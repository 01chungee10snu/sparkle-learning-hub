#!/usr/bin/env node
import {cp, stat, lstat, mkdir, rename, writeFile, readFile, readdir, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const destination=process.env.MAGIC_PREVIEW_DIR||
  '/Users/01chungee10/AI-Interop/runtime/magic-village-private-family-v24-20261018';
const stage=destination+'.staging-'+process.pid;
const entries=['index.html','learning.html','app.js','style.css','experience.css',
  'hanja.css','resource-economy.css','assets','games','platform','vendor','village'];
if(!destination.startsWith('/Users/01chungee10/AI-Interop/runtime/magic-village-'))
  throw new Error('Preview must stay under the approved local family-preview runtime.');
if(root===destination||destination.includes('/../'))
  throw new Error('Unsafe preview path');
await mkdir(path.dirname(destination),{recursive:true});
let fileCount=0,bytes=0,skippedSymlinks=0;
const excludes=new Set(['.DS_Store','.git','.env','.env.local','.env.production',
  '.private','node_modules','docs','scripts','supabase','db','README_FAMILY.md']);
async function allow(src){
  const info=await lstat(src);
  if(info.isSymbolicLink()){skippedSymlinks++;return false;}
  const base=path.basename(src);
  if(excludes.has(base)||base.startsWith('.git'))return false;
  if(info.isFile()){fileCount++;bytes+=info.size;}
  return true;
}
await mkdir(stage,{recursive:true});
let completed=false;
try{
  for(const name of entries){
    const source=path.join(root,name),target=path.join(stage,name);
    await cp(source,target,{recursive:true,filter:allow,preserveTimestamps:true});
  }
  const important=[
    'index.html','learning.html','app.js','games/catalog.json','games/irt-bank.json',
    'platform/resource-economy.js','platform/cloud-sync.js',
    'village/index.html','village/village-ui.js','village/village-bridge.js',
    'village/Build/WebGL.loader.js','village/Build/WebGL.data.unityweb',
    'village/Build/WebGL.framework.js.unityweb','village/Build/WebGL.wasm.unityweb'
  ];
  const hashes={};
  for(const file of important){
    const data=await readFile(path.join(stage,file));
    hashes[file]={sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length};
  }
  const receipt={version:'private-family-v24-20261018',builtAt:new Date().toISOString(),
    sourceProject:'sparkle-learning-gameplay-v10',usage:'Trusted family Wi-Fi only, not a public redistributable release',
    filesCopied:fileCount,bytesCopied:bytes,skippedSymlinks,
    allowedTopLevel:entries,criticalFiles:hashes,
    cloud:'Real Supabase service is used only after family device pairing',
    rights:'Hanja grade dataset distributor attributes source rights to 한국어문회; public release not approved.'};
  await writeFile(path.join(stage,'FAMILY_PREVIEW_MANIFEST.json'),JSON.stringify(receipt,null,2)+'\n');
  await writeFile(path.join(stage,'PRIVATE_FAMILY_NOTICE.md'),
    '# 태희·세희의 마법마을 · 가족 전용 시범판\n\n'+
    '개인 학습 테스트용 복사본입니다. 허가되지 않은 공개 GitHub Pages 배포에 사용하지 않습니다.\n'+
    '학습·보상 기록은 각 기기 브라우저에 저장되며, 가족 코드를 연결한 경우에만 클라우드와 동기화됩니다.\n'+
    '정식 실기 확인 전에는 한자 등급 성취를 공인 능력 판정으로 해석하지 마세요.\n');
  let previous='';
  try{
    await stat(destination);
    previous=destination+'.previous-'+new Date().toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
    await rename(destination,previous);
  }catch(error){if(error.code!=='ENOENT')throw error;}
  try{await rename(stage,destination);}catch(error){
    if(previous)await rename(previous,destination);
    throw error;
  }
  completed=true;
  console.log('FAMILY_PREVIEW_READY',JSON.stringify({destination,previous,
    filesCopied:fileCount,bytesCopied:bytes,skippedSymlinks,verified:important.length}));
}catch(error){console.error('FAMILY_PREVIEW_FAILED',error.message);throw error;
}finally{if(!completed)await rm(stage,{recursive:true,force:true});}
