export type AnalyticsData = {
  sentences: { id: number; length: number; text: string }[];
  wordFrequency: { word: string; count: number }[];
  fogIndex: number;
  alerts: { type: 'warning' | 'danger' | 'info'; message: string }[];
  totalWords: number;
};

const STOP_WORDS = new Set([
  'i', 'a', 'o', 'z', 'w', 'że', 'na', 'do', 'nie', 'ale', 'to', 'jest', 'się', 
  'jak', 'od', 'za', 'po', 'co', 'tym', 'lub', 'czy', 'też', 'by', 'tu', 'dla',
  'tak', 'jego', 'jej', 'ich', 'tylko', 'przez', 'przy', 'bardzo'
]);

// Prosty algorytm liczenia sylab w j. polskim
const countSyllables = (word: string) => {
  const vowels = word.match(/[aąeęioóuy]/gi);
  return vowels ? vowels.length : 1;
};

export const analyzeText = (text: string): AnalyticsData => {
  if (!text || !text.trim()) {
    return { sentences: [], wordFrequency: [], fogIndex: 0, alerts: [], totalWords: 0 };
  }

  // 1. Analiza zdań
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  const rawSentences = text.match(sentenceRegex) || [text];
  
  let totalWords = 0;
  let complexWordsCount = 0;
  
  const sentences = rawSentences.map((s, index) => {
    // Regex dla polskich znaków
    const words = s.match(/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+/g) || [];
    totalWords += words.length;
    words.forEach(w => {
      if (countSyllables(w) >= 4) complexWordsCount++;
    });
    return {
      id: index + 1,
      length: words.length,
      text: s.trim()
    };
  }).filter(s => s.length > 0);

  // 2. FOG Index (zaadaptowany dla polskiego)
  // Wzór: 0.4 * ( (słowa/zdania) + 100 * (trudneSłowa/słowa) )
  const avgSentenceLength = totalWords / (sentences.length || 1);
  const percentComplex = totalWords > 0 ? (complexWordsCount / totalWords) * 100 : 0;
  const fogIndex = 0.4 * (avgSentenceLength + percentComplex);

  // 3. Częstotliwość słów (eliminacja powtórzeń)
  const allWords = text.toLowerCase().match(/[a-ząćęłńóśźż]+/g) || [];
  const freqMap: Record<string, number> = {};
  
  allWords.forEach(word => {
    if (!STOP_WORDS.has(word) && word.length > 2) {
      freqMap[word] = (freqMap[word] || 0) + 1;
    }
  });
  
  const wordFrequency = Object.entries(freqMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // 4. Generowanie alertów (AI Alerts)
  const alerts: AnalyticsData['alerts'] = [];
  
  // Wykrywanie monotonii (3 lub więcej zdań o podobnej długości)
  let monotonyCount = 0;
  for (let i = 1; i < sentences.length; i++) {
    const diff = Math.abs(sentences[i].length - sentences[i-1].length);
    if (diff <= 2) monotonyCount++;
    else monotonyCount = 0;
    
    if (monotonyCount >= 3) {
      alerts.push({ type: 'warning', message: 'Wykryto monotonię: Seria zdań o bardzo podobnej długości.' });
      break; 
    }
  }

  // Zbyt długie zdania
  let consecutiveLong = 0;
  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].length > 20) consecutiveLong++;
    else consecutiveLong = 0;

    if (consecutiveLong >= 2) {
      alerts.push({ type: 'danger', message: `Zbyt wiele długich zdań pod rząd. Czytelnik może stracić koncentrację.` });
      break;
    }
  }

  // Wysoki poziom skomplikowania
  if (fogIndex > 15) {
     alerts.push({ type: 'info', message: 'Tekst jest bardzo trudny (poziom akademicki). Rozważ użycie prostszego słownictwa.' });
  }

  return {
    sentences,
    wordFrequency,
    fogIndex: Number(fogIndex.toFixed(1)),
    alerts,
    totalWords
  };
};
