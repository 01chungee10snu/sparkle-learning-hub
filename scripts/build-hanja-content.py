#!/usr/bin/env python3
"""Generate reproducible Hanja *practice* banks from grade/reading facts.

Usage: python3 scripts/build-hanja-content.py --source /path/to/hanja.csv
The upstream file is NOT redistributed verbatim. Check reuse permission before
public publication. Questions/distractors are generated app material and require
editorial verification before they are treated as exam-preparation content.
"""
from __future__ import annotations

import argparse
import ast
import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GRADES = [
    ("8급", "H8", "hanja-h8", 50),
    ("7급Ⅱ", "H7II", "hanja-h7ii", 50),
    ("7급", "H7", "hanja-h7", 50),
    ("6급Ⅱ", "H6II", "hanja-h6ii", 75),
    ("6급", "H6", "hanja-h6", 75),
    ("5급Ⅱ", "H5II", "hanja-h5ii", 100),
    ("5급", "H5", "hanja-h5", 100),
    ("4급Ⅱ", "H4II", "hanja-h4ii", 250),
    ("4급", "H4", "hanja-h4", 250),
    ("3급Ⅱ", "H3II", "hanja-h3ii", 500),
    ("3급", "H3", "hanja-h3", 317),
]
SOURCE_SHA256 = "8a54b274540a46332fedb5f947ca9f437a6e4ac83197580b1c844f88f0251715"
CANONICAL_NAME = "rycont/hanja-grade-dataset/main/hanja.csv"
# Selected traditional 훈 that are unusual or archaic for preschool learners.
CHILD_FRIENDLY_HUN = {"女": "여자", "母": "어머니", "父": "아버지"}
BASIC_STORIES = {
    "日": "해가 반짝이는 모습을 떠올려 봐요.",
    "月": "밤하늘에 뜬 달을 생각해 봐요.",
    "山": "산의 봉우리를 떠올려 봐요.",
    "水": "물이 흐르는 모습을 떠올려 봐요.",
    "木": "가지가 뻗은 나무를 생각해 봐요.",
    "火": "타오르는 불꽃을 떠올려 봐요.",
    "人": "사람이 서 있는 모습을 생각해 봐요.",
    "大": "팔을 크게 벌린 모습을 생각해 봐요.",
    "小": "작은 것을 떠올려 봐요.",
    "口": "입 모양을 떠올려 봐요.",
}


def clean_hun(value):
    # Bracketed semantic annotations are not needed to choose the reading.
    value = re.sub(r"\[[^\]]+\]", "", value)
    value = re.sub(r"\([^)]*\)", "", value)
    return value.strip()


def choice_set(target, pool, glyph, position, count=4):
    """Keep answer unambiguous, position deterministic, and distractors unique."""
    seed = int(hashlib.sha256((glyph + "|" + target + "|" + str(position)).encode()).hexdigest()[:12], 16)
    candidates = sorted({value for value in pool if value and value != target})
    if len(candidates) < count - 1:
        raise ValueError(f"Not enough distinct alternatives for {glyph}")
    # Controlled, reproducible stride sampling; don't bias to lexical neighbours.
    start = seed % len(candidates)
    step = 2 * (seed // len(candidates) % max(1, len(candidates) // 2)) + 1
    while __import__("math").gcd(step, len(candidates)) != 1:
        step += 2
    distractors = [candidates[(start + step * k) % len(candidates)] for k in range(count - 1)]
    answer = (seed // 11) % count
    choices = distractors[:]
    choices.insert(answer, target)
    return choices, answer


def build(src, verify=False):
    data = src.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if digest != SOURCE_SHA256:
        raise ValueError("Unexpected upstream SHA-256; review source changes before importing: " + digest)
    entries = list(csv.DictReader(data.decode("utf-8-sig").splitlines()))
    parsed = {}
    for row in entries:
        if row["level"] not in {g[0] for g in GRADES}:
            continue
        char = unicodedata.normalize("NFKC", row["hanja"])
        readings = ast.literal_eval(row["meaning"])
        hun = CHILD_FRIENDLY_HUN.get(char, clean_hun(readings[0][0][0]))
        eum = row["main_sound"].strip()
        if len(char) != 1 or not hun or not re.fullmatch("[가-힣]+", eum) or char in parsed:
            raise ValueError("Invalid or repeated glyph: " + char)
        label = hun if hun.endswith(" " + eum) else f"{hun} {eum}"
        parsed[char] = {"char": char, "grade": row["level"], "hun": hun, "eum": eum,
                        "label": label, "radical": unicodedata.normalize("NFKC", row["radical"])}
    expected = {g[0]: g[3] for g in GRADES}
    counts = Counter(row["grade"] for row in parsed.values())
    if counts != Counter(expected):
        raise ValueError(f"Grade allocations mismatch: {counts} / {expected}")

    cumulative = []
    generated = []
    for idx, (grade, band, game_id, count) in enumerate(GRADES):
        current = sorted((r for r in parsed.values() if r["grade"] == grade), key=lambda r: ord(r["char"]))
        cumulative.extend(current)
        labels = [r["label"] for r in cumulative]
        sounds = [r["eum"] for r in cumulative]
        # Alternative options from previous levels are familiar and constitute meaningful distractors.
        questions = []
        for n, item in enumerate(current):
            character = item["char"]
            family = "hanja-u" + format(ord(character), "x")
            family_story = BASIC_STORIES.get(character, "마법 두루마리에서 글자를 발견했어요.")
            for task, target, pool, prompt, skill, offset in [
                ("meaning", item["label"], labels, "이 한자의 뜻과 소리를 골라요.", "한자 훈음 이해", -0.14),
                ("sound", item["eum"], sounds, "이 한자를 어떤 소리로 읽을까요?", "한자 독음 구별", 0.10),
            ]:
                # Sounds can repeat: alternatives are unique by content, not by character.
                choices, answer = choice_set(target, pool, character, n + (0 if task == "meaning" else 919))
                questions.append({
                    "id": f"{game_id}-{format(ord(character), 'x')}-{task}",
                    "title": "마법 두루마리 · " + grade,
                    "story": family_story,
                    "prompt": prompt,
                    "visual": {"kind": "word", "text": character},
                    "choices": choices,
                    "answer": answer,
                    "explanation": [
                        f"{character}의 뜻과 소리는 ‘{item['label']}’예요.",
                        "글자를 직접 가리키며 소리 내어 읽고, 며칠 뒤 다시 떠올려 봐요.",
                    ],
                    "skill": skill,
                    "hanjaCharacter": character,
                    "hanjaFamily": family,
                    "hanjaTask": task,
                    "readText": f"화면의 한 글자를 눈으로 보고 생각해요. {prompt} " + " ".join(f"{i+1}번 {v}." for i,v in enumerate(choices)),
                    "provenance": {
                        "source": "hanja_grade_dictionary",
                        "grade": grade,
                        "calibration": "editorial_provisional",
                        "answerVerificationStatus": "generated_requires_editor_review",
                        "difficultyB": offset / 0.28,
                    },
                })
        game = {
            "id": game_id, "subject": "hanja", "hanjaGrade": grade, "gradeBand": band,
            "title": "한자 수련 · " + grade, "description": "뜻·소리 연결과 독음을 연습해요.",
            "emoji": "📜", "strand": "한자 훈음·독음", "prerequisite": "천천히 듣고 네 개 보기 중 하나를 골라요.",
            "offline": "가족과 함께 오늘 배운 한 글자를 종이에 써 보아요.",
            "sourceInfo": {"upstream": CANONICAL_NAME, "sha256": digest, "rights": "review_before_public_release"},
            "questions": questions,
        }
        entry = {
            "id": game_id, "subject": "hanja", "title": game["title"],
            "description": f"한국어문회 {grade} 배정 {count}자 · 뜻과 음을 연결해요.",
            "emoji": "📜", "kind": "quiz", "source": f"./games/{game_id}/game.json",
            "levelLabel": grade, "hanjaGrade": grade, "gradeBand": band,
            "starterCards": [{"glyph": r["char"], "reading": r["label"]} for r in current[:8]],
            "questionCount": len(questions), "status": "published",
            "questionIds": [q["id"] for q in questions], "growth": False,
            "modes": ["choice"], "sourceGroup": "hanja",
        }
        generated.append((game_id, game, entry))
    # Refuse to overwrite anything with a non-generated game id.
    catalog_path = ROOT / "games/catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    ids = {name for name, _, _ in generated}
    catalog = [entry for entry in catalog if entry["id"] not in ids]
    catalog += [entry for _, _, entry in generated]
    results = [(catalog_path, json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")]
    for name, game, _ in generated:
        results.append((ROOT / f"games/{name}/game.json", json.dumps(game, ensure_ascii=False, separators=(",", ":")) + "\n"))
    for path, output in results:
        if verify:
            if not path.is_file() or path.read_text(encoding="utf-8") != output:
                raise AssertionError(f"Hanja content outdated: {path}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(output, encoding="utf-8")
    total = sum(len(game["questions"]) for _, game, _ in generated)
    print(f"{'VERIFIED' if verify else 'BUILT'}: {len(generated)} grades, {len(parsed)} unique characters, {total} practice questions, src SHA256 {digest}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    build(args.source, args.verify)
