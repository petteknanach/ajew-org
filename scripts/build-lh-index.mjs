import fs from 'fs';
import path from 'path';

const dir = 'C:/Users/Pettek/.openclaw/workspace/ajew-org/src/pages/teachings/likutay-halachos';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.astro'));

let listItems = files.map(f => {
  const url = '/teachings/likutay-halachos/' + f.replace('.astro', '');
  const title = f.replace('.astro', '').replace(/-/g, ' ');
  return '        <a href="' + url + '" class="topic-card">\\n          <div class="topic-card-body">\\n            <div style="text-transform: capitalize;">' + title + '</div>\\n          </div>\\n        </a>';
}).join('\n');

const astroContent = ---
import Layout from '../../layouts/Layout.astro';
---

<Layout title="Likutay Halachos - Breslov Teachings" description="Likutay Halachos translations">
<style>
  .page-header {
    background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
    color: white;
    padding: 4rem 2rem;
    text-align: center;
  }
  .page-header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    font-family: 'Cinzel', serif;
  }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
  .topics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-top: 2rem;
  }
  .topic-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    overflow: hidden;
    transition: all 0.2s;
    text-decoration: none;
    display: block;
    border: 1px solid #eee;
  }
  .topic-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    border-color: #1a365d;
  }
  .topic-card-body {
    padding: 1.25rem;
    color: #1a365d;
    font-weight: 500;
  }
</style>

<section class="page-header">
  <h1>Likutay Halachos</h1>
  <p style="font-family: 'EB Garamond', serif; font-size: 1.2em; font-style: italic;">Comprehensive English Translations</p>
</section>

<section class="content" style="padding-bottom: 4rem; background: #faf8f4;">
  <div class="container">
    <div class="topics-grid">
\
    </div>
  </div>
</section>
</Layout>
;

fs.writeFileSync('C:/Users/Pettek/.openclaw/workspace/ajew-org/src/pages/teachings/likutay-halachos.astro', astroContent);
console.log('Index built!');
