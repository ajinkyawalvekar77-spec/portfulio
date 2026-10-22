// Usage: NEW_PASSWORD='your-new-password' node scripts/set-password.js [path/to/admin.json]
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const pw=process.env.NEW_PASSWORD;
if(!pw||pw.length<10){console.error('Set NEW_PASSWORD (min 10 chars) in the environment.');process.exit(1)}
const out=process.argv[2]||path.join(process.env.DATA_DIR||path.join(__dirname,'..','data'),'admin.json');
const salt=crypto.randomBytes(16).toString('hex');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({user:'Ajinkya',salt,hash:crypto.scryptSync(pw,salt,64).toString('hex')},null,2));
console.log('Password updated in',out,'- restart the server to end old sessions.');
