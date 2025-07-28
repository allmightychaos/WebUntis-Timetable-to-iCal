const assert = require('assert');
const https = require('https');
const { resolveWebUntisHost } = require('../core/domain');

async function run() {
  const originalRequest = https.request;
  https.request = (_opts, cb) => {
    const res = { statusCode: 200, on: () => {} };
    process.nextTick(() => cb(res));
    return { on: () => {}, end: () => {} };
  };
  try {
    const host1 = await resolveWebUntisHost('nete');
    assert.strictEqual(host1, 'nete.webuntis.com');

    const host2 = await resolveWebUntisHost('https://demo.webuntis.com');
    assert.strictEqual(host2, 'demo.webuntis.com');
    console.log('domain tests passed');
  } finally {
    https.request = originalRequest;
  }
}

run();
