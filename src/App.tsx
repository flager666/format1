import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Wand2, Loader2, Copy, Check, Lock } from 'lucide-react';

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

export default function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(true); // Start verifying to check if no password required

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/verify-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: '' }),
        });
        if (res.ok) {
          setIsAuthenticated(true);
        }
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

      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Nieprawidłowe hasło');
      }
    } catch (err) {
      setAuthError('Błąd połączenia z serwerem');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputText,
          systemInstruction: SYSTEM_INSTRUCTION,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('Błąd serwera');
      }

      const data = await response.json();
      setOutputText(data.text || '');
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

  if (!isAuthenticated && !isVerifying) {
    return (
      <div className="min-h-screen bg-[#f5f5f4] flex flex-col items-center justify-center font-['Inter',system-ui,sans-serif] p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-orange-600 p-3 rounded-xl text-white shadow-sm">
              <Lock size={28} />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-center text-gray-900 mb-2">Dostęp zablokowany</h1>
          <p className="text-center text-gray-500 text-sm mb-8">Wprowadź hasło, aby uzyskać dostęp do aplikacji.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Hasło"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 bg-gray-50 text-gray-900 placeholder-gray-400"
              />
            </div>
            {authError && (
              <p className="text-red-500 text-sm text-center font-medium">{authError}</p>
            )}
            <button
              type="submit"
              disabled={!password}
              className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Zaloguj się</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && isVerifying) {
    return (
      <div className="min-h-screen bg-[#f5f5f4] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-orange-600" />
      </div>
    );
  }

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
