'use strict';

process.env.ADMIN_PASSWORD = 'test-only-admin-password';
process.env.SESSION_SECRET = 'test-only-session-secret-with-sufficient-length';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { start, sanitizeContent } = require('./server');

test('public landing page has no upload or inline editing controls', async () => {
  const html = await fs.readFile(path.join(__dirname, 'ecopass.html'), 'utf8');
  const adminHtml = await fs.readFile(path.join(__dirname, 'admin.html'), 'utf8');
  const adminCss = await fs.readFile(path.join(__dirname, 'admin.css'), 'utf8');
  assert.doesNotMatch(html, /type=["']file["']/i);
  assert.doesNotMatch(html, /contenteditable/i);
  assert.doesNotMatch(html, /indexedDB/i);
  assert.match(html, /data-content="hero\.titleLine1"/);
  assert.match(html, /data-image="hero\.phoneImage"/);
  assert.match(html, /data-image="hero\.backgroundImage"/);
  assert.match(html, /data-image="how\.backgroundImage"/);
  assert.match(html, /data-image="impact\.backgroundImage"/);
  assert.match(adminHtml, /data-slot="hero\.backgroundImage"/);
  assert.match(adminHtml, /data-slot="how\.backgroundImage"/);
  assert.match(adminHtml, /data-slot="impact\.backgroundImage"/);
  assert.match(html, /data-image="brand\.logoImage"/);
  assert.match(html, /data-image="cta\.backgroundImage"/);
  assert.match(html, /data-image="cta\.phoneImage"/);
  assert.doesNotMatch(html, /class="site-header/);
  assert.match(html, /class="hero-logo/);
  assert.doesNotMatch(html, /class="promise-strip/);
  assert.match(adminCss, /\[hidden\]\{display:none!important\}/);
});

test('content sanitizer keeps the schema and strips control characters', () => {
  const content = sanitizeContent({ hero: { title: 'Hello\u0000 world', steps: 'ignored' }, unknown: 'discarded' });
  assert.equal(content.hero.title, 'Hello world');
  assert.equal(content.unknown, undefined);
  assert.equal(content.brand.name, 'EcoPass');
});

test('server protects writes and persists authenticated content updates', async t => {
  const contentFile = path.join(__dirname, 'data', 'site-content.json');
  let original = null;
  try { original = await fs.readFile(contentFile); } catch {}
  const server = await start(0);
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    if (original) await fs.writeFile(contentFile, original); else await fs.rm(contentFile, { force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const publicResponse = await fetch(`${base}/api/content`);
  assert.equal(publicResponse.status, 200);
  const current = await publicResponse.json();
  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.status, 'ok');
  assert.equal(health.adminConfigured, true);

  const denied = await fetch(`${base}/api/admin/content`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
  assert.equal(denied.status, 401);

  const login = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'test-only-admin-password' }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  const backgroundUpload = await fetch(`${base}/api/admin/upload?slot=how.backgroundImage`, { method: 'POST', headers: { 'Content-Type': 'image/png', Cookie: cookie }, body: tinyPng });
  assert.equal(backgroundUpload.status, 201);
  const uploadedBackground = await backgroundUpload.json();
  assert.match(uploadedBackground.url, /^\/uploads\/how-backgroundImage-/);
  const afterBackgroundUpload = await (await fetch(`${base}/api/content`)).json();
  assert.equal(afterBackgroundUpload.how.backgroundImage, uploadedBackground.url);
  assert.equal(afterBackgroundUpload.hero.backgroundImage, '/ecopass-cream-texture.png');
  const backgroundRemoval = await fetch(`${base}/api/admin/image?slot=how.backgroundImage`, { method: 'DELETE', headers: { Cookie: cookie } });
  assert.equal(backgroundRemoval.status, 200);
  assert.equal((await backgroundRemoval.json()).url, '/ecopass-cream-texture.png');
  current.hero.title = 'Persisted integration test title';
  const saved = await fetch(`${base}/api/admin/content`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(current) });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).hero.title, 'Persisted integration test title');
  const reread = await (await fetch(`${base}/api/content`)).json();
  assert.equal(reread.hero.title, 'Persisted integration test title');
});
