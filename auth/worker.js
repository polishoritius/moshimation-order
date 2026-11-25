const enc=new TextEncoder();
const ITER=160000,MAX=4096;
const headers=(origin)=>({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(origin?{'Access-Control-Allow-Origin':origin}:{}),'Vary':'Origin'});
const respond=(x,status=200,origin='')=>new Response(JSON.stringify(x),{status,headers:headers(origin)});
const validNumber=n=>typeof n==='string'&&/^\d{3,6}$/.test(n);
const validSecret=s=>typeof s==='string'&&s.length>=20&&s.length<=128&&/^[A-Za-z0-9_-]+$/.test(s);
const failure=()=>({ok:false,error:'AUTH_FAILED',message:'認証に失敗しました。番号と認証キーを確認するか、時間をおいて再試行してください。'});
const toB64=u=>btoa(String.fromCharCode(...u)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const fromB64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function derive(secret,salt){const key=await crypto.subtle.importKey('raw',enc.encode(secret),'PBKDF2',false,['deriveBits']);return toB64(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:ITER,hash:'SHA-256'},key,256)));}
function same(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function body(request){const text=await request.text();if(enc.encode(text).length>MAX)throw Error('large');const obj=JSON.parse(text);if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('bad');return obj;}
export default {async fetch(request,env){
const url=new URL(request.url),reqOrigin=request.headers.get('Origin')||'',origin=reqOrigin===env.PUBLIC_ORIGIN?reqOrigin:'';
if(!env.DB||!env.PUBLIC_ORIGIN)return respond({ok:false,error:'NOT_CONFIGURED'},503,origin);
if(request.method==='OPTIONS'){if(!origin)return respond({ok:false,error:'FORBIDDEN'},403);return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600','Vary':'Origin'}});}
if(reqOrigin&&!origin)return respond({ok:false,error:'FORBIDDEN'},403);
if(url.pathname==='/api/health'&&request.method==='GET')return respond({ok:true,service:'moshimation-credential-auth'},200,origin);
if(url.pathname==='/api/authenticate'&&request.method==='POST'){
let data;try{data=await body(request);}catch{return respond(failure(),400,origin);}
const {number,password}=data;if(!validNumber(number)||typeof password!=='string'||password.length>128)return respond(failure(),400,origin);
const entry=await env.DB.prepare('SELECT * FROM credentials WHERE number=?').bind(number).first();
const check=await derive(password,entry?fromB64(entry.salt):new Uint8Array(16));
const now=Math.floor(Date.now()/1000);
if(!entry||entry.status!=='active')return respond(failure(),401,origin);
if(entry.lock_until>now)return respond(failure(),429,origin);
if(!same(check,entry.hash)){
const attempts=Number(entry.failures||0)+1,lock=attempts>=8?now+900:0;
await env.DB.prepare('UPDATE credentials SET failures=?,lock_until=? WHERE number=?').bind(lock?0:attempts,lock,number).run();
return respond(failure(),401,origin);
}
await env.DB.prepare('UPDATE credentials SET failures=0,lock_until=0 WHERE number=?').bind(number).run();
return respond({ok:true,number:entry.number,callsign:entry.callsign,rank:entry.rank,status:'active',version:entry.version},200,origin);
}
if(url.pathname.startsWith('/api/admin/')&&request.method==='POST'){
if(!env.ADMIN_TOKEN||!same(request.headers.get('Authorization')||'', 'Bearer '+env.ADMIN_TOKEN))return respond({ok:false,error:'UNAUTHORIZED'},401,origin);
let data;try{data=await body(request);}catch{return respond({ok:false,error:'INVALID_INPUT'},400,origin);}
if(url.pathname==='/api/admin/issue'){
const {number,callsign,rank,password,version}=data;
if(!validNumber(number)||number==='000'||typeof callsign!=='string'||!callsign.trim()||callsign.length>60||typeof rank!=='string'||!rank.trim()||rank.length>100||!validSecret(password)||!Number.isSafeInteger(version)||version<1)return respond({ok:false,error:'INVALID_FIELDS'},400,origin);
if(await env.DB.prepare('SELECT number FROM credentials WHERE number=?').bind(number).first())return respond({ok:false,error:'ALREADY_ISSUED'},409,origin);
const salt=crypto.getRandomValues(new Uint8Array(16)),hash=await derive(password,salt);
try{await env.DB.prepare("INSERT INTO credentials (number,callsign,rank,status,version,salt,hash,failures,lock_until,created_at) VALUES (?,?,?,'active',?,?,?,0,0,?)").bind(number,callsign.trim(),rank.trim(),version,toB64(salt),hash,new Date().toISOString()).run();}
catch{return respond({ok:false,error:'ISSUE_FAILED'},409,origin);}
return respond({ok:true,number,status:'active',message:'Issued; no credential secret returned'},201,origin);
}
if(url.pathname==='/api/admin/revoke'){
if(!validNumber(data.number))return respond({ok:false,error:'INVALID_FIELDS'},400,origin);
const x=await env.DB.prepare("UPDATE credentials SET status='revoked' WHERE number=? AND status='active'").bind(data.number).run();
return x.meta?.changes===1?respond({ok:true,number:data.number,status:'revoked'},200,origin):respond({ok:false,error:'NOT_ACTIVE'},404,origin);
}}
return respond({ok:false,error:'NOT_FOUND'},404,origin);
}};