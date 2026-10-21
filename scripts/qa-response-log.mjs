import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
let playwright;
if(process.env.PLAYWRIGHT_MODULE)playwright=await import(process.env.PLAYWRIGHT_MODULE);
else {try{playwright=require('playwright');}catch{playwright=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}}
const {chromium}=playwright.chromium?playwright:playwright.default;
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=http.createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/__response_qa'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Synthetic response test</title>');return;}
 const p=path.resolve(root,'.'+pathname);if(!p.startsWith(root+'/'))throw Error('outside root');
 res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.json')?'application/json':'text/plain');
 res.end(await fs.readFile(p));
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const executablePath=process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
try{
 const context=await browser.newContext();const page=await context.newPage();
 await page.goto(`http://127.0.0.1:${server.address().port}/__response_qa`);
 const before=await page.evaluate(async()=>{
  const P=await import('/platform/progress.js'),L=await import('/platform/response-log.js');
  const catalog=await fetch('/games/catalog.json').then(r=>r.json()),bank=await fetch('/games/irt-bank.json').then(r=>r.json());
  P.configureCatalog(catalog);P.configureIrtBank(bank);P.selectLearner('se');
  const g=await fetch('/games/growth-math-1/game.json').then(r=>r.json()),q=g.questions[0];
  const right=q.interaction?.type==='numeric'?String(q.interaction.target):q.interaction?.type==='build'?q.interaction.target:q.answer;
  for(let i=0;i<12;i++)P.answerGuidedQuestion(g,q.id,right,{sessionId:'idb-fixture-'+i,shownAt:Date.now()-200});
  await L.drainJournal();await L.drainJournal();
  const rows=await L.exportEvents();return {events:rows.length,journal:Object.keys(localStorage).filter(k=>k.startsWith(L.JOURNAL_PREFIX)).length,archive:L.status().archive};
 });
 assert.deepEqual(before,{events:12,journal:0,archive:'indexeddb'});
 await page.reload();
 const after=await page.evaluate(async()=>{const L=await import('/platform/response-log.js'),pending=await L.pendingEvents();
  await L.acknowledge(pending.slice(0,3).map(e=>e.eventId));
  return {before:pending.length,pending:(await L.pendingEvents()).length,total:(await L.exportEvents()).length};});
 assert.deepEqual(after,{before:12,pending:9,total:12});
 console.log(JSON.stringify({result:'PASS',cases:['real IndexedDB archive','write-ahead journal drained','reload durability','selective acknowledgement','history retained'],before,after}));
 await context.close();
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
