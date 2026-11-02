// Запросы Gateway Plus по REST против эмулятора с нашими правилами: регистрация аккаунта (PUT), пульс (PATCH), проверка блокировки (GET по точному ключу).
// Запуск как у read-rules.test.mjs: npx firebase emulators:exec --only database --project demo-test "node tests/rules/gateway-rest.test.mjs"
// (на машине с прокси для localhost сделайте unset HTTPS_PROXY HTTP_PROXY JAVA_TOOL_OPTIONS)
const base = 'http://127.0.0.1:9000', ns = '?ns=demo-test-default-rtdb';
async function call(method, path, body) {
  const r = await fetch(base + path + '.json' + ns, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) };
}
let bad = 0; const t = (n, c, x) => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(x)); if (!c) bad++; };
const id = '0123456789abcdef01234567', dev = 'fedcba9876543210fedcba9876543210';
const got0 = await call('GET', `/gatewayAccounts/${id}`);
t('нового аккаунта в базе ещё нет (null)', got0.ok && got0.json === null, got0);
const reg = await call('PUT', `/gatewayAccounts/${id}`, { name: 'Alex', createdAt: { '.sv': 'timestamp' }, lastSeen: { '.sv': 'timestamp' }, termsV: 1, ver: '2.0.0', dev, servers: 0 });
t('PUT регистрации (время от сервера)', reg.ok, reg);
const got = await call('GET', `/gatewayAccounts/${id}`);
t('createdAt — число, имя на месте', got.ok && typeof got.json.createdAt === 'number' && got.json.name === 'Alex', got);
const beat = await call('PATCH', `/gatewayAccounts/${id}`, { lastSeen: { '.sv': 'timestamp' }, ver: '2.0.1', servers: 2, termsV: 1 });
t('PATCH пульса', beat.ok, beat);
const got2 = await call('GET', `/gatewayAccounts/${id}`);
t('createdAt после пульса не изменился', got2.ok && got2.json.createdAt === got.json.createdAt && got2.json.servers === 2, got2);
const blk = await call('GET', `/gatewayBlocks/${id}`);
t('проверка блокировки: записи нет (null), не ошибка', blk.ok && blk.json === null, blk);
const dblk = await call('GET', `/gatewayBlockedDevices/${dev}`);
t('проверка блокировки устройства: записи нет', dblk.ok && dblk.json === null, dblk);
const forge = await call('PUT', `/gatewayBlocks/${id}`, { at: 1, reason: 'x', by: 'me' });
t('клиент не может записать блокировку', !forge.ok, forge);
const list = await call('GET', '/gatewayAccounts');
t('список аккаунтов закрыт', !list.ok, list);
const longName = await call('PUT', `/gatewayAccounts/aaaaaaaaaaaaaaaaaaaaaaaa`, { name: 'x'.repeat(31), createdAt: { '.sv': 'timestamp' } });
t('слишком длинное имя отклонено', !longName.ok, longName);
console.log(bad ? 'FAILED ' + bad : 'ALL PASS');
process.exit(bad ? 1 : 0);
