const https = require('https');
const fs = require('fs');

const SOURCES = [
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

const SKIP_HOSTS = [
  'localhost', '127.0.0.1', '0.0.0.0', 'example.com'
];

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(fetchURL(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return resolve('');
      }
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
      const name = namePart.slice(1).join(',').trim();
      const logo     = (line.match(/tvg-logo="([^"]*)"/)     || [])[1] || '';
      const country  = (line.match(/tvg-country="([^"]*)"/)  || [])[1] || '';
      const language = (line.match(/tvg-language="([^"]*)"/) || [])[1] || '';
      const group    = (line.match(/group-title="([^"]*)"/)  || [])[1] || 'General';
      current = { name, logo, country, language, group, url: '' };

    } else if (line && !line.startsWith('#') && current) {
      current.url = line;
      const isValid = current.url.startsWith('http') &&
                      !SKIP_HOSTS.some(s => current.url.includes(s)) &&
                      current.name.trim() !== '';
      if (isValid) {
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

async function main() {
  console.log('Iniciando descarga de categorias...\n');

  for (const source of SOURCES) {
    console.log(`[${source.key}] Descargando ${source.url}`);
    try {
      const content = await fetchURL(source.url);
      if (!content || content.length < 100) {
        console.log(`[${source.key}] Sin contenido - omitiendo`);
        continue;
      }

      const channels = parseM3U(content);

      // Ordenar HTTPS primero, luego por nombre
      channels.sort((a, b) => {
        if (a.isHttps && !b.isHttps) return -1;
        if (!a.isHttps && b.isHttps) return 1;
        return a.name.localeCompare(b.name);
      });

      const filename = source.key === 'all' ? 'channels.json' : `channels_${source.key}.json`;
      fs.writeFileSync(filename, JSON.stringify(channels, null, 2));
      console.log(`[${source.key}] OK - ${channels.length} canales -> ${filename}`);

    } catch(e) {
      console.log(`[${source.key}] ERROR: ${e.message}`);
    }
  }

  // Generar index de categorias
  const index = {
    updated: new Date().toISOString(),
    categories: [
      { key: 'all',           label: '📺 Todos',          file: 'channels.json' },
      { key: 'movies',        label: '🎬 Películas',       file: 'channels_movies.json' },
      { key: 'series',        label: '🎭 Series',          file: 'channels_series.json' },
      { key: 'sport',         label: '⚽ Deportes',        file: 'channels_sport.json' },
      { key: 'news',          label: '📰 Noticias',        file: 'channels_news.json' },
      { key: 'music',         label: '🎵 Música',          file: 'channels_music.json' },
      { key: 'documentary',   label: '🎥 Documentales',    file: 'channels_documentary.json' },
      { key: 'animation',     label: '🐭 Animación',       file: 'channels_animation.json' },
      { key: 'kids',          label: '👶 Infantil',        file: 'channels_kids.json' },
      { key: 'entertainment', label: '🎪 Entretenimiento', file: 'channels_entertainment.json' },
      { key: 'comedy',        label: '😂 Comedia',         file: 'channels_comedy.json' },
      { key: 'cooking',       label: '🍳 Cocina',          file: 'channels_cooking.json' },
      { key: 'travel',        label: '✈️ Viajes',           file: 'channels_travel.json' },
      { key: 'science',       label: '🔬 Ciencia',         file: 'channels_science.json' },
      { key: 'religious',     label: '✝️ Religión',         file: 'channels_religious.json' },
    ]
  };

  fs.writeFileSync('categories.json', JSON.stringify(index, null, 2));
  console.log('\ncategories.json generado OK');
  console.log('\nTodo completado!');
}

main().catch(console.error);
