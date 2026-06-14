const https = require('https');
const http = require('http');
const fs = require('fs');

const M3U_URL = 'https://iptv-org.github.io/iptv/index.m3u';

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(fetchURL(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF')) {
      const name = line.split(',').pop().trim();
      const tvgId = (line.match(/tvg-id="([^"]*)"/) || [])[1] || '';
      const tvgName = (line.match(/tvg-name="([^"]*)"/) || [])[1] || name;
      const logo = (line.match(/tvg-logo="([^"]*)"/) || [])[1] || '';
      const country = (line.match(/tvg-country="([^"]*)"/) || [])[1] || '';
      const language = (line.match(/tvg-language="([^"]*)"/) || [])[1] || '';
      const group = (line.match(/group-title="([^"]*)"/) || [])[1] || 'General';

      current = { name, tvgId, tvgName, logo, country, language, group, url: '' };

    } else if (line && !line.startsWith('#') && current) {
      current.url = line;
      // Solo incluir canales con URL válida
      if (current.url.startsWith('http')) {
        channels.push(current);
      }
      current = null;
    }
  }

  return channels;
}

async function main() {
  console.log('Descargando index.m3u...');
  const content = await fetchURL(M3U_URL);
  console.log(`Descargado: ${content.length} bytes`);

  const channels = await parseM3U(content);
  console.log(`Canales parseados: ${channels.length}`);

  fs.writeFileSync('channels.json', JSON.stringify(channels, null, 2));
  console.log('channels.json guardado');
}

main().catch(console.error);