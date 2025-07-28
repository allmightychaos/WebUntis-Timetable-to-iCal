const https = require('https');

async function resolveWebUntisHost(input) {
  if (!input) throw new Error('WEBUNTIS_DOMAIN missing');
  let host = input.trim();
  if (/^https?:\/\//i.test(host)) {
    try {
      host = new URL(host).hostname;
    } catch (e) {
      throw new Error('Invalid server name');
    }
  }
  if (!host.endsWith('webuntis.com')) {
    host = `${host}.webuntis.com`;
  }
  const testUrl = `https://${host}/WebUntis/`;
  const options = new URL(testUrl);
  options.method = 'HEAD';

  await new Promise((resolve, reject) => {
    const req = https.request(options, () => resolve());
    req.on('error', reject);
    req.end();
  }).catch(() => {
    throw new Error('Could not connect to WebUntis server');
  });

  return host;
}

module.exports = { resolveWebUntisHost };
