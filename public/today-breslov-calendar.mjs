// Offline Hebrew/Gregorian conversion. Intl supplies the Hebrew calendar.
export const MONTHS = ['Tishrei','Cheshvan','Kislev','Tevet','Shvat','Adar I','Adar','Adar II','Nisan','Iyyar','Sivan','Tamuz','Av','Elul'];
export const HEBREW_MONTHS = {Tishrei:'תשרי',Cheshvan:'חשוון',Kislev:'כסלו',Tevet:'טבת',Shvat:'שבט','Adar I':'אדר א׳',Adar:'אדר','Adar II':'אדר ב׳',Nisan:'ניסן',Iyyar:'אייר',Sivan:'סיוון',Tamuz:'תמוז',Av:'אב',Elul:'אלול'};
const aliases = {Tishri:'Tishrei',Heshvan:'Cheshvan',Shevat:'Shvat',Nissan:'Nisan',Iyar:'Iyyar',Tammuz:'Tamuz', 'Adar 1':'Adar I','Adar 2':'Adar II'};
const heb = new Intl.DateTimeFormat('en-u-ca-hebrew',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric'});
export function civilDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Invalid civil date');
  const d = new Date(iso+'T12:00:00Z');
  if (!Number.isFinite(+d) || d.toISOString().slice(0,10)!==iso) throw new Error('Invalid civil date');
  return d;
}
export function fromGregorian(iso) {
  const parts = Object.fromEntries(heb.formatToParts(civilDate(iso)).map(p=>[p.type,p.value]));
  const month = aliases[parts.month] || parts.month;
  if (!MONTHS.includes(month)) throw new Error('Hebrew calendar unavailable');
  return {year:Number(parts.year),month,day:Number(parts.day)};
}
const conversionCache = new Map();
export function toGregorian(year, month, day) {
  if (!Number.isInteger(year)||year<4000||year>7000||!MONTHS.includes(month)||!Number.isInteger(day)||day<1||day>30) return null;
  const key = `${year}/${month}/${day}`;
  if (conversionCache.has(key)) return conversionCache.get(key);
  const tuple = h=>h.year*1000+MONTHS.indexOf(h.month)*32+h.day;
  const wanted = tuple({year,month,day});
  let lo = Math.floor(Date.UTC(year-3761,0,1,12)/86400000), hi = Math.floor(Date.UTC(year-3759,0,1,12)/86400000);
  let result = null;
  while (lo<=hi) {
    const mid = Math.floor((lo+hi)/2), iso = new Date(mid*86400000).toISOString().slice(0,10), actual = fromGregorian(iso), n=tuple(actual);
    if (n===wanted) { result=iso; break; }
    if (n<wanted) lo=mid+1; else hi=mid-1;
  }
  conversionCache.set(key,result);
  return result;
}
export function moveDay(iso,amount) { const d=civilDate(iso); d.setUTCDate(d.getUTCDate()+amount); return d.toISOString().slice(0,10); }
export function hebrewNumber(n) {
  if (!Number.isInteger(n)||n<1) return '';
  let out='';
  if (n>=1000) {out=hebrewNumber(Math.floor(n/1000)).replace(/[״׳]/g,'')+'׳';n%=1000;}
  let rest='';
  for (const [v,c] of [[400,'ת'],[300,'ש'],[200,'ר'],[100,'ק'],[90,'צ'],[80,'פ'],[70,'ע'],[60,'ס'],[50,'נ'],[40,'מ'],[30,'ל'],[20,'כ']]) while(n>=v){rest+=c;n-=v;}
  if(n===15){rest+='טו';n=0;} if(n===16){rest+='טז';n=0;}
  for (const [v,c] of [[10,'י'],[9,'ט'],[8,'ח'],[7,'ז'],[6,'ו'],[5,'ה'],[4,'ד'],[3,'ג'],[2,'ב'],[1,'א']]) while(n>=v){rest+=c;n-=v;}
  return out+(rest.length>1?rest.slice(0,-1)+'״'+rest.slice(-1):rest?rest+'׳':'');
}
export function matchesDay(event,date) {
  // An explicitly unspecified Adar is not silently assigned to either leap month.
  return event.day===date.day && (event.month===date.month || (event.month==='Adar' && (date.month==='Adar I'||date.month==='Adar II')));
}
export function zonedCivil(now,timeZone) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function sunsetUTC(iso,latitude,longitude,timeZone) {
  // NOAA sunrise equation; apparent sunset includes standard refraction (90.833°).
  const rad=Math.PI/180, d=civilDate(iso), start=Date.UTC(d.getUTCFullYear(),0,0,12), N=(+d-start)/86400000;
  const t=N+(18-longitude/15)/24, M=.9856*t-3.289;
  const norm=x=>(x%360+360)%360;
  const L=norm(M+1.916*Math.sin(M*rad)+.020*Math.sin(2*M*rad)+282.634);
  let RA=norm(Math.atan(.91764*Math.tan(L*rad))/rad);
  RA+=(Math.floor(L/90)*90-Math.floor(RA/90)*90);RA/=15;
  const sinDec=.39782*Math.sin(L*rad), cosDec=Math.cos(Math.asin(sinDec));
  const cosH=(Math.cos(90.833*rad)-sinDec*Math.sin(latitude*rad))/(cosDec*Math.cos(latitude*rad));
  if(cosH>1||cosH< -1)return null;
  const H=Math.acos(cosH)/rad/15, UT=((H+RA-.06571*t-6.622-longitude/15)%24+24)%24;
  let result=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())+UT*3600000;
  // Choose the UTC occurrence on the intended local solar day.
  while(result+longitude/15*3600000<Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()))result+=86400000;
  while(result+longitude/15*3600000>=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+1))result-=86400000;
  if (timeZone) {
    const candidates=[result-86400000,result,result+86400000];
    result=candidates.find(value=>zonedCivil(new Date(value),timeZone)===iso)??null;
  }
  return result;
}
export function todayDate(now=new Date(),location={latitude:31.778,longitude:35.235,timeZone:'Asia/Jerusalem'}) {
  const civil=zonedCivil(now,location.timeZone), sunset=sunsetUTC(civil,location.latitude,location.longitude,location.timeZone);
  const afterSunset=sunset!==null && +now>=sunset;
  return {civil,iso:afterSunset?moveDay(civil,1):civil,afterSunset,sunset,hebrew:fromGregorian(afterSunset?moveDay(civil,1):civil)};
}
