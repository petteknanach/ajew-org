const fs = require('fs');
const path = require('path');

const sourceDir = 'C:\\Users\\Pettek\\Documents\\Translations\\Likutay Tefilos';
const destDir = 'C:\\Users\\Pettek\\.openclaw\\workspace\\ajew-org\\src\\pages\\teachings\\likutay-tefilos';

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const filesToProcess = fs.readdirSync(sourceDir).filter(f => f.endsWith('.html'));

const sharedStyles = '<style>\n  @import url(\'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Cinzel:wght@400;600;700&family=Noto+Serif+Hebrew&display=swap\');\n  .tefilos-container { --ink:#1c1c2e;--parchment:#f7f3ea;--parchment2:#eee8d5;--gold:#a07830;--gold-light:#c8a050;--sapphire:#1e3a5f;--sapphire2:#2e5580;--sapphire-pale:#dde8f5;--ruby:#7a1a2e;--border:#b89860;--muted:#5a5040;--verse-color:#1e3a5f;--source-color:#888070; font-family:\'EB Garamond\',Georgia,serif; font-size:18px;line-height:2;color:var(--ink); background:var(--parchment);padding-bottom:80px; }\n  .tefilos-container #masthead{background:linear-gradient(160deg,#0d2240 0%,#1e3a5f 45%,#0d2240 100%);color:#e8dfc0;text-align:center;padding:48px 24px 36px;border-bottom:5px solid var(--gold);position:relative;overflow:hidden;}\n  .tefilos-container #masthead::before{content:\'\';position:absolute;inset:0;background-image:repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(255,255,255,.025) 60px,rgba(255,255,255,.025) 61px);pointer-events:none;}\n  .tefilos-container .series-label{font-family:\'Cinzel\',serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:var(--gold-light);margin-bottom:10px;}\n  .tefilos-container #masthead h1{font-family:\'Cinzel\',serif;font-size:2.4em;font-weight:700;color:#f5ead0;letter-spacing:2px;text-shadow:0 2px 12px rgba(0,0,0,.5);margin-bottom:8px;}\n  .tefilos-container .prayer-meta{display:flex;justify-content:center;gap:32px;margin-top:14px;flex-wrap:wrap;}\n  .tefilos-container .meta-item{font-family:\'Cinzel\',serif;font-size:.85em;color:var(--gold-light);letter-spacing:2px;text-transform:uppercase;}\n  .tefilos-container .meta-item span{color:#c8bfa0;font-style:italic;font-family:\'EB Garamond\',serif;font-size:1.1em;text-transform:none;letter-spacing:0;}\n  .tefilos-container .source-note{font-size:.9em;color:#c8bfa0;font-style:italic;margin-top:12px;}\n  .tefilos-container .nanach-badge{display:inline-block;margin-top:18px;padding:6px 22px;border:2px solid var(--gold);border-radius:2px;font-family:\'Cinzel\',serif;font-size:.9em;color:var(--gold-light);letter-spacing:3px;}\n  .tefilos-container .wrapper{max-width:840px;margin:0 auto;padding:0 28px;}\n  .tefilos-container .prayer-heading{font-family:\'Cinzel\',serif;font-size:1.2em;font-weight:600;color:var(--sapphire);text-align:center;letter-spacing:2px;padding:28px 0 6px;border-bottom:2px solid var(--border);margin-bottom:24px;}\n  .tefilos-container .prayer-heading::after{content:\'\';display:block;margin:8px auto 0;width:60px;height:2px;background:var(--gold);}\n  .tefilos-container .para{margin:20px 0;}\n  .tefilos-container .para p{text-align:justify;hyphens:auto;}\n  .tefilos-container .heb-btn{display:inline-block;font-family:\'Noto Serif Hebrew\',serif;font-size:11px;color:var(--sapphire2);border:1px solid var(--sapphire2);border-radius:3px;padding:1px 8px;cursor:pointer;margin-left:5px;vertical-align:middle;background:var(--sapphire-pale);user-select:none;opacity:.75;transition:opacity .15s;}\n  .tefilos-container .heb-btn:hover{opacity:1;}\n  .tefilos-container .heb-text{display:none;direction:rtl;font-family:\'Noto Serif Hebrew\',serif;font-size:1.05em;line-height:2.1;color:var(--ink);background:var(--parchment2);border-right:4px solid var(--gold);padding:10px 16px 10px 12px;margin-top:8px;border-radius:0 4px 4px 0;}\n  .tefilos-container .heb-text.open{display:block;}\n  .tefilos-container .heb{font-style:italic;color:var(--ruby);}\n  .tefilos-container .def{color:var(--muted);font-size:.93em;}\n  .tefilos-container .verse{font-style:italic;color:var(--verse-color);}\n  .tefilos-container .src{font-size:.85em;color:var(--source-color);}\n  .tefilos-container .emph{font-weight:600;color:var(--sapphire);}\n  .tefilos-container .hashem{font-weight:600;}\n  .tefilos-container .ornament{text-align:center;color:var(--gold);font-size:1.4em;letter-spacing:10px;margin:30px 0 10px;}\n  .tefilos-container footer{text-align:center;margin-top:60px;padding:24px;font-size:.85em;color:var(--muted);border-top:1px solid var(--border);font-family:\'Cinzel\',serif;letter-spacing:1px;}\n  .tefilos-container .nanach-f{color:var(--gold);font-weight:700;font-size:1.05em;display:block;margin-top:8px;}\n</style>\n<script is:inline>function tog(id){var el=document.getElementById(id);if(el)el.classList.toggle(\'open\');}</script>';

for (const file of filesToProcess) {
    const srcPath = path.join(sourceDir, file);
    let htmlContent = fs.readFileSync(srcPath, 'utf8');
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let innerContent = bodyMatch ? bodyMatch[1] : htmlContent;
    let slug = file.replace(/\.html$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let titleName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    // Fix class= class= duplicate generated by some conversion tools
    innerContent = innerContent.replace(/class="([^"]*)"\s+class="([^"]*)"/g, 'class=" "');
    
    // Remove scripts from inside the innerContent if they don't have is:inline
    innerContent = innerContent.replace(/<script>([\s\S]*?)<\/script>/gi, '<script is:inline></script>');
    
    const astroContent = '---\n' +
'import Layout from \'../../../layouts/Layout.astro\';\n' +
'const pageTitle = "Likutay Tefilos - ' + titleName + '";\n' +
'const pageDescription = "Breslov prayers from Likutay Tefilos: ' + titleName + '";\n' +
'---\n\n' +
'<Layout title={pageTitle} description={pageDescription}>\n' +
  sharedStyles + '\n' +
  '  <div class="tefilos-container">\n' +
    innerContent + '\n' +
  '  </div>\n' +
'</Layout>';

    const destPath = path.join(destDir, slug + '.astro');
    fs.writeFileSync(destPath, astroContent, 'utf8');
    console.log('Generated ' + slug + '.astro');
}

console.log("Done generating Likutay Tefilos pages.");
