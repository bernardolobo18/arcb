import { createHash, randomBytes } from 'node:crypto';
import { argv } from 'node:process';

const pin = String(argv[2] || '').replace(/\D/g, '');

if (!/^\d{4}$/.test(pin)) {
  console.error('Uso: node scripts/hash-pin.mjs 1234');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = createHash('sha256').update(`${salt}:${pin}`).digest('hex');

console.log(`POS_PIN_SALT=${salt}`);
console.log(`POS_PIN_HASH=${hash}`);
