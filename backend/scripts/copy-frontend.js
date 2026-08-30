const { cpSync, existsSync, mkdirSync, rmSync } = require('fs');
const { join } = require('path');

const src = join(__dirname, '..', '..', 'frontend', 'dist');
const dest = join(__dirname, '..', 'public');

if (!existsSync(src)) {
  console.error('frontend/dist not found. Run: npm run build --prefix ../frontend');
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Copied frontend/dist → backend/public`);
