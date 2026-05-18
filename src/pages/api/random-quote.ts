import type { APIContext } from 'astro';

export const prerender = false;

const QUOTES = [
  { he: 'כל העולם כולו גשר צר מאוד, והעיקר לא לפחד כלל', en: 'The whole world is a very narrow bridge, and the main thing is not to fear at all', src: 'LM II:48' },
  { he: 'אם אתה מאמין שיכולין לקלקל, תאמין שיכולין לתקן', en: 'If you believe you can damage, believe you can fix', src: 'LM II:112' },
  { he: 'מצוה גדולה להיות בשמחה תמיד', en: 'It is a great mitzvah to always be happy', src: 'LM II:24' },
  { he: 'אין שום יאוש בעולם כלל', en: 'There is no despair in the world at all', src: 'LM II:78' },
  { he: 'התבודדות הוא מעלה עליונה ויתירה על הכל', en: 'Hitbodedut is the highest virtue of all', src: 'LM II:25' },
  { he: 'עיקר החיות מהשמחה', en: 'The essence of life is from joy', src: 'LM II:24' },
  { he: 'תפילה בלא כוונה כגוף בלא נשמה', en: 'Prayer without intent is like a body without a soul', src: 'LM I:2' },
  { he: 'שכל אחד ואחד מישראל יש לו חלק בתורה', en: 'Every single Jew has a portion in Torah', src: 'LM I:22' },
  { he: 'צריך לחפש ולבקש למצוא בעצמו איזה מעט טוב', en: 'One must search to find in oneself some small good', src: 'LM I:282' },
  { he: 'נ נח נחמ נחמן מאומן', en: 'Na Nach Nachma Nachman MeUman', src: 'The Petek' },
  { he: 'כשאדם יודע שכל הקורותיו הם לטובתו, זאת הבחינה מעין עולם הבא', en: 'When a person knows all that happens is for his good, this is like the World to Come', src: 'LM I:4' },
  { he: 'הצדיק אמר שאין דבר ישן, כל יום ויום הם שמים חדשים וארץ חדשה', en: 'The Tzaddik said there is nothing old — every day is a new heaven and new earth', src: 'Sichos HaRan' },
];

export async function GET() {
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  return new Response(JSON.stringify(quote), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
