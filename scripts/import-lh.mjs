import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const sourceDir = 'C:\\Users\\Pettek\\Documents\\Translations\\Likutay Halachos\\Likutay Halachos - Orach Chaim - 2';

const destDir = path.join(rootDir, 'src', 'pages', 'teachings', 'likutay-halachos');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const filesToProcess = [
    '010 COMPLETE_Masa_Umasan_Halachos_1-2  have to fix masan in all the files.html',
    '020 Likutay_Halachos_Masa_Umasan_3.html',
    '030 Likutay_Halachos_Masa_Umasan_4_Part1.html',
    '040 Likutay_Halachos_Masa_Umasan_4_Part2.html',
    '045 Likutay_Halachos_Masa_Umasan_4_Part3 (1).html',
    '050 Likutay_Halachos_Masa_Umasan_5 (1).html',
    '055 Likutay_Halachos_Masa_Umasan_6 (1).html',
    '060 Likutay_Halachos_Netilas_Yadayim_LSeudah_1 (1).html',
    '065 Likutay_Halachos_Netilas_Yadayim_LSeudah_2.html',
    '070 Likutay_Halachos_Netilas_Yadayim_LSeudah_3.html',
    '075 Likutay_Halachos_Netilas_Yadayim_LSeudah_3_Part2.html',
    '080 Likutay_Halachos_Netilas_Yadayim_LSeudah_4.html',
    '085 Likutay_Halachos_Netilas_Yadayim_LSeudah_4_Part2.html',
    '087  COMPLETE_Betzias_HaPas_Intro_9-10 - this is a repitition of the end of 085.html',
    '090 Likutay_Halachos_Netilas_Yadayim_LSeudah_6 1-9.html',
    '095 Likutay_Halachos netilas yadayim liseuda _Betzias_HaPas_Part1 10-21.html',
    '100 Likutay_Halachos_Betzias_HaPas_Part2 22-31.html',
    '110 Likutay_Halachos_Betzias_HaPas_Part3.html',
    '115 Likutay_Halachos netlias yadayim liseuda _Betzias_HaPas_Part4 44-56.html',
    '120 Likutay_Halachos netilas yadayim liseuda _Betzias_HaPas_Part5 57-68.html'
];

const sharedStyles = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
  
  .lh-container {
    font-family: 'EB Garamond', 'Cormorant Garamond', Georgia, serif;
    font-size: 18px; line-height: 1.85; color: #1a1a1a;
    background-color: #faf8f4; text-align: justify;
    max-width: 800px; margin: 0 auto; padding: 40px 20px 80px;
  }
  .lh-container .book-title { text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 2px solid #d4c9a8; }
  .lh-container .book-title h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 2.2em; font-weight: 700; color: #3d3225; letter-spacing: 0.03em; margin-bottom: 4px; }
  .lh-container .book-title .subtitle { font-size: 1.1em; color: #5a5040; font-style: italic; }
  .lh-container .section-header { text-align: center; margin: 50px 0 30px; padding: 15px 0; border-top: 1px solid #d4c9a8; border-bottom: 1px solid #d4c9a8; }
  .lh-container .section-header h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.65em; font-weight: 600; color: #3d3225; margin: 0; }
  .lh-container .halacha-header { text-align: center; margin: 55px 0 20px; padding: 20px 0; border-top: 2px solid #8B7432; border-bottom: 2px solid #8B7432; }
  .lh-container .halacha-header h2 { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.65em; font-weight: 600; color: #3d3225; margin: 0; }
  .lh-container .sa-excerpt { text-align: center; margin: 20px 0 35px; padding: 15px 25px; background: #f0ece3; border-left: 3px solid #8B7432; border-right: 3px solid #8B7432; font-size: 1.05em; font-style: italic; color: #3d3225; line-height: 1.9; }
  .lh-container .ois { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 1.15em; color: #8B7432; margin-top: 35px; margin-bottom: 10px; display: block; }
  .lh-container p { margin-bottom: 18px; text-indent: 1.5em; }
  .lh-container p:first-of-type, .lh-container .ois + p, .lh-container .sa-excerpt + p, .lh-container .section-header + p, .lh-container .halacha-header + p { text-indent: 0; }
  .lh-container .verse { font-style: italic; color: #3d3225; }
  .lh-container .source { font-size: 0.88em; color: #5a5040; font-style: normal; }
  .lh-container .heb { font-style: italic; }
  .lh-container .bracket { color: #5a5040; font-size: 0.95em; }
  .lh-container .insert { color: #5a5040; font-size: 0.93em; }
  .lh-container .key { font-weight: 600; }
  .lh-container .aramaic { font-style: italic; }
  .lh-container .hagahah { font-variant: small-caps; font-weight: 600; color: #8B7432; }
  .lh-container .closing { text-align: center; font-style: italic; margin: 25px 0; color: #3d3225; }
  
  .page-banner {
    background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
    color: white;
    padding: 3rem 2rem;
    text-align: center;
    margin-bottom: 0;
  }
  .page-banner h1 {
    font-family: var(--font-hebrew);
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: white;
  }
</style>
`;

for (const file of filesToProcess) {
    const srcPath = path.join(sourceDir, file);
    if (!fs.existsSync(srcPath)) {
        console.log(`Skipping ${file} - not found`);
        continue;
    }
    
    let htmlContent = fs.readFileSync(srcPath, 'utf8');
    
    // Extract everything inside <body>...</body>
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let innerContent = bodyMatch ? bodyMatch[1] : htmlContent;
    
    // Create a slug from the filename
    // e.g. "010 LH_OC1_Complete_Hakdamah_Hashkamas1.html" -> "hakdamah-hashkamas-1"
    let slug = file.replace(/^[0-9]+\s*LH_OC1_/, '')
                   .replace(/Complete_/, '')
                   .replace(/\.html$/, '')
                   .toLowerCase()
                   .replace(/[^a-z0-9]+/g, '-')
                   .replace(/^-|-$/g, '');
                   
    // Pretty title
    let titleName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    const astroContent = `---
import Layout from '../../../layouts/Layout.astro';
const pageTitle = "Likutay Halachos - ${titleName}";
const pageDescription = "Breslov teachings from Likutay Halachos: ${titleName}";
---

<Layout title={pageTitle} description={pageDescription}>
  <div class="page-banner">
    <h1>Likutay Halachos</h1>
    <p>${titleName}</p>
  </div>
  ${sharedStyles}
  <div class="lh-container">
    ${innerContent}
  </div>
</Layout>
`;

    const destPath = path.join(destDir, `${slug}.astro`);
    fs.writeFileSync(destPath, astroContent, 'utf8');
    console.log(`Generated ${slug}.astro`);
}

console.log("Done generating first batch of Astro pages.");
