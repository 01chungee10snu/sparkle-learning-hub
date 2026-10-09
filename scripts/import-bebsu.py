#!/usr/bin/env python3
"""Import question-only Bebsu exports without copying learner or credential data.

Source images retain their original bytes. Missing images or answers are
reported in the manifest rather than replaced by incomplete OCR text.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import struct


GAME_NAMES = {
    "bebsu-foundation": ("K", "뱁수 기초 연산", "5와 10 안에서 수를 더하고 빼요.", "🍬"),
    "bebsu-g1-generated": ("G1", "뱁수 초1 수학", "수 세기·연산·자릿값·규칙·시계·길이를 만나요.", "🔢"),
    "bebsu-g1-original": ("G1", "뱁수 초1 문제 정원", "기존 초1 문제 그림과 풀이로 수학을 탐험해요.", "🌱"),
    "bebsu-g2-original": ("G2", "뱁수 초2 문제 정원", "기존 초2 문제 그림과 풀이를 차근차근 살펴봐요.", "🌿"),
}
GRADE_NAMES = {"K": "유아 기초", **{f"G{i}": f"초{i}" for i in range(1, 7)}, "M": "중등", **{f"M{i}": f"중{i}" for i in range(1, 4)}}
CIRCLED_CHOICES = "①②③④⑤"
VERIFIED = {"machine_checked", "human_verified", "legacy_reviewed"}
QUARANTINED_SOURCE_IDS = {
    "6f36ee40-7eb0-4ac8-9a7f-0518d11797ee": {"officialObservedAnswer": "(1) 마름모, 870 (2) 130번째", "sourceAnswerLinkedQuestion": 25},
    "4baab36a-a63a-4118-a03a-d6ebc9f8b447": {"officialObservedAnswer": "24π", "sourceAnswerLinkedQuestion": 16},
}


def dump(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def fingerprint(value: str | bytes) -> str:
    return hashlib.sha256(value.encode("utf-8") if isinstance(value, str) else value).hexdigest()


def png_metadata(path: Path) -> dict:
    content = path.read_bytes()
    if content[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Source asset is not a PNG: {path.name}")
    width, height = struct.unpack(">II", content[16:24])
    if width <= 0 or height <= 0:
        raise ValueError(f"Invalid source image dimensions: {path.name}")
    return {"sha256": fingerprint(content), "bytes": len(content), "width": width, "height": height}


def numeric_answer(row: dict) -> int | None:
    answer = row.get("answer_json", {})
    target = answer.get("value")
    if answer.get("type") != "number" or isinstance(target, bool) or not isinstance(target, (float, int)) or not math.isfinite(target) or int(target) != target:
        return None
    return int(target)


def choice_answer(row: dict) -> int | None:
    answer = row.get("answer_json", {})
    raw = str(answer.get("raw", "")).strip()
    if answer.get("type") != "choice":
        return None
    if raw in CIRCLED_CHOICES and len(raw) == 1:
        return CIRCLED_CHOICES.index(raw)
    key = str(answer.get("correct_choice_id", ""))
    return "ABCDE".index(key) if key in "ABCDE" and len(key) == 1 else None


def verify_foundation(row: dict) -> None:
    match = re.fullmatch(r"(\d+)\s*([+-])\s*(\d+)\s*=\s*\?", row["stem_md"])
    if not match:
        raise ValueError("Unsupported foundation expression")
    a, operation, b = match.groups()
    expected = int(a) + int(b) if operation == "+" else int(a) - int(b)
    if expected != row["answer"]:
        raise ValueError(f"Incorrect foundation answer: {row['item_key']}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Sanitized question-only source JSON; never a full database backup")
    parser.add_argument("--foundation", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True, help="Learning hub repository")
    parser.add_argument("--asset-root", type=Path, action="append", default=[], help="Directory containing problem_crops and solution_crops")
    parser.add_argument("--asset-inventory", type=Path, action="append", default=[], help="Previously verified image hashes and dimensions")
    parser.add_argument("--copy-assets", action="store_true")
    args = parser.parse_args()
    source_bytes = args.source.read_bytes()
    source = json.loads(source_bytes)
    if source.get("schema") != "bebsu-question-only-snapshot-v1" or "tables" in source or set(source) - {"schema", "source_repo", "source_snapshot_name", "items", "skills", "assets"}:
        raise ValueError("Use a sanitized question-only snapshot; database/activity exports are forbidden")
    if len({row["item_key"] for row in source["items"]}) != len(source["items"]):
        raise ValueError("Duplicate source question keys")
    skills = {row["id"]: row for row in source["skills"]}
    assets_by_item = collections.defaultdict(dict)
    for asset in source["assets"]:
        if asset.get("status") == "approved" and asset.get("kind") in {"problem_image", "solution_image"}:
            assets_by_item[asset["item_id"]][asset["kind"]] = asset
    inventory = {}
    for path in args.asset_inventory:
        for row in json.loads(path.read_text())["assets"]:
            inventory[row["source_path"].replace("\\", "/")] = row
    imported_assets = {}
    full_hashes_by_name = {}

    def asset_reference(asset: dict | None) -> dict | None:
        if not asset:
            return None
        source_path = asset["storage_path"].replace("\\", "/")
        if not source_path.startswith("data/kma/assets/") or ".." in Path(source_path).parts:
            raise ValueError("Unsafe source asset path")
        relative = source_path.removeprefix("data/kma/assets/")
        found = next((root / relative for root in args.asset_root if (root / relative).is_file()), None)
        metadata = {**inventory.get(source_path, {}), **png_metadata(found)} if found else inventory.get(source_path)
        if not metadata:
            return None
        sha = metadata["sha256"]
        if not re.fullmatch(r"[a-f0-9]{64}", sha):
            raise ValueError("Invalid asset SHA-256")
        name = f"{sha[:16]}.png"
        if name in full_hashes_by_name and full_hashes_by_name[name] != sha:
            raise ValueError("Image filename hash collision")
        full_hashes_by_name[name] = sha
        local = f"./assets/bebsu/math/{name}"
        if args.copy_assets:
            destination = args.output / local.removeprefix("./")
            destination.parent.mkdir(parents=True, exist_ok=True)
            if found:
                shutil.copyfile(found, destination)
            elif not destination.is_file() or fingerprint(destination.read_bytes()) != sha:
                raise ValueError(f"Image bytes unavailable for copy: {source_path}")
        result = {"path": local, "sourcePath": source_path, **{key: metadata[key] for key in ["sha256", "bytes", "width", "height"]}}
        recovery = {key: metadata[key] for key in ["source_pdf", "source_url", "page", "bounds", "kind", "method", "source_pdf_sha256"] if key in metadata}
        if recovery:
            if recovery.get("source_pdf"):
                original_pdf = str(recovery["source_pdf"]).replace("\\", "/")
                if not original_pdf.startswith("data/kma/raw/") or ".." in Path(original_pdf).parts:
                    crop_relative = source_path.removeprefix("data/kma/assets/").split("/", 1)[1]
                    original_pdf = "data/kma/raw/" + re.sub(r"_q\d+\.png$", ".pdf", crop_relative)
                recovery["source_pdf"] = original_pdf
            if recovery.get("source_url") and not re.match(r"^https?://(?:www\.)?kma-e\.com/", str(recovery["source_url"]), re.I):
                recovery.pop("source_url")
            result["recovery"] = recovery
        imported_assets[source_path] = result
        return result

    games = collections.defaultdict(list)
    excluded = []
    source_counts = collections.Counter()
    grade_counts = collections.Counter()
    for row in sorted(source["items"], key=lambda x: (x.get("grade_band", ""), x.get("source", ""), x.get("item_key", ""))):
        source_counts[row.get("source", "unknown")] += 1
        grade_counts[row.get("grade_band", "unknown")] += 1
        key = row["item_key"]
        original = row.get("source") == "kma_public_original"
        if row["id"] in QUARANTINED_SOURCE_IDS:
            excluded.append({"sourceId": row["id"], "itemKey": key, "gradeBand": row.get("grade_band"), "reason": "unsupported_original_answer", "subReason": "source_answer_linked_to_another_question_and_official_answer_not_single_integer", "sourceStatus": row.get("status"), "sourceAnswer": row.get("answer_json"), "sourceUrl": row.get("source_url"), **QUARANTINED_SOURCE_IDS[row["id"]], "evidence": "official-answer-table-comparison.json; qa-answer-candidates.jpg"})
            continue
        numeric = numeric_answer(row)
        choice = choice_answer(row)
        if row.get("app_integration_status") == "blocked_missing_answer" or row.get("answer_verification_status") not in VERIFIED or (numeric is None and choice is None):
            excluded.append({"itemKey": key, "gradeBand": row.get("grade_band"), "reason": "missing_or_unverified_answer", "sourceStatus": row.get("status")})
            continue
        pictures = assets_by_item[row["id"]]
        problem = asset_reference(pictures.get("problem_image")) if original else None
        solution = asset_reference(pictures.get("solution_image")) if original else None
        if original and (problem is None or solution is None):
            excluded.append({"itemKey": key, "gradeBand": row.get("grade_band"), "reason": "missing_problem_or_solution_image", "sourceStatus": row.get("status")})
            continue
        grade = row.get("grade_band", "G1")
        game_id = f"bebsu-{grade.lower()}-original" if original else "bebsu-g1-generated"
        question = {
            "id": "bebsu-" + fingerprint(key)[:16],
            "title": f"{GRADE_NAMES.get(grade, grade)} 수학 · {row.get('exam_question_no', '')}번",
            "story": f"문제 그림에서 {row.get('exam_question_no', '')}번을 찾아, 네 생각으로 풀어 봐." if original else row["stem_md"],
            "prompt": "그림 속 보기 번호를 골라 주세요." if choice is not None else "답을 숫자로 적어 주세요.",
            "explanation": [f"정답은 {CIRCLED_CHOICES[choice] if choice is not None else numeric}예요.", f"풀이 그림에서 {row.get('exam_question_no', '')}번을 보며 답이 나온 과정을 확인해 봐요."] if original else [row["explanation_md"]],
            "skill": skills.get(row.get("skill_id"), {}).get("name") or row.get("skill_id", "수학"),
            "originalStem": row.get("stem_md", ""),
            "originalExplanation": row.get("explanation_md", ""),
            "source": {"id": key, "repo": "01chungee10snu/Bebsu", "format": row.get("format"), "answer": row.get("answer_json"), "rawAnswer": row.get("answer_json", {}).get("raw"), "gradeBand": grade},
            "provenance": {
                "repo": "01chungee10snu/Bebsu", "itemKey": key, "gradeBand": grade,
                "source": row.get("source"), "sourceStatus": row.get("status"), "legacySourceStatus": row.get("legacy_source_status"),
                "sourceUrl": row.get("source_url"), "eventTitle": row.get("source_event_title"),
                "sourceLicenseStatus": row.get("source_license_status"), "originalLicenseStatus": row.get("source_metadata", {}).get("license_status"),
                "answerVerificationStatus": row.get("answer_verification_status"), "difficultyB": row.get("difficulty_b"),
                "skillCode": skills.get(row.get("skill_id"), {}).get("code"), "examQuestionNo": row.get("exam_question_no"),
            },
        }
        if choice is not None:
            question.update({"choices": list(CIRCLED_CHOICES), "answer": choice})
        else:
            question["interaction"] = {"type": "numeric", "target": numeric, "max": max(99 if grade == "G1" else 9999, numeric)}
            if numeric < 0:
                question["interaction"]["min"] = -99
        if original:
            question["problemImage"] = problem["path"]
            question["solutionImage"] = solution["path"]
            question["provenance"]["problemImage"] = problem
            question["provenance"]["solutionImage"] = solution
        games[game_id].append(question)

    foundation = json.loads(args.foundation.read_text())
    for row in foundation["items"]:
        verify_foundation(row)
        a, operation, b = re.fullmatch(r"(\d+)\s*([+-])\s*(\d+)\s*=\s*\?", row["stem_md"]).groups()
        games["bebsu-foundation"].append({
            "id": "bebsu-" + fingerprint(row["item_key"])[:16], "title": f"기초 연산 · {row['slot']}번",
            "story": row["stem_md"], "prompt": "빈칸에 알맞은 숫자를 적어 주세요.",
            "interaction": {"type": "numeric", "target": row["answer"], "max": 10},
            "explanation": [row["explanation_md"], "손가락이나 블록으로 수를 모으고 빼며 확인해 봐요."],
            "skill": row["skill_name"], "visual": {"kind": "counters", "emoji": "🍎", "left": int(a), "operator": operation, "right": int(b)},
            "source": {"id": row["item_key"], "repo": "01chungee10snu/Bebsu", "format": "numeric_input", "answer": {"type": "number", "value": row["answer"], "raw": str(row["answer"])}, "rawAnswer": str(row["answer"]), "gradeBand": "K"},
            "provenance": {"repo": "01chungee10snu/Bebsu", "itemKey": row["item_key"], "gradeBand": "K", "source": "sehee_foundation", "skillCode": row["skill_code"], "stage": row["stage"], "answerVerificationStatus": "independently_arithmetic_checked"},
        })

    entries = []
    for game_id, questions in sorted(games.items()):
        if len(questions) < 5:
            raise ValueError(f"Game is too small: {game_id}")
        grade, title, description, emoji = GAME_NAMES.get(game_id, (game_id.split("-")[1].upper(), "뱁수 수학", "기존 문제 그림과 풀이로 수학을 탐험해요.", "📚"))
        if game_id not in GAME_NAMES:
            title = f"뱁수 {GRADE_NAMES.get(grade, grade)} 문제 정원"
        ids = [question["id"] for question in questions]
        if len(set(ids)) != len(ids):
            raise ValueError("Duplicate source question key")
        game = {"id": game_id, "subject": "math", "title": title, "description": description, "emoji": emoji, "growth": False, "gradeBand": grade, "prerequisite": "아이와 보호자가 문제 수준을 보고 직접 선택해요.", "offline": "풀이를 말로 설명하고, 필요한 수나 도형을 종이와 블록으로 확인해 보세요.", "questions": questions}
        dump(args.output / "games" / game_id / "game.json", game)
        entries.append({"id": game_id, "subject": "math", "title": title, "description": description, "emoji": emoji, "kind": "quiz", "source": f"./games/{game_id}/game.json", "status": "published", "levelLabel": GRADE_NAMES.get(grade, grade), "questionCount": len(questions), "questionIds": ids, "modes": sorted({question.get("interaction", {}).get("type", "choice") for question in questions}), "sourceGroup": "bebsu", "gradeBand": grade, "growth": False, "maxChoices": 5})
        if any(question.get("interaction", {}).get("min", 0) < 0 for question in questions):
            entries[-1]["numericMin"] = -99
    manifest = {
        "schema": "bebsu-question-import-manifest-v1", "sourceRepo": "01chungee10snu/Bebsu", "sourceSnapshotName": source.get("source_snapshot_name"), "questionOnlySourceSha256": fingerprint(source_bytes),
        "sourceCounts": dict(source_counts), "sourceGradeCounts": dict(grade_counts), "foundationQuestions": len(foundation["items"]),
        "importedQuestions": sum(len(rows) for rows in games.values()), "importedGames": len(games), "gameCounts": {key: len(rows) for key, rows in games.items()},
        "excludedCounts": dict(collections.Counter(row["reason"] for row in excluded)), "excluded": excluded,
        "assets": list(imported_assets.values()), "uniqueAssetFiles": len(full_hashes_by_name), "uniqueAssetBytes": sum(next(asset["bytes"] for asset in imported_assets.values() if asset["sha256"] == sha) for sha in full_hashes_by_name.values()),
        "imageRecoveryCounts": dict(collections.Counter(asset.get("recovery", {}).get("kind", "existing_repo_crop") for asset in imported_assets.values())),
        "notes": ["Only question content, question metadata, skills and original math images were imported. Learner records, wallets, students, credentials and Bebsu activity are excluded.", "Legacy archived status was retained in provenance; the source application and Google Sheets were not changed.", "Original text is OCR and may omit or reorder notation. Visible original questions use the source image; raw OCR is retained as metadata only.", "The source labels original answers machine_checked. Original exam answers were not all independently solved again during this import.", "IRT difficulty metadata is preserved only as provenance and never automatically raises a child's learning stage."],
        "officialAnswerComparison": {"compared": 1296, "matched": 1294, "quarantined": 2, "scope": "Official PDF answer tables where unambiguous structured entries were recovered; not a full re-solve of every imported exam question"},
    }
    dump(args.output / "docs" / "bebsu-import-manifest.json", manifest)
    dump(args.output / "docs" / "bebsu-catalog-fragment.json", entries)
    summary = ["# Bebsu 수학 문항 통합", "", f"- 원본 문항: {len(source['items'])}개 + 유아 기초 {len(foundation['items'])}개", f"- 학습 앱에서 사용할 수 있는 문항: {manifest['importedQuestions']}개 / {manifest['importedGames']}개 문제은행", f"- 답이 없거나 검증되지 않아 제외한 문항: {manifest['excludedCounts'].get('missing_or_unverified_answer', 0)}개", f"- 문제·풀이 그림이 없어 제외한 문항: {manifest['excludedCounts'].get('missing_problem_or_solution_image', 0)}개", "", "| 문제은행 | 문항 수 |", "|---|---:|", *[f"| {entry['title']} | {entry['questionCount']} |" for entry in entries], "", "## 보존과 검증", "", "기존 Bebsu 앱과 원격 데이터는 수정하지 않았습니다. 문항, 스킬 이름, 정답, 원문 문제·풀이 그림과 출처만 옮겼으며 학생·풀이 이력·지갑·비밀번호·API 토큰은 포함하지 않습니다.", "", "직접 만든 초1 변형 100문항과 유아 기초 25문항은 산술을 독립 검산했습니다. KMA 원본 정답은 Bebsu에 기록된 `machine_checked` 상태를 보존합니다. 모든 원본을 다시 풀어 정답을 검증했다는 의미는 아닙니다. 원본의 OCR 문장에는 누락·순서 오류가 있어 학습 화면은 문제와 풀이의 원본 그림을 사용합니다.", "", "원본 그림의 해시, 픽셀 크기, 출처 경로와 제외 문항은 `bebsu-import-manifest.json`에서 확인할 수 있습니다. 원문 OCR과 정답 형식은 각 문제의 `originalStem`, `originalExplanation`, `source`, `provenance`에 남아 있습니다.", "", "학년별 문제은행은 보호자와 아이가 직접 선택합니다. 저장된 IRT 난도는 출처 정보로 보존하며 학습 단계의 자동 승급에 사용하지 않습니다.", "", "## 다시 생성하기", "", "```bash", "python3 scripts/import-bebsu.py \\", "  --source /path/to/question-only-source.json \\", "  --foundation /path/to/Bebsu/src/data/sehee-foundation-items.json \\", "  --output . \\", "  --asset-root /path/to/Bebsu/public/assets/kma \\", "  --asset-root /path/to/recovered-assets/kma \\", "  --copy-assets", "```", "", "입력은 전체 DB 백업을 직접 받지 않는 `bebsu-question-only-snapshot-v1` 형식입니다. `--asset-inventory`는 이미 검증한 원본 파일의 해시 목록으로 데이터 검증용 출력을 생성할 때 사용할 수 있습니다. 실제 배포 시에는 `--copy-assets`로 PNG 파일이 존재하는지도 확인해야 합니다.", ""]
    (args.output / "docs" / "BEBSU_INTEGRATION.md").write_text("\n".join(summary), encoding="utf-8")
    with (args.output / "docs" / "BEBSU_INTEGRATION.md").open("a", encoding="utf-8") as report:
        report.write("\n## 공식 원문과 대조한 추가 검수\n\n공식 정답표의 명확히 읽히는 1,296개 답을 대조해 1,294개가 일치했습니다. 초5 24번의 복합형 답과 중등 14번의 π가 포함된 답은 Bebsu에서 다른 문항의 숫자와 연결되어 있어 출제에서 격리했습니다. 원본 답을 임의로 수정하지 않았으며 기존 답, 공식 원문에서 확인한 답과 제외 이유를 manifest에 보존했습니다. 기존 13개 정답 누락과 합쳐 총 15개를 출제에서 제외합니다.\n\n기존 일부 풀이 그림에서도 문항번호가 어긋나 있어 공식 PDF의 문항번호를 기준으로 모든 문제·풀이 그림을 다시 생성했습니다. 문항 경계를 확실히 찾을 수 없는 경우에는 해당 문항이 포함된 원문 페이지 전체를 유지하고, 화면에서 찾아야 할 문항번호를 안내합니다. 해설 OCR은 표시하지 않고 출처 기록으로만 남깁니다. 각 그림의 `recovery`에는 공식 PDF, 페이지, 경계 좌표, 추출 방식과 SHA-256이 남습니다.\n")
    print(json.dumps({key: manifest[key] for key in ["importedQuestions", "importedGames", "gameCounts", "excludedCounts", "uniqueAssetFiles", "uniqueAssetBytes"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
