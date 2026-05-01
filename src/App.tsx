import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import * as diff from 'diff';
import {
  FileText, Wand2, Loader2, Copy, Check, Lock, Moon, Sun,
  Image as ImageIcon, Download, Layers, Sparkles, Type, Layout,
  BookOpen, Palette, FileDown, MoreVertical, MessageSquare, BarChart2, History
} from 'lucide-react';
import { AnalyticsPanel } from './components/AnalyticsPanel';

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
  const [activeRightTab, setActiveRightTab] = useState<'media' | 'analytics'>('analytics');
  const [images, setImages] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageStyle, setImageStyle] = useState('Cyberpunk / Sci-Fi');

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [docTitle, setDocTitle] = useState('Dokument_DTP');
  const [docAuthor, setDocAuthor] = useState('');
  const [exporting, setExporting] = useState(false);

  // Floating menu state
  const [selection, setSelection] = useState({ text: '', x: 0, y: 0, show: false });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Time Machine state
  const [history, setHistory] = useState<{timestamp: number, text: string}[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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

  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${docTitle}</title>
            <style>
              @page { size: A4; margin: 2cm; }
              body { font-family: 'Georgia', serif; line-height: 1.6; color: #000; font-size: 12pt; }
              h1 { font-family: 'Helvetica', sans-serif; font-size: 24pt; margin-bottom: 2rem; font-weight: bold; }
              h2 { font-family: 'Helvetica', sans-serif; font-size: 16pt; margin-top: 2rem; margin-bottom: 1rem; }
              p { margin-bottom: 1rem; text-align: justify; }
              ul, ol { margin-bottom: 1rem; }
            </style>
          </head>
          <body>
            ${document.querySelector('.prose')?.innerHTML || 'Brak treści do wydruku.'}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    }
    setShowExportModal(false);
  };

  const exportDocx = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: outputText, title: docTitle, password })
      });
      if (!response.ok) throw new Error('Błąd generowania DOCX na serwerze.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docTitle || 'document'}.docx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  const exportEpub = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/export/epub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: outputText, title: docTitle, author: docAuthor, coverImage: images[0], password })
      });
      if (!response.ok) throw new Error('Błąd generowania EPUB na serwerze.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docTitle || 'document'}.epub`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
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

  const handleTextSelection = (e: any) => {
    if (!textAreaRef.current) return;
    const { selectionStart, selectionEnd, value } = textAreaRef.current;
    if (selectionStart !== selectionEnd) {
      const text = value.substring(selectionStart, selectionEnd);
      if (text.trim().length > 0) {
        const rect = textAreaRef.current.getBoundingClientRect();
        setSelection({
          text,
          x: e.clientX ? e.clientX : rect.left + rect.width / 2,
          y: e.clientY ? e.clientY - 40 : rect.top + 20,
          show: true
        });
        return;
      }
    }
    setSelection({ ...selection, show: false });
  };

  useEffect(() => {
    const handleClickOutside = (e: any) => {
      if (selection.show && !e.target.closest('#floating-menu') && !e.target.closest('textarea')) {
        setSelection({ ...selection, show: false });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selection]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
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

            <button onClick={() => setShowExportModal(true)} disabled={!inputText} className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Eksportuj Plik">
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
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowHistory(true)}
                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 uppercase tracking-wider transition-colors"
                title="Historia Wersji"
              >
                <History size={14} /> Historia ({history.length})
              </button>
              <span className="text-[11px] text-slate-400 font-mono">{inputText.length} znaków</span>
            </div>
          </div>
          <textarea
            ref={textAreaRef}
            onMouseUp={handleTextSelection}
            onKeyUp={handleTextSelection}
            className="flex-1 w-full p-6 text-slate-800 dark:text-slate-200 bg-transparent resize-none focus:outline-none font-['Georgia',serif] leading-relaxed text-[15px] placeholder-slate-300 dark:placeholder-slate-700"
            placeholder="Wklej surowy tekst do składu..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            spellCheck={false}
          />
        </section>

        {/* Right Column: Dynamic Panel */}
        {showMediaPanel && (
          <aside className="w-full lg:w-80 flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all animate-in slide-in-from-right-8 duration-300">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setActiveRightTab('analytics')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${activeRightTab === 'analytics' ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border-b-2 border-indigo-600 dark:border-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                <BarChart2 size={14} />
                Analityka
              </button>
              <button
                onClick={() => setActiveRightTab('media')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors ${activeRightTab === 'media' ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 border-b-2 border-emerald-600 dark:border-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                <Palette size={14} />
                Media
              </button>
            </div>

            {activeRightTab === 'analytics' ? (
              <AnalyticsPanel text={inputText} />
            ) : (
              <div className="p-4 flex flex-col h-full overflow-y-auto">
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
                  {isGeneratingImage ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-emerald-400" />}
                  {isGeneratingImage ? 'Generowanie...' : 'Generuj z kontekstu'}
                </button>

                <div className="flex-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Galeria Mediów</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {images.length > 0 ? images.map((img, i) => (
                      <div key={i} className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group relative cursor-pointer shadow-sm">
                        <img src={img} alt="Generated UI" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                          <span className="text-[10px] text-white font-bold bg-black/60 px-3 py-1.5 rounded-md border border-white/20">Użyj</span>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-2 text-center py-10 opacity-60 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <ImageIcon size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-[10px] text-slate-500 font-medium">Brak wygenerowanych mediów</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}

      </main>

      {/* Pending Change Modal */}
      {pendingChange && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl overflow-hidden flex flex-col h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Check size={18} className="text-emerald-500" /> Weryfikacja Zmian
              </h3>
              <button onClick={() => setPendingChange(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                ✕
              </button>
            </div>
            <div className="p-6 flex-1 flex flex-col md:flex-row gap-6 overflow-hidden bg-white dark:bg-slate-900">
              {/* Left Column: Cards */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 shrink-0">Raport Edukacyjny:</h4>
                <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4">
                  {pendingChange.changes && pendingChange.changes.length > 0 ? (
                    pendingChange.changes.map((change, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          const newChanges = [...pendingChange.changes];
                          newChanges[idx].isSelected = !newChanges[idx].isSelected;
                          setPendingChange({ ...pendingChange, changes: newChanges });
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
                        {change.originalText && change.newText && change.originalText !== change.newText && (
                          <div className={`mt-2 p-3 rounded-lg flex flex-col gap-1.5 text-[12px] font-['Georgia',serif] border ${change.isSelected ? 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700/50' : 'bg-transparent border-slate-100 dark:border-slate-800 opacity-70'}`}>
                            <div className="flex gap-2 text-slate-500 dark:text-slate-500">
                              <span className="shrink-0 text-[10px] font-sans font-bold uppercase tracking-wider text-red-500/70 mt-0.5">Było:</span>
                              <span className="line-through decoration-red-500/40">{change.originalText}</span>
                            </div>
                            <div className="flex gap-2 text-slate-700 dark:text-slate-300">
                              <span className="shrink-0 text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-500/70 mt-0.5">Jest:</span>
                              <span className="font-medium bg-emerald-100/50 dark:bg-emerald-900/30 px-1 rounded">{change.newText}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500 italic p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">Brak wykrytych zmian w strukturze.</div>
                  )}
                </div>
              </div>

              {/* Right Column: Preview Diff */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 shrink-0">Podgląd nowej treści ze zmianami:</h4>
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-y-auto flex-1 h-full">
                  {renderDiff(pendingChange.originalText, getPreviewText())}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setPendingChange(null)}
                className="px-5 py-2.5 rounded-xl font-medium text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Odrzuć
              </button>
              <button
                onClick={() => {
                  const finalText = getPreviewText();
                  // Zapis historii przed wprowadzeniem zmiany
                  setHistory(prev => [{ timestamp: Date.now(), text: inputText }, ...prev]);
                  
                  if (pendingChange.isSelection) {
                    const escapedOriginal = pendingChange.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regexStr = escapedOriginal.replace(/\s+/g, '\\s+');
                    const regex = new RegExp(regexStr);
                    
                    const newFullText = inputText.replace(regex, finalText);
                    setInputText(newFullText);
                    setOutputText(newFullText);
                  } else {
                    setInputText(finalText);
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileDown size={18} className="text-indigo-500" /> Opcje Eksportu
              </h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tytuł Dokumentu</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Autor (Dla EPUB)</label>
                <input
                  type="text"
                  value={docAuthor}
                  onChange={e => setDocAuthor(e.target.value)}
                  placeholder="Imię i nazwisko"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {images.length > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/50 flex gap-3 items-center">
                  <div className="w-10 h-10 rounded overflow-hidden shrink-0">
                    <img src={images[0]} alt="cover" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    Ostatni wygenerowany obraz (Nano Banana 2) zostanie użyty jako okładka dla pliku EPUB.
                  </p>
                </div>
              )}

              <div className="pt-4 grid grid-cols-3 gap-3">
                <button
                  onClick={exportPDF}
                  disabled={exporting}
                  className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <span className="text-lg font-black text-red-500">PDF</span>
                  <span className="text-[10px] text-slate-500 font-medium">Do druku</span>
                </button>

                <button
                  onClick={exportEpub}
                  disabled={exporting}
                  className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {exporting ? <Loader2 size={24} className="animate-spin text-emerald-500" /> : <span className="text-lg font-black text-emerald-500">EPUB</span>}
                  <span className="text-[10px] text-slate-500 font-medium">E-book</span>
                </button>

                <button
                  onClick={exportDocx}
                  disabled={exporting}
                  className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {exporting ? <Loader2 size={24} className="animate-spin text-blue-500" /> : <span className="text-lg font-black text-blue-500">DOCX</span>}
                  <span className="text-[10px] text-slate-500 font-medium">Do redakcji</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal / Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <History size={18} className="text-indigo-500" /> Time Machine
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
              {history.length > 0 ? history.map((item, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-3 group hover:border-indigo-500/50 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    <button 
                      onClick={() => {
                        if (confirm('Czy na pewno chcesz przywrócić tę wersję? Obecny tekst zostanie nadpisany.')) {
                          setInputText(item.text);
                          setOutputText(item.text);
                          setShowHistory(false);
                        }
                      }}
                      className="text-xs bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Przywróć
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-['Georgia',serif] line-clamp-3">
                    {item.text}
                  </p>
                </div>
              )) : (
                <div className="text-center py-10 opacity-60">
                  <History size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Brak zapisanych wersji</p>
                  <p className="text-[10px] text-slate-400 mt-1">Wersje zapisują się automatycznie po zatwierdzeniu zmian AI.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
