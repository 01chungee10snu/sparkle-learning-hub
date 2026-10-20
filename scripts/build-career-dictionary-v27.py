#!/usr/bin/env python3
"""Build 100 source-labelled factual career cards with original child-facing prose.

Input: a manually audited set of CareerNet occupational names & original Korean
children's summaries. Official CareerNet JSON is used for numeric/statistical
facts (annual median wage, respondent education percentages, classification),
never copied narrative. A missing/cross-occupation number is NEVER fabricated.

Rebuild with: python3 scripts/build-career-dictionary-v27.py
Requires access to public career.go.kr and list metadata previously fetched into
/tmp; output itself and audit sheet are versioned for offline reproducibility.
"""
import csv,datetime,hashlib,json,re,subprocess,time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
METADATA=Path('/private/tmp/careernet-552-official-public-metadata-20261019.json')
ROWS=ROOT/'scripts/career-curation-v27.tsv'
JSOUT=ROOT/'village/career-data-v27.js'
AUDIT=ROOT/'docs/CAREER_V27_SOURCE_AUDIT.json'
YEAR_RE=re.compile(r'\((20\d\d)\)')
HOURS_YEAR=2080  # Nominal 40 hours × 52 weeks, not observed actual hours.
GROUPS={'medical','tech','justice','leadership','creative','planet'}
SCHOOL={'math','korean','english','hanja'}
EMOJI={'medical':'🩺','tech':'🚀','justice':'⚖️','leadership':'🏛️','creative':'🎨','planet':'🌎'}
LEGACY_IDS={
 '일반의사':'doctor','치과의사':'dentist','수의사':'veterinarian',
 '약사 및 한약사':'pharmacist','기업고위임원':'ceo',
 '판사':'judge','변호사':'lawyer','외교관':'diplomat',
 '회계사':'accountant','경제학연구원':'economist',
 '인공지능 엔지니어':'ai-researcher',
 '지능형 로봇개발자':'robot-engineer',
 '반도체공학기술자':'semiconductor','항공우주공학기술자':'astronautical',
 '정보보호전문가':'cybersecurity','건축사':'architect',
 '게임기획자':'game-designer','비행기조종사':'pilot',
 '빅 데이터 전문가':'biomedical-data-unmapped'
}
# Do not relabel a different previous career. This one is a different field.
del LEGACY_IDS['빅 데이터 전문가']

source=json.loads(METADATA.read_text())
official={x['name']:x for x in source['rows']}
lines=[line.split('|') for line in ROWS.read_text().splitlines() if line.strip()]
assert len(lines)==101,(len(lines),"curation rows")
assert all(len(row)==6 for row in lines)
# One proxy record duplicated another profession's wage: keep general doctor,
# avoid presenting the same source wage as two separately measured occupations.
selected=[row for row in lines if row[0]!='전문의사']
assert len(selected)==100
seen=set();entries=[];proxy_count=0;years={}

for idx,(name,group,emoji,mission,try_it,subjects) in enumerate(selected,1):
 if name in seen or name not in official:raise RuntimeError('Missing/duplicate official job: '+name)
 seen.add(name)
 if group not in GROUPS or not mission or not try_it:raise RuntimeError('Curated record invalid '+name)
 linked=subjects.split(',')
 if len(linked)!=2 or len(set(linked))!=2 or any(s not in SCHOOL for s in linked):
  raise RuntimeError('Exactly 2 distinct study subjects required '+name)
 record=official[name]
 if record['annual_median_wan'] is None:raise RuntimeError('No wage evidence for '+name)
 seq=record['id']
 url=f'https://www.career.go.kr/cloud/api/job/view?seq={seq}'
 p=subprocess.run(['curl','--fail','--silent','--show-error','--location','--retry','3',
  '--retry-delay','1','--max-time','20',url],capture_output=True,text=True)
 if p.returncode!=0:raise RuntimeError('Failed official profile '+name+' '+p.stderr[:160])
 detail=json.loads(p.stdout)
 if detail['job_nm']!=name:raise RuntimeError('CareerNet identity conflict '+name)
 wage_raw=str(detail.get('wage') or '').replace(',','')
 if not re.fullmatch(r'[0-9]{2,6}',wage_raw):raise RuntimeError('Non-numeric wage '+name)
 wage=int(wage_raw)
 if wage!=record['annual_median_wan']:raise RuntimeError('Detail/List wage disagreement '+name)
 source_txt=str(detail.get('wage_source') or '')
 match=YEAR_RE.findall(source_txt)
 year=int(match[-1]) if match else None
 if not year:raise RuntimeError('Missing wage survey year '+name)
 years[year]=years.get(year,0)+1
 proxy=('관련 직업' in source_txt or '관련직업' in source_txt)
 if proxy:proxy_count+=1
 edu=detail.get('jobEduChart') or {}
 names=[n.strip() for n in str(edu.get('name') or '').split(',')]
 vals=[]
 try:vals=[round(float(n)) for n in str(edu.get('data') or '').split(',')]
 except ValueError:pass
 valid_education=(len(vals)==6 and len(names)==6 and all(0<=v<=100 for v in vals)
                  and 95<=sum(vals)<=105)
 educated=round(sum(vals[3:])) if valid_education else None
 edu_percent={n:v for n,v in zip(names,vals)} if valid_education else None
 id=LEGACY_IDS.get(name,f'career-{seq}')
 if group=='medical':
  impact='정확한 지식과 책임 있는 판단으로 사람들의 건강과 삶에 기여할 수 있어요.'
 elif group=='justice':
  impact='공정한 규칙과 협력을 통해 안전하고 신뢰하는 사회를 만드는 데 도움을 줘요.'
 elif group=='tech':
  impact='연구와 기술을 활용해 더 나은 도구와 새로운 해결 방법을 만들 수 있어요.'
 elif group=='leadership':
  impact='자원과 사람을 책임 있게 관리하고 경제활동을 개선할 수 있어요.'
 elif group=='creative':
  impact='새로운 생각을 표현하고 배움을 전하며 사람들의 경험을 풍성하게 만들어요.'
 else:
  impact='안전한 생활과 지속 가능한 환경을 지키는 데 필요한 일을 해요.'
 display_subject={'math':'수학','korean':'국어','english':'영어','hanja':'한자'}
 journey='어릴 때는 '+ '·'.join(display_subject[s] for s in linked) + ' 등 여러 분야를 살펴보고, 자라면서 이 직업에 필요한 다양한 배움과 훈련 경로를 알아봐요.'
 entry={
  'id':id,'sourceCode':seq,'name':name,'emoji':emoji,'group':group,
  'mission':mission,'impact':impact,'journey':journey,'tryIt':try_it,
  'subjects':linked,
  'annualMedianWan':wage,
  'hourlyEquivalentWon':int((wage*10000/HOURS_YEAR)+0.5),
  'hoursPerYearAssumed':HOURS_YEAR,
  'wageSurveyYear':year,'wageIsRelatedOccupationProxy':proxy,
  'wageSourceLabel':'커리어넷 직업백과: '+('관련 직업 임금 대체치' if proxy else '해당 직업 임금 통계'),
  'sourceUrl':url.replace('/cloud/api/job/','/cloud/m/job/'),
  'educationBachelorPlusPct':educated,
  'educationDistribution':edu_percent,
  'educationSourceLabel':str(edu.get('source') or '').strip()[:110],
  'jobStdCode':str(detail.get('std_job_cd') or ''),
  'jobEmploymentCode':str(detail.get('emp_job_cd') or ''),
  # Never invent profession-specific percentiles from occupational survey.
  'requiredStudentRankPer10000':None,
  'requiredStudentRankSource':None,
  'dataRetrievedAt':'2026-10-19'
 }
 entries.append(entry)
 if idx%20==0:
  print('OFFICIAL_DETAIL_VERIFIED',idx,'/',len(selected),flush=True)
 time.sleep(.07)

entries.sort(key=lambda c:(-c['annualMedianWan'],c['name']))
assert len(entries)==100==len(set(e['id'] for e in entries))
assert entries[0]['annualMedianWan']>=entries[-1]['annualMedianWan']
AUDIT.parent.mkdir(parents=True,exist_ok=True)
audit={
 'schema':2,'retrievalDate':'2026-10-19','authoritativeOccupationSource':{
  'title':'한국직업사전', 'url':'https://www.work.go.kr/consltJobCarpa/srch/jobDic/jobDicIntro.do',
  'mapping':'CareerNet job employment classification field is included; an exact 1:1 Korean Job Dictionary entry match was not independently verified for all 100.'
 },
 'wageAndEducationSource':{
  'title':'커리어넷 직업백과 공개 JSON / 한국고용정보원 임금조사',
  'endpoint':'https://www.career.go.kr/cloud/api/job/view?seq={id}',
  'wageStatistic':'annual median wage (not an average hourly wage)',
  'hourlyFormula':'round(annual median wage in KRW / (40*52), nearest whole won)',
  'hoursPerYearAssumed':HOURS_YEAR,
  'actualHoursAvailable':False,
  'wageSurveyYears':years,
  'incomeIsCausalEffectOfGrade':False,
  'requiredTopStudentRankPercentileAvailable':False,
  'educationMetric':'share of surveyed incumbents reporting bachelor or higher, NOT an entry requirement or grade cutoff',
  'proxyOccupationCases':proxy_count
 },
 'curationMethod':'100 hand-curated jobs from 478 wage-supported titles of 552 CareerNet entries. Covers 6 child-friendly job families and full wage range. Not statistically representative. One duplicate specialist with a proxy general-doctor wage was excluded.',
 'selectionByGroup':{group:sum(e['group']==group for e in entries) for group in sorted(GROUPS)},
 'count':100,
 'occupationEvidence':[{
  'id':e['id'],'name':e['name'],'jobSourceCode':e['sourceCode'],
  'annualMedianWan':e['annualMedianWan'],'wageSurveyYear':e['wageSurveyYear'],
  'proxy':e['wageIsRelatedOccupationProxy'],'hourlyEquivalentWon':e['hourlyEquivalentWon'],
  'respondentBachelorPlusPct':e['educationBachelorPlusPct'],'sourceUrl':e['sourceUrl']
 } for e in entries]
}
js='// Generated from official CareerNet wage and education metadata; do not hand-edit.\n'
js+='// Original short child-facing prose: scripts/career-curation-v27.tsv\n'
js+='export const CAREER_DATA=Object.freeze('+json.dumps(entries,ensure_ascii=False,separators=(',',':'))+');\n'
JSOUT.write_text(js)
AUDIT.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
print('CAREER_100_OFFICIAL_BUILD_OK',len(entries),'salaryYears',years,'proxyJobs',proxy_count,
 'minMax',entries[-1]['annualMedianWan'],entries[0]['annualMedianWan'],
 'jsonKB',round(JSOUT.stat().st_size/1024,1))
