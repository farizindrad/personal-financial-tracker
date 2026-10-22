require('./test-database.cjs').loadTestEnvironment();
process.env.TS_NODE_PROJECT = require('path').join(__dirname, '../tsconfig.json');
require('ts-node/register');
require('../test/helpers/server.ts');
