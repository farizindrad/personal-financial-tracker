/**
 * Dev server helper: bebaskan PORT lalu jalankan Nest.
 * Dipakai tsc-watch --onSuccess — di Windows child lama sering
 * tidak mati, sehingga EADDRINUSE muncul berkali-kali.
 */
const { spawn, execSync } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || '3000';
const mainJs = path.join(__dirname, '..', 'dist', 'main.js');

function freePort(port) {
  if (process.platform !== 'win32') {
    try {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    } catch {
      /* empty */
    }
    return;
  }

  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes(`:${port}`) || !line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[dev-serve] freed port ${port} (killed PID ${pid})`);
      } catch {
        /* empty */
      }
    }
  } catch {
    /* empty */
  }
}

freePort(PORT);

const child = spawn(process.execPath, [mainJs], {
  stdio: 'inherit',
  env: process.env,
});

function shutdown() {
  if (child.pid) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'ignore' });
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      /* empty */
    }
  }
  freePort(PORT);
}

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});
process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(0);
  process.exit(code ?? 0);
});
