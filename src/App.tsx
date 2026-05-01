import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from '@google/genai';
import { FileText, Wand2, Loader2, Copy, Check } from 'lucide-react';

const SYSTEM_INSTRUCTION = `Jesteś profesjonalnym redaktorem literackim, korektorem i ekspertem od składu tekstu (DTP) z wieloletnim doświadczeniem w pracy nad prozą (powieści, opowiadania). Twoim zadaniem jest przekształcanie surowego, nieuporządkowanego tekstu w czystą, profesjonalną formę literacką.

Twoje cele:
- Strukturyzacja dialogów: Każda wypowiedź bohatera musi zaczynać się od nowej linii. Używaj polskich myślników dialogowych (półpauza „–” lub pauza „—”) poprzedzonych spacją nierozdzielającą, jeśli to konieczne.
- Podział na akapity: Rozbijaj „ściany tekstu”. Twórz nowe akapity tam, gdzie następuje zmiana wątku, czasu, miejsca lub perspekwyspektywy bohatera.
- Nagłówki i sekcje: Identyfikuj naturalne przerwy w narracji. Wstawiaj nagłówki (np. ## Rozdział X) lub znaczniki przejścia sceny (***), jeśli wyczujesz wyraźną zmianę czasu lub miejsca.
- Interpunkcja dialogowa: Poprawiaj interpunkcję w didaskaliach (np. mała litera po myślniku, jeśli czasownik opisuje czynność mówienia: – Idę stąd – powiedział Marek.).
- Usuwanie błędów technicznych: Łącz przypadkowo rozbite wyrazy, usuwaj zbędne spacje i naprawiaj błędy powstałe przy kopiowaniu tekstu (np. z OCR).

Zasady formatowania (Markdown):
- Używaj # dla tytułów książek.
- Używaj ## dla rozdziałów.
- Używaj ### dla podtytułów lub ważnych sekcji.
- Stosuj kursywę *tekst* dla myśli bohaterów lub podkreśleń.
- Retuszuj tekst tak, aby był gotowy do wklejenia do edytora tekstowego (Word/Google Docs).

Instrukcja dla procesu:
- Zachowaj 100% oryginalnej treści autora. Nie dopisuj własnych zdań, nie zmieniaj stylu autora ani słownictwa (chyba że jest to ewidentna literówka).
- Jeśli tekst jest urwany, dokończ formatowanie do ostatniego pełnego zdania.
- Jeśli w tekście pojawiają się notatki autora (np. "[tutaj opis walki]"), pozostaw je w nawiasach kwadratowych, pogrubione.`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview', // Pro model for complex text tasks & formatting
        contents: inputText,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.2, // Low temperature for consistent formatting
        },
      });
      
      setOutputText(response.text || '');
    } catch (error) {
      console.error('Error processing text:', error);
      setOutputText('Wystąpił błąd podczas przetwarzania tekstu. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] flex flex-col font-['Inter',system-ui,sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg text-white shadow-sm">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 leading-tight">DTP AI Editor</h1>
            <p className="text-xs text-gray-500 font-medium h-[14px]">PROFESJONALNA KOREKTA I SKŁAD</p>
          </div>
        </div>
        <button
          onClick={handleProcess}
          disabled={isLoading || !inputText.trim()}
          className="bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          <span>{isLoading ? 'Przetwarzanie...' : 'Formatuj Tekst'}</span>
        </button>
      </header>

      {/* Main Split Interface */}
      <main className="flex-1 max-w-[1920px] mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        
        {/* Left Column: Input */}
        <section className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[40vh] lg:min-h-0">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tekst Źródłowy</h2>
            <span className="text-xs text-gray-400">{inputText.length} znaków</span>
          </div>
          <textarea
            className="flex-1 w-full p-6 text-gray-700 bg-transparent resize-none focus:outline-none focus:ring-2 focus:ring-orange-600/20 font-['Georgia',serif] leading-relaxed text-[15px]"
            placeholder="Wklej tutaj surowy tekst do sformatowania..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            spellCheck={false}
          />
        </section>

        {/* Right Column: Output */}
        <section className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative min-h-[40vh] lg:min-h-0">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sformatowany Wynik</h2>
            {outputText && (
              <button 
                onClick={handleCopy}
                className="text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors text-xs font-medium bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copied ? 'Skopiowano' : 'Kopiuj'}
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-auto bg-[#fafafa]">
            {outputText ? (
              <div className="p-8 prose prose-orange max-w-none prose-p:leading-relaxed prose-headings:font-['Montserrat',sans-serif] prose-h2:font-light prose-h2:mb-4 prose-h2:mt-8 font-['Georgia',serif] text-[15px] prose-p:mb-4 text-gray-800">
                <ReactMarkdown>{outputText}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex-1 h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-white/50">
                <div className="w-16 h-16 mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                  <Wand2 size={24} className="text-gray-300" />
                </div>
                <p className="font-medium text-sm">Wynik pojawi się tutaj</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[250px]">Wklej tekst i kliknij "Formatuj Tekst", aby rozpocząć pracę redaktorską.</p>
              </div>
            )}
            
            {isLoading && (
              <div className="absolute inset-x-0 bottom-0 top-12 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="bg-white px-6 py-4 rounded-full shadow-lg border border-gray-100 flex items-center gap-3">
                  <Loader2 className="animate-spin text-orange-600" size={20} />
                  <span className="text-sm font-medium text-gray-600">Trwa magia redakcyjna...</span>
                </div>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
