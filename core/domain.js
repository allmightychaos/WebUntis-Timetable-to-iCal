const https = require('https');

// Static list of known WebUntis servers. If your server is missing, please
// check https://status.webuntis.com/ and open a PR to update this list.
const WEBUNTIS_SERVERS = [
  'demo', 'kevin', 'mese', 'mytea', 'nete', 'nero', 'radix', 'willi'
];

async function resolveWebUntisHost(input) {
  if (!input) throw new Error('WEBUNTIS_DOMAIN missing');

  let host = input.trim();

  // allow protocol/full URL
  if (/^https?:\/\//i.test(host)) {
    try {
      host = new URL(host).hostname;
    } catch {
      throw new Error('Invalid server name');
    }
  }

  if (host.endsWith('.webuntis.com')) {
    host = host.replace(/\.webuntis\.com$/, '');
  }

  if (!WEBUNTIS_SERVERS.includes(host)) {
    throw new Error('Entered server does not exist');
  }

  const fullHost = `${host}.webuntis.com`;

  await new Promise((resolve, reject) => {
    const req = https.request({ method: 'HEAD', host: fullHost, path: '/' }, () => resolve());
    req.on('error', reject);
    req.end();
  }).catch(() => {
    throw new Error('Could not connect to WebUntis server');
  });

  return fullHost;
}

module.exports = { resolveWebUntisHost, WEBUNTIS_SERVERS };
