import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import * as diff from 'diff';
import {
  FileText, Wand2, Loader2, Copy, Check, Lock, Moon, Sun,
  Image as ImageIcon, Download, Layers, Sparkles, Type, Layout,
  BookOpen, Palette, FileDown, MoreVertical, MessageSquare
} from 'lucide-react';

const SYSTEM_INSTRUCTION = `Jesteś ekspertem DTP, redaktorem technicznym i korektorem z 20-letnim doświadczeniem w polskiej branży wydawniczej. Twoją specjalnością jest przygotowanie surowych maszynopisów do składu w standardzie premium. Twoim celem jest przekształcenie tekstu w idealnie sformatowany dokument, zachowując 100% wierności stylowi autora.

Zadania techniczne (Standard Wydawniczy):

Polski zapis dialogowy:
Używaj wyłącznie półpauzy (–) na początku dialogu.
Zasada didaskaliów: Jeśli po dialogu występuje czasownik oznaczający mówienie (rzekł, zapytał, mruknął), kontynuuj małą literą bez kropki przed myślnikiem (np. „– Idę – rzekł.”). Jeśli po dialogu występuje czynność (spojrzał, westchnął), zamknij dialog kropką i zacznij didaskalia wielką literą (np. „– Idę. – Spojrzał na zegarek.”).

Struktura i rytm:
Eliminuj „ściany tekstu” poprzez logiczny podział na akapity (nowa myśl, zmiana czasu/miejsca/akcji).
Wstawiaj *** w miejscach wyraźnych przeskoków czasowych lub narracyjnych wewnątrz rozdziałów.

Higiena tekstu:
Usuwaj podwójne spacje, błędy OCR (np. l zamiast I, 0 zamiast O).
Łącz wyrazy przypadkowo rozbite na końcach linii.

Zasady formatowania Markdown:
# TYTUŁ KSIĄŻKI (Wszystkie litery wielkie).
## Numer Rozdziału / Tytuł Rozdziału.
*Kursywa* dla myśli wewnętrznych oraz podkreśleń (nie używaj cudzysłowów dla myśli).
Wszelkie uwagi autora lub luki w tekście (np. [opis walki]) pozostaw jako [BOGRUBIONY TEKST W NAWIASACH].

Instrukcje rygorystyczne:
Zero ingerencji redakcyjnej: Nie zmieniaj słownictwa, nie poprawiaj szyku zdań (chyba że to oczywisty błąd techniczny), nie dopisuj własnej treści.
Czystość wyjściowa: Wynikiem Twojej pracy ma być wyłącznie sformatowany tekst – bez żadnych komentarzy wstępnych typu „Oto sformatowany tekst...”.
Kompletność: Jeśli tekst kończy się w połowie zdania, sformatuj go do ostatniego znaku, nie próbując go kończyć.`;

const PROMPT_TYPO = `Rola: Jesteś precyzyjnym automatem do korekty technicznej i typograficznej.
Zadanie: Twoim jedynym celem jest naprawa błędów bez ingerencji w warstwę stylistyczną.
Zakres działań:
1. Poprawa błędów ortograficznych i literówek.
2. Korekta błędów OCR (np. błędne łączenie/dzielenie wyrazów, zamiana "l" na "1" itp.).
3. Korekta interpunkcji zgodnie z zasadami języka tekstu.
4. Poprawa typografii: zamiana dywizów (-) na półpauzy (–) w dialogach i zakresach, usunięcie podwójnych spacji.
Restrykcje:
- NIE zmieniaj szyku zdań.
- NIE podmieniaj słownictwa na synonimy.
- NIE poprawiaj stylu, nawet jeśli wydaje się niezgrabny.
- NIE dodawaj ani nie usuwaj akapitów.
- NIE dodawaj żadnego komentarza przed ani po tekście.
Wyjście: Zwróć wyłącznie poprawiony tekst źródłowy.`;

const PROMPT_SPOJNOSC = `Rola: Jesteś surowym audytorem treści, analitykiem logiki narracyjnej i kontrolerem jakości tekstu.
Zadanie: Przeprowadź krytyczną analizę dostarczonego tekstu. Twoim celem jest wykrycie błędów strukturalnych, logicznych oraz technicznych.
Kategorie audytu:
1. Logika i Fakty: Wykrywanie wewnętrznych sprzeczności.
2. Ciągłość (Continuity): Błędy w chronologii, niewyjaśnione skoki czasowe.
3. Spójność Postaci: Niespójności w opisach i zachowaniach.
4. Formatowanie: Wykrywanie nieregularności w zapisie.
Instrukcje wyjściowe:
- Zwróć wyłącznie raport w formie listy punktowanej Markdown.
- Każdy punkt: [Lokalizacja/Opis problemu] oraz [Sugestia naprawy].
- Jeśli tekst jest spójny: "Brak wykrytych błędów spójności".
- Zakaz: Nie poprawiaj tekstu źródłowego, nie pisz wstępów.`;

const PROMPT_LAMANIE = `Rola: Jesteś ekspertem od strukturyzacji tekstu i składu Markdown.
Zadanie: Twoim celem jest przekształcenie surowego tekstu w przejrzysty, sformatowany dokument.
Zakres działań:
1. Podziel tekst na logiczne akapity (zasada "jedna myśl na akapit").
2. Wprowadź hierarchię nagłówków Markdown (#, ##, ###).
3. Sformatuj wyliczenia jako listy punktowane lub numerowane.
4. Zastosuj pogrubienie dla kluczowych terminów.
Restrykcje:
- Bezwzględnie zachowaj oryginalne słownictwo i szyk zdań.
- Nie wolno usuwać, dodawać ani streszczać treści.
Wyjście: Zwróć wyłącznie sformatowany tekst.`;

type ChangeItem = {
  location: string;
  action: string;
  explanation: string;
  originalText?: string;
  newText?: string;
  isSelected?: boolean;
};

export default function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auth state
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);

  // New features state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showMediaPanel, setShowMediaPanel] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageStyle, setImageStyle] = useState('Cyberpunk / Sci-Fi');

  // Floating menu state
  const [selection, setSelection] = useState({ text: '', x: 0, y: 0, show: false });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Pending change state for confirmation modal
  const [pendingChange, setPendingChange] = useState<{ changes: ChangeItem[], text: string, isSelection: boolean, originalText: string } | null>(null);

  const getPreviewText = () => {
    if (!pendingChange) return '';
    
    // Sprawdzamy czy AI zwróciło dane do podmiany (wsparcia selektywnego)
    const hasOriginalTextData = pendingChange.changes.some(c => c.originalText);
    const allSelected = pendingChange.changes.every(c => c.isSelected !== false);

    if (!hasOriginalTextData && allSelected) {
      return pendingChange.text; // Fallback do starego zachowania
    }

    let preview = pendingChange.originalText;
    pendingChange.changes.forEach(change => {
      if (change.isSelected !== false && change.originalText && change.newText) {
        preview = preview.replace(change.originalText, change.newText);
      }
    });
    
    // Jeśli z jakiegoś powodu preview się nie zmieniło a powinno, a mamy fallback, użyjmy text
    if (preview === pendingChange.originalText && allSelected && pendingChange.text) {
        return pendingChange.text;
    }

    return preview;
  };

  const renderDiff = (oldText: string, newText: string) => {
    const diffs = diff.diffWordsWithSpace(oldText, newText);
    return (
      <div className="font-['Georgia',serif] whitespace-pre-wrap text-[13px] leading-relaxed break-words">
        {diffs.map((part, index) => {
          if (part.added) {
            return <span key={index} className="bg-emerald-200/50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 rounded px-0.5">{part.value}</span>;
          }
          if (part.removed) {
            return <span key={index} className="bg-red-200/50 dark:bg-red-900/40 text-red-800 dark:text-red-200 line-through rounded px-0.5">{part.value}</span>;
          }
          return <span key={index} className="text-slate-700 dark:text-slate-300">{part.value}</span>;
        })}
      </div>
    );
  };

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: '' }),
        });
        if (res.ok) setIsAuthenticated(true);
      } catch (err) {
        console.error('Auth check failed', err);
      } finally {
        setIsVerifying(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setIsVerifying(true);
    setAuthError('');
    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) setIsAuthenticated(true);
      else {
        const data = await res.json();
        setAuthError(data.error || 'Nieprawidłowe hasło');
      }
    } catch (err) {
      setAuthError('Błąd połączenia z serwerem');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProcess = async (customInstruction?: string) => {
    const textToProcess = selection.show && selection.text ? selection.text : inputText;
    if (!textToProcess.trim()) return;

    setIsLoading(true);
    setSelection({ ...selection, show: false });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText: textToProcess,
          systemInstruction: customInstruction || SYSTEM_INSTRUCTION,
          password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Błąd serwera');
      }

      const data = await response.json();

      setPendingChange({
        changes: (data.changes || []).map((c: any) => ({ ...c, isSelected: true })),
        text: data.text || '',
        isSelection: !!(selection.show && selection.text),
        originalText: selection.show && selection.text ? selection.text : inputText
      });
    } catch (error: any) {
      console.error('Error processing:', error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async () => {
    const prompt = selection.show && selection.text ? selection.text : "Zjawiskowa scena, główny bohater";
    setIsGeneratingImage(true);
    setSelection({ ...selection, show: false });

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: imageStyle, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Błąd generowania obrazu');
      }

      const data = await response.json();
      setImages([data.imageUrl, ...images]);
    } catch (error) {
      console.error('Błąd:', error);
      alert('Nie udało się wygenerować obrazu. Sprawdź konsolę.');
    } finally {
      setIsGeneratingImage(false);
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

  const handleTextSelection = () => {
    const text = window.getSelection()?.toString();
    if (text && text.trim().length > 0) {
      const range = window.getSelection()?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setSelection({
          text,
          x: rect.left + window.scrollX + (rect.width / 2),
          y: rect.top + window.scrollY - 60,
          show: true
        });
      }
    } else {
      setSelection({ ...selection, show: false });
    }
  };

  // ---------------- Render Branches ---------------- //

  if (!isAuthenticated && !isVerifying) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center font-['Inter',system-ui,sans-serif] p-4 transition-colors">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-300 dark:border-slate-700 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-slate-700 dark:bg-slate-600 p-4 rounded-2xl text-white shadow-lg shadow-slate-700/30">
              <Lock size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">Dostęp chroniony</h1>
          <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-8">Wprowadź hasło, aby uzyskać dostęp do DTP Studio.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Hasło dostępowe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-700/50 focus:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
              />
            </div>
            {authError && <p className="text-red-500 text-sm text-center font-medium">{authError}</p>}
            <button
              type="submit"
              disabled={!password || isVerifying}
              className="w-full bg-slate-700 hover:bg-slate-800 active:bg-slate-900 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isVerifying ? <Loader2 size={18} className="animate-spin" /> : <span>Autoryzuj dostęp</span>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && isVerifying) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center transition-colors">
        <Loader2 size={40} className="animate-spin text-slate-600 dark:text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-['Inter',system-ui,sans-serif] text-slate-800 dark:text-slate-200 transition-colors selection:bg-slate-300 dark:selection:bg-slate-700/50">
      
      {/* Floating Contextual Menu */}
      {selection.show && (
        <div 
          className="absolute z-50 bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-slate-200 dark:border-slate-700 flex gap-1 p-1 animate-in fade-in zoom-in duration-200"
          style={{ left: `${selection.x}px`, top: `${selection.y}px`, transform: 'translateX(-50%)' }}
        >
          <button onClick={() => handleProcess("Popraw tylko błędy typograficzne i ortograficzne w tym fragmencie, nie zmieniając stylu.")} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/30 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
            <Sparkles size={14} className="text-slate-700 dark:text-slate-400" /> Korekta
          </button>
          <button onClick={() => handleProcess("Sparafrazuj ten tekst na styl bardziej literacki i wysublimowany.")} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/30 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
            <MessageSquare size={14} className="text-indigo-600 dark:text-indigo-400" /> Parafraza
          </button>
          <button onClick={generateImage} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/30 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors">
            <ImageIcon size={14} className="text-emerald-600 dark:text-emerald-400" /> Ilustruj
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-40 shadow-sm transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1920px] mx-auto">
          
          <div className="flex items-center gap-3">
            <div className="bg-slate-700 dark:bg-slate-600 p-2.5 rounded-xl text-white shadow-md shadow-slate-700/20">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white leading-tight text-lg">DTP Studio Pro</h1>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold tracking-wider uppercase">Ai-Powered Publishing</p>
            </div>
          </div>

          {/* AI Tools Toolbar */}
          <div className="flex-1 hidden md:flex items-center justify-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button onClick={() => handleProcess(PROMPT_TYPO)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-xs font-medium transition-all shadow-sm">
                <Type size={14} className="text-slate-600 dark:text-slate-400" /> Typo
              </button>
              <button onClick={() => handleProcess(PROMPT_SPOJNOSC)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-xs font-medium transition-all shadow-sm">
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" /> Spójność
              </button>
              <button onClick={() => handleProcess(PROMPT_LAMANIE)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-xs font-medium transition-all shadow-sm">
                <Layout size={14} className="text-indigo-600 dark:text-indigo-400" /> Łamanie
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
              title="Zmień motyw"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>

            <button onClick={() => mockAction("Eksport PDF/X-4")} className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors" title="Eksportuj">
              <FileDown size={18} />
            </button>
            
            <button onClick={() => setShowMediaPanel(!showMediaPanel)} className={`p-2.5 rounded-full transition-colors ${showMediaPanel ? 'bg-slate-200 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300' : 'text-slate-500 hover:text-slate-900 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'}`} title="Panel Multimediów">
              <ImageIcon size={18} />
            </button>

            <button
              onClick={() => handleProcess()}
              disabled={isLoading || !inputText.trim()}
              className="bg-slate-700 hover:bg-slate-800 active:bg-slate-900 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all shadow-md shadow-slate-700/20 ml-2"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              <span className="hidden sm:inline">{isLoading ? 'Formatowanie...' : 'Pełny Skład DTP'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1920px] mx-auto w-full p-4 flex flex-col lg:flex-row gap-4 overflow-hidden" onMouseUp={handleTextSelection}>
        
        {/* Left Column: Input */}
        <section className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[40vh] transition-colors">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-slate-400" />
              <h2 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Źródło</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{inputText.length} znaków</span>
          </div>
          <textarea
            ref={textAreaRef}
            className="flex-1 w-full p-6 text-slate-800 dark:text-slate-200 bg-transparent resize-none focus:outline-none font-['Georgia',serif] leading-relaxed text-[15px] placeholder-slate-300 dark:placeholder-slate-700"
            placeholder="Wklej surowy tekst do składu..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            spellCheck={false}
          />
        </section>

        {/* Middle Column: Output */}
        <section className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative min-h-[40vh] transition-colors">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layout size={14} className="text-slate-500 dark:text-slate-400" />
              <h2 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Podgląd Wydruku</h2>
            </div>
            {outputText && (
              <button onClick={handleCopy} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 transition-colors text-[11px] font-semibold bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? 'Skopiowano' : 'Kopiuj'}
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-auto bg-slate-50/30 dark:bg-slate-950/30">
            {outputText ? (
              <div className="p-8 prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-['Inter',sans-serif] prose-h1:font-black prose-h1:text-2xl prose-h1:mb-6 prose-h2:font-light prose-h2:text-xl prose-h2:mb-4 prose-h2:mt-8 font-['Georgia',serif] text-[15px] prose-p:mb-4">
                <ReactMarkdown>{outputText}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex-1 h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center opacity-60">
                <div className="w-16 h-16 mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center rotate-3 border border-slate-200 dark:border-slate-700">
                  <Wand2 size={24} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="font-medium text-sm text-slate-600 dark:text-slate-400">Puste pole składu</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 max-w-[250px]">Skorzystaj z narzędzi AI, aby wygenerować profesjonalny układ typograficzny.</p>
              </div>
            )}
            
            {isLoading && (
              <div className="absolute inset-x-0 bottom-0 top-10 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-10 transition-all">
                <div className="bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                  <Loader2 className="animate-spin text-slate-600 dark:text-slate-400" size={24} />
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Przetwarzanie algorytmiczne...</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Analiza gramatyki i łamanie tekstu</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Media Panel */}
        {showMediaPanel && (
          <aside className="w-full lg:w-72 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all animate-in slide-in-from-right-8 duration-300">
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
              <Palette size={14} className="text-slate-500 dark:text-slate-400" />
              <h2 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nano Banana 2</h2>
            </div>
            
            <div className="p-4 flex flex-col h-full">
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Styl Ilustracji</label>
                <select 
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                >
                  <option>Cyberpunk / Sci-Fi</option>
                  <option>Szkic Techniczny</option>
                  <option>Realizm Magiczny</option>
                  <option>Minimalizm Wektorowy</option>
                </select>
              </div>

              <button 
                onClick={generateImage}
                disabled={isGeneratingImage}
                className="w-full bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl py-3 text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg mb-6"
              >
                {isGeneratingImage ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-slate-300" />}
                {isGeneratingImage ? 'Generowanie...' : 'Generuj z kontekstu'}
              </button>

              <div className="flex-1 overflow-y-auto">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Galeria Mediów</h3>
                <div className="grid grid-cols-2 gap-2">
                  {images.length > 0 ? images.map((img, i) => (
                    <div key={i} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group relative cursor-pointer">
                      <img src={img} alt="Generated UI" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] text-white font-medium bg-black/60 px-2 py-1 rounded">Użyj</span>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 text-center py-8 opacity-50">
                      <ImageIcon size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-[10px] text-slate-500">Brak wygenerowanych mediów</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        )}

      </main>

      {/* Pending Change Modal */}
      {pendingChange && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Check size={18} className="text-emerald-500" /> Weryfikacja Zmian
              </h3>
              <button onClick={() => setPendingChange(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Raport Edukacyjny:</h4>
                <div className="flex flex-col gap-3">
                  {pendingChange.changes && pendingChange.changes.length > 0 ? (
                    pendingChange.changes.map((change, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          const newChanges = [...pendingChange.changes];
                          newChanges[idx].isSelected = !newChanges[idx].isSelected;
                          setPendingChange({...pendingChange, changes: newChanges});
                        }}
                        className={`bg-white dark:bg-slate-800 border ${change.isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'} rounded-xl p-4 shadow-sm flex flex-col gap-2 relative cursor-pointer transition-all`}
                      >
                        <div className="absolute top-4 right-4">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${change.isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                            {change.isSelected && <Check size={14} className="text-white" />}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pr-8">
                          <span className={`${change.isSelected ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'} text-[10px] px-2 py-0.5 rounded-full font-bold uppercase transition-colors`}>{change.location}</span>
                          <span className={`text-sm font-semibold ${change.isSelected ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{change.action}</span>
                        </div>
                        <p className={`text-[13px] leading-relaxed pr-8 ${change.isSelected ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          <strong className={change.isSelected ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}>Dlaczego? </strong>
                          {change.explanation}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500 italic p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">Brak wykrytych zmian w strukturze.</div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Podgląd nowej treści ze zmianami:</h4>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner max-h-64 overflow-y-auto">
                  {renderDiff(pendingChange.originalText, getPreviewText())}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
              <button 
                onClick={() => setPendingChange(null)}
                className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Odrzuć
              </button>
              <button 
                onClick={() => {
                  const finalText = getPreviewText();
                  if (pendingChange.isSelection) {
                    setInputText(inputText.replace(pendingChange.originalText, finalText));
                  } else {
                    setOutputText(finalText);
                  }
                  setPendingChange(null);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-sm transition-colors shadow-md shadow-emerald-600/20 flex items-center gap-2"
              >
                <Check size={16} /> Zatwierdź i Wprowadź
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
