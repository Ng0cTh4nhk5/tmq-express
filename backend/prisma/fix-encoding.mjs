// Fix script: reverses Windows-1252 mojibake back to correct UTF-8
// Run: node prisma/fix-encoding.mjs
import { readFileSync, writeFileSync } from 'fs';

// CP1252 byte → Unicode codepoint for the special 0x80–0x9F range
// Includes the 5 "undefined" bytes that Windows treats as their literal codepoints
const cp1252Special = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
  0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
  0x9E: 0x017E, 0x9F: 0x0178,
  // Undefined CP1252 bytes — Windows maps them to their literal codepoints
  0x81: 0x0081, 0x8D: 0x008D, 0x8F: 0x008F, 0x90: 0x0090, 0x9D: 0x009D
};

// Build reverse map: Unicode codepoint → original CP1252 byte
const unicodeToByte = new Map();
for (const [byte, unicode] of Object.entries(cp1252Special)) {
  unicodeToByte.set(unicode, parseInt(byte));
}
// 0xA0–0xFF: direct correspondence
for (let i = 0xA0; i <= 0xFF; i++) {
  unicodeToByte.set(i, i);
}

// Read corrupted file as UTF-8 (produces mojibake string)
const mojibake = readFileSync('prisma/seed.js', 'utf8');

// Convert mojibake back to original bytes
const originalBytes = [];
for (const char of mojibake) {
  const code = char.codePointAt(0);
  if (code < 0x80) {
    // ASCII range: unchanged
    originalBytes.push(code);
  } else if (unicodeToByte.has(code)) {
    // Known CP1252 character → restore original byte
    originalBytes.push(unicodeToByte.get(code));
  } else {
    // Outside known range: re-encode as UTF-8 (shouldn't happen for our file)
    const buf = Buffer.from(char, 'utf8');
    for (const b of buf) originalBytes.push(b);
  }
}

const restored = Buffer.from(originalBytes);
writeFileSync('prisma/seed.js', restored);
console.log(`✅ Fixed encoding: ${mojibake.length} chars → ${originalBytes.length} bytes`);

// Verify a sample
const verify = readFileSync('prisma/seed.js', 'utf8');
const sample = verify.match(/don_vi_gui: '[^']+'/)?.[0];
console.log('Sample check:', sample);
