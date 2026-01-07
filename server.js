import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_KEY = process.env.CLAUDE_API_KEY;

if (!API_KEY) {
  console.warn('⚠️  CLAUDE_API_KEY is not set. Requests will fail until you set it.');
}

app.post('/api/chat', async (req, res) => {
  try {
    // Convert OpenAI-compatible format to Claude API format
    const requestBody = req.body;
    const messages = requestBody.messages || [];

    // Build Claude API request
    const claudeRequest = {
      model: 'claude-sonnet-4-5-20250929', // Use Claude Sonnet 4.5 model
      max_tokens: requestBody.max_tokens || 1000,
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    };

    // Forward request to Claude API
    const claudeResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(claudeRequest)
    });

    // Get response
    const claudeData = await claudeResponse.json();

    // Convert Claude response to OpenAI-compatible format
    if (!claudeResponse.ok) {
      return res.status(claudeResponse.status).json({
        error: {
          message: claudeData.error?.message || 'Claude API error',
          type: claudeData.error?.type || 'api_error',
        }
      });
    }

    // Extract text from Claude response (Claude uses content array)
    const textContent = claudeData.content?.find(c => c.type === 'text')?.text || '';

    // Convert to OpenAI-compatible format
    const openAIFormatResponse = {
      choices: [{
        message: {
          role: 'assistant',
          content: textContent,
        },
        finish_reason: claudeData.stop_reason || 'stop',
      }],
      usage: claudeData.usage || {},
    };

    // Return response
    res.status(200).json(openAIFormatResponse);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
