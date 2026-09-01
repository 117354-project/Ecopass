'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const defaults = require('./site-defaults');

const ROOT = __dirname;
const envFile = path.join(ROOT, '.env');
try {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch {}
const STORAGE_ROOT = process.env.STORAGE_ROOT ? path.resolve(process.env.STORAGE_ROOT) : ROOT;
const DATA_DIR = path.join(STORAGE_ROOT, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'site-content.json');
const UPLOAD_DIR = path.join(STORAGE_ROOT, 'uploads');
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update(`${ROOT}:ecopass-local`).digest('hex');
const MAX_BODY = 6 * 1024 * 1024;
const SESSION_TTL = 8 * 60 * 60 * 1000;
const loginAttempts = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml'
};
const IMAGE_TYPES = new Map([['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif']]);
const IMAGE_SLOTS = new Set(['brand.logoImage', 'hero.backgroundImage', 'hero.image', 'hero.phoneImage', 'how.backgroundImage', 'destinations.items.0.image', 'destinations.items.1.image', 'destinations.items.2.image', 'impact.backgroundImage', 'journey.image', 'cta.backgroundImage', 'cta.phoneImage']);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function merge(base, input) {
  if (Array.isArray(base)) return base.map((item, index) => merge(item, Array.isArray(input) ? input[index] : undefined));
  if (base && typeof base === 'object') {
    const out = {};
    for (const key of Object.keys(base)) out[key] = merge(base[key], input && typeof input === 'object' ? input[key] : undefined);
    return out;
  }
  return typeof input === typeof base ? input : base;
}
function cleanText(value, max = 500) { return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max); }
function sanitizeContent(input) {
  const result = merge(clone(defaults), input || {});
  const walk = value => {
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, walk(child)]));
    return typeof value === 'string' ? cleanText(value, 700) : value;
  };
  return walk(result);
}
async function ensureStorage() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  try { await fsp.access(CONTENT_FILE); } catch { await writeContent({ ...clone(defaults), updatedAt: new Date().toISOString() }); }
}
async function readContent() {
  try { return sanitizeContent(JSON.parse(await fsp.readFile(CONTENT_FILE, 'utf8'))); }
  catch { return clone(defaults); }
}
async function writeContent(content) {
  const next = sanitizeContent(content);
  next.updatedAt = new Date().toISOString();
  const temp = `${CONTENT_FILE}.${process.pid}.tmp`;
  await fsp.writeFile(temp, JSON.stringify(next, null, 2), 'utf8');
  await fsp.rename(temp, CONTENT_FILE);
  return next;
}
function json(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}
function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(v => v.trim().split('=')).filter(v => v.length === 2));
}
function sign(value) { return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url'); }
function makeSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL, nonce: crypto.randomBytes(10).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
function authenticated(req) {
  const token = cookies(req).ecopass_admin;
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return origin === `http://${req.headers.host}` || origin === `https://${req.headers.host}`;
}
async function body(req, limit = MAX_BODY) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw Object.assign(new Error('Request is too large'), { status: 413 }); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
async function jsonBody(req) {
  const raw = await body(req, 1024 * 1024);
  try { return JSON.parse(raw.toString('utf8') || '{}'); } catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}
function setPath(object, slot, value) {
  const parts = slot.split('.'); let cursor = object;
  for (let i = 0; i < parts.length - 1; i++) cursor = cursor[Number.isInteger(Number(parts[i])) ? Number(parts[i]) : parts[i]];
  cursor[parts.at(-1)] = value;
}
function clientKey(req) { return req.socket.remoteAddress || 'unknown'; }
function loginAllowed(req) {
  const key = clientKey(req), now = Date.now(), recent = (loginAttempts.get(key) || []).filter(t => now - t < 10 * 60 * 1000);
  loginAttempts.set(key, recent); return recent.length < 8;
}
function recordFailure(req) { const key = clientKey(req); loginAttempts.set(key, [...(loginAttempts.get(key) || []), Date.now()]); }
function safeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a)).digest();
  const right = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}
function matchesImageType(buffer, type) {
  if (type === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (type === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
  if (type === 'image/webp') return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}
async function serveFile(res, file, cache = false) {
  try {
    const stat = await fsp.stat(file); if (!stat.isFile()) throw new Error('Not file');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': cache ? 'public, max-age=31536000, immutable' : 'no-cache' });
    fs.createReadStream(file).pipe(res);
  } catch { json(res, 404, { error: 'Not found' }); }
}
async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/content' && req.method === 'GET') return json(res, 200, await readContent());
    if (url.pathname === '/health' && req.method === 'GET') return json(res, 200, { status: 'ok', adminConfigured: Boolean(ADMIN_PASSWORD) });
    if (url.pathname === '/api/admin/session' && req.method === 'GET') return json(res, 200, { authenticated: authenticated(req) });
    if (url.pathname === '/api/admin/login' && req.method === 'POST') {
      if (!sameOrigin(req)) return json(res, 403, { error: 'Invalid request origin' });
      if (!ADMIN_PASSWORD) return json(res, 503, { error: 'Admin access is locked until ADMIN_PASSWORD is configured on the server.' });
      if (!loginAllowed(req)) return json(res, 429, { error: 'Too many attempts. Try again later.' });
      const input = await jsonBody(req);
      if (!safeEqual(input.password, ADMIN_PASSWORD)) { recordFailure(req); return json(res, 401, { error: 'Incorrect password' }); }
      loginAttempts.delete(clientKey(req));
      const secure = String(req.headers['x-forwarded-proto'] || '').includes('https');
      return json(res, 200, { ok: true }, { 'Set-Cookie': `ecopass_admin=${makeSession()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL / 1000}${secure ? '; Secure' : ''}` });
    }
    if (url.pathname === '/api/admin/logout' && req.method === 'POST') return json(res, 200, { ok: true }, { 'Set-Cookie': 'ecopass_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
    if (url.pathname.startsWith('/api/admin/') && (!authenticated(req) || !sameOrigin(req))) return json(res, 401, { error: 'Authentication required' });
    if (url.pathname === '/api/admin/content' && req.method === 'PUT') return json(res, 200, await writeContent(await jsonBody(req)));
    if (url.pathname === '/api/admin/upload' && req.method === 'POST') {
      const slot = url.searchParams.get('slot');
      const type = String(req.headers['content-type'] || '').split(';')[0];
      if (!IMAGE_SLOTS.has(slot)) return json(res, 400, { error: 'Unknown image slot' });
      if (!IMAGE_TYPES.has(type)) return json(res, 415, { error: 'Use a JPG, PNG, WebP, or GIF image' });
      const file = await body(req, 5 * 1024 * 1024);
      if (file.length < 16) return json(res, 400, { error: 'Image file is empty' });
      if (!matchesImageType(file, type)) return json(res, 415, { error: 'The file contents do not match the selected image type' });
      const filename = `${slot.replaceAll('.', '-')}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${IMAGE_TYPES.get(type)}`;
      await fsp.writeFile(path.join(UPLOAD_DIR, filename), file, { flag: 'wx' });
      const content = await readContent(); const previous = slot.split('.').reduce((v, key) => v?.[Number.isInteger(Number(key)) ? Number(key) : key], content);
      setPath(content, slot, `/uploads/${filename}`); await writeContent(content);
      if (typeof previous === 'string' && previous.startsWith('/uploads/')) await fsp.unlink(path.join(UPLOAD_DIR, path.basename(previous))).catch(() => {});
      return json(res, 201, { url: `/uploads/${filename}` });
    }
    if (url.pathname === '/api/admin/image' && req.method === 'DELETE') {
      const slot = url.searchParams.get('slot'); if (!IMAGE_SLOTS.has(slot)) return json(res, 400, { error: 'Unknown image slot' });
      const content = await readContent(); const previous = slot.split('.').reduce((v, key) => v?.[Number.isInteger(Number(key)) ? Number(key) : key], content);
      const fallback = slot.split('.').reduce((v, key) => v?.[Number.isInteger(Number(key)) ? Number(key) : key], defaults);
      setPath(content, slot, fallback); await writeContent(content);
      if (typeof previous === 'string' && previous.startsWith('/uploads/')) await fsp.unlink(path.join(UPLOAD_DIR, path.basename(previous))).catch(() => {});
      return json(res, 200, { url: fallback });
    }
    if (url.pathname.startsWith('/uploads/')) return serveFile(res, path.join(UPLOAD_DIR, path.basename(url.pathname)), true);
    const routes = { '/': 'ecopass.html', '/ecopass.html': 'ecopass.html', '/admin': 'admin.html', '/admin/': 'admin.html' };
    const requested = routes[url.pathname] || url.pathname.slice(1);
    if (!requested || requested.includes('..') || path.isAbsolute(requested)) return json(res, 404, { error: 'Not found' });
    return serveFile(res, path.join(ROOT, requested));
  } catch (error) { return json(res, error.status || 500, { error: error.status ? error.message : 'Server error' }); }
}

async function start(port = PORT) {
  await ensureStorage();
  const server = http.createServer(handler);
  return new Promise(resolve => server.listen(port, '0.0.0.0', () => {
    if (!ADMIN_PASSWORD) console.warn('EcoPass admin access is locked: configure ADMIN_PASSWORD to enable dashboard sign-in.');
    resolve(server);
  }));
}
if (require.main === module) start().then(server => console.log(`EcoPass running at http://localhost:${server.address().port}`));
module.exports = { start, sanitizeContent, readContent, writeContent };
