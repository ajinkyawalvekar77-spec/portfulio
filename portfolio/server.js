'use strict';
// Dependency-free portfolio server: static files + JSON API + secure admin auth.
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=__dirname,PUB=path.join(ROOT,'public');
const DATA=process.env.DATA_DIR||path.join(ROOT,'data'),UP=path.join(DATA,'uploads');
const PORT=+process.env.PORT||3000,PROD=process.env.NODE_ENV==='production';
const COLS=['skills','projects','achievements','certificates','research','education','internships'];
fs.mkdirSync(UP,{recursive:true});
const F=n=>path.join(DATA,n);
const rd=(n,d)=>{try{return JSON.parse(fs.readFileSync(F(n),'utf8'))}catch{return d}};
const wr=(n,v)=>{const t=F(n)+'.tmp';fs.writeFileSync(t,JSON.stringify(v,null,2));fs.renameSync(t,F(n))};
const uid=()=>crypto.randomBytes(6).toString('hex');
// ---- password hashing (scrypt, per-user random salt) ----
const hash=(pw,salt)=>crypto.scryptSync(pw,salt,64).toString('hex');
const mkAdmin=pw=>{const salt=crypto.randomBytes(16).toString('hex');return{user:'Ajinkya',salt,hash:hash(pw,salt)}};
const same=(a,b)=>{a=Buffer.from(a);b=Buffer.from(b);return a.length===b.length&&crypto.timingSafeEqual(a,b)};
// ---- first-run setup ----
if(!fs.existsSync(F('content.json')))fs.copyFileSync(path.join(ROOT,'seed/content.json'),F('content.json'));
if(!fs.existsSync(F('admin.json'))){
  if(process.env.ADMIN_INITIAL_PASSWORD)wr('admin.json',mkAdmin(process.env.ADMIN_INITIAL_PASSWORD));
  else fs.copyFileSync(path.join(ROOT,'seed/admin.json'),F('admin.json'));
}
if(!fs.existsSync(F('messages.json')))wr('messages.json',[]);
// ---- sessions & rate limits (in memory) ----
const sessions=new Map(),hits=new Map();
const limited=(k,max,win)=>{const n=Date.now(),a=(hits.get(k)||[]).filter(t=>n-t<win);a.push(n);hits.set(k,a);return a.length>max};
setInterval(()=>{const n=Date.now();for(const[k,v]of sessions)if(v<n)sessions.delete(k);hits.clear()},600000).unref();
const cookie=r=>Object.fromEntries((r.headers.cookie||'').split(';').map(c=>c.trim().split('=')).filter(c=>c[0]));
const authed=r=>{const t=cookie(r).sid,e=sessions.get(t);return e&&e>Date.now()?t:null};
// ---- helpers ----
const SEC={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin',
'Content-Security-Policy':"default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; form-action 'self'"};
const json=(res,code,obj,h={})=>{res.writeHead(code,{'Content-Type':'application/json',...SEC,...h});res.end(JSON.stringify(obj))};
const body=(req,max=8e6)=>new Promise((ok,no)=>{let b=[],n=0;req.on('data',c=>{n+=c.length;if(n>max){no(new Error('too large'));req.destroy()}else b.push(c)});
 req.on('end',()=>{try{ok(JSON.parse(Buffer.concat(b).toString()||'{}'))}catch{no(new Error('bad json'))}});req.on('error',no)});
const clean=o=>{const r={};for(let[k,v]of Object.entries(o||{})){if(!/^[a-zA-Z]{1,24}$/.test(k)||k==='id')continue;
 if(typeof v==='boolean')r[k]=v;else if(typeof v==='string'){v=v.slice(0,5000);
 if(/(url|link|image|photo|resume|github|linkedin)$/i.test(k)&&v&&!/^(https?:\/\/|\/)/.test(v))continue;r[k]=v}}return r};
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.pdf':'application/pdf','.json':'application/json','.ico':'image/x-icon'};
const UPEXT=['.png','.jpg','.jpeg','.webp','.gif','.pdf'];
function serve(res,root,rel){
  const p=path.join(root,path.normalize(decodeURIComponent(rel)).replace(/^(\.\.[\/\\])+/,''));
  if(!p.startsWith(root))return json(res,403,{error:'forbidden'});
  fs.stat(p,(e,s)=>{if(e||!s.isFile())return json(res,404,{error:'not found'});
   res.writeHead(200,{'Content-Type':MIME[path.extname(p).toLowerCase()]||'application/octet-stream','Cache-Control':p.endsWith('.html')?'no-cache':'public, max-age=300',...SEC});fs.createReadStream(p).pipe(res)});
}
const pub=c=>{const o={profile:c.profile};for(const k of COLS)o[k]=(c[k]||[]).filter(i=>i.published!==false);return o};
// ---- router ----
http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://x'),p=u.pathname,m=req.method,ip=req.socket.remoteAddress;
  if(p.startsWith('/api/')){
   if(m!=='GET'&&req.headers['x-requested-with']!=='fetch')return json(res,403,{error:'bad request'});
   if(p==='/api/content'&&m==='GET')return json(res,200,pub(rd('content.json',{})));
   if(p==='/api/contact'&&m==='POST'){
     if(limited('c'+ip,5,3600000))return json(res,429,{error:'Too many messages. Try later.'});
     const b=await body(req,2e4);if(b.website)return json(res,200,{ok:true}); // honeypot
     const name=String(b.name||'').trim().slice(0,100),email=String(b.email||'').trim().slice(0,150),msg=String(b.message||'').trim().slice(0,3000);
     if(!name||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||msg.length<5)return json(res,400,{error:'Please fill all fields correctly.'});
     const a=rd('messages.json',[]);a.unshift({id:uid(),name,email,message:msg,date:new Date().toISOString()});wr('messages.json',a.slice(0,500));
     return json(res,200,{ok:true});}
   if(p==='/api/login'&&m==='POST'){
     if(limited('l'+ip,8,900000))return json(res,429,{error:'Too many attempts. Wait 15 minutes.'});
     const b=await body(req,2000),a=rd('admin.json',{});
     const ok=String(b.username)===a.user&&same(hash(String(b.password||''),a.salt),a.hash);
     if(!ok)return json(res,401,{error:'Invalid username or password'});
     const t=crypto.randomBytes(32).toString('hex');sessions.set(t,Date.now()+6*3600000);
     return json(res,200,{ok:true},{'Set-Cookie':`sid=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=21600${PROD?'; Secure':''}`});}
   if(p==='/api/logout'){sessions.delete(cookie(req).sid);return json(res,200,{ok:true},{'Set-Cookie':'sid=; HttpOnly; Path=/; Max-Age=0'})}
   if(p.startsWith('/api/admin/')){
     if(!authed(req))return json(res,401,{error:'Not logged in'});
     const parts=p.split('/').slice(3),[a0,id]=parts;
     if(a0==='me')return json(res,200,{user:rd('admin.json',{}).user});
     if(a0==='content'&&m==='GET')return json(res,200,rd('content.json',{}));
     if(a0==='messages'){const a=rd('messages.json',[]);
       if(m==='GET')return json(res,200,a);
       if(m==='DELETE'){wr('messages.json',a.filter(x=>x.id!==id));return json(res,200,{ok:true})}}
     if(a0==='profile'&&m==='PUT'){const c=rd('content.json',{});c.profile={...c.profile,...clean(await body(req,5e4))};wr('content.json',c);return json(res,200,c.profile)}
     if(a0==='password'&&m==='POST'){const b=await body(req,2000),a=rd('admin.json',{});
       if(!same(hash(String(b.current||''),a.salt),a.hash))return json(res,401,{error:'Current password is wrong'});
       if(String(b.next||'').length<10)return json(res,400,{error:'New password must be at least 10 characters'});
       wr('admin.json',mkAdmin(b.next));return json(res,200,{ok:true})}
     if(a0==='upload'&&m==='POST'){const b=await body(req);const ext=path.extname(String(b.name||'')).toLowerCase();
       if(!UPEXT.includes(ext))return json(res,400,{error:'Only png, jpg, webp, gif, pdf allowed'});
       const buf=Buffer.from(String(b.data||''),'base64');if(!buf.length||buf.length>5e6)return json(res,400,{error:'File must be under 5 MB'});
       const fn=uid()+ext;fs.writeFileSync(path.join(UP,fn),buf);return json(res,200,{url:'/uploads/'+fn})}
     if(COLS.includes(a0)){const c=rd('content.json',{});c[a0]=c[a0]||[];
       if(m==='POST'){const it={id:uid(),published:false,...clean(await body(req,5e4))};c[a0].push(it);wr('content.json',c);return json(res,200,it)}
       const i=c[a0].findIndex(x=>x.id===id);if(i<0)return json(res,404,{error:'not found'});
       if(m==='PUT'){c[a0][i]={...c[a0][i],...clean(await body(req,5e4))};wr('content.json',c);return json(res,200,c[a0][i])}
       if(m==='DELETE'){c[a0].splice(i,1);wr('content.json',c);return json(res,200,{ok:true})}}
     return json(res,404,{error:'not found'});}
   return json(res,404,{error:'not found'});
  }
  if(m!=='GET'&&m!=='HEAD')return json(res,405,{error:'method not allowed'});
  if(p.startsWith('/uploads/'))return serve(res,UP,p.slice(9));
  if(p==='/admin'||p==='/admin/')return serve(res,PUB,'admin.html');
  return serve(res,PUB,p==='/'?'index.html':p);
 }catch(e){json(res,e.message==='too large'?413:400,{error:e.message})}
}).listen(PORT,()=>console.log('Portfolio running on http://localhost:'+PORT));
