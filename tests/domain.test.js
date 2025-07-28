const assert = require('assert');
const https = require('https');
const { resolveWebUntisHost } = require('../core/domain');

async function testValidDomain() {
  process.env.WEBUNTIS_DOMAIN = 'demo';
  const originalRequest = https.request;
  https.request = (_opts, cb) => {
    const res = { on: () => {} };
    process.nextTick(() => cb(res));
    return { on: () => {}, end: () => {} };
  };
  try {
    const host = await resolveWebUntisHost(process.env.WEBUNTIS_DOMAIN);
    assert.strictEqual(host, 'demo.webuntis.com');
  } finally {
    https.request = originalRequest;
  }
}

async function testInvalidDomain() {
  process.env.WEBUNTIS_DOMAIN = 'invalid';
  try {
    await resolveWebUntisHost(process.env.WEBUNTIS_DOMAIN);
    assert.fail('Expected invalid domain error');
  } catch (err) {
    assert.strictEqual(err.message, 'Entered server does not exist');
  }
}

async function testUnreachableDomain() {
  process.env.WEBUNTIS_DOMAIN = 'demo';
  const originalRequest = https.request;
  https.request = () => {
    const { EventEmitter } = require('events');
    const req = new EventEmitter();
    req.end = () => process.nextTick(() => req.emit('error', new Error('fail')));
    return req;
  };
  try {
    await resolveWebUntisHost(process.env.WEBUNTIS_DOMAIN);
    assert.fail('Expected connection error');
  } catch (err) {
    assert.strictEqual(err.message, 'Could not connect to WebUntis server');
  } finally {
    https.request = originalRequest;
  }
}

async function run() {
  await testValidDomain();
  await testInvalidDomain();
  await testUnreachableDomain();
  console.log('domain tests passed');
}

run();

