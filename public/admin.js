'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const H={'Content-Type':'application/json','X-Requested-With':'fetch'};
const api=async(m,u,b)=>{const r=await fetch('/api/'+u,{method:m,headers:H,body:b?JSON.stringify(b):undefined});const j=await r.json().catch(()=>({}));if(r.status===401&&u!=='login'){show(false)}if(!r.ok)throw new Error(j.error||'Request failed');return j};
$('#theme').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('theme',t)}catch(e){}};
// field: [key,label,type]  types: text, area, url, image(upload), file(upload any)
const S={
 projects:[['title','Title'],['category','Category (used for filters)'],['description','Description','area'],['tags','Tags (comma separated)'],['url','Project URL','url'],['image','Image','image']],
 skills:[['name','Skill'],['category','Category']],
 achievements:[['title','Title'],['award','Award / Position'],['year','Year'],['description','Description','area'],['image','Image','image']],
 certificates:[['title','Title'],['issuer','Issuer'],['date','Date'],['url','Credential URL','url'],['image','Image','image']],
 research:[['title','Title','area'],['doi','DOI'],['url','Paper URL','url'],['venue','Journal / Venue'],['summary','Summary','area'],['image','Image','image']],
 education:[['institution','Institution'],['degree','Degree'],['period','Period'],['details','Details','area']],
 internships:[['role','Role'],['company','Company'],['period','Period'],['details','Details','area'],['url','URL','url']]};
const P=[['name','Name'],['title','Title'],['college','College'],['tagline','Tagline'],['about','About','area'],['email','Email'],['github','GitHub URL','url'],['linkedin','LinkedIn URL','url'],['photo','Profile photo','image'],['resume','Resume (PDF)','file']];
let C={},tab='projects',msgEl;
const note=(t,bad)=>{msgEl.textContent=t;msgEl.style.color=bad?'#dc2626':'var(--ac2)'};
const label=i=>i.title||i.name||i.institution||i.role||'(untitled)';
function show(on){$('#login').hidden=on;$('#app').hidden=!on;if(on)load()}
async function load(){C=await api('GET','admin/content');draw()}
function draw(){
 const names=[...Object.keys(S),'profile','messages','password'];
 $('#tabs').innerHTML=names.map(n=>`<button class="${n===tab?'on':''}" data-t="${n}">${n[0].toUpperCase()+n.slice(1)}</button>`).join('');
 $('#pane').innerHTML='<p id="msg" role="status"></p><div id="body"></div>';msgEl=$('#msg');
 if(S[tab])list();else if(tab==='profile')form('profile',P,C.profile||{});else if(tab==='messages')msgs();else pw();
}
$('#tabs').onclick=e=>{if(e.target.dataset.t){tab=e.target.dataset.t;draw()}};
function list(){
 const a=C[tab]||[];
 $('#body').innerHTML=`<div class="card"><button class="btn" id="add">+ Add new</button>${a.map(i=>`<div class="row"><div><b>${esc(label(i))}</b><span class="pill ${i.published!==false?'live':''}">${i.published!==false?'Published':'Draft'}</span></div><div class="acts"><button data-a="pub" data-id="${i.id}">${i.published!==false?'Unpublish':'Publish'}</button><button data-a="edit" data-id="${i.id}">Edit</button><button class="danger" data-a="del" data-id="${i.id}">Delete</button></div></div>`).join('')||'<p class="muted">Nothing here yet.</p>'}</div>`;
 $('#add').onclick=()=>form(tab,S[tab],{published:false},true);
 $('#body').onclick=async e=>{const id=e.target.dataset.id,x=a.find(i=>i.id===id);if(!x)return;
  try{if(e.target.dataset.a==='edit')form(tab,S[tab],x);
  if(e.target.dataset.a==='pub'){await api('PUT',`admin/${tab}/${id}`,{published:x.published===false});await load();note('Updated.')}
  if(e.target.dataset.a==='del'&&confirm(`Delete "${label(x)}"? This cannot be undone.`)){await api('DELETE',`admin/${tab}/${id}`);await load();note('Deleted.')}}catch(er){note(er.message,1)}}
}
function form(col,fields,v,isNew){
 const f=fields.map(([k,l,t])=>{const val=esc(v[k]),inp=t==='area'?`<textarea name="${k}" rows="4">${val}</textarea>`:`<input name="${k}" value="${val}">`;
  const up=(t==='image'||t==='file')?`<div class="ur">${inp}<input type="file" data-for="${k}" accept="${t==='file'?'.pdf,.png,.jpg':'.png,.jpg,.jpeg,.webp,.gif'}"></div>`:inp;
  return `<label>${l}${up}</label>`}).join('');
 $('#body').innerHTML=`<form id="ef" class="card">${f}${col!=='profile'?`<label class="chk"><input type="checkbox" name="published" ${v.published!==false?'checked':''}> Published (visible on the public site)</label>`:''}<div class="acts"><button class="btn">Save</button><button type="button" class="sm" id="cancel">Cancel</button></div></form>`;
 $('#cancel').onclick=draw;
 $('#ef').onchange=async e=>{if(e.target.type!=='file'||!e.target.files[0])return;const fl=e.target.files[0];
  if(fl.size>5e6)return note('File must be under 5 MB',1);note('Uploading…');
  const data=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result.split(',')[1]);fr.readAsDataURL(fl)});
  try{const j=await api('POST','admin/upload',{name:fl.name,data});$('#ef').elements[e.target.dataset.for].value=j.url;note('Uploaded. Click Save to apply.')}catch(er){note(er.message,1)}};
 $('#ef').onsubmit=async e=>{e.preventDefault();const o={};new FormData(e.target).forEach((x,k)=>{if(typeof x==='string')o[k]=x});
  if(col!=='profile')o.published=e.target.elements.published.checked;
  try{if(col==='profile')await api('PUT','admin/profile',o);else if(isNew)await api('POST','admin/'+col,o);else await api('PUT',`admin/${col}/${v.id}`,o);
  await load();note('Saved.')}catch(er){note(er.message,1)}};
}
async function msgs(){const a=await api('GET','admin/messages');
 $('#body').innerHTML=`<div class="card">${a.map(m=>`<div class="row"><div><b>${esc(m.name)} &lt;${esc(m.email)}&gt;</b><small>${esc(new Date(m.date).toLocaleString())}</small><p>${esc(m.message)}</p></div><button class="sm danger" data-id="${m.id}">Delete</button></div>`).join('')||'<p class="muted">No messages yet.</p>'}</div>`;
 $('#body').onclick=async e=>{if(e.target.dataset.id){await api('DELETE','admin/messages/'+e.target.dataset.id);msgs()}}}
function pw(){$('#body').innerHTML=`<form id="pf" class="card"><h3>Change password</h3><label>Current password<input type="password" name="current" autocomplete="current-password" required></label><label>New password (min 10 characters)<input type="password" name="next" autocomplete="new-password" minlength="10" required></label><button class="btn">Change password</button></form>`;
 $('#pf').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));try{await api('POST','admin/password',f);note('Password changed.');e.target.reset()}catch(er){note(er.message,1)}}}
$('#lf').onsubmit=async e=>{e.preventDefault();try{await api('POST','login',Object.fromEntries(new FormData(e.target)));e.target.reset();show(true)}catch(er){$('#lmsg').textContent=er.message}};
$('#out').onclick=async()=>{await api('POST','logout');show(false)};
api('GET','admin/me').then(()=>show(true)).catch(()=>show(false));
