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
  { key: 'spa', label: 'Español',    url: 'https://iptv-org.github.io/iptv/languages/spa.m3u' },
  { key: 'eng', label: 'English',    url: 'https://iptv-org.github.io/iptv/languages/eng.m3u' },
  { key: 'por', label: 'Português',  url: 'https://iptv-org.github.io/iptv/languages/por.m3u' },
  { key: 'fra', label: 'Français',   url: 'https://iptv-org.github.io/iptv/languages/fra.m3u' },
  { key: 'deu', label: 'Deutsch',    url: 'https://iptv-org.github.io/iptv/languages/deu.m3u' },
  { key: 'ara', label: 'العربية',    url: 'https://iptv-org.github.io/iptv/languages/ara.m3u' },
  { key: 'ita', label: 'Italiano',   url: 'https://iptv-org.github.io/iptv/languages/ita.m3u' },
  { key: 'rus', label: 'Русский',    url: 'https://iptv-org.github.io/iptv/languages/rus.m3u' },
  { key: 'zho', label: '中文',        url: 'https://iptv-org.github.io/iptv/languages/zho.m3u' },
  { key: 'tur', label: 'Türkçe',     url: 'https://iptv-org.github.io/iptv/languages/tur.m3u' },
  { key: 'hin', label: 'Hindi',      url: 'https://iptv-org.github.io/iptv/languages/hin.m3u' },
  { key: 'ind', label: 'Indonesia',  url: 'https://iptv-org.github.io/iptv/languages/ind.m3u' },
  { key: 'nld', label: 'Nederlands', url: 'https://iptv-org.github.io/iptv/languages/nld.m3u' },
  { key: 'pol', label: 'Polski',     url: 'https://iptv-org.github.io/iptv/languages/pol.m3u' },
  { key: 'ron', label: 'Română',     url: 'https://iptv-org.github.io/iptv/languages/ron.m3u' },
];

const SOURCES = [
  { key: 'freetv',   label: 'Free-TV',      url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8' },
  { key: 'tdt',      label: 'TDT España',   url: 'https://www.tdtchannels.com/lists/tv.m3u' },
  { key: 'radio',    label: 'Radio España', url: 'https://www.tdtchannels.com/lists/radio.m3u' },
  { key: 'pluto',    label: 'Pluto TV',     url: 'https://i.mjh.nz/PlutoTV/all.m3u8' },
  { key: 'samsung',  label: 'Samsung TV+',  url: 'https://i.mjh.nz/SamsungTVPlus/all.m3u8' },
  { key: 'plex',     label: 'Plex TV',      url: 'https://i.mjh.nz/Plex/all.m3u8' },
  { key: 'stirr',    label: 'Stirr',        url: 'https://i.mjh.nz/Stirr/all.m3u8' },
];

const SKIP_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'example.com'];

function fetchURL(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve) => {
    if (redirects > 5) return resolve('');
    try {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          res.destroy();
          return resolve(fetchURL(res.headers.location, redirects + 1));
        }
        if (res.statusCode !== 200) { res.destroy(); return resolve(''); }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
        res.on('error', () => resolve(''));
      }).on('error', () => resolve(''));
    } catch(e) { resolve(''); }
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
                 current.name.trim() !== '';
      if (ok) channels.push({ ...current, url, isHttps: url.startsWith('https') });
      current = null;
    }
  }
  return channels;
}

function sortChannels(ch) {
  return ch.sort((a, b) => {
    if (a.isHttps && !b.isHttps) return -1;
    if (!a.isHttps && b.isHttps) return 1;
    return a.name.localeCompare(b.name);
  });
}

async function processSource(key, url, prefix) {
  console.log(`[${key}] Descargando...`);
  try {
    const content = await fetchURL(url);
    if (!content || content.length < 100) { console.log(`[${key}] Sin contenido`); return 0; }
    const channels = sortChannels(parseM3U(content));
    const filename = prefix === '' ? 'channels.json' : `${prefix}${key}.json`;
    fs.writeFileSync(filename, JSON.stringify(channels, null, 2));
    console.log(`[${key}] OK - ${channels.length} canales -> ${filename}`);
    return channels.length;
  } catch(e) { console.log(`[${key}] ERROR: ${e.message}`); return 0; }
}

async function main() {
  console.log('=== CATEGORIAS ===');
  for (const s of CATEGORIES) {
    await processSource(s.key, s.url, s.key === 'all' ? '' : 'channels_');
  }
  console.log('\n=== IDIOMAS ===');
  for (const l of LANGUAGES) {
    await processSource(l.key, l.url, 'lang_');
  }
  console.log('\n=== FUENTES ===');
  const sourceCounts = {};
  for (const s of SOURCES) {
    sourceCounts[s.key] = await processSource(s.key, s.url, 'src_');
  }
  fs.writeFileSync('languages.json', JSON.stringify({
    updated: new Date().toISOString(),
    languages: LANGUAGES.map(l => ({ key: l.key, label: l.label, file: `lang_${l.key}.json` }))
  }, null, 2));
  fs.writeFileSync('categories.json', JSON.stringify({
    updated: new Date().toISOString(),
    categories: CATEGORIES.map(c => ({ key: c.key, file: c.key === 'all' ? 'channels.json' : `channels_${c.key}.json` }))
  }, null, 2));
  fs.writeFileSync('sources.json', JSON.stringify({
    updated: new Date().toISOString(),
    sources: SOURCES.map(s => ({ key: s.key, label: s.label, file: `src_${s.key}.json`, count: sourceCounts[s.key] || 0 }))
  }, null, 2));
  console.log('\nTodo completado!');
}

main().catch(console.error);
