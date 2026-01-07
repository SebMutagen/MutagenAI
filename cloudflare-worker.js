// Cloudflare Worker for Claude API Proxy
// This worker proxies requests to Claude (Anthropic) API to avoid CORS issues
// Converts between OpenAI-compatible format and Claude API format

export default {
  async fetch(request, env) {
    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Handle GET requests for testing
    if (request.method === 'GET') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          message: 'Claude API Proxy Worker is running',
          hasApiKey: !!env.CLAUDE_API_KEY,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Handle POST requests
    if (request.method === 'POST') {
      try {
        // Get the request body (OpenAI-compatible format)
        const requestBody = await request.json();

        // Check if API key is set
        if (!env.CLAUDE_API_KEY) {
          return new Response(
            JSON.stringify({
              error: 'API key not configured',
              message: 'Please set CLAUDE_API_KEY in Worker secrets',
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Convert OpenAI-compatible format to Claude API format
        const messages = requestBody.messages || [];

        // Build Claude API request
        const claudeRequest = {
          model: 'claude-haiku-4-5-20251001', // Use Claude Sonnet 4.5 model
          max_tokens: requestBody.max_tokens || 1000,
          messages: messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          }))
        };

        // Forward request to Claude API
        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(claudeRequest),
        });

        // Get response
        const claudeData = await claudeResponse.json();

        // Convert Claude response to OpenAI-compatible format
        if (!claudeResponse.ok) {
          return new Response(
            JSON.stringify({
              error: {
                message: claudeData.error?.message || 'Claude API error',
                type: claudeData.error?.type || 'api_error',
              }
            }),
            {
              status: claudeResponse.status,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
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

        // Return response with CORS headers
        return new Response(JSON.stringify(openAIFormatResponse), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        // Handle errors
        return new Response(
          JSON.stringify({
            error: 'Proxy error',
            message: error.message,
            details: error.stack,
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Handle other methods
    return new Response(
      JSON.stringify({
        error: 'Method not allowed',
        message: `Method ${request.method} is not supported`,
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  },
};
