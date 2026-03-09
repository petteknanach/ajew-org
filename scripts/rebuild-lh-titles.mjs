import fs from 'fs';
import path from 'path';

const targetRoot = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/src/pages/teachings/likutay-halachos';
const indexPagePath = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/src/pages/teachings/likutay-halachos.astro';

const volumes = [
    "orach-chaim-1",
    "orach-chaim-2",
    "orach-chaim-3",
    "yoreh-daya-1",
    "yoreh-daya-2",
    "choshen-mishpat-1",
    "choshen-mishpat-2",
    "evven-hu-ezehr"
];

const niceTitles = {
    "orach-chaim-1": "Orach Chaim 1",
    "orach-chaim-2": "Orach Chaim 2",
    "orach-chaim-3": "Orach Chaim 3",
    "yoreh-daya-1": "Yoreh Daya 1",
    "yoreh-daya-2": "Yoreh Daya 2",
    "choshen-mishpat-1": "Choshen Mishpat 1",
    "choshen-mishpat-2": "Choshen Mishpat 2",
    "evven-hu-ezehr": "Evven Hu-ezehr"
};

function formatTitle(slug) {
    return slug.replace(/-/g, ' ')
               .replace(/\b[a-z]/g, l => l.toUpperCase())
               .replace(/Part(\d)/gi, 'Part ')
               .replace(/Halacha(\d)/gi, 'Halacha ')
               .replace(/Halachos(\d)/gi, 'Halachos ')
               .replace(/(\d+)/g, '  ')
               .replace(/\s+/g, ' ')
               .trim();
}

let indexHtml = '---' + '\n' +
'import Layout from \'../../layouts/Layout.astro\';' + '\n' +
'---' + '\n\n' +
'<Layout title="Likutay Halachos - Breslov Teachings" description="Likutay Halachos English Translations">' + '\n' +
'<style>' + '\n' +
'  .page-header { background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; padding: 4rem 2rem; text-align: center; }' + '\n' +
'  .page-header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; font-family: \'Cinzel\', serif; }' + '\n' +
'  .container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }' + '\n' +
'  .volume-section { margin-top: 4rem; }' + '\n' +
'  .volume-title { font-family: \'Cinzel\', serif; font-size: 2rem; color: #1a365d; border-bottom: 2px solid #d4c9a8; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }' + '\n' +
'  .topics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }' + '\n' +
'  .topic-card { background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden; transition: all 0.2s; text-decoration: none; display: block; border: 1px solid #eee; }' + '\n' +
'  .topic-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); border-color: #1a365d; }' + '\n' +
'  .topic-card-body { padding: 1.25rem; color: #1a365d; font-weight: 500; }' + '\n' +
'</style>' + '\n' +
'<section class="page-header">' + '\n' +
'  <h1>Likutay Halachos</h1>' + '\n' +
'  <p style="font-family: \'EB Garamond\', serif; font-size: 1.2em; font-style: italic;">Comprehensive English Translations</p>' + '\n' +
'</section>' + '\n' +
'<section class="content" style="padding-bottom: 4rem; background: #faf8f4;">' + '\n' +
'  <div class="container">' + '\n';

for (const volSlug of volumes) {
    const volPath = path.join(targetRoot, volSlug);
    if (!fs.existsSync(volPath)) continue;
    
    let volTitle = niceTitles[volSlug] || volSlug;

    indexHtml += '\n    <div class="volume-section" id="' + volSlug + '">\n      <h2 class="volume-title">' + volTitle + '</h2>\n      <div class="topics-grid">\n';

    const files = fs.readdirSync(volPath).filter(f => f.endsWith('.astro'));

    for (const file of files) {
        let fileSlug = file.replace(/\.astro$/, '');
        let niceName = formatTitle(fileSlug);
        
        let astroPath = path.join(volPath, file);
        let content = fs.readFileSync(astroPath, 'utf8');
        content = content.replace(/<p>.*?- (.*?)<\/p>/, '<p>' + volTitle + ' - ' + niceName + '</p>');
        fs.writeFileSync(astroPath, content);

        indexHtml += '        <a href="/teachings/likutay-halachos/' + volSlug + '/' + fileSlug + '" class="topic-card">\n          <div class="topic-card-body">' + niceName + '</div>\n        </a>\n';
    }

    indexHtml += '      </div>\n    </div>\n';
}

indexHtml += '  </div>\n</section>\n</Layout>';
fs.writeFileSync(indexPagePath, indexHtml, 'utf8');
console.log("Titles improved and index rebuilt.");
