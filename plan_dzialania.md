# Plan Rozwoju: DTP Studio Pro

Dokument ten zawiera architektoniczny i wdrożeniowy plan dla czterech kluczowych funkcji, które przekształcą DTP Studio Pro w kompletne, bezkonkurencyjne narzędzie dla wydawców, redaktorów i autorów.

---

## 1. 🖨️ Prawdziwy Silnik Eksportu (PDF, EPUB, DOCX)

**Cel:** Zastąpienie atrapy przycisku eksportu pełnoprawnym systemem generowania gotowych plików wydawniczych.

**Szczegóły wdrożenia:**
*   **PDF:** Wykorzystanie bibliotek takich jak `jspdf` lub generowanie po stronie backendu przez headless browser (np. Puppeteer) w celu uzyskania idealnego składu (strony tytułowe, marginesy, numery stron, osadzanie grafik wygenerowanych przez Nano Banana 2).
*   **EPUB:** Zastosowanie biblioteki np. `epub-gen` do tworzenia natywnych e-booków. Rozdziały będą automatycznie parsowane na podstawie nagłówków `##` z tekstu w formacie Markdown.
*   **HTML/DOCX:** Konwersja Markdown do czystego DOCX (biblioteka `docx` w Node.js) dla tradycyjnych agencji wydawniczych i redakcji.

**Kamienie milowe:**
1. Stworzenie nowych endpointów na backendzie (`/api/export/pdf`, `/api/export/epub`).
2. Parsowanie wyjściowego Markdowna na format pośredni (HTML).
3. Dodanie modala "Opcje Eksportu" na frontendzie (wybór formatu, dodanie okładki).

---

## 2. 🧠 Słownik Projektu / Glosariusz AI (Consistency Enforcer)

**Cel:** Utrzymanie absolutnej spójności narracyjnej i logicznej w długich tekstach (World-building).

**Szczegóły wdrożenia:**
*   **UI:** Dodanie nowej zakładki "Glosariusz" w Dynamicznym Panelu bocznym (obok Analityki i Mediów).
*   **UX:** Prosty interfejs "Klucz - Wartość" (np. *Jan Kowalski* -> *szatyn, nerwowy, ma bliznę*).
*   **Logika AI:** Podczas wysyłania zapytania na endpoint `/api/generate`, zawartość glosariusza jest dołączana jako twardy kontekst w `systemInstruction`.
*   **Działanie:** Jeśli AI wykryje w tekście "Jan poprawił swoje blond włosy", automatycznie wyłapie ten błąd, zaproponuje zmianę w modalu Weryfikacji Zmian i dopisze w raporcie: *"Poprawiono kolor włosów z blond na szatyn, zgodnie z Glosariuszem"*.

**Kamienie milowe:**
1. Stworzenie komponentu `GlossaryPanel.tsx`.
2. Zapis stanu glosariusza (Pamięć lokalna / LocalStorage).
3. Aktualizacja promptów systemowych w `server.js`, aby przyjmowały dynamiczny "World Context".

---

## 3. ✍️ AI Co-Pilot (Rozwijanie Myśli i Ghostwriting)

**Cel:** Asystent pomagający przezwyciężyć blokadę pisarską i ułatwiający manipulację długością i tonem tekstu.

**Szczegóły wdrożenia:**
*   Rozszerzenie obecnego "pływającego menu" pojawiającego się przy zaznaczeniu tekstu.
*   **Funkcja "Rozwiń to":** Użytkownik zaznacza "Wyszedł z domu i zobaczył burzę". System wysyła to do AI z promptem nakazującym literackie rozwinięcie w akapit w stylu reszty dokumentu.
*   **Funkcja "Skróć to":** Usuwanie "lania wody" – kondensacja długiego akapitu do najważniejszych faktów (przydatne do artykułów biznesowych).

**Kamienie milowe:**
1. Dodanie przycisków "Rozwiń" i "Skróć" w pływającym menu (`App.tsx`).
2. Przygotowanie nowych, dedykowanych promptów dla Co-Pilota.
3. Sprawne zastępowanie zaznaczonego fragmentu wygenerowanym tekstem, wykorzystując istniejący system akceptacji zmian.

---

## 4. 🗄️ Time Machine (Historia Wersji / Rewizje)

**Cel:** Bezpieczeństwo pracy – zabezpieczenie przed przypadkową utratą dobrych fragmentów podczas edycji z AI.

**Szczegóły wdrożenia:**
*   **UI:** Nowa ikona "Zegar / Historia" w lewym górnym rogu edytora źródłowego.
*   **Logika:** Po każdym zatwierdzeniu zmian przez użytkownika ("Zatwierdź i Wprowadź"), aktualny tekst z pola "Źródło" (przed zmianą) jest zapisywany w tablicy historii.
*   **UX:** Lista z datą i godziną. Kliknięcie w dowolną migawkę przywraca tamtą wersję tekstu. Podobnie jak w Google Docs.

**Kamienie milowe:**
1. Stworzenie struktury stanu dla historii (`Array<{ timestamp: number, text: string }>`).
2. Wykrywanie momentu zapisu (na przycisku zatwierdzania z AI).
3. Dodanie bocznego panelu wysuwanego (Drawer) z listą chronologiczną rewizji.