/**
 * Organize the Breslov PDF collection into categorized folders
 *
 * Categories:
 * 1. R' Nachman - Likutay Moharan, Sefer HaMidos, Sipurey Maasiyos
 * 2. R' Nosson - Likutay Halachos, Likutay Tefilos, Likutay Eitzos, etc
 * 3. Chayey Moharan & History - Chayey Moharan, Yemei Moharnat, biographies
 * 4. Shivchay & Sichos HaRan
 * 5. Ebay/Alim HaNachal - letters
 * 6. Students & Talmidim - R' Avraham, R' from Tcheryn, Parparos, etc
 * 7. Levi Yitzchak Bender - Siach Sarfei Kodesh
 * 8. Prayer & Siddur - Tefilos, Tikkun, Siddur
 * 9. Breslov Customs & Guidance - Otzar HaYirah, Hanhagos
 * 10. Manuscripts & Rare - Ksav Yad, old prints
 * 11. Na Nach & Petek
 * 12. Misc & Uncategorized
 */

const fs = require('fs');
const path = require('path');

const SRC = 'C:/Users/Pettek/Documents/Claude Desktop projects/ChatExport_2026-03-10/Breslov books dl from telegram sifray breslov';
const DEST = 'C:/Users/Pettek/Documents/Claude Desktop projects/Breslov-PDFs-Organized';

// Category rules - checked in order, first match wins
const CATEGORIES = [
  {
    name: '01-Rabbi-Nachman/Likutay-Moharan',
    patterns: [/ליקוטי מוהר/i, /ליקו.*מ תק/i, /ליקו.*מ תר/i, /likuteimoharan/i, /ליקו''מ/i, /לקוטי מוהר/i, /ליקוטי_מוהר/i, /נעימות נצח/i, /ליקו.*מ דפו/i, /ליקו.*מ שה/i],
  },
  {
    name: '01-Rabbi-Nachman/Kitzur-Likutay-Moharan',
    patterns: [/קיצור.*ליקו.*מ/i, /קיצור_ליקו/i, /קצור לקוטי מוהר/i],
  },
  {
    name: '01-Rabbi-Nachman/Sefer-HaMidos',
    patterns: [/ספר המד/i, /ספר_המד/i, /הנהגות ישרות/i],
  },
  {
    name: '01-Rabbi-Nachman/Sipurey-Maasiyos',
    patterns: [/סיפורי מעשי/i, /סיפורי_מעשי/i, /סיפורים נפלאים/i, /אור המעשיות/i, /סיפורי.*ר.*אודסר/i, /רמזים.*לוית חן/i],
  },
  {
    name: '01-Rabbi-Nachman/Tikkun-HaKlali',
    patterns: [/תיקון הכללי/i, /תיקון_הכללי/i],
  },
  {
    name: '02-Rabbi-Nosson/Likutay-Halachos',
    patterns: [/ליקוטי הלכות/i, /לקוטי_הלכות/i, /ליקוטי הלכ/i, /קיצור ליקוטי הלכות/i, /מפתחות.*ליקוטי הלכות/i, /השלמות קיצור ליקוטי/i],
  },
  {
    name: '02-Rabbi-Nosson/Likutay-Tefilos',
    patterns: [/ליקוטי.*תפיל/i, /ליקוטי_תפיל/i, /לקוטי תפילות/i, /לקוטי_תפילות/i, /תפלות הבוקר/i],
  },
  {
    name: '02-Rabbi-Nosson/Likutay-Eitzos',
    patterns: [/ליקוטי עצות/i, /ליקוטי_עצות/i, /לקוטי.*עצות/i, /לקוטי_עצות/i, /עצות המבוארות/i],
  },
  {
    name: '02-Rabbi-Nosson/Alim-LiTrufa',
    patterns: [/עלים לתרופה/i, /עלים.*ציגלמן/i],
  },
  {
    name: '02-Rabbi-Nosson/Michtavim',
    patterns: [/מכתבי מוהרנ/i, /מכתבי מורנת/i],
  },
  {
    name: '03-Shivchay-Sichos-HaRan',
    patterns: [/שבחי הר/i, /שבחי_הר/i, /שיחות הרן/i, /שיחות_הרן/i, /שבחי ושיחות/i, /שיחות קדושות/i, /שיחות נפלאות/i],
  },
  {
    name: '04-Chayey-Moharan-History',
    patterns: [/חיי מוהר/i, /חיי_מוהר/i, /השמטות.*חיי/i, /השמטות_חיי/i, /ימי מוהרנ/i, /ימי_מוהרנ/i, /ימי התלאות/i, /באש ובמים/i, /תולדות מוהרנ/i, /נסיעת הר.*ן/i, /ר.*נחמן.*חייו/i, /רבי_נחמן_מברסלב_חייו/i],
  },
  {
    name: '05-Ebay-HaNachal',
    patterns: [/אב.*י.*הנחל/i, /אב״י_הנחל/i, /אבי הנחל/i, /חלוקי הנחל/i, /מבועי הנחל/i, /עמק הנחל/i, /משך הנחל/i, /נחלי אמונה/i],
  },
  {
    name: '06-Students-Talmidim/Parparos-Rimzei',
    patterns: [/פרפראות/i, /פרפרא/i],
  },
  {
    name: '06-Students-Talmidim/Tcheryn',
    patterns: [/כתב.*יד.*טשע/i, /כתב_יד.*טשע/i, /מוהר.*ר.*נחמן.*מטשע/i, /זמרת הארץ/i, /נחת השולחן/i, /מגיד שיחות/i],
  },
  {
    name: '06-Students-Talmidim/R-Avraham',
    patterns: [/כוכבי אור/i, /ביאור.*הליקוטים/i, /גלויות.*אברהם/i, /ליקוטי אבן/i],
  },
  {
    name: '06-Students-Talmidim/R-Shimshon',
    patterns: [/גבורות שמשון/i, /ליקוטי_עצות_המבואר_עם_גבורות/i],
  },
  {
    name: '07-Siach-Sarfei-Kodesh',
    patterns: [/שיחות.*מר.*שמואל/i, /שיחות.*ליברמנטש/i, /ימי שמואל/i, /מכתבי שמואל/i, /מכתב ר.*שמואל/i, /תולדות שמואל/i, /סיפורי.*שמואל/i, /מכתב.*ראש השנה/i],
  },
  {
    name: '08-Prayer-Siddur',
    patterns: [/סידור/i, /תיקון חצות/i, /תיקון_חצות/i, /סדר תיקון/i, /סדר ברכת/i, /סדר יום כפור/i, /כוונת.*תפילה/i, /וידוי דברים/i, /ציצית.*תפילין/i, /ליקוט_על_ציצית/i, /התעוררות.*התבודדות/i, /שערי דמעות/i, /רצון דקדושא/i],
  },
  {
    name: '09-Otzar-HaYirah-Guidance',
    patterns: [/אוצר.*היראה/i, /אוצר_היראה/i, /מפתחות.*אוצר/i, /קיום התורה/i, /קונטרס.*הצירופים/i, /קונטרס.*הצרופים/i, /מפתחות.*וקונטרס/i, /מפתחות.*ליקוטי הלכות/i, /ראשית השנה/i, /להיות אצלי.*ראש/i, /דרך חסידים/i, /בגן השעשועים/i, /שמחת התם/i, /קול שמחה/i, /אמונת אומן/i, /אמונת חכמים/i, /אליך נפש/i, /שיבולים/i, /נקודת השמחה/i, /לשון חסידים/i, /מטמונים/i],
  },
  {
    name: '10-Manuscripts-Rare',
    patterns: [/כתב יד/i, /כתב_יד/i, /הגהות/i, /כנסת קהל/i, /קנאת ה/i, /קנאת_ה/i, /שומרי משפט/i, /אולפן חד/i, /אור זורח/i, /אור נצח/i, /אור צדיקים/i, /מלי דאבות/i, /מכניע זדים/i, /מעגלי צדק/i, /מסעות הים/i, /קונטרס.*זוכר/i, /קונטרס_עין/i, /קונטרס.*אור.*זורח/i, /קונטרס כפתור/i, /טעם זקנים/i, /יעלת חן/i, /שארית ישראל/i, /העתקת מחברת/i, /כתבי.*רובינ/i, /ר.*אייזיק/i, /ב\..*עי.*ישראל קרדונר/i, /שיר ידידות/i, /רנת ציון/i, /על כסאו/i, /דיבורי אמונה/i, /גנזי אבא/i, /ציון המצוינת/i, /פנקס חבר/i, /ארצנו הקדושה/i, /זו ארצי/i, /קינת אומן/i, /מכתבי ר.*ישראל אבא/i, /בעקבי/i, /גלויות.*שלמה/i, /אברהם_רובינשטיין/i, /קריאה_לעזרה/i, /תקנות ישיבת/i, /מכתב.*געציל/i, /צאצאי.*ונכדי/i, /איך_נשיר/i, /חלומות וחזיונות/i, /יצחק_אייזק/i],
  },
  {
    name: '11-Na-Nach-Petek',
    patterns: [/פתק/i, /petek/i, /kardoner/i, /נ נח/i, /na.nach/i, /ליקוט ברסלב/i],
  },
];

function categorize(filename) {
  for (const cat of CATEGORIES) {
    for (const pattern of cat.patterns) {
      if (pattern.test(filename)) {
        return cat.name;
      }
    }
  }
  return '12-Misc';
}

function main() {
  // Read all files
  const allFiles = fs.readdirSync(SRC).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.pdf', '.doc', '.docx', '.rtf', '.djvu', '.zip', '.rar'].includes(ext);
  });

  console.log(`Total files: ${allFiles.length}`);
  console.log(`Destination: ${DEST}\n`);

  // Categorize
  const categorized = {};
  for (const file of allFiles) {
    const cat = categorize(file);
    if (!categorized[cat]) categorized[cat] = [];
    categorized[cat].push(file);
  }

  // Print summary
  const sorted = Object.keys(categorized).sort();
  for (const cat of sorted) {
    console.log(`\n${cat} (${categorized[cat].length} files):`);
    for (const f of categorized[cat].sort()) {
      const srcPath = path.join(SRC, f);
      const stat = fs.statSync(srcPath);
      const sizeMB = (stat.size / 1024 / 1024).toFixed(1);
      console.log(`  ${sizeMB}MB  ${f}`);
    }
  }

  // Create directory structure and copy files
  if (!process.argv.includes('--dry-run')) {
    console.log('\n\nCreating directories and copying files...');
    let copied = 0;

    for (const cat of sorted) {
      const catDir = path.join(DEST, cat);
      fs.mkdirSync(catDir, { recursive: true });

      for (const file of categorized[cat]) {
        const srcPath = path.join(SRC, file);
        const destPath = path.join(catDir, file);

        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
          copied++;
        }
      }
    }

    console.log(`Copied ${copied} files to ${DEST}`);
  } else {
    console.log('\n\n*** DRY RUN - no files copied ***');
  }
}

main();
