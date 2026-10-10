const COURSES=['length','weight','distance','mix'];
const validId=id=>/^(length|weight|distance|mix)-(0[1-9]|1[0-2])$/.test(id);
const natural=n=>Number.isFinite(Number(n))?Math.max(0,Math.min(100000,Math.floor(Number(n)))):0;
function round(s){
 if(!s||!COURSES.includes(s.course)||![1,2].includes(s.level)||!Array.isArray(s.ids)||s.ids.length!==5||new Set(s.ids).size!==5||!s.ids.every(id=>{if(!validId(id)||!id.startsWith(s.course+'-'))return false;const n=Number(id.split('-')[1]);return ([1,2,3,7,8,9].includes(n)?1:2)===s.level;})||!Number.isInteger(s.index)||s.index<0||s.index>5||!Array.isArray(s.answers)||s.answers.length<s.index||s.answers.length>Math.min(5,s.index+1)||!s.answers.every((a,i)=>a&&a.id===s.ids[i]&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<3&&Number.isInteger(a.earned)&&a.earned>=0&&a.earned<=10))return null;
 return {course:s.course,level:s.level,ids:[...s.ids],index:s.index,answers:s.answers.map(a=>({id:a.id,choice:a.choice,earned:a.earned,correct:Boolean(a.correct)})),finished:s.index===5};
}
export function cleanLegacy(raw){
 if(raw?.version!==1||!raw.profiles?.tae||!raw.profiles?.se)return null;
 const next={version:1,selected:raw.selected==='se'?'se':'tae',profiles:{}};
 for(const who of ['tae','se']){const source=raw.profiles[who],p={level:source.level===2?2:1,records:{},sessions:natural(source.sessions),active:round(source.active),paused:{}};for(const [id,r]of Object.entries(source.records||{}))if(validId(id)&&r&&[2,10].includes(r.best))p.records[id]={best:r.best,seen:Math.max(1,natural(r.seen))};for(const [key,s]of Object.entries(source.paused||{})){const valid=round(s);if(valid&&!valid.finished&&key===valid.course+'-'+valid.level)p.paused[key]=valid;}next.profiles[who]=p;}
 return next;
}
export function mergeLegacy(current,incoming){
 const src=cleanLegacy(incoming);if(!src)return cleanLegacy(current);
 const dest=cleanLegacy(current);if(!dest)return src;
 for(const who of ['tae','se']){const p=dest.profiles[who],s=src.profiles[who];for(const [id,r]of Object.entries(s.records)){const old=p.records[id];p.records[id]={best:Math.max(old?.best||0,r.best),seen:Math.max(old?.seen||0,r.seen)};}p.sessions=Math.max(p.sessions,s.sessions);if((!p.active||p.active.finished)&&s.active&&!s.active.finished)p.active=s.active;for(const [key,session]of Object.entries(s.paused))p.paused[key]||=session;}
 return dest;
}
