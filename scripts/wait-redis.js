/* eslint-disable @typescript-eslint/no-var-requires */

const redis = require('redis');
const chalk = require('chalk').default;
const SECOND = 1000;

const log = msg => console.info(chalk.yellow(msg));

const wait = async () => {
  log(' -- Waiting for Redis to be ready...');
  const client = await redis.createClient();
  await new Promise((res, rej) => client.on('connect', err => err ? rej() : res()));
}

(async function() {
  await wait();
  process.exit();
})();
