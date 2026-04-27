import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const sourceDir = 'C:\\Users\\Pettek\\Documents\\Translations\\Likutay Halachos\\Likutay Halachos - Orach Chaim - 1';

const destDir = path.join(rootDir, 'src', 'pages', 'teachings', 'likutay-halachos');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const filesToProcess = [
    "010 LH_OC1_Complete_Hakdamah_Hashkamas1.html",
    "020 LH_OC1_Hashkamas1_sections3-15.html",
    "030 LH_OC1_Hashkamas2-3.html",
    "040 LH_OC1_Hashkamas4.html",
    "050 LH_OC1_Hashkamas5.html",
    "060 LH_OC1_NetilasYadayim1-2 (1) - this might include the two previous.html",
    "070 nitteylas_yadayim_3.html",
    "080 nitteylas_yadayim_4.html",
    "090 tzitzis_1.html",
    "100 tzitzis_2.html",
    "110 tzitzis_3.html",
    "120 tzitzis_4_5.html",
    "130 tzitzis_7.html",
    "140 tefillin_1_2_3.html",
    "150 tefillin_4 - added diagram.html",
    "160 tefillin_5a.html",
    "170 tefillin_5b.html",
    "180 tefillin_5c.html",
    "190 tefillin_5d.html",
    "200 tefillin_5e.html",
    "210 tefillin_5f.html",
    "220 tefillin_6a.html",
    "230 tefillin_6b.html",
    "240 tefillin_6c.html",
    "250 tefillin_7.html",
    "260 bircas_hashachar_1.html",
    "270 bircas_hashachar_3a.html",
    "280 bircas_hashachar_3b.html",
    "290 bircas_hashachar_3c.html",
    "400 bircas_hashachar_5a.html",
    "410 bircas_hashachar_5b.html",
    "420 bircas_hashachar_5c.html",
    "430 bircas_hashachar_5d.html",
    "440 bircas_hashachar_5e.html",
    "450 bircas_hashachar_5f.html",
    "460 bircas_hashachar_5g.html",
    "470 bircas_hashachar_5h.html",
    "480 bircas_hashachar_5i.html",
    "490 bircas_hashachar_5j.html",
    "500 bircas_hashachar_5k.html",
    "510 birchos_hatorah_1_kaddish_1.html",
    "520 krias_shma_1_2.html",
    "530 krias_shma_3.html",
    "540 krias_shma_4a.html",
    "550 krias_shma_4b.html",
    "560 krias_shma_5a.html",
    "570 krias_shma_5b.html",
    "580 krias_shma_5c.html",
    "590 tefillah_1_3.html",
    "600 tefillah_4a.html",
    "610 tefillah_4b.html",
    "620 tefillah_4c.html",
    "630  tefillah_4d.html",
    "640 tefillah_5_6 (1).html",
    "650 nesias_kapayim_1.html",
    "660 nesias_kapayim_2.html",
    "670 nesias_kapayim_3.html",
    "680 nesias_kapayim_4.html",
    "690 nesias_kapayim_5a.html",
    "700 nesias_kapayim_5b.html",
    "710 nesias_kapayim_5c.html",
    "720 nesias_kapayim_5d.html",
    "730 nesias_kapayim_5e.html",
    "740 nefilas_apayim_1.html",
    "750 nefilas_apayim_4a.html",
    "760 nefilas_apayim_4b.html",
    "770 nefilas_apayim_4c.html",
    "780 nefilas_apayim_4d.html",
    "790 nefilas_apayim_4e.html",
    "800 nefilas_apayim_4f.html",
    "810 nefilas_apayim_6a.html",
    "820 nefilas_apayim_6b.html",
    "830 nefilas_apayim_6c.html",
    "840 kedushah_dsidra_1.html",
    "850 krias_hatorah_1.html",
    "860 krias_hatorah_3.html",
    "870 krias_hatorah_4.html",
    "880 krias_hatorah_6a.html",
    "890 krias_hatorah_6b.html",
    "900 krias_hatorah_6c.html",
    "910 krias_hatorah_6d.html",
    "920 krias_hatorah_6e.html",
    "930 krias_hatorah_6f.html",
    "940 bais_haknnesses_1.html",
    "945 bais_haknnesses_2.html",
    "950 bais_haknnesses_3.html",
    "955 bais_haknnesses_4.html",
    "960 bais_haknnesses_5a.html",
    "965 bais_haknnesses_5b.html",
    "970 bais_haknnesses_5c.html",
    "975 bais_haknnesses_5d.html",
    "980 bais_haknnesses_5e.html",
    "982 bais_haknnesses_5f.html",
    "984 bais_haknnesses_6a.html",
    "988 bais_haknnesses_6b.html",
    "991 bais_haknnesses_6c.html",
    "995 bais_haknnesses_6d.html"
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



