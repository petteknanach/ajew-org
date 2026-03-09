const fs = require('fs');
const path = require('path');

const sourceRoot = 'C:/Users/Pettek/Documents/Translations/Likutay Halachos';
const targetRoot = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/src/pages/teachings/likutay-halachos';
const indexPagePath = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/src/pages/teachings/likutay-halachos.astro';

if (!fs.existsSync(targetRoot)) {
    fs.mkdirSync(targetRoot, { recursive: true });
}

const volumes = [
    "Likutay Halachos - Orach Chaim - 1",
    "Likutay Halachos - Orach Chaim - 2",
    "Likutay Halachos - Orach Chaim - 3",
    "Likutay Halachos - Yoreh Daya - 1",
    "Likutay Halachos - Yoreh Daya - 2",
    "Likutay Halachos - Choshen Mishpat - 1",
    "Likutay Halachos - Choshen Mishpat - 2",
    "Likutay Halachos - Evven Hu-ezehr"
];

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
'  .topic-card-body { padding: 1.25rem; color: #1a365d; font-weight: 500; text-transform: capitalize; }' + '\n' +
'</style>' + '\n' +
'<section class="page-header">' + '\n' +
'  <h1>Likutay Halachos</h1>' + '\n' +
'  <p style="font-family: \'EB Garamond\', serif; font-size: 1.2em; font-style: italic;">Comprehensive English Translations</p>' + '\n' +
'</section>' + '\n' +
'<section class="content" style="padding-bottom: 4rem; background: #faf8f4;">' + '\n' +
'  <div class="container">' + '\n';

const sharedStyles = '<style>' + '\n' +
'  @import url(\'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Cinzel:wght@400;600;700&family=Noto+Serif+Hebrew&display=swap\');' + '\n' +
'  .lh-container { --ink:#1c1c2e;--parchment:#f7f3ea;--parchment2:#eee8d5;--gold:#a07830;--gold-light:#c8a050;--sapphire:#1e3a5f;--sapphire2:#2e5580;--sapphire-pale:#dde8f5;--ruby:#7a1a2e;--border:#b89860;--muted:#5a5040;--verse-color:#1e3a5f;--source-color:#888070; font-family:\'EB Garamond\',Georgia,serif; font-size:18px; line-height:1.85; color:var(--ink); background:var(--parchment); text-align:justify; max-width:800px; margin:0 auto; padding:40px 20px 80px; }' + '\n' +
'  .lh-container .book-title { text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 2px solid var(--border); }' + '\n' +
'  .lh-container .book-title h1 { font-family: \'Cinzel\', serif; font-size: 2.2em; font-weight: 700; color: var(--sapphire); letter-spacing: 0.03em; margin-bottom: 4px; }' + '\n' +
'  .lh-container .section-header { text-align: center; margin: 50px 0 30px; padding: 15px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }' + '\n' +
'  .lh-container .halacha-header { text-align: center; margin: 55px 0 20px; padding: 20px 0; border-top: 2px solid var(--gold); border-bottom: 2px solid var(--gold); }' + '\n' +
'  .lh-container .sa-excerpt { text-align: center; margin: 20px 0 35px; padding: 15px 25px; background: var(--parchment2); border-left: 3px solid var(--gold); border-right: 3px solid var(--gold); font-style: italic; }' + '\n' +
'  .lh-container .ois { font-weight: 700; font-size: 1.15em; color: var(--gold); margin-top: 35px; margin-bottom: 10px; display: block; }' + '\n' +
'  .lh-container p { margin-bottom: 18px; text-indent: 1.5em; }' + '\n' +
'  .lh-container p:first-of-type, .lh-container .ois + p, .lh-container .sa-excerpt + p { text-indent: 0; }' + '\n' +
'  .lh-container .heb { font-style: italic; color: var(--ruby); }' + '\n' +
'  .page-banner { background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; padding: 3rem 2rem; text-align: center; margin-bottom: 0; }' + '\n' +
'  .page-banner h1 { font-family: \'Cinzel\', serif; font-size: 2.5rem; margin-bottom: 0.5rem; color: white; }' + '\n' +
'</style>';

for (const vol of volumes) {
    const volPath = path.join(sourceRoot, vol);
    if (!fs.existsSync(volPath)) continue;

    let volSlug = vol.replace('Likutay Halachos - ', '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let volTitle = vol.replace('Likutay Halachos - ', '');

    const volDest = path.join(targetRoot, volSlug);
    fs.mkdirSync(volDest, { recursive: true });

    indexHtml += '\n    <div class="volume-section" id="' + volSlug + '">\n      <h2 class="volume-title">' + volTitle + '</h2>\n      <div class="topics-grid">\n';

    const files = fs.readdirSync(volPath).filter(f => f.endsWith('.html'));

    files.sort((a, b) => {
        const numA = parseInt(a.match(/^(\d+)/) ? a.match(/^(\d+)/)[1] : 0);
        const numB = parseInt(b.match(/^(\d+)/) ? b.match(/^(\d+)/)[1] : 0);
        return numA - numB;
    });

    for (const file of files) {
        let cleanName = file.replace(/^\d+[-_\s]*/, '')
                            .replace(/\.html$/i, '')
                            .replace(/COMPLETE_/i, '')
                            .replace(/LH_OC[123]_/i, '')
                            .replace(/lh_oc[123]_/i, '')
                            .replace(/LH_YD[12]_/i, '')
                            .replace(/lh_yd_/i, '')
                            .replace(/LH_Choshen_Mishpat_II_/i, '')
                            .replace(/Likutay_Halachos_/gi, '')
                            .replace(/likutayhalachos_/i, '')
                            .replace(/_v2|_FINAL|\(1\)|- this is a repitition.*|have to fix masan.*/gi, '')
                            .replace(/_/g, ' ')
                            .trim();

        let fileSlug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if(!fileSlug) fileSlug = file.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

        const srcPath = path.join(volPath, file);
        let htmlContent = fs.readFileSync(srcPath, 'utf8');
        const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        let innerContent = bodyMatch ? bodyMatch[1] : htmlContent;

        const astroContent = '---' + '\n' +
'import Layout from \'../../../../layouts/Layout.astro\';' + '\n' +
'const pageTitle = "Likutay Halachos - ' + cleanName + '";' + '\n' +
'const pageDescription = "Breslov teachings from Likutay Halachos: ' + cleanName + '";' + '\n' +
'---' + '\n' +
'<Layout title={pageTitle} description={pageDescription}>' + '\n' +
'  <div class="page-banner">' + '\n' +
'    <h1>Likutay Halachos</h1>' + '\n' +
'    <p>' + volTitle + ' - ' + cleanName + '</p>' + '\n' +
'  </div>' + '\n' +
sharedStyles + '\n' +
'  <div class="lh-container">' + '\n' +
innerContent + '\n' +
'  </div>' + '\n' +
'</Layout>';

        fs.writeFileSync(path.join(volDest, fileSlug + '.astro'), astroContent, 'utf8');

        indexHtml += '        <a href="/teachings/likutay-halachos/' + volSlug + '/' + fileSlug + '" class="topic-card">\n          <div class="topic-card-body">' + cleanName + '</div>\n        </a>\n';
    }

    indexHtml += '      </div>\n    </div>\n';
}

indexHtml += '  </div>\n</section>\n</Layout>';
fs.writeFileSync(indexPagePath, indexHtml, 'utf8');
console.log("Rebuild complete.");
