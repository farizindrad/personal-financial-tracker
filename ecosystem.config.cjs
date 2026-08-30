/**
 * PM2 — 1 proses Node per instance (VPS kecil, jangan cluster).
 *
 * Docker: `pm2-runtime start ecosystem.config.cjs` (lihat Dockerfile).
 * Host (tanpa Docker), dari folder backend setelah build:
 *   pm2 start ../ecosystem.config.cjs --only finance-app
 *
 * Env (DATABASE_URL, PORT, IS_DEMO) dari environment / env_file —
 * jangan hardcode credential di file ini.
 */
module.exports = {
  apps: [
    {
      name: 'finance-app',
      script: './dist/main.js',
      cwd: process.env.PM2_CWD || '.',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '250M',
      kill_timeout: 5_000,
      listen_timeout: 10_000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
