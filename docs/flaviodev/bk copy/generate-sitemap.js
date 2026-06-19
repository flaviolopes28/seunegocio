// generate-sitemaps.js
const fs = require('fs');
const path = require('path');
const { parseStringPromise, Builder } = require('xml2js');

const DOCS_DIR = path.join(__dirname, 'docs'); // pasta onde estão os HTML exportados
const SITEMAP_DIR = path.join(DOCS_DIR, 'sitemap');
const BASE_URL = 'https://healthandlongevity.reviewnexus.blog'; // seu domínio final

// Função para percorrer todas as páginas HTML recursivamente
function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getHtmlFiles(filePath));
    } else if (file.endsWith('.html')) {
      results.push(filePath);
    }
  });
  return results;
}

// Função para extrair imagens de cada HTML
function extractImages(htmlContent) {
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  let images = [];
  let match;
  while ((match = imgRegex.exec(htmlContent))) {
    images.push(match[1]);
  }
  return images;
}

// Cria a estrutura de um sitemap XML
function buildUrlElement(loc, lastmod, images = []) {
  const url = { loc: `${BASE_URL}${loc}`, lastmod };
  if (images.length) {
    url['image:image'] = images.map((img) => ({
      'image:loc': `${BASE_URL}${img}`,
    }));
  }
  return url;
}

async function generateSitemaps() {
  if (!fs.existsSync(SITEMAP_DIR)) fs.mkdirSync(SITEMAP_DIR, { recursive: true });

  const htmlFiles = getHtmlFiles(DOCS_DIR);

  const pages = [];
  const posts = [];

  const now = new Date().toISOString();

  htmlFiles.forEach((file) => {
    const relativePath = '/' + path.relative(DOCS_DIR, file).replace(/\\/g, '/');
    const htmlContent = fs.readFileSync(file, 'utf8');
    const images = extractImages(htmlContent);

    // Detecta automaticamente se é post ou página (ex: /en/ ou /pt/ dentro do caminho)
    if (/\/(en|pt)\//i.test(relativePath)) {
      posts.push(buildUrlElement(relativePath, now, images));
    } else {
      pages.push(buildUrlElement(relativePath, now, images));
    }
  });

  const builder = new Builder({ headless: true, rootName: 'urlset', xmldec: { version: '1.0', encoding: 'UTF-8' } });

  const postSitemapXml = builder.buildObject({ url: posts });
  const pageSitemapXml = builder.buildObject({ url: pages });

  fs.writeFileSync(path.join(SITEMAP_DIR, 'post-sitemap.xml'), postSitemapXml, 'utf8');
  fs.writeFileSync(path.join(SITEMAP_DIR, 'page-sitemap.xml'), pageSitemapXml, 'utf8');

  // Sitemap index
  const indexBuilder = new Builder({ headless: true, rootName: 'sitemapindex', xmldec
