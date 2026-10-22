const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');

function databaseConfig(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('MYSQL_CONFIG_INVALID'); }
  if (url.protocol !== 'mysql:' || !/^\/[a-zA-Z0-9_]+$/.test(url.pathname)) throw new Error('MYSQL_CONFIG_INVALID');
  return url;
}
const quoteOption = (value) => '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';

async function runMysql(tool, value, args, io = {}, env = process.env) {
  const url = databaseConfig(value);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-mysql-'));
  const options = path.join(dir, 'client.cnf');
  fs.writeFileSync(options, ['[client]', 'protocol=TCP',
    'host=' + quoteOption(url.hostname), 'port=' + (url.port || '3306'),
    'user=' + quoteOption(decodeURIComponent(url.username)), 'password=' + quoteOption(decodeURIComponent(url.password)),
  ].join('\n'), { mode: 0o600, flag: 'wx' });
  try {
    const binary = env.MYSQL_BIN_DIR ? path.join(env.MYSQL_BIN_DIR, tool + (process.platform === 'win32' ? '.exe' : '')) : tool;
    const child = spawn(binary, ['--defaults-extra-file=' + options, ...args, url.pathname.slice(1)], { windowsHide: true, stdio: [io.input ? 'pipe' : 'ignore', io.output ? 'pipe' : 'ignore', 'pipe'] });
    child.stderr.resume();
    const done = new Promise((resolve, reject) => {
      child.once('error', () => reject(new Error('MYSQL_TOOL_UNAVAILABLE')));
      child.once('exit', (code) => code === 0 ? resolve() : reject(new Error('MYSQL_COMMAND_FAILED')));
    });
    const streams = [];
    if (io.input) streams.push(pipeline(fs.createReadStream(io.input), child.stdin));
    if (io.output) streams.push(pipeline(child.stdout, fs.createWriteStream(io.output, { mode: 0o600, flags: 'wx' })));
    await Promise.all([done, ...streams]);
  } finally {
    fs.unlinkSync(options);
    fs.rmdirSync(dir);
  }
}

module.exports = { databaseConfig, quoteOption, runMysql };
