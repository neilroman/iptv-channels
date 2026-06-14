const https = require('https');
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
  { key: 'hin', label: 'हिन्दी',       url: 'https://iptv-org.github.io/iptv/languages/hin.m3u' },
  { key: 'ind', label: 'Indonesia',  url: 'https://iptv-org.github.io/iptv/languages/ind.m3u' },
  { key: 'nld', label: 'Nederlands', url: 'https://iptv-org.github.io/iptv/languages/nld.m3u' },
  { key: 'pol', label: 'Polski',     url: 'https://iptv-org.github.io/iptv/languages/pol.m3u' },
  { key: 'ron', label: 'Română',     url: 'https://iptv-org.github.io/iptv/languages/ron.m3u' },
];

const SKIP_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'example.com'];

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(fetchURL(res.headers.location));
      }
      if (res.statusCode !== 200) return resolve('');
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
      const namePart = line.split(',');
      const name     = namePart.slice(1).join(',').trim();
      const logo     = (line.match(/tvg-logo="([^"]*)"/)     || [])[1] || '';
      const country  = (line.match(/tvg-country="([^"]*)"/)  || [])[1] || '';
      const language = (line.match(/tvg-language="([^"]*)"/) || [])[1] || '';
      const group    = (line.match(/group-title="([^"]*)"/)  || [])[1] || 'General';
      current = { name, logo, country, language, group, url: '' };
    } else if (line && !line.startsWith('#') && current) {
      current.url = line;
      const ok = current.url.startsWith('http') &&
                 !SKIP_HOSTS.some(s => current.url.includes(s)) &&
                 current.name.trim() !== '';
      if (ok) {
        channels.push({
          name:     current.name,
          logo:     current.logo,
          country:  current.country,
          language: current.language,
          group:    current.group,
          url:      current.url,
          isHttps:  current.url.startsWith('https')
        });
      }
      current = null;
    }
  }
  return channels;
}

function sortChannels(channels) {
  return channels.sort((a, b) => {
    if (a.isHttps && !b.isHttps) return -1;
    if (!a.isHttps && b.isHttps) return 1;
    return a.name.localeCompare(b.name);
  });
}

async function processSource(key, url, prefix) {
  console.log(`[${key}] Descargando...`);
  try {
    const content = await fetchURL(url);
    if (!content || content.length < 100) {
      console.log(`[${key}] Sin contenido - omitiendo`);
      return 0;
    }
    const channels = sortChannels(parseM3U(content));
    const filename = `${prefix}${key}.json`;
    fs.writeFileSync(filename, JSON.stringify(channels, null, 2));
    console.log(`[${key}] OK - ${channels.length} canales -> ${filename}`);
    return channels.length;
  } catch(e) {
    console.log(`[${key}] ERROR: ${e.message}`);
    return 0;
  }
}

async function main() {
  console.log('=== CATEGORIAS ===');
  for (const s of CATEGORIES) {
    const file = s.key === 'all' ? 'channels.json' : `channels_${s.key}.json`;
    const prefix = s.key === 'all' ? '' : 'channels_';
    const key = s.key === 'all' ? 'all' : s.key;
    await processSource(key, s.url, prefix === '' ? '' : 'channels_');
  }

  console.log('\n=== IDIOMAS ===');
  for (const l of LANGUAGES) {
    await processSource(l.key, l.url, 'lang_');
  }

  // Index de categorias
  const catIndex = {
    updated: new Date().toISOString(),
    categories: [
      { key: 'all',           label: 'Todos',          file: 'channels.json' },
      { key: 'movies',        label: 'Peliculas',       file: 'channels_movies.json' },
      { key: 'series',        label: 'Series',          file: 'channels_series.json' },
      { key: 'sport',         label: 'Deportes',        file: 'channels_sport.json' },
      { key: 'news',          label: 'Noticias',        file: 'channels_news.json' },
      { key: 'music',         label: 'Musica',          file: 'channels_music.json' },
      { key: 'documentary',   label: 'Documentales',    file: 'channels_documentary.json' },
      { key: 'animation',     label: 'Animacion',       file: 'channels_animation.json' },
      { key: 'kids',          label: 'Infantil',        file: 'channels_kids.json' },
      { key: 'entertainment', label: 'Entretenimiento', file: 'channels_entertainment.json' },
      { key: 'comedy',        label: 'Comedia',         file: 'channels_comedy.json' },
      { key: 'cooking',       label: 'Cocina',          file: 'channels_cooking.json' },
      { key: 'travel',        label: 'Viajes',          file: 'channels_travel.json' },
      { key: 'science',       label: 'Ciencia',         file: 'channels_science.json' },
      { key: 'religious',     label: 'Religion',        file: 'channels_religious.json' },
    ]
  };
  fs.writeFileSync('categories.json', JSON.stringify(catIndex, null, 2));

  // Index de idiomas
  const langIndex = {
    updated: new Date().toISOString(),
    languages: LANGUAGES.map(l => ({
      key:   l.key,
      label: l.label,
      file:  `lang_${l.key}.json`
    }))
  };
  fs.writeFileSync('languages.json', JSON.stringify(langIndex, null, 2));

  console.log('\ncategories.json y languages.json generados OK');
  console.log('Todo completado!');
}

main().catch(console.error);
