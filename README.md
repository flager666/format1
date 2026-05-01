<div align="center">
<img width="1200" height="475" alt="DTP Studio Pro Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🖋️ DTP Studio Pro
**Inteligentne środowisko do składu tekstu i generowania mediów wspierane przez AI.**
</div>

---

## 🚀 O projekcie
**DTP Studio Pro** to zaawansowana aplikacja typu Full-stack, stworzona z myślą o profesjonalistach zajmujących się przygotowaniem tekstów do druku i publikacji cyfrowych. Łączy w sobie precyzję modeli językowych Gemini z mocą generatywną Imagen 3, oferując nie tylko automatyzację pracy, ale także walor edukacyjny.

### ✨ Kluczowe Funkcje
*   **🤖 Inteligentny Toolbar AI:**
    *   **T Typo (Korekta):** Automatyczne usuwanie błędów typograficznych i ortograficznych.
    *   **∞ Spójność:** Audyt narracyjny i logiczny tekstu.
    *   **◫ Łamanie:** Inteligentne strukturyzowanie treści (nagłówki, listy, akapity).
*   **🎓 System Weryfikacji Zmian (Tryb Edukacyjny):**
    *   **Visual Diff:** Każda propozycja AI jest prezentowana w formie czytelnego porównania (podświetlenie zmian na zielono/czerwono).
    *   **Raport Merytoryczny:** AI tłumaczy *dlaczego* dokonało poprawki, wskazując konkretne zasady typograficzne lub językowe.
*   **🎨 Nano Banana 2 (Media Generation):**
    *   Integracja z modelem **Imagen 3** do generowania wysokiej jakości ilustracji bezpośrednio w studiu.
    *   Wybór stylów (Cyberpunk, Szkic, Fotorealizm itp.).
*   **🔒 Bezpieczeństwo:** Pełna ochrona dostępu poprzez `APP_PASSWORD`.
*   **⚡ Optymalizacja Kosztów:** Hybrydowe wykorzystanie modeli (Gemini 1.5 Flash dla tekstu oraz Imagen 3 dla grafiki).

---

## 🛠️ Technologia
*   **Frontend:** React + Vite + Tailwind CSS / Vanilla CSS.
*   **Backend:** Node.js + Express.
*   **AI:** Google Generative AI SDK (Gemini & Imagen 3).
*   **Deployment:** Gotowa konfiguracja pod Render.com.

---

## ⚙️ Instalacja Lokalna

1.  **Klonowanie repozytorium:**
    ```bash
    git clone [url-twojego-repo]
    cd format
    ```
2.  **Instalacja zależności:**
    ```bash
    npm install
    ```
3.  **Konfiguracja zmiennych środowiskowych (`.env`):**
    Utwórz plik `.env` w głównym katalogu i uzupełnij:
    ```env
    GEMINI_API_KEY=twoj_klucz_platny
    GEMINI_API_KEY_FREE=twoj_klucz_darmowy
    APP_PASSWORD=twoje_haslo_do_studia
    ```
4.  **Uruchomienie:**
    ```bash
    npm run dev  # Frontend (Vite)
    node server.js # Backend (Express)
    ```

---

## ☁️ Wdrożenie na Render (Blueprint)
Projekt zawiera plik `render.yaml`, który automatyzuje proces wdrażania.

1.  Połącz swoje repozytorium z Render.com.
2.  Wybierz opcję **Blueprint Instance**.
3.  Podaj wartości dla zmiennych `GEMINI_API_KEY`, `GEMINI_API_KEY_FREE` oraz `APP_PASSWORD`.
4.  System automatycznie zbuduje frontend i uruchomi serwer produkcyjny.

---

<div align="center">
Stworzone z pasją do typografii i nowoczesnych technologii.
</div>
