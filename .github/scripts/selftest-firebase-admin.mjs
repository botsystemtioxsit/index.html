// Самотест перед выкладкой Worker'а role-gateway (запускается из
// .github/workflows/deploy-role-gateway.yml): может ли ключ сервисного
// аккаунта из секрета FIREBASE_SERVICE_ACCOUNT писать в Realtime Database
// ПОМИМО правил. Именно на это Worker будет полагаться после выкладки — если
// ключу не хватает роли, лучше узнать здесь, чем получить Worker, который не
// может выдать роль.
//
// Намеренно самодостаточный (своя копия обмена JWT на токен): он запускается
// вместе с секретом, поэтому не должен исполнять код из другого репозитория.
//
// Пишет только во временные узлы (_gateway_selftest_, users/_gateway_selftest_)
// и в конце всегда их удаляет.
import crypto from 'node:crypto';

const DB = 'https://zolotaya-kletka-default-rtdb.firebaseio.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email';
const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

class SelfTestError extends Error {}
const fail = (message) => { throw new SelfTestError(message); };

function parseServiceAccount(text) {
  let t = String(text).replace(/^﻿/, '').trim();
  if (!t.startsWith('{')) {
    try { t = Buffer.from(t, 'base64').toString('utf8').replace(/^﻿/, '').trim(); } catch { /* ниже ошибка */ }
  }
  let sa;
  try { sa = JSON.parse(t); } catch { fail('FIREBASE_SERVICE_ACCOUNT — это не JSON.'); }
  if (!sa || typeof sa.client_email !== 'string' || typeof sa.private_key !== 'string') {
    fail('В FIREBASE_SERVICE_ACCOUNT нет client_email/private_key — нужен JSON-ключ сервисного аккаунта.');
  }
  return sa;
}

async function getToken(sa) {
  const b64u = (buf) => Buffer.from(buf).toString('base64url');
  const iat = Math.floor(Date.now() / 1000);
  const input = `${b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64u(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: TOKEN_URL, iat, exp: iat + 3600 }))}`;
  const signature = crypto.createSign('RSA-SHA256').update(input).sign(sa.private_key);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${b64u(signature)}` }).toString(),
  });
  if (!res.ok) fail(`Google не выдал токен (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  if (!data.access_token) fail('Google не вернул access_token.');
  return data.access_token;
}

async function main() {
  if (!raw) fail('В GitHub не задан секрет FIREBASE_SERVICE_ACCOUNT (Settings → Secrets and variables → Actions).');
  const token = await getToken(parseServiceAccount(raw));
  console.log('✓ токен сервисного аккаунта получен');

  const withToken = (path) => `${DB}${path}?access_token=${encodeURIComponent(token)}`;
  const scratch = `/_gateway_selftest_/run-${process.pid}-${new Date().getTime()}.json`;
  const fakeUser = '/users/_gateway_selftest_.json';

  try {
    // 1. Запись и чтение с токеном.
    let res = await fetch(withToken(scratch), { method: 'PUT', body: JSON.stringify({ ok: true }) });
    if (res.status === 401 || res.status === 403) {
      fail(
        `Ключу FIREBASE_SERVICE_ACCOUNT отказано в записи в базу (HTTP ${res.status}). ` +
        'Ему не хватает роли «Firebase Realtime Database Admin» (roles/firebasedatabase.admin) — ' +
        'выдать в Google Cloud Console → IAM для этого сервисного аккаунта, либо взять ключ сервисного аккаунта firebase-adminsdk-*.',
      );
    }
    if (!res.ok) fail(`Запись с токеном не удалась: HTTP ${res.status} ${await res.text()}`);
    const echoed = await (await fetch(withToken(scratch))).json();
    if (!echoed || echoed.ok !== true) fail('Данные, записанные с токеном, не прочитались обратно.');
    console.log('✓ запись и чтение с токеном работают');

    // 2. Главное: запись, которую ПРАВИЛА отклонили бы клиенту (роль superadmin
    //    без ключа), с токеном проходит — значит токен действительно в обход правил.
    res = await fetch(withToken(fakeUser), { method: 'PUT', body: JSON.stringify({ role: 'superadmin' }) });
    if (!res.ok) fail(`Запись role=superadmin с токеном отклонена (HTTP ${res.status}) — токен не обходит правила, Worker не сможет выдавать роли.`);
    console.log('✓ токен обходит database.rules.json (роль superadmin записалась без ключа)');

    // 3. Контроль: тот же запрос БЕЗ токена. Если правила его пропускают — это не
    //    сбой самотеста, но об этом надо знать.
    await fetch(withToken(fakeUser), { method: 'DELETE' });
    res = await fetch(`${DB}${fakeUser}`, { method: 'PUT', body: JSON.stringify({ role: 'superadmin' }) });
    if (res.ok) console.log('::warning::Запись role=superadmin БЕЗ токена прошла — правила сейчас не защищают роль (после перехода на admin-режим их нужно выложить).');
    else console.log(`✓ без токена та же запись отклоняется (HTTP ${res.status}) — правила работают`);

    // эти узлы нужно убрать и в успешном случае — ниже, в finally
    console.log('Самотест пройден.');
  } finally {
    for (const path of [scratch, fakeUser]) {
      try { await fetch(withToken(path), { method: 'DELETE' }); } catch { /* best effort */ }
    }
  }
}

main().catch((err) => {
  console.error(`::error::${err instanceof SelfTestError ? err.message : `Самотест упал: ${err.message}`}`);
  process.exitCode = 1;
});
