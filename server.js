import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const genAI_Free = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_FREE || process.env.GEMINI_API_KEY });
const genAI_Paid = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    const instructionWithJson = systemInstruction + `\n\nWAŻNE: Musisz zwrócić odpowiedź WYŁĄCZNIE jako poprawny obiekt JSON.
Struktura:
{
  "changes": [
    {
      "location": "Akapit X, linia Y",
      "action": "Krótki opis zmiany",
      "explanation": "Edukacyjne uzasadnienie dlaczego to jest konieczne (np. zasady typograficzne)"
    }
  ],
  "text": "Twój właściwy wynik"
}`;

    const response = await genAI_Free.models.generateContent({
      model: 'gemini-1.5-flash',
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
      console.warn("Failed to parse JSON, falling back to raw text:", e);
      res.json({ text: response.text, changes: [] });
    }
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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

    const finalPrompt = `\${prompt}. Style: \${style || 'cyberpunk'}. High quality, detailed illustration.`;

    const response = await genAI_Paid.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: finalPrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: "4:3"
        }
    });

    const base64Image = response.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/jpeg;base64,\${base64Image}`;

    res.json({ imageUrl });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Error generating image' });
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
