# Plan Implementacji Funkcji DTP Studio Pro

Poniżej znajduje się szczegółowy plan ożywienia funkcji interfejsu użytkownika w aplikacji DTP Studio, bazujący na analizie obecnego kodu `App.tsx`.

## 1. Narzędzia Główne (Toolbar)

Obecnie przyciski te wywołują funkcję `mockAction`. Docelowo każda z nich będzie wywoływać zoptymalizowany proces AI poprzez endpoint `/api/generate`.

### T Typo (Korekta Techniczna)
*   **Cel:** Usunięcie błędów literowych, interpunkcyjnych i typograficznych bez ingerencji w styl autora.
*   **Prompt Systemowy:** 
    > "Jesteś bezwzględnym korektorem technicznym. Twoim zadaniem jest wyłącznie poprawa błędów ortograficznych, interpunkcyjnych (w tym zamiana dywizów na półpauzy w dialogach) oraz literówek i błędów OCR. Nie wolno Ci zmieniać szyku zdań, słownictwa ani dodawać nowych akapitów. Zwróć tylko czysty, poprawiony tekst."
*   **Wynik:** Nadpisuje `outputText` lub aktualizuje zaznaczony fragment.

### ✓ Spójność (Analiza i Logika)
*   **Cel:** Weryfikacja spójności narracyjnej, logiki wydarzeń i ciągłości czasu.
*   **Działanie:** Zwraca raport w formie listy punktowanej zamiast modyfikować tekst źródłowy.
*   **Prompt Systemowy:**
    > "Przeanalizuj poniższy tekst pod kątem niespójności logicznych, błędów w narracji (np. skoki czasu), pomyłek w opisach postaci oraz nieregularnego formatowania. Zwróć w formie wypunktowanej listy w Markdownie znalezione problemy i sugestie ich naprawy. Nie zwracaj sformatowanego tekstu, tylko sam raport."
*   **Wynik:** Wyświetlany w polu `outputText` jako raport audytowy.

### ◫ Łamanie (Formatowanie Strukturalne)
*   **Cel:** Automatyczny podział tekstu na akapity i nadanie struktury Markdown (nagłówki, listy).
*   **Prompt Systemowy:**
    > "Jesteś ekspertem składu DTP. Podziel podany tekst na logiczne, niezbyt długie akapity (zasada jednej myśli na akapit). Zastosuj odpowiednie znaczniki Markdown dla nagłówków, list i wyróżnień, aby nadać tekstowi profesjonalną strukturę. Zachowaj oryginalną treść."
*   **Wynik:** Sformatowany dokument w `outputText`.

---

## 2. Nano Banana 2 (Multimedia)

### Funkcja: ✨ Generuj z kontekstu
*   **Cel:** Tworzenie ilustracji na podstawie treści tekstu i wybranego stylu.
*   **Proces:**
    1.  **Analiza kontekstu:** Pobranie zaznaczenia lub streszczenie `inputText` przez AI (np. krótki opis wizualny po angielsku).
    2.  **Budowa Promptu:** Połączenie opisu sceny z wybranym stylem z listy (np. "Technical Sketch", "Cyberpunk").
    3.  **API Obrazów:** Wywołanie `/api/generate-image` (integracja z DALL-E 3 lub Midjourney API).
    4.  **Galeria:** Dodanie zwróconego URL do tablicy `images` i odświeżenie widoku galerii.

### Wymagane zmiany w kodzie:
1.  Dodanie stanu `imageStyle` dla listy rozwijanej stylu ilustracji.
2.  Zastąpienie `setTimeout` w `generateImage` właściwym zapytaniem `fetch`.
3.  Dodanie obsługi błędów generowania (np. brak środków na API, błąd promptu).
