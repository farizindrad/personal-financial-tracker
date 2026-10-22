// Windows can terminate the server tree without delivering SIGTERM to Node.
// Run guarded cleanup from the runner as well, including after failed tests.
module.exports = async () => {
  require('child_process').execFileSync(process.execPath,
    [require('path').resolve(__dirname, '../../backend/scripts/cleanup-test-app.cjs')],
    { stdio: 'inherit', windowsHide: true });
};
