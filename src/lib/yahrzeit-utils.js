// Yahrzeit utility functions

// Function to get Hebrew date using Hebcal API
export async function getHebrewDate(gregorianDate) {
  const year = gregorianDate.getFullYear();
  const month = gregorianDate.getMonth() + 1; // JavaScript months are 0-indexed
  const day = gregorianDate.getDate();
  
  try {
    const response = await fetch(`https://www.hebcal.com/converter?cfg=json&gy=${year}&gm=${month}&gd=${day}&g2h=1`);
    if (!response.ok) throw new Error('Failed to fetch Hebrew date');
    const data = await response.json();
    return {
      year: data.hy,
      month: data.hm,
      day: data.hd,
      hebrew: data.hebrew,
      events: data.events || []
    };
  } catch (error) {
    console.error('Error fetching Hebrew date:', error);
    // Fallback: approximate calculation
    const hebrewMonths = ['TISHREI', 'CHESHVAN', 'KISLEV', 'TEVET', 'SHEVAT', 'ADAR', 'NISAN', 'IYAR', 'SIVAN', 'TAMMUZ', 'AV', 'ELUL'];
    const monthIndex = (gregorianDate.getMonth() + 6) % 12; // Rough approximation
    return {
      year: 5786,
      month: hebrewMonths[monthIndex],
      day: gregorianDate.getDate(),
      hebrew: 'Approximate date',
      events: []
    };
  }
}

// Function to get tzaddikim for a Hebrew date
export function getTzaddikimForHebrewDate(tzaddikimData, hebrewDate) {
  const { month, day } = hebrewDate;
  
  if (!tzaddikimData || !tzaddikimData.all_tzaddikim) {
    return [];
  }
  
  return tzaddikimData.all_tzaddikim.filter(tzaddik => {
    if (!tzaddik.yahrzeit_month || !tzaddik.yahrzeit_day) return false;
    
    const tzaddikMonth = tzaddik.yahrzeit_month.toUpperCase();
    const targetMonth = month.toUpperCase();
    
    // Check if months match (including Adar/Adar II handling)
    if (tzaddikMonth === targetMonth) {
      return tzaddik.yahrzeit_day.toString() === day.toString();
    }
    
    // In non-leap years, Adar II yahrzeits are observed in Adar
    if (tzaddikMonth === 'ADAR II' && targetMonth === 'ADAR') {
      return tzaddik.yahrzeit_day.toString() === day.toString();
    }
    
    return false;
  });
}

// Function to format Hebrew date for display
export function formatHebrewDate(hebrewDate) {
  return `${hebrewDate.hebrew} (${hebrewDate.day} ${hebrewDate.month} ${hebrewDate.year})`;
}

// Function to check if a date has significant yahrzeits
export function hasSignificantYahrzeits(tzaddikimData, hebrewDate) {
  const tzaddikim = getTzaddikimForHebrewDate(tzaddikimData, hebrewDate);
  return tzaddikim.length > 0;
}