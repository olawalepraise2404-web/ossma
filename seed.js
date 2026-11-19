#!/usr/bin/env node
/*
 * Seed / scale the sticker database.
 *
 *   node seed.js --test                     10 stickers incl. the test fixtures (default count 10)
 *   node seed.js --count 10005 --force      wipe and regenerate 10,005 (refuses if any sticker is registered)
 *   node seed.js --add 5000                 append 5,000 more without touching existing rows
 *   node seed.js --test --force --out test-stickers.csv   also write the generated records to a CSV
 */
const fs = require('fs');
const db = require('./db');
const { generateStickers, insertStickers, TEST_FIXTURES } = require('./lib/stickers');

const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const val = (n, d) => { const i = args.indexOf('--' + n); return i > -1 ? args[i + 1] : d; };
const num = (n, d) => { const v = parseInt(val(n, d), 10); if (!Number.isInteger(v) || v < 0) { console.error(`--${n} needs a positive integer`); process.exit(1); } return v; };

const addMode = flag('add');
const count = addMode ? num('add') : num('count', 10);
const withTest = flag('test');
const total = () => db.prepare('SELECT COUNT(*) c FROM stickers').get().c;

if (!addMode && total() > 0) {
  if (!flag('force')) { console.log(`Database already holds ${total()} stickers. Use --force to regenerate or --add N to append.`); process.exit(0); }
  const reg = db.prepare('SELECT COUNT(*) c FROM stickers WHERE is_registered=1').get().c;
  if (reg > 0 && !withTest) { console.error(`Refusing to wipe: ${reg} stickers are registered.`); process.exit(1); }
  db.exec('DELETE FROM stickers');
}

const taken = new Set(db.prepare('SELECT sticker_id FROM stickers').pluck().all());
const fixtures = withTest && !addMode ? TEST_FIXTURES.filter(f => !taken.has(f.sticker_id)) : [];
fixtures.forEach(f => taken.add(f.sticker_id));
const records = [...fixtures, ...generateStickers(Math.max(0, count - fixtures.length), taken)];
insertStickers(db, records);

console.log(`Added ${records.length} stickers. Database now holds ${total()}.`);
if (records.length <= 50) console.table(records.map(r => ({ sticker_id: r.sticker_id, serial_number: r.serial_number, state: r.registered ? 'pre-registered demo' : 'unregistered' })));
if (val('out')) {
  fs.writeFileSync(val('out'), 'sticker_id,serial_number\n' + records.map(r => `${r.sticker_id},${r.serial_number}`).join('\n') + '\n');
  console.log(`Wrote ${val('out')}`);
}
