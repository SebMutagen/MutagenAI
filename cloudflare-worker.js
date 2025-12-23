// Cloudflare Worker proxy for DeepSeek chat completions.
// Deploy this worker, set the secret DEEPSEEK_API_KEY, and point
// window.DEEPSEEK_PROXY_URL in your front-end to the worker URL.

const API_URL = 'https://api.deepseek.com/v1/chat/completions';

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // Allow GET requests for testing/debugging
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'Worker is running',
        message: 'DeepSeek API Proxy',
        method: 'Use POST to send requests',
        hasApiKey: !!env.DEEPSEEK_API_KEY
      }), {
        status: 200,
        headers: {
          ...corsHeaders(),
          'Content-Type': 'application/json',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: corsHeaders(),
      });
    }

    try {
      const body = await request.text();
      const upstream = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY || ''}`,
        },
        body,
      });

      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': upstream.headers.get('content-type') || 'application/json',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy error', detail: err.message }), {
        status: 500,
        headers: corsHeaders(),
      });
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
