const path = require('path');
const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { generateStickers, insertStickers, TEST_FIXTURES } = require('./lib/stickers');

// Auto-seed an empty database on first start (for hosts with no shell). SEED_ON_EMPTY=test or a number like 10005.
const seedMode = process.env.SEED_ON_EMPTY;
if (seedMode && db.prepare('SELECT COUNT(*) c FROM stickers').get().c === 0) {
  const test = seedMode === 'test', n = test ? 10 : parseInt(seedMode, 10);
  if (!Number.isInteger(n) || n < 1) throw new Error('SEED_ON_EMPTY must be "test" or a positive number');
  const fx = test ? TEST_FIXTURES : [];
  insertStickers(db, [...fx, ...generateStickers(n - fx.length, new Set(fx.map(f => f.sticker_id)))]);
  console.log(`Seeded ${n} stickers.`);
}

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || 'https://ossma.com').replace(/\/$/, '');
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const VEHICLE_TYPES = ['Pick Up Vans', '18 Tyres', '12/14 Tyres', 'Luxury Buses', 'Commercial Buses', 'Tankers', 'Tricycles (Keke)', 'Taxis', 'Other'];

app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' } });

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const norm = v => String(v || '').trim();
const findValid = (sid, serial) => {
  const row = db.prepare('SELECT * FROM stickers WHERE sticker_id = ?').get(norm(sid).toUpperCase());
  return row && safeEqual(row.serial_number, norm(serial)) ? row : null;
};
const INVALID = { error: 'Invalid Sticker ID or Serial Number' };

// Step 1: verify
app.post('/api/verify', limiter, (req, res) => {
  const row = findValid(req.body.sticker_id, req.body.serial_number);
  if (!row) return res.status(404).json(INVALID);
  if (!row.is_registered) return res.json({ registered: false });
  res.json({ registered: true, vehicle: {   // phone, email and address are deliberately not exposed publicly
    sticker_id: row.sticker_id, vehicle_plate: row.vehicle_plate, full_name: row.full_name,
    vehicle_type: row.vehicle_type, num_tyres: row.num_tyres, state: row.state, lga: row.lga,
    registered_at: row.registered_at } });
});

// Step 2: register
app.post('/api/register', limiter, (req, res) => {
  const b = req.body, errs = [];
  const d = {
    vehicle_plate: norm(b.vehicle_plate).toUpperCase(), full_name: norm(b.full_name), email: norm(b.email),
    phone: norm(b.phone), address: norm(b.address), tin_number: norm(b.tin_number) || null,
    next_of_kin_phone: norm(b.next_of_kin_phone), vehicle_type: norm(b.vehicle_type),
    num_tyres: parseInt(b.num_tyres, 10), state: norm(b.state), lga: norm(b.lga)
  };
  const phoneOk = p => /^\+?\d{10,14}$/.test(p.replace(/[\s-]/g, ''));
  if (!/^[A-Z0-9 -]{5,12}$/.test(d.vehicle_plate)) errs.push('Enter a valid plate number');
  if (d.full_name.length < 3) errs.push('Enter the owner\'s full name');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) errs.push('Enter a valid email address');
  if (!phoneOk(d.phone)) errs.push('Enter a valid phone number');
  if (!phoneOk(d.next_of_kin_phone)) errs.push('Enter a valid next of kin phone number');
  if (d.address.length < 5) errs.push('Enter the owner\'s address');
  if (!VEHICLE_TYPES.includes(d.vehicle_type)) errs.push('Select a vehicle type');
  if (!(d.num_tyres >= 2 && d.num_tyres <= 30)) errs.push('Number of tyres must be between 2 and 30');
  if (!d.state || !d.lga) errs.push('Select a state and LGA');
  if (errs.length) return res.status(400).json({ error: errs.join('. ') + '.' });

  const row = findValid(b.sticker_id, b.serial_number);
  if (!row) return res.status(404).json(INVALID);
  // Atomic: only succeeds if the sticker is still unregistered
  const r = db.prepare(`UPDATE stickers SET is_registered=1, vehicle_plate=@vehicle_plate, full_name=@full_name,
    email=@email, phone=@phone, address=@address, tin_number=@tin_number, next_of_kin_phone=@next_of_kin_phone,
    vehicle_type=@vehicle_type, num_tyres=@num_tyres, state=@state, lga=@lga, registered_at=datetime('now')
    WHERE id=@id AND is_registered=0`).run({ ...d, id: row.id });
  if (!r.changes) return res.status(409).json({ error: 'This sticker has already been registered.' });
  res.json({ ok: true, sticker_id: row.sticker_id, vehicle_plate: d.vehicle_plate });
});

// Admin: CSV of all stickers for QR batch printing. Send header  x-admin-key: <ADMIN_KEY>
app.get('/admin/export.csv', (req, res) => {
  if (!ADMIN_KEY || !safeEqual(req.get('x-admin-key') || req.query.key || '', ADMIN_KEY)) return res.status(401).send('Unauthorized');
  const rows = db.prepare('SELECT id, sticker_id, serial_number, is_registered FROM stickers ORDER BY id').all();
  const lines = ['id,sticker_id,serial_number,is_registered,qr_url'];
  for (const r of rows) lines.push([r.id, r.sticker_id, r.serial_number, r.is_registered ? 'true' : 'false',
    `${BASE_URL}/verify?sticker_number=${r.sticker_id}`].join(','));
  res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="ossma-stickers.csv"' });
  res.send(lines.join('\n'));
});

app.get(['/verify', '/'], (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`OSSMA running on http://localhost:${PORT}`));
