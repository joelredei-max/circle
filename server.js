// Party website server with PostgreSQL database support for Render
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data');

// PostgreSQL connection setup using Render's DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Initialize database tables on startup
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        code TEXT PRIMARY KEY,
        ticket_id TEXT,
        ticket_name TEXT,
        quantity INT,
        total NUMERIC,
        name TEXT,
        email TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS support_messages (
        ref TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        topic TEXT,
        message TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS subscribers (
        email TEXT PRIMARY KEY
      );
    `);
    console.log('  Database tables initialized successfully.');
  } catch (err) {
    console.error('  Database initialization error (falling back to local files if needed):', err.message);
  }
}
initDB();

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

  // Ticket types (with live remaining stock from DB or JSON)
  if (req.method === 'GET' && pathname === '/api/tickets') {
    const tickets = readJSON('tickets.json', []);
    let orders = [];
    try {
      const dbRes = await pool.query('SELECT ticket_id as "ticketId", quantity FROM orders');
      orders = dbRes.rows;
    } catch {
      orders = readJSON('orders.json', []);
    }
    const sold = {};
    orders.forEach((o) => { sold[o.ticketId] = (sold[o.ticketId] || 0) + o.quantity; });
    return send(res, 200, tickets.map((t) => ({ ...t, remaining: Math.max(0, t.stock - (sold[t.id] || 0)) })));
  }

  // Buy tickets
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

    let orders = [];
    try {
      const dbRes = await pool.query('SELECT ticket_id as "ticketId", quantity FROM orders');
      orders = dbRes.rows;
    } catch {
      orders = readJSON('orders.json', []);
    }

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

    try {
      await pool.query(
        'INSERT INTO orders (code, ticket_id, ticket_name, quantity, total, name, email, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [order.code, order.ticketId, order.ticketName, order.quantity, order.total, order.name, order.email, order.createdAt]
      );
    } catch (err) {
      // Fallback to local json if DB fails
      const localOrders = readJSON('orders.json', []);
      localOrders.push(order);
      writeJSON('orders.json', localOrders);
    }

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
    const ref = 'SUP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const createdAt = new Date().toISOString();

    try {
      await pool.query(
        'INSERT INTO support_messages (ref, name, email, topic, message, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [ref, name, email, topic, message, createdAt]
      );
    } catch {
      const list = readJSON('support.json', []);
      list.push({ ref, name, email, topic, message, createdAt });
      writeJSON('support.json', list);
    }

    return send(res, 201, { ok: true, ref });
  }

  // Newsletter
  if (req.method === 'POST' && pathname === '/api/subscribe') {
    const b = await readBody(req);
    const email = clean(b.email, 120);
    if (!validEmail(email)) return send(res, 400, { error: 'Enter a valid email.' });

    try {
      await pool.query('INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING', [email]);
    } catch {
      const list = readJSON('subscribers.json', []);
      if (!list.includes(email)) { list.push(email); writeJSON('subscribers.json', list); }
    }

    return send(res, 201, { ok: true });
  }

  // Gallery
  if (req.method === 'GET' && pathname === '/api/gallery') {
    const dir = path.join(PUBLIC, 'gallery');
    const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp|gif|mp4|webm)$/i.test(f)).sort();
    return send(res, 200, files.map((f) => ({ src: '/gallery/' + encodeURIComponent(f), type: /\.(mp4|webm)$/i.test(f) ? 'video' : 'image' })));
  }

  // Intro video
  if (req.method === 'GET' && pathname === '/api/intro') {
    const dir = path.join(PUBLIC, 'media');
    const file = ['intro.mp4', 'intro.webm'].find((f) => fs.existsSync(path.join(dir, f)));
    return send(res, 200, { video: file ? '/media/' + file : null });
  }

  return send(res, 404, { error: 'Not found' });
}

// ---------- Static files ----------
function serveStatic(req, res, pathname) {
  let filePath = path.normalize(path.join(PUBLIC, decodeURIComponent(pathname)));
  if (!filePath.startsWith(PUBLIC)) return send(res, 403, 'Forbidden', 'text/plain');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
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