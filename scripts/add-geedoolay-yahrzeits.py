#!/usr/bin/env python3
import json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=[
 ('Tishrei',14,"R' Ephraim son of Reb Naftali",'ר\' אפרים ב"ר נפתלי','5643 / 1882'),
 ('Tishrei',18,'Rabbi Nachman of Breslov','רבי נחמן מברסלב','5571 / 1810'),
 ('Tishrei',19,"R' David Tzvi Dashivsky",'ר\' דוד צבי דאשווסקי','5673 / 1912'),
 ('Cheshvan',2,"R' Sender son of Reb Tzvi of Tzfas",'ר\' סענדיר ב"ר צבי מצפת','5652 / 1891'),
 ('Cheshvan',9,"R' Yisrael of Kardon",'ר\' ישראל מקארדאן','5679 / 1918'),
 ('Kislev',9,"R' Nosson Trubitzer of Tzfas",'ר\' נתן טרוביצער מצפת','5679 / 1918'),
 ('Kislev',14,"R' Shmuel Heshel Friedman",'ר\' שמואל העשיל פרידמאן','5678 / 1917'),
 ('Kislev',20,"R' Shmuel son of Reb Yaakov of Nemirov",'ר\' שמואל ב"ר יעקב מנעמירוב','5591 / 1830'),
 ('Kislev',27,'Mrs. Sarah, daughter of Rabbeinu','מרת שרה בת רבינו','5592 / 1831'),
 ('Kislev',29,"R' Avraham son of Reb Nachman",'ר\' אברהם ב"ר נחמן','5678 / 1917'),
 ('Tevet',10,'Rebbe Nosson','מוהרנ"ת','5605 / 1844'),
 ('Tevet',18,"R' Yitzchok Isaac Eisenstein",'ר\' אייזיק אייזינשטיין','5684 / 1923'),
 ('Adar',11,"R' Yitzchok Isaac Yosef Sofer",'ר\' יצחק אייזיק יוסף סופר','5588 / 1828'),
 ('Adar',11,"R' Tzvi Aryeh son of R' Aharon of Breslov",'הרב ר\' צבי אריה ב"ר אהרן מברסלב','5628 / 1868'),
 ('Adar',19,'Mrs. Feiga, mother of Rabbeinu','מרת פייגא אם רבינו','5561 / 1801'),
 ('Adar II',7,"R' Nosson son of Reb Yosef of Yerushalayim",'ר\' נתן ב"ר יוסף מירושלים','5657 / 1897'),
 ('Adar II',12,"R' Alter of Teplik",'ר\' אלטער מטעפליק','5679 / 1919'),
 ('Adar II',13,"R' Nachman of Tcherin",'הרב ר\' נחמן מטשעהרין','5654 / 1894'),
 ('Nisan',20,"R' Mendl of Ladizhin",'ר\' מענדיל מלאדיזין','5591 / 1831'),
 ('Nisan',21,"R' Getzel Libovne",'ר\' געציל ליובאוונע','Seventh day of Pesach 5678 / 1918'),
 ('Nisan',26,"R' Nachman of Tulchin",'ר\' נחמן מטולטשין','5644 / 1884'),
 ('Iyyar',23,"R' Avraham Eliezer son of Reb Sender of Tzfas",'ר\' אברהם אליעזר ב"ר סענדיר מצפת','5666 / 1906'),
 ('Iyyar',24,"R' Shmuel of Teplik",'ר\' שמואל מטעפליק','5591 / 1831'),
 ('Sivan',5,'Mrs. Sashia, wife of Rabbeinu','מרת סאשיא אשת רבינו','5567 / 1807'),
 ('Tamuz',1,"R' Yosef son of Reb Nosson of Yerushalayim",'ר\' יוסף בר"נ מירושלים','5655 / 1895'),
 ('Tamuz',24,"R' Tuvia of Bobrinets",'ר\' טוביה מבאבריניץ','5680 / 1920'),
 ('Av',1,"R' Aharon of Breslov",'הרב ר\' אהרן מברסלב','5605 / 1845'),
 ('Av',19,"R' Naftali of Nemirov",'ר\' נפתלי מנעמירוב','5620 / 1860'),
 ('Av',26,"R' Tzvi Trubitzer of Tzfas",'ר\' צבי טרוביצער מצפת','5650 / 1890'),
 ('Elul',19,"Mrs. Feiga, daughter of R' Yechiel Tzvi",'מרת פייגא בת ר\' יחיאל צבי אח רבינו','5632 / 1872'),
]

def norm(s): return re.sub(r"\s+|[\"'׳״()\-–—.]",'',s or '').lower()

for rel in ['public/data/tzaddikim-database-complete.json','public/data/tzaddikim-database.json']:
    p=ROOT/rel
    data=json.loads(p.read_text(encoding='utf-8'))
    arr=data.setdefault('all_tzaddikim',[])
    keys={(norm(x.get('name')), norm(x.get('hebrew_name')), str(x.get('yahrzeit_month')), str(x.get('yahrzeit_day'))) for x in arr}
    added=0
    for month,day,name,hebrew,year in rows:
        key=(norm(name), norm(hebrew), month, str(day))
        # Exact HE/name+date dedupe; do not broad-match unrelated short names.
        if key in keys:
            continue
        if any((norm(x.get('name'))==norm(name) or norm(x.get('hebrew_name'))==norm(hebrew)) and str(x.get('yahrzeit_month'))==month and str(x.get('yahrzeit_day'))==str(day) for x in arr):
            continue
        arr.append({
          'name': name, 'hebrew_name': hebrew, 'yahrzeit_hebrew': f'{day} {month}',
          'yahrzeit_month': month, 'yahrzeit_day': day, 'is_adar_ii': month=='Adar II',
          'year_passed': year, 'notes': 'From Geedoolay HaNachal known yahrzeit list; uncertain/conflicting dates skipped.',
          'category':'breslov', 'source':'Geedoolay HaNachal'
        })
        keys.add(key); added+=1
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')
    print(rel,'added',added,'total',len(arr))

# Append a clear source block to hardcoded importantDates for prominent/upcoming yahrzeit box visibility.
comp=ROOT/'src/components/CompactYahrzeit.astro'
s=comp.read_text(encoding='utf-8')
if 'GEEDOOLAY HANACHAL YAHRZEITS' not in s:
    block='''\n\n    // === GEEDOOLAY HANACHAL YAHRZEITS — exact known dates only; uncertain/conflicting dates skipped ===\n'''
    for month,day,name,hebrew,year in rows:
        esc=lambda x:x.replace('\\','\\\\').replace("'","\\'")
        block += f"    {{ month: '{month}', day: {day}, type: 'yahrzeit', name: '{esc(name)}', hebrew_name: '{esc(hebrew)}', description: 'Geedoolay HaNachal — {esc(year)}', priority: 4 }},\n"
    marker='\n    // === PURIM TIBERIAS ==='
    s=s.replace(marker, block+marker)
    comp.write_text(s,encoding='utf-8')
    print('importantDates block added',len(rows))
else:
    print('importantDates block already present')
