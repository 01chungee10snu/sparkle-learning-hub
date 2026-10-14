export const DAY_MS=24*60*60*1000;
export const SUCCESS_INTERVAL_DAYS=Object.freeze([2,4,7,14,30]);

export function independentAttempts(record){
 return (record?.attempts||[])
  .filter(a=>a?.assisted!==true&&typeof a.correct==='boolean'&&Number.isFinite(a.at))
  .slice().sort((a,b)=>a.at-b.at||String(a.id).localeCompare(String(b.id)));
}

export function reviewStatus(record,now=Date.now()){
 const attempts=independentAttempts(record),last=attempts.at(-1);
 if(!last)return {due:Boolean(record?.seen),last:null,streak:0,intervalDays:0,priority:record?.seen?1:0};
 if(last.correct!==true)return {due:true,last,streak:0,intervalDays:0,priority:2};
 let streak=0;
 for(let i=attempts.length-1;i>=0&&attempts[i].correct===true;i--)streak++;
 const intervalDays=SUCCESS_INTERVAL_DAYS[Math.min(SUCCESS_INTERVAL_DAYS.length-1,Math.max(0,streak-1))];
 return {due:last.at<=now-intervalDays*DAY_MS,last,streak,intervalDays,priority:1};
}

export function isReviewDue(record,now=Date.now()){return reviewStatus(record,now).due;}
