const fs = require('fs');

const dir = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/src/pages/teachings/likutay-halachos';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.astro'));

let listItems = files.map(f => {
  const url = '/teachings/likutay-halachos/' + f.replace('.astro', '');
  const title = f.replace('.astro', '').replace(/-/g, ' ');
  return '        <a href="' + url + '" class="topic-card">\n          <div class="topic-card-body">\n            <div style="text-transform: capitalize;">' + title + '</div>\n          </div>\n        </a>';
}).join('\n');

const astroContent = '---' + '\n' +
'import Layout from \'../../layouts/Layout.astro\';' + '\n' +
'---' + '\n' +
'<Layout title="Likutay Halachos - Breslov Teachings" description="Likutay Halachos translations">' + '\n' +
'<style>' + '\n' +
'  .page-header {' + '\n' +
'    background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);' + '\n' +
'    color: white;' + '\n' +
'    padding: 4rem 2rem;' + '\n' +
'    text-align: center;' + '\n' +
'  }' + '\n' +
'  .page-header h1 {' + '\n' +
'    font-size: 2.5rem;' + '\n' +
'    margin-bottom: 0.5rem;' + '\n' +
'  }' + '\n' +
'  .container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }' + '\n' +
'  .topics-grid {' + '\n' +
'    display: grid;' + '\n' +
'    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));' + '\n' +
'    gap: 1rem;' + '\n' +
'    margin-top: 2rem;' + '\n' +
'  }' + '\n' +
'  .topic-card {' + '\n' +
'    background: white;' + '\n' +
'    border-radius: 8px;' + '\n' +
'    box-shadow: 0 4px 12px rgba(0,0,0,0.05);' + '\n' +
'    overflow: hidden;' + '\n' +
'    transition: all 0.2s;' + '\n' +
'    text-decoration: none;' + '\n' +
'    display: block;' + '\n' +
'    border: 1px solid #eee;' + '\n' +
'  }' + '\n' +
'  .topic-card:hover {' + '\n' +
'    transform: translateY(-4px);' + '\n' +
'    box-shadow: 0 8px 24px rgba(0,0,0,0.1);' + '\n' +
'    border-color: #1a365d;' + '\n' +
'  }' + '\n' +
'  .topic-card-body {' + '\n' +
'    padding: 1.25rem;' + '\n' +
'    color: #1a365d;' + '\n' +
'    font-weight: 500;' + '\n' +
'  }' + '\n' +
'</style>' + '\n\n' +
'<section class="page-header">' + '\n' +
'  <h1>Likutay Halachos</h1>' + '\n' +
'</section>' + '\n\n' +
'<section class="content" style="padding-bottom: 4rem; background: #faf8f4;">' + '\n' +
'  <div class="container">' + '\n' +
'    <div class="topics-grid">' + '\n' +
listItems + '\n' +
'    </div>' + '\n' +
'  </div>' + '\n' +
'</section>' + '\n' +
'</Layout>';

fs.writeFileSync('C:/Users/Pettek/.openclaw/workspace/ajew-org/src/pages/teachings/likutay-halachos.astro', astroContent);
console.log('Index built!');
