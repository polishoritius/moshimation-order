// Offline tests for worker.js with an in-memory D1 stand-in. Run: node --test auth/tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../worker.js';

const ORIGIN = 'https://polishoritius.github.io';
const TOKEN = 'T'.repeat(43);

function makeDb() {
  const rows = new Map();
  return {
    rows,
    prepare(sql) {
      let args = [];
      const s = {
        bind: (...a) => { args = a; return s; },
        async first() { if (sql.startsWith('SELECT')) return rows.get(args[0]) ?? null; return null; },
        async run() {
          if (sql.startsWith('INSERT')) {
            const [number, callsign, rank, version, salt, hash, created_at] = args;
            if (rows.has(number)) throw new Error('dup');
            rows.set(number, { number, callsign, rank, status: 'active', version, salt, hash, failures: 0, lock_until: 0, created_at });
            return { meta: { changes: 1 } };
          }
          if (sql.includes("SET status='revoked'")) {
            const r = rows.get(args[0]);
            if (r && r.status === 'active') { r.status = 'revoked'; return { meta: { changes: 1 } }; }
            return { meta: { changes: 0 } };
          }
          if (sql.includes('SET failures=?')) { const r = rows.get(args[2]); r.failures = args[0]; r.lock_until = args[1]; return { meta: { changes: 1 } }; }
          if (sql.includes('SET failures=0')) { const r = rows.get(args[0]); r.failures = 0; r.lock_until = 0; return { meta: { changes: 1 } }; }
          throw new Error('unexpected sql ' + sql);
        },
      };
      return s;
    },
  };
}
const mk = (db, adminToken = TOKEN) => ({ DB: db, PUBLIC_ORIGIN: ORIGIN, ADMIN_TOKEN: adminToken });
const post = (path, body, headers = {}) => new Request('https://w.example' + path, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...headers } });
const admin = (path, body, token = TOKEN) => post(path, body, { Authorization: 'Bearer ' + token });
const PW = 'synthetic-test-secret-0123456789';

test('PBKDF2 iterations stay within the Workers limit (<=100000)', () => {
  const m = /ITER=(\d+)/.exec(readFileSync(new URL('../worker.js', import.meta.url), 'utf8'));
  assert.ok(m && Number(m[1]) <= 100000, 'ITER=' + (m && m[1]));
});

test('worker source never logs', () => {
  assert.doesNotMatch(readFileSync(new URL('../worker.js', import.meta.url), 'utf8'), /console\./);
});

test('issue -> authenticate -> wrong password -> revoke -> rejected', async () => {
  const env = mk(makeDb());
  let r = await worker.fetch(admin('/api/admin/issue', { number: '900100', callsign: 'T', rank: 't', password: PW, version: 1 }), env);
  assert.equal(r.status, 201);
  assert.equal((await r.text()).includes(PW), false, 'response must not echo secret');
  r = await worker.fetch(post('/api/authenticate', { number: '900100', password: PW }), env);
  assert.equal(r.status, 200);
  r = await worker.fetch(post('/api/authenticate', { number: '900100', password: PW + 'x' }), env);
  assert.equal(r.status, 401);
  r = await worker.fetch(admin('/api/admin/revoke', { number: '900100' }), env);
  assert.equal(r.status, 200);
  r = await worker.fetch(post('/api/authenticate', { number: '900100', password: PW }), env);
  assert.equal(r.status, 401);
});

test('admin API rejects missing, wrong and prefix tokens', async () => {
  const env = mk(makeDb());
  for (const h of [{}, { Authorization: 'Bearer wrong' }, { Authorization: 'Bearer ' + TOKEN.slice(0, 10) }, { Authorization: TOKEN }]) {
    const r = await worker.fetch(post('/api/admin/issue', { number: '900101' }, h), env);
    assert.equal(r.status, 401);
  }
  const r = await worker.fetch(new Request('https://w.example/api/admin/issue', { method: 'GET' }), env);
  assert.equal(r.status, 404);
});

test('regression: a secret stored with trailing CRLF still matches a clean Bearer token', async () => {
  const env = mk(makeDb(), TOKEN + '\r\n');
  const r = await worker.fetch(admin('/api/admin/issue', { number: '900102', callsign: 'T', rank: 't', password: PW, version: 1 }), env);
  assert.equal(r.status, 201);
});

test('blank ADMIN_TOKEN never authorizes', async () => {
  for (const t of ['', '  ', '\r\n']) {
    const r = await worker.fetch(admin('/api/admin/issue', { number: '900103' }, ''), mk(makeDb(), t));
    assert.equal(r.status, 401);
  }
});

test('8 consecutive failures lock the account for even the correct secret', async () => {
  const db = makeDb(); const env = mk(db);
  await worker.fetch(admin('/api/admin/issue', { number: '900104', callsign: 'T', rank: 't', password: PW, version: 1 }), env);
  for (let i = 0; i < 8; i++) assert.equal((await worker.fetch(post('/api/authenticate', { number: '900104', password: 'y'.repeat(24) }), env)).status, 401);
  assert.ok(db.rows.get('900104').lock_until > Date.now() / 1000);
  assert.equal((await worker.fetch(post('/api/authenticate', { number: '900104', password: PW }), env)).status, 429);
});

test('auth failures share one generic body (no existence oracle for unknown/revoked/wrong)', async () => {
  const db = makeDb(); const env = mk(db);
  await worker.fetch(admin('/api/admin/issue', { number: '900105', callsign: 'T', rank: 't', password: PW, version: 1 }), env);
  const bodies = new Set();
  for (const b of [{ number: '900999', password: PW }, { number: '900105', password: PW + 'z' }]) bodies.add(await (await worker.fetch(post('/api/authenticate', b), env)).text());
  assert.equal(bodies.size, 1);
});

test('CORS: only the configured origin is reflected; others get 403', async () => {
  const env = mk(makeDb());
  let r = await worker.fetch(new Request('https://w.example/api/health', { headers: { Origin: ORIGIN } }), env);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  r = await worker.fetch(new Request('https://w.example/api/health', { headers: { Origin: 'https://evil.example' } }), env);
  assert.equal(r.status, 403);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), null);
  r = await worker.fetch(new Request('https://w.example/api/authenticate', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env);
  assert.equal(r.status, 403);
  r = await worker.fetch(new Request('https://w.example/api/authenticate', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env);
  assert.equal(r.status, 204);
});

test('oversized body is rejected', async () => {
  const r = await worker.fetch(post('/api/authenticate', { number: '900106', password: 'a'.repeat(5000) }), mk(makeDb()));
  assert.equal(r.status, 400);
});
