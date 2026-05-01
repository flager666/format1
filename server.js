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

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: inputText,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
      },
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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
