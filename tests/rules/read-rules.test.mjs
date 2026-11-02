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
  videochat:{communities:{'-1':{joinCode:'ZZZ111'}}}, clans:{c1:{name:'x'}}, battles:{b1:{hostId:'100'}}, matches:{m1:{finishedAt:1}}, queue:{}, leaderboardNew:{a:1},
  launcherFeedback:{f1:{type:'bug',text:'x',status:'new',createdAt:1,shots:1}}, launcherFeedbackShots:{f1:{0:'data:image/jpeg;base64,AAAA'}}, launcherFeedbackNew:{f1:true},
  gatewayAccounts:{aaaaaaaaaaaaaaaaaaaaaaaa:{name:'Alex',createdAt:1,lastSeen:2,termsV:1}}, gatewayBlocks:{bbbbbbbbbbbbbbbbbbbbbbbb:{at:1,reason:'x',by:'1'}}, gatewayBlockedDevices:{cccccccccccccccccccccccccccccccc:{at:1,reason:'x',by:'1'}}
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
// сообщения из лаунчера: список закрыт, по точному ключу читается (статус и ответ), запись — только с допустимыми полями
for (const p of ['launcherFeedback','launcherFeedbackShots','launcherFeedbackNew']) await r(p,false);
for (const p of ['launcherFeedback/f1','launcherFeedback/f1/status','launcherFeedbackShots/f1']) await r(p,true);
await w('launcherFeedback/f2',{type:'idea',text:'Добавьте тёмную тему',status:'new',createdAt:1,shots:0,system:'Windows 11',account:{id:'100',name:'A',playerId:'PLR-1'}},true);
await w('launcherFeedback/f1/status','done',true); await w('launcherFeedback/f1/reply','Исправлено',true); await w('launcherFeedback/f1/replyAt',5,true);
await w('launcherFeedback/f3/type','spam',false);                 // неизвестный тип
await w('launcherFeedback/f3/text','x'.repeat(4001),false);       // слишком длинный текст
await w('launcherFeedback/f3/status','hacked',false);             // неизвестный статус
await w('launcherFeedback/f3/shots',9,false);                     // скриншотов не больше трёх
await w('launcherFeedback/f3/evil','1',false);                    // посторонние поля не принимаются
await w('launcherFeedback/f3/account/token','1',false);
await w('launcherFeedbackShots/f2/0','data:image/jpeg;base64,/9j/4AAQ',true);
await w('launcherFeedbackShots/f2/1','data:text/html;base64,PHNjcmlwdD4=',false);   // только JPEG
await w('launcherFeedbackShots/f2/2','data:image/jpeg;base64,'+'A'.repeat(400000),false);  // слишком большой
await w('launcherFeedbackNew/f2',true,true); await w('launcherFeedbackNew/f3','yes',false);
await w('launcherFeedback/f2',null,true);                          // удаление владельцем

// Gateway Plus: аккаунты шлюза. Списком закрыто, по точному ключу читается; блокировки клиент записать не может (пишет только Worker).
for (const p of ['gatewayAccounts','gatewayBlocks','gatewayBlockedDevices']) await r(p,false);
for (const p of ['gatewayAccounts/aaaaaaaaaaaaaaaaaaaaaaaa','gatewayBlocks/bbbbbbbbbbbbbbbbbbbbbbbb','gatewayBlockedDevices/cccccccccccccccccccccccccccccccc','gatewayBlocks/zzzzzzzzzzzzzzzzzzzzzzzz']) await r(p,true);
const ID='dddddddddddddddddddddddd';
await w('gatewayAccounts/'+ID,{name:'Новый',createdAt:5,lastSeen:5,termsV:1,ver:'2.0.0',dev:'0123456789abcdef0123456789abcdef',servers:1},true);
await w('gatewayAccounts/'+ID+'/lastSeen',9,true); await w('gatewayAccounts/'+ID+'/servers',2,true);
await w('gatewayAccounts/'+ID+'/createdAt',99,false);              // дата создания не меняется
await w('gatewayAccounts/'+ID+'/name','x'.repeat(31),false);       // слишком длинное имя
await w('gatewayAccounts/'+ID+'/evil','1',false);                  // посторонние поля не принимаются
await w('gatewayAccounts/'+ID+'/dev','not-hex',false);
await w('gatewayAccounts/'+ID+'/servers',99,false);
await w('gatewayAccounts/badid',{name:'A',createdAt:1},false);     // ключ — 24 знака 0-9a-f
await w('gatewayAccounts/eeeeeeeeeeeeeeeeeeeeeeee',{lastSeen:1},false);   // без имени и даты создания
await w('gatewayBlocks/'+ID,{at:1,reason:'self',by:'me'},false);   // блокировку клиент поставить/подделать не может
await w('gatewayBlocks/bbbbbbbbbbbbbbbbbbbbbbbb/reason','edited',false);
await w('gatewayBlockedDevices/cccccccccccccccccccccccccccccccc/reason','edited',false);
await w('gatewayBlockedDevices/ffffffffffffffffffffffffffffffff',{at:1},false);
// ИЗВЕСТНОЕ ОГРАНИЧЕНИЕ: корень базы открыт на запись (.write: true), а .validate на удаление не действует — человек, знающий свой номер, может стереть свою блокировку.
// Тест фиксирует это, чтобы документация не обещала лишнего (см. CLAUDE.md: «Gateway Plus»). Настоящая защита — отдельная база со строгими правилами.
await w('gatewayBlocks/bbbbbbbbbbbbbbbbbbbbbbbb',null,true);
console.log(fail?('FAILED '+fail):'ALL PASS');
await env.cleanup();
