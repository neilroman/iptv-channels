const https = require('https');
const http = require('http');
const fs = require('fs');

const CATEGORIES = [
  { key: 'all',           url: 'https://iptv-org.github.io/iptv/index.m3u' },
  { key: 'movies',        url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
  { key: 'series',        url: 'https://iptv-org.github.io/iptv/categories/series.m3u' },
  { key: 'animation',     url: 'https://iptv-org.github.io/iptv/categories/animation.m3u' },
  { key: 'documentary',   url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u' },
  { key: 'music',         url: 'https://iptv-org.github.io/iptv/categories/music.m3u' },
  { key: 'news',          url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
  { key: 'sport',         url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
  { key: 'kids',          url: 'https://iptv-org.github.io/iptv/categories/kids.m3u' },
  { key: 'entertainment', url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u' },
  { key: 'comedy',        url: 'https://iptv-org.github.io/iptv/categories/comedy.m3u' },
  { key: 'cooking',       url: 'https://iptv-org.github.io/iptv/categories/cooking.m3u' },
  { key: 'religious',     url: 'https://iptv-org.github.io/iptv/categories/religious.m3u' },
  { key: 'travel',        url: 'https://iptv-org.github.io/iptv/categories/travel.m3u' },
  { key: 'science',       url: 'https://iptv-org.github.io/iptv/categories/science.m3u' },
];

const LANGUAGES = [
  { key: 'spa', url: 'https://iptv-org.github.io/iptv/languages/spa.m3u' },
  { key: 'eng', url: 'https://iptv-org.github.io/iptv/languages/eng.m3u' },
  { key: 'por', url: 'https://iptv-org.github.io/iptv/languages/por.m3u' },
  { key: 'fra', url: 'https://iptv-org.github.io/iptv/languages/fra.m3u' },
  { key: 'deu', url: 'https://iptv-org.github.io/iptv/languages/deu.m3u' },
  { key: 'ara', url: 'https://iptv-org.github.io/iptv/languages/ara.m3u' },
  { key: 'ita', url: 'https://iptv-org.github.io/iptv/languages/ita.m3u' },
  { key: 'rus', url: 'https://iptv-org.github.io/iptv/languages/rus.m3u' },
  { key: 'zho', url: 'https://iptv-org.github.io/iptv/languages/zho.m3u' },
  { key: 'tur', url: 'https://iptv-org.github.io/iptv/languages/tur.m3u' },
  { key: 'hin', url: 'https://iptv-org.github.io/iptv/languages/hin.m3u' },
  { key: 'ind', url: 'https://iptv-org.github.io/iptv/languages/ind.m3u' },
  { key: 'nld', url: 'https://iptv-org.github.io/iptv/languages/nld.m3u' },
  { key: 'pol', url: 'https://iptv-org.github.io/iptv/languages/pol.m3u' },
  { key: 'ron', url: 'https://iptv-org.github.io/iptv/languages/ron.m3u' },
];

const SKIP_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'example.com'];

// Patrones de URLs que sabemos que no funcionan en navegador
const BLOCKED_PATTERNS = [
  'samsung-tvplus', 'samsungtvplus', 'pluto.tv', 'plutotv',
  'peacocktv.com', 'tubi.tv', 'stirr.com', 'plex.tv',
  'jmp2.uk',        // Samsung TV Plus proxy
  'token=', 'authToken=', 'jwt=',  // Canales con autenticacion
];

// Puertos no estandar bloqueados por navegadores
const BLOCKED_PORTS = [':1935', ':1936', ':4000', ':5000', ':5735', ':8081', ':9981'];

function isBlocked(url) {
  const lower = url.toLowerCase();
  if (BLOCKED_PATTERNS.some(p => lower.includes(p.toLowerCase()))) return true;
  if (BLOCKED_PORTS.some(p => lower.includes(p))) return true;
  return false;
}

function fetchURL(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
        timeout: 8000
      }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          res.destroy();
          if (loc) return resolve(fetchURL(loc));
          return resolve('');
        }
        if (res.statusCode !== 200) { res.destroy(); return resolve(''); }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', () => resolve(''));
      });
      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
    } catch(e) { resolve(''); }
  });
}

// Verificar si un stream responde (HEAD request rapido)
function checkStream(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const urlObj = new URL(url);
      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port || (url.startsWith('https') ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': '*/*'
        },
        timeout: 6000
      }, (res) => {
        const ok = res.statusCode >= 200 && res.statusCode < 400;
        res.destroy();
        resolve(ok);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch(e) { resolve(false); }
  });
}

function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
      const name     = line.split(',').slice(1).join(',').trim();
      const logo     = (line.match(/tvg-logo="([^"]*)"/)     || [])[1] || '';
      const country  = (line.match(/tvg-country="([^"]*)"/)  || [])[1] || '';
      const language = (line.match(/tvg-language="([^"]*)"/) || [])[1] || '';
      const group    = (line.match(/group-title="([^"]*)"/)  || [])[1] || 'General';
      current = { name, logo, country, language, group };
    } else if (line && !line.startsWith('#') && current) {
      const url = line.trim();
      const ok = url.startsWith('http') &&
                 !SKIP_HOSTS.some(s => url.includes(s)) &&
                 current.name.trim() !== '' &&
                 !isBlocked(url);
      if (ok) {
        channels.push({
          name:     current.name,
          logo:     current.logo,
          country:  current.country,
          language: current.language,
          group:    current.group,
          url:      url,
          isHttps:  url.startsWith('https')
        });
      }
      current = null;
    }
  }
  return channels;
}

// Verificar canales en paralelo con limite de concurrencia
async function verifyChannels(channels, concurrency = 20) {
  const results = [];
  const dead = [];
  let checked = 0;

  for (let i = 0; i < channels.length; i += concurrency) {
    const batch = channels.slice(i, i + concurrency);
    const checks = await Promise.all(
      batch.map(async (ch) => {
        const alive = await checkStream(ch.url);
        checked++;
        if (checked % 50 === 0) {
          process.stdout.write(`  Verificados: ${checked}/${channels.length}\r`);
        }
        return { ch, alive };
      })
    );
    checks.forEach(({ ch, alive }) => {
      if (alive) results.push(ch);
      else dead.push(ch.name + ' | ' + ch.url);
    });
  }

  console.log(`\n  Activos: ${results.length} | Inactivos: ${dead.length}`);
  return { results, dead };
}

function sortChannels(ch) {
  return ch.sort((a, b) => {
    if (a.isHttps && !b.isHttps) return -1;
    if (!a.isHttps && b.isHttps) return 1;
    return a.name.localeCompare(b.name);
  });
}

async function processSource(key, url, prefix, verify = false) {
  console.log(`\n[${key}] Descargando...`);
  try {
    const content = await fetchURL(url);
    if (!content || content.length < 100) {
      console.log(`[${key}] Sin contenido - omitiendo`);
      return;
    }
    let channels = parseM3U(content);
    console.log(`[${key}] Parseados: ${channels.length}`);

    // Solo verificar si se pide (tarda mucho para 'all')
    if (verify) {
      console.log(`[${key}] Verificando streams...`);
      const { results, dead } = await verifyChannels(channels, 30);
      channels = results;
      // Guardar lista de canales muertos
      fs.writeFileSync(`dead_${key}.txt`, dead.join('\n'));
    }

    channels = sortChannels(channels);
    const filename = prefix === '' ? 'channels.json' : `${prefix}${key}.json`;
    fs.writeFileSync(filename, JSON.stringify(channels, null, 2));
    console.log(`[${key}] Guardados: ${channels.length} -> ${filename}`);
  } catch(e) {
    console.log(`[${key}] ERROR: ${e.message}`);
  }
}

async function main() {
  const verifyAll = process.argv.includes('--verify');
  if (verifyAll) {
    console.log('Modo verificacion activado - esto tardara mas tiempo\n');
  }

  console.log('=== CATEGORIAS ===');
  for (const s of CATEGORIES) {
    // Verificar solo categorias pequeñas para no tardar demasiado
    const shouldVerify = verifyAll && s.key !== 'all';
    await processSource(s.key, s.url, s.key === 'all' ? '' : 'channels_', shouldVerify);
  }

  console.log('\n=== IDIOMAS ===');
  for (const l of LANGUAGES) {
    await processSource(l.key, l.url, 'lang_', verifyAll);
  }

  // Index de idiomas
  const LANG_LABELS = {
    spa:'Español', eng:'English', por:'Português', fra:'Français',
    deu:'Deutsch', ara:'العربية', ita:'Italiano', rus:'Русский',
    zho:'中文', tur:'Türkçe', hin:'Hindi', ind:'Indonesia',
    nld:'Nederlands', pol:'Polski', ron:'Română'
  };

  fs.writeFileSync('languages.json', JSON.stringify({
    updated: new Date().toISOString(),
    languages: LANGUAGES.map(l => ({
      key: l.key,
      label: LANG_LABELS[l.key] || l.key,
      file: `lang_${l.key}.json`
    }))
  }, null, 2));

  fs.writeFileSync('categories.json', JSON.stringify({
    updated: new Date().toISOString(),
    categories: CATEGORIES.map(c => ({
      key: c.key,
      file: c.key === 'all' ? 'channels.json' : `channels_${c.key}.json`
    }))
  }, null, 2));

  console.log('\nTodo completado!');
}

main().catch(console.error);
