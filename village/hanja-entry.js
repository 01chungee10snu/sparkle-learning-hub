// Direct Hanja entry uses the same host, learner, scoring and saved records.
const button=document.querySelector('#hanja-entry');
const ui=document.querySelector('#village-ui');
let opening=false;
function enterHanja(){
 if(opening||!button||!ui)return;
 opening=true;button.disabled=true;
 const observer=new MutationObserver(check);
 function stop(){observer.disconnect();opening=false;button.disabled=false;}
 function check(){
  if(!ui.hidden&&ui.dataset.ready==='true'){
   stop();ui.querySelector('[data-district="hanja"]')?.click();return;
  }
  const loading=document.querySelector('#loading');
  if(loading?.getAttribute('aria-busy')==='false'&&ui.hidden&&!document.querySelector('#lite')?.disabled)stop();
 }
 observer.observe(ui,{attributes:true,attributeFilter:['hidden','data-ready']});
 observer.observe(document.querySelector('#loading'),{attributes:true,attributeFilter:['aria-busy']});
 document.querySelector('#lite')?.click();check();
}
button?.addEventListener('click',enterHanja);
if(new URLSearchParams(location.search).get('hanja')==='1')enterHanja();
