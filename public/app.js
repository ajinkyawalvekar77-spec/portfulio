'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const su=u=>/^(https?:\/\/|\/)/.test(u||'')?esc(u):'';
const none=t=>`<p class="empty">${t}</p>`;
document.addEventListener('error',e=>{const t=e.target;if(t.tagName==='IMG'&&t.dataset.fb&&!t.dataset.d){t.dataset.d=1;t.src=t.dataset.fb}},true);
$('#yr').textContent=new Date().getFullYear();
$('#theme').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('theme',t)}catch(e){}};
const menu=$('#menu'),burger=$('#burger');
burger.onclick=()=>burger.setAttribute('aria-expanded',menu.classList.toggle('open'));
menu.onclick=e=>{if(e.target.tagName==='A'){menu.classList.remove('open');burger.setAttribute('aria-expanded',false)}};
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1});
const reveal=()=>document.querySelectorAll('.reveal:not(.in)').forEach(n=>io.observe(n));
const img=(src,fb)=>`<img src="${su(src)||fb}" data-fb="${fb}" alt="" loading="lazy">`;
const link=(u,t)=>su(u)?`<a href="${su(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`:'';
const R={
 projects:(a)=>{const cats=['All',...new Set(a.map(p=>p.category).filter(Boolean))];
  $('#filters').innerHTML=cats.map((c,i)=>`<button class="${i?'':'on'}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
  const draw=c=>{$('#projects-g').innerHTML=a.filter(p=>c==='All'||p.category===c).map(p=>`<article class="card reveal">${img(p.image,'/assets/placeholders/project-default.svg')}<div class="cb"><h3>${esc(p.title)}</h3><p class="muted">${esc(p.description)}</p>${(p.tags||'').split(',').map(t=>t.trim()).filter(Boolean).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}<p>${link(p.url,'Open project →')||'<span class="muted">Link coming soon</span>'}</p></div></article>`).join('')||none('No projects yet.');reveal()};
  $('#filters').onclick=e=>{if(e.target.dataset.c){document.querySelectorAll('#filters button').forEach(b=>b.classList.toggle('on',b===e.target));draw(e.target.dataset.c)}};draw('All')},
 research:a=>a.map(r=>`<article class="card reveal">${img(r.image,'/assets/placeholders/research-paper.svg')}<div class="cb"><h3>${esc(r.title)}</h3>${r.venue?`<p class="muted">${esc(r.venue)}</p>`:''}<p>DOI: ${link(r.url||'https://doi.org/'+r.doi,esc(r.doi))}</p>${r.summary?`<p class="muted">${esc(r.summary)}</p>`:''}</div></article>`).join(''),
 achievements:a=>a.map(x=>`<article class="card reveal">${img(x.image,'/assets/placeholders/achievement-default.svg')}<div class="cb"><h3>${esc(x.title)}</h3><p class="badge">${esc(x.award)}${x.year?' · '+esc(x.year):''}</p>${x.description?`<p class="muted">${esc(x.description)}</p>`:''}</div></article>`).join(''),
 certificates:a=>a.map(x=>`<article class="card reveal">${img(x.image,'/assets/placeholders/certificate-default.svg')}<div class="cb"><h3>${esc(x.title)}</h3><p class="muted">${esc(x.issuer)}${x.date?' · '+esc(x.date):''}</p><p>${link(x.url,'View credential →')}</p></div></article>`).join(''),
 education:a=>a.map(x=>`<div class="card reveal"><h3>${esc(x.institution)}</h3><p>${esc(x.degree)}</p>${x.period?`<p class="muted">${esc(x.period)}</p>`:''}${x.details?`<p class="muted">${esc(x.details)}</p>`:''}</div>`).join(''),
 internships:a=>a.map(x=>`<div class="card reveal"><h3>${esc(x.role)}</h3><p>${esc(x.company)}</p>${x.period?`<p class="muted">${esc(x.period)}</p>`:''}${x.details?`<p class="muted">${esc(x.details)}</p>`:''}<p>${link(x.url,'Details →')}</p></div>`).join(''),
 skills:a=>{const g={};a.forEach(s=>(g[s.category||'Other']??=[]).push(s.name));return Object.entries(g).map(([c,n])=>`<div class="sk reveal"><h3>${esc(c)}</h3>${n.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>`).join('')}
};
fetch('/api/content',{headers:{'X-Requested-With':'fetch'}}).then(r=>r.json()).then(d=>{
 const p=d.profile||{};document.title=`${p.name||'Portfolio'} | ${p.title||''}`;
 $('#h-name').textContent=p.name||'';$('#h-title').textContent=p.title||'';$('#h-college').textContent=p.college||'';$('#h-tag').textContent=p.tagline||'';$('#a-text').textContent=p.about||'';
 $('#h-photo').src=su(p.photo)||'/assets/placeholders/profile-photo.svg';
 $('#resume-a').href=su(p.resume)||'/assets/resume.pdf';
 const L=[['Email',p.email&&'mailto:'+p.email,p.email],['GitHub',p.github,'GitHub'],['LinkedIn',p.linkedin,'LinkedIn']].filter(x=>x[1]&&(x[1].startsWith('mailto:')||su(x[1])));
 if(L.length)$('#links').innerHTML=L.map(([,u,t])=>`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(t)}</a>`).join('');
 const empty={research:'No research published yet.',achievements:'Nothing published yet.',certificates:'Certificates will be added soon.',education:'Not added yet.',internships:'No internships to show yet.',skills:'Skills coming soon.'};
 for(const k of Object.keys(R)){const a=d[k]||[];if(k==='projects'){R.projects(a);continue}$('#'+k+'-g').innerHTML=a.length?R[k](a):none(empty[k])}
 reveal();
}).catch(()=>{$('#a-text').textContent='Could not load content. Please make sure the server is running.'});
document.querySelectorAll('section h2,.hero-in>div').forEach(n=>n.classList.add('reveal'));reveal();
$('#cform').onsubmit=async e=>{e.preventDefault();const f=e.target,s=$('#cstatus');s.textContent='Sending…';
 try{const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json','X-Requested-With':'fetch'},body:JSON.stringify(Object.fromEntries(new FormData(f)))});
 const j=await r.json();if(r.ok){s.textContent='Thanks! Your message has been sent.';f.reset()}else s.textContent=j.error||'Something went wrong.'}catch{s.textContent='Network error. Please try again.'}};
