// Проверка правил чтения database.rules.json в эмуляторе Firebase (без обращения к настоящей базе).
// Запуск (нужны Node и Java):
//   npm i --no-save firebase-tools @firebase/rules-unit-testing firebase
//   npx firebase emulators:exec --only database --project demo-test "node tests/rules/read-rules.test.mjs"
// с firebase.json вида {"database":{"rules":"database.rules.json"},"emulators":{"database":{"port":9000}}}.
// Что проверяется: открытые разделы читаются, accessTokens/emailLogins/usernames/devicePairings — только по точному
// ключу, owners/googleLinks/resetConfirmations/assistantRequests и корень — никак; запись и старые .validate — как были.
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import fs from 'fs';
const env = await initializeTestEnvironment({ projectId:'demo-test', database:{ host:'127.0.0.1', port:9000, rules: fs.readFileSync(process.env.RULES_FILE || 'database.rules.json','utf8') } });
await env.withSecurityRulesDisabled(async (c)=>{ await c.database().ref('/').set({
  users:{'100':{playerId:'PLR-1',role:'user',points:1000,firstName:'A'}, 'guest_x':{playerId:'PLR-2',role:'user'}},
  accessTokens:{tok1:{label:'t'}}, emailLogins:{e1:'100'}, usernames:{bob:'100'}, devicePairings:{ABC234:{status:'pending'}},
  owners:{'100':'uidX'}, googleLinks:{x:'y'}, resetConfirmations:{r:{code:1}}, assistantRequests:{a:{messages:1}},
  config:{maintenanceMode:false, closedBeta:false}, errorReports:{e:{m:1}}, logs:{l1:{a:1}}, presence:{'100':true},
  videochat:{communities:{'-1':{joinCode:'ZZZ111'}}}, clans:{c1:{name:'x'}}, battles:{b1:{hostId:'100'}}, matches:{m1:{finishedAt:1}}, queue:{}, leaderboardNew:{a:1}
}); });
const anon = env.unauthenticatedContext().database();
let fail=0;
async function r(path, expect){ let ok; try{ await anon.ref(path).get(); ok=true;}catch(e){ ok=false; } const good = ok===expect; if(!good) fail++; console.log(good?'PASS':'FAIL', 'read', path, ok?'allowed':'denied'); }
async function q(path, child, val, expect){ let ok; try{ await anon.ref(path).orderByChild(child).equalTo(val).get(); ok=true;}catch(e){ok=false;} const good=ok===expect; if(!good)fail++; console.log(good?'PASS':'FAIL','query',path,child, ok?'allowed':'denied'); }
async function w(path, val, expect){ let ok; try{ await anon.ref(path).set(val); ok=true;}catch(e){ok=false;} const good=ok===expect; if(!good)fail++; console.log(good?'PASS':'FAIL','write',path, ok?'allowed':'denied'); }
// открытые чтения
for (const p of ['users','users/100','logs','presence','config','config/maintenanceMode','errorReports','videochat','videochat/communities','clans','battles','matches','queue','leaderboardNew','deviceTrustRequests']) await r(p,true);
await q('users','playerId','PLR-1',true); await q('users','role','user',true); await q('videochat/communities','joinCode','ZZZ111',true);
// точечное чтение
for (const p of ['accessTokens/tok1','emailLogins/e1','usernames/bob','devicePairings/ABC234']) await r(p,true);
// списком — закрыто
for (const p of ['accessTokens','emailLogins','usernames','devicePairings','owners','owners/100','googleLinks','resetConfirmations','assistantRequests','/']) await r(p,false);
// запись, как раньше
await w('users/100/lastSeen',123,true); await w('emailLogins/e2','100',true); await w('usernames/zed','100',true);
await w('accessTokens/tok2',{label:'x',createdAt:1,createdBy:'1',permissions:{a:true}},true); await w('devicePairings/ZZZ999',{status:'pending'},true);
await w('logs/l2',{a:2},true); await w('config/maintenanceMode',true,true); await w('newthing/x',1,true);
await w('users/100/role','admin',false);   // старое правило сохранилось
await w('users/100/trustedDevices/k',{a:1},false);
// транзакция на usernames (как в панели) — нужно чтение по ключу
let tx; try{ const res=await anon.ref('usernames/newname').transaction(c=>c===null?'100':undefined); tx=res.committed; }catch(e){ tx='ERR '+e.message; } console.log(tx===true?'PASS':'FAIL','transaction usernames/newname',tx); if(tx!==true)fail++;
console.log(fail?('FAILED '+fail):'ALL PASS');
await env.cleanup();
