Plan Implementacji Funkcji DTP Studio
Pro V2
Poniżej znajduje się zaktualizowany, szczegółowy plan ożywienia funkcji interfejsu użytkownika
w aplikacji DTP Studio, zawierający zoptymalizowane prompty systemowe dla modeli Gemini.
1. Narzędzia Główne (Toolbar)
Obecnie przyciski te wywołują funkcję mockAction. Docelowo każda z nich będzie wywoływać
zoptymalizowany proces AI poprzez endpoint /api/generate.
T Typo (Korekta Techniczna)
● Cel: Usunięcie błędów literowych, interpunkcyjnych i typograficznych bez ingerencji w styl
autora.
● Prompt Systemowy:
Rola: Jesteś precyzyjnym automatem do korekty technicznej i
typograficznej.
Zadanie: Twoim jedynym celem jest naprawa błędów bez ingerencji w
warstwę stylistyczną.
Zakres działań:
1. Poprawa błędów ortograficznych i literówek.
2. Korekta błędów OCR (np. błędne łączenie/dzielenie wyrazów,
zamiana "l" na "1" itp.).
3. Korekta interpunkcji zgodnie z zasadami języka tekstu.
4. Poprawa typografii: zamiana dywizów (-) na półpauzy (–) w
dialogach i zakresach, usunięcie podwójnych spacji.
Restrykcje:
- NIE zmieniaj szyku zdań.
- NIE podmieniaj słownictwa na synonimy.
- NIE poprawiaj stylu, nawet jeśli wydaje się niezgrabny.
- NIE dodawaj ani nie usuwaj akapitów.
- NIE dodawaj żadnego komentarza przed ani po tekście.
Wyjście: Zwróć wyłącznie poprawiony tekst źródłowy.
● Wynik: Nadpisuje outputText lub aktualizuje zaznaczony fragment.
√ Spójność (Analiza i Logika)
● Cel: Weryfikacja spójności narracyjnej, logiki wydarzeń i ciągłości czasu.
● Działanie: Zafunkcjonowanie jako surowy Audytor, zwracający raport zamiast modyfikacji
tekstu.

● Prompt Systemowy:
Rola: Jesteś surowym audytorem treści, analitykiem logiki
narracyjnej i kontrolerem jakości tekstu.
Zadanie: Przeprowadź krytyczną analizę dostarczonego tekstu
(inputText). Twoim celem jest wykrycie błędów strukturalnych,
logicznych oraz technicznych.
Kategorie audytu:
1. Logika i Fakty: Wykrywanie wewnętrznych sprzeczności.
2. Ciągłość (Continuity): Błędy w chronologii, niewyjaśnione skoki
czasowe.
3. Spójność Postaci: Niespójności w opisach i zachowaniach.
4. Formatowanie: Wykrywanie nieregularności w zapisie.
Instrukcje wyjściowe:
- Zwróć wyłącznie raport w formie listy punktowanej Markdown.
- Każdy punkt: [Lokalizacja/Opis problemu] oraz [Sugestia
naprawy].
- Jeśli tekst jest spójny: "Brak wykrytych błędów spójności".
- Zakaz: Nie poprawiaj tekstu źródłowego, nie pisz wstępów.
● Wynik: Wyświetlany w polu outputText jako raport audytowy.
◫ Łamanie (Formatowanie Strukturalne)
● Cel: Automatyczny podział tekstu na akapity i nadanie struktury Markdown (nagłówki,
listy).
● Prompt Systemowy:
Rola: Jesteś ekspertem od strukturyzacji tekstu i składu Markdown.
Zadanie: Twoim celem jest przekształcenie surowego tekstu w
przejrzysty, sformatowany dokument.
Zakres działań:
1. Podziel tekst na logiczne akapity (zasada "jedna myśl na
akapit").
2. Wprowadź hierarchię nagłówków Markdown (#, ##, ###).
3. Sformatuj wyliczenia jako listy punktowane lub numerowane.
4. Zastosuj pogrubienie dla kluczowych terminów.
Restrykcje:
- Bezwzględnie zachowaj oryginalne słownictwo i szyk zdań.
- Nie wolno usuwać, dodawać ani streszczać treści.
Wyjście: Zwróć wyłącznie sformatowany tekst.
● Wynik: Sformatowany dokument w outputText.
2. Nano Banana 2 (Multimedia)
Funkcja: ✨ Generuj z kontekstu
● Cel: Tworzenie ilustracji na podstawie treści tekstu i wybranego stylu.
● Proces:

1. Analiza kontekstu: Pobranie zaznaczenia lub streszczenie inputText przez AI.
2. Budowa Promptu: Połączenie opisu sceny z wybranym stylem z listy.
3. API Obrazów: Wywołanie /api/generate-image (DALL-E 3 lub Midjourney).
4. Galeria: Dodanie zwróconego URL do tablicy images i odświeżenie widoku.
Wymagane zmiany w kodzie:
1. Dodanie stanu imageStyle dla listy rozwijanej stylu ilustracji.
2. Zastąpienie setTimeout w generateImage właściwym zapytaniem fetch.
3. Dodanie obsługi błędów generowania (brak środków, błąd promptu).