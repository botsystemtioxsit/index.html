// Запросы лаунчера «Написать нам» по REST против эмулятора с нашими правилами (POST → PUT скриншота → PATCH → PUT «новое»).
// Запуск как у read-rules.test.mjs: npx firebase emulators:exec --only database --project demo-test "node tests/rules/launcher-feedback-rest.test.mjs"
// (на машине с прокси для localhost сделайте unset HTTPS_PROXY HTTP_PROXY JAVA_TOOL_OPTIONS)
const base = 'http://127.0.0.1:9000', ns = '?ns=demo-test-default-rtdb';
async function call(method, path, body) {
  const r = await fetch(base + path + '.json' + ns, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) };
}
let bad = 0; const t = (n, c, x) => { console.log(c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(x)); if (!c) bad++; };
const rec = { type: 'bug', text: 'Тест: после включения плагина панель задач мигает', createdAt: { '.sv': 'timestamp' }, status: 'new', shots: 0,
  contact: '@someone', system: 'Windows 11 (сборка 26300), 64-bit; лаунчер 1.34.0; плагины: Taskbar Plus 2.1.0',
  account: { id: '100', name: 'Alex', playerId: 'PLR-7K3M9Q' } };
const post = await call('POST', '/launcherFeedback', rec);
t('POST записи (время от сервера)', post.ok && post.json && post.json.name, post);
const id = post.json && post.json.name;
const put = await call('PUT', `/launcherFeedbackShots/${id}/0`, 'data:image/jpeg;base64,/9j/4AAQSkZJRg==');
t('PUT скриншота', put.ok, put);
const patch = await call('PATCH', `/launcherFeedback/${id}`, { shots: 1 });
t('PATCH числа скриншотов', patch.ok, patch);
const nw = await call('PUT', `/launcherFeedbackNew/${id}`, true);
t('PUT отметки «новое»', nw.ok, nw);
const get = await call('GET', `/launcherFeedback/${id}`);
t('чтение по точному номеру: createdAt — число, статус new', get.ok && typeof get.json.createdAt === 'number' && get.json.status === 'new' && get.json.shots === 1, get);
const list = await call('GET', '/launcherFeedback');
t('список закрыт (без ключа админа)', !list.ok, list);
const bigText = await call('POST', '/launcherFeedback', { ...rec, text: 'x'.repeat(5000) });
t('слишком длинный текст отклонён', !bigText.ok, bigText);
console.log(bad ? 'FAILED ' + bad : 'ALL PASS');
process.exit(bad ? 1 : 0);
