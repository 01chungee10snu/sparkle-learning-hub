#!/usr/bin/env python3
"""Retrieve public factual career wage metadata. NOT a copied prose catalogue."""
import csv,json,re,subprocess,sys,time
from pathlib import Path

base="https://www.career.go.kr/cloud/api/job/search"
parameters={
 "keyword":"","mode":"","searchGubun":"","selectedtab1":[],
 "selectedtab22":[],"selectedtab3_wage":[],"selectedtab3_wlb":[],
 "selectedtab3_social":[],"selectedtab4":[]
}
all_rows=[]
for page in range(3):
 url=f"{base}?size=200&page={page}&sort=reg_dt,desc"
 request=subprocess.run([
  "curl","-fsSL","--max-time","25","--retry","2","-A","Mozilla/5.0",
  "-H","Content-Type: application/json","--data",json.dumps(parameters),url
 ],capture_output=True,text=True)
 if request.returncode!=0:raise RuntimeError("CareerNet fetch unavailable: "+request.stderr[:140])
 body=json.loads(request.stdout)
 print("OFFICIAL_CAREERNET_PAGE",page,"count",len(body.get("content",[])),
       "total",body.get("totalElements"),flush=True)
 all_rows.extend(body["content"])
 if len(all_rows)>=body["totalElements"]:break

ids=set();rows=[]
for item in all_rows:
 job_id=str(item.get("job_cd",""))
 if not job_id.isdigit() or job_id in ids:continue
 ids.add(job_id)
 raw=str(item.get("wage") or "").replace(",","").strip()
 wage=int(raw) if re.fullmatch(r"\d{2,6}",raw) else None
 rows.append({
  "id":job_id,"name":item.get("job_nm"),
  "annual_median_wan":wage,
  "wage_level":item.get("wage_level"),
  "aptitude":item.get("aptit_name"),
  "work_preview":item.get("work"),
  "source_url":f"https://www.career.go.kr/cloud/m/job/view?seq={job_id}"
 })
outfile=Path("/private/tmp/careernet-552-official-public-metadata-20261019.json")
outfile.write_text(json.dumps({
 "retrieved_at":"2026-10-19","source_endpoint":base,
 "count":len(rows),"rows":rows
},ensure_ascii=False,indent=2))
print("OFFICIAL_CAREERNET_TOTAL",len(rows),"WITH_WAGE",sum(r["annual_median_wan"]!=None for r in rows))
for item in sorted([r for r in rows if r["annual_median_wan"]],key=lambda r:-r["annual_median_wan"])[:55]:
 print("SALARY_TOP",item["name"],item["annual_median_wan"],"code",item["id"])
for item in sorted([r for r in rows if r["annual_median_wan"]],key=lambda r:r["annual_median_wan"])[:36]:
 print("SALARY_LOW",item["name"],item["annual_median_wan"],"code",item["id"])
