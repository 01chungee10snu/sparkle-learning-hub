#!/usr/bin/env node
/** Audit child-visible author text; preserve source-protected stems, answer keys and canonical Hanja readings. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const catalog=JSON.parse(fs.readFileSync('games/catalog.json','utf8'));
const gameFiles=catalog.map(g=>typeof g.source==='string'?g.source.replace(/^\.\//,''):null).filter(p=>p?.endsWith('.json'));
for(const file of ['games/irt-bank.json','games/bebsu-challenges.json','games/magic-practice-challenges.json'])if(fs.existsSync(file))gameFiles.push(file);
const files=[...new Set(['games/catalog.json',...gameFiles])];
const original=/^(originalStem|originalExplanation|source|provenance|verification|quality|answer|rawAnswer|sourceInfo|metadata|originalQuestion|exam|calibration|accuracyNote|questionIds|choices|readText|hanjaCharacter|hanjaFamily|hanjaTask)$/;
const fields=/^(title|description|story|prompt|explanation|prerequisite|offline|learning|intro|after|guide|label|levelLabel|hint|feedback|instruction)$/;
const rules=[
 ['shaming',/(바보|멍청|한심|무능|실패자|낙오자|꼴찌|형편없)/g],
 ['coercion',/(틀리면\s*(벌|못)|무조건\s*(맞|성공)|반드시\s*성공|기회는\s*단\s*한\s*번)/g],
 ['threat',/(죽여|죽이|살해|처형|피투성이|목숨을\s*잃)/g],
 ['abstract',/(메타인지|인지적\s*유연성|수리적\s*사고력)/g],
 ['grammar',/‘[^‘’]*[가-힣]’예요/g]
];
const findings=[];const counts={};let inspected=0,questions=0,skipped=0;
function traverse(value,file,field,protectedSource=false){
 if(Array.isArray(value)){for(let i=0;i<value.length;i++)traverse(value[i],file,`${field}[${i}]`,protectedSource);return;}
 if(value&&typeof value==='object'){
  for(const [k,v] of Object.entries(value))traverse(v,file,field?`${field}.${k}`:k,protectedSource||original.test(k));return;
 }
 if(typeof value!=='string')return;
 const key=(field.match(/\.?(\w+)(?:\[\d+\])?$/)||[])[1]||'';
 if(protectedSource||!fields.test(key)){skipped++;return;}
 inspected++;
 for(const [rule,regex] of rules){regex.lastIndex=0;if(regex.test(value) && !(rule==='grammar' && ![...value.matchAll(/‘([^‘’]+)’예요/g)].some(m=>{const c=m[1].codePointAt(m[1].length-1);return c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28!==0;}))){findings.push({rule,file,field,sample:value.slice(0,100)});counts[rule]=(counts[rule]||0)+1;}}
}
for(const file of files){if(!fs.existsSync(file))throw new Error(`Catalog source missing: ${file}`);const data=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(data.questions))questions+=data.questions.length;traverse(data,file,'');}
for(const file of ['village/story-quests.js','platform/learning-moments.js']){
 const source=fs.readFileSync(file,'utf8'); const literals=[...source.matchAll(/(?:intro|learning|after|guide|title|label)\s*:\s*(['"])(.*?)\1/g)];
 literals.forEach((m,i)=>{inspected++;for(const [rule,re] of rules){re.lastIndex=0;if(re.test(m[2])){findings.push({rule,file,field:`literal[${i}]`,sample:m[2]});counts[rule]=(counts[rule]||0)+1;}}});
}
const report={catalogGames:catalog.length,files:files.length+2,questions,visibleStringsScanned:inspected,otherStringsExcluded:skipped,counts,findings};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));else{
 console.log(`Games ${report.catalogGames}; files ${report.files}; questions ${questions}; authored visible strings ${inspected}; source/metadata strings excluded ${skipped}`);
 console.log('Counts:',JSON.stringify(counts));for(const f of findings.slice(0,50))console.log(`${f.rule}: ${f.file} :: ${f.field}: ${f.sample}`);
}
if(findings.some(f=>['shaming','coercion','threat'].includes(f.rule)))process.exitCode=1;
