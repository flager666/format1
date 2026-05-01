import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { marked } from 'marked';
import htmlToDocx from 'html-to-docx';
import Epub from 'epub-gen-memory';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const genAI_Free = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_FREE || process.env.GEMINI_API_KEY });
const genAI_Paid = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_FREE });

app.post('/api/verify-password', (req, res) => {
  const { password } = req.body;
  if (process.env.APP_PASSWORD && password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Nieprawidłowe hasło.' });
  }
  res.json({ success: true });
});

app.post('/api/generate', async (req, res) => {
  try {
    const { inputText, systemInstruction, password } = req.body;

    if (process.env.APP_PASSWORD && password !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: 'Nieprawidłowe hasło.' });
    }

    if (!inputText) {
      return res.status(400).json({ error: 'inputText is required' });
    }

    if (!process.env.GEMINI_API_KEY_FREE && !process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Brak klucza API (GEMINI_API_KEY_FREE lub GEMINI_API_KEY) w konfiguracji serwera.' });
    }

    const instructionWithJson = systemInstruction + `\n\nWAŻNE: Musisz zwrócić odpowiedź WYŁĄCZNIE jako poprawny obiekt JSON.
Struktura:
{
  "changes": [
    {
      "location": "Akapit X, linia Y",
      "action": "Krótki opis zmiany",
      "explanation": "Edukacyjne uzasadnienie dlaczego to jest konieczne (np. zasady typograficzne)",
      "originalText": "Dokładny fragment tekstu przed zmianą (musi być unikalny w skali tekstu)",
      "newText": "Dokładny fragment tekstu po zmianie"
    }
  ],
  "text": "Twój właściwy wynik"
}`;

    const response = await genAI_Free.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: inputText,
      config: {
        systemInstruction: instructionWithJson,
        temperature: 0.2,
        responseMimeType: "application/json"
      },
    });

    try {
      const data = JSON.parse(response.text);
      res.json({ text: data.text, changes: data.changes || [] });
    } catch (e) {
      console.error("Błąd parsowania JSON z AI:", e);
      res.status(500).json({ error: 'AI zwróciło nieprawidłowy format danych. Spróbuj ponownie.', details: e.message });
    }
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: error.message || 'Wystąpił nieoczekiwany błąd serwera.' });
  }
});

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, style, password } = req.body;

    if (process.env.APP_PASSWORD && password !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: 'Nieprawidłowe hasło.' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const finalPrompt = `${prompt}. Style: ${style || 'cyberpunk'}. High quality, detailed illustration.`;

    const response = await genAI_Paid.models.generateImages({
      model: 'gemini-2.5-flash-image',
      prompt: finalPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "4:3"
      }
    });

    const base64Image = response.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    res.json({ imageUrl });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: error.message || 'Error generating image' });
  }
});

app.post('/api/export/docx', async (req, res) => {
  try {
    const { markdown, title, password } = req.body;
    if (process.env.APP_PASSWORD && password !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: 'Nieprawidłowe hasło.' });
    }

    // Convert Markdown to HTML
    const html = marked.parse(markdown || '');

    // Convert HTML to DOCX buffer
    const docxBuffer = await htmlToDocx(html, null, {
      title: title || 'DTP_Document',
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="document.docx"`);
    res.send(Buffer.from(docxBuffer));
  } catch (error) {
    console.error('Error exporting DOCX:', error);
    res.status(500).json({ error: 'Błąd generowania DOCX' });
  }
});

app.post('/api/export/epub', async (req, res) => {
  try {
    const { markdown, title, author, coverImage, password } = req.body;
    if (process.env.APP_PASSWORD && password !== process.env.APP_PASSWORD) {
      return res.status(401).json({ error: 'Nieprawidłowe hasło.' });
    }

    const html = marked.parse(markdown || '');

    // Split into chapters by H2 (##) if possible
    const chapters = [];
    const parts = markdown.split(/^## /m);

    if (parts.length > 1) {
      if (parts[0].trim()) {
        chapters.push({ title: 'Wstęp', data: marked.parse(parts[0]) });
      }
      for (let i = 1; i < parts.length; i++) {
        const lines = parts[i].split('\n');
        const chapTitle = lines[0].trim();
        const content = parts[i].substring(lines[0].length);
        chapters.push({ title: chapTitle, data: marked.parse('## ' + chapTitle + content) });
      }
    } else {
      chapters.push({ title: title || 'Treść', data: html });
    }

    const options = {
      title: title || 'DTP Studio eBook',
      author: author || 'Autor',
      content: chapters
    };

    if (coverImage) {
      options.cover = coverImage;
    }

    const epubBuffer = await new Epub(options).genEpub();

    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="ebook.epub"`);
    res.send(Buffer.from(epubBuffer));
  } catch (error) {
    console.error('Error exporting EPUB:', error);
    res.status(500).json({ error: 'Błąd generowania EPUB' });
  }
});

// Serve static files from the React app
app.use(express.static(join(__dirname, 'dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
