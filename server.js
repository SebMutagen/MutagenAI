import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const API_KEY = process.env.DEEPSEEK_API_KEY;

if (!API_KEY) {
  console.warn('⚠️  DEEPSEEK_API_KEY is not set. Requests will fail until you set it.');
}

app.post('/api/chat', async (req, res) => {
  try {
    const dsResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY || ''}`
      },
      body: JSON.stringify(req.body)
    });

    // Forward status and body
    const data = await dsResponse.text();
    res.status(dsResponse.status);
    res.set('Content-Type', dsResponse.headers.get('content-type') || 'application/json');
    res.send(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
