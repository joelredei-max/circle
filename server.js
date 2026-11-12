// Party website server - zero dependencies, just Node.js built-ins.
// Run:  node server.js   then open http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(path.join(PUBLIC, 'gallery'), { recursive: true });
fs.mkdirSync(path.join(PUBLIC, 'media'), { recursive: true });

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8')); }
  catch { return fallback; }
}
function writeJSON(file, obj) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(obj, null, 2));
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) { req.destroy(); reject(new Error('Too large')); }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
  });
}

const clean = (s, max = 500) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ---------- API ----------
async function handleApi(req, res, pathname) {
  // Events
  if (req.method === 'GET' && pathname === '/api/events') {
    return send(res, 200, readJSON('events.json', []));
  }

  // Ticket types (with live remaining stock)
  if (req.method === 'GET' && pathname === '/api/tickets') {
    const tickets = readJSON('tickets.json', []);
    const orders = readJSON('orders.json', []);
    const sold = {};
    orders.forEach((o) => { sold[o.ticketId] = (sold[o.ticketId] || 0) + o.quantity; });
    return send(res, 200, tickets.map((t) => ({ ...t, remaining: Math.max(0, t.stock - (sold[t.id] || 0)) })));
  }

  // Buy tickets (reservation - hook up a real payment provider here)
  if (req.method === 'POST' && pathname === '/api/orders') {
    const b = await readBody(req);
    const name = clean(b.name, 80);
    const email = clean(b.email, 120);
    const quantity = parseInt(b.quantity, 10);
    const tickets = readJSON('tickets.json', []);
    const ticket = tickets.find((t) => t.id === b.ticketId);
    if (!name || !validEmail(email) || !ticket || !(quantity >= 1 && quantity <= 10)) {
      return send(res, 400, { error: 'Please fill in every field correctly.' });
    }
    const orders = readJSON('orders.json', []);
    const soldNow = orders.filter((o) => o.ticketId === ticket.id).reduce((a, o) => a + o.quantity, 0);
    if (soldNow + quantity > ticket.stock) {
      return send(res, 409, { error: 'Not enough tickets left for that tier.' });
    }
    const order = {
      code: 'PX-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      ticketId: ticket.id,
      ticketName: ticket.name,
      quantity,
      total: ticket.price * quantity,
      name,
      email,
      createdAt: new Date().toISOString(),
    };
    orders.push(order);
    writeJSON('orders.json', orders);
    return send(res, 201, order);
  }

  // Support messages
  if (req.method === 'POST' && pathname === '/api/support') {
    const b = await readBody(req);
    const name = clean(b.name, 80);
    const email = clean(b.email, 120);
    const topic = clean(b.topic, 60);
    const message = clean(b.message, 2000);
    if (!name || !validEmail(email) || message.length < 5) {
      return send(res, 400, { error: 'Please fill in your name, a valid email and a message.' });
    }
    const list = readJSON('support.json', []);
    const ref = 'SUP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    list.push({ ref, name, email, topic, message, createdAt: new Date().toISOString() });
    writeJSON('support.json', list);
    return send(res, 201, { ok: true, ref });
  }

  // Newsletter
  if (req.method === 'POST' && pathname === '/api/subscribe') {
    const b = await readBody(req);
    const email = clean(b.email, 120);
    if (!validEmail(email)) return send(res, 400, { error: 'Enter a valid email.' });
    const list = readJSON('subscribers.json', []);
    if (!list.includes(email)) { list.push(email); writeJSON('subscribers.json', list); }
    return send(res, 201, { ok: true });
  }

  // Gallery: lists any images you drop into /public/gallery
  if (req.method === 'GET' && pathname === '/api/gallery') {
    const dir = path.join(PUBLIC, 'gallery');
    const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|gif|mp4|webm)$/i.test(f)).sort();
    return send(res, 200, files.map((f) => ({ src: '/gallery/' + encodeURIComponent(f), type: /\.(mp4|webm)$/i.test(f) ? 'video' : 'image' })));
  }

  // Does an intro video exist?
  if (req.method === 'GET' && pathname === '/api/intro') {
    const dir = path.join(PUBLIC, 'media');
    const file = ['intro.mp4', 'intro.webm'].find((f) => fs.existsSync(path.join(dir, f)));
    return send(res, 200, { video: file ? '/media/' + file : null });
  }

  return send(res, 404, { error: 'Not found' });
}

// ---------- Static files (with range support for video) ----------
function serveStatic(req, res, pathname) {
  let filePath = path.normalize(path.join(PUBLIC, decodeURIComponent(pathname)));
  if (!filePath.startsWith(PUBLIC)) return send(res, 403, 'Forbidden', 'text/plain');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA fallback: any non-file route returns index.html (client router handles it)
      if (path.extname(pathname)) return send(res, 404, 'Not found', 'text/plain');
      filePath = path.join(PUBLIC, 'index.html');
      return fs.readFile(filePath, (e, buf) => (e ? send(res, 500, 'Error', 'text/plain') : send(res, 200, buf, MIME['.html'])));
    }
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      });
      return fs.createReadStream(filePath, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  try {
    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
    return serveStatic(req, res, pathname);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Server error' });
  }
});

server.listen(PORT, () => console.log(`\n  PARTY SITE running -> http://localhost:${PORT}\n`));
