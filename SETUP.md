# Running Mutagen AI on Local Server

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Set your Claude API key** as an environment variable:
   
   **Windows (PowerShell):**
   ```powershell
   $env:CLAUDE_API_KEY="your-api-key-here"
   ```
   
   **Windows (Command Prompt):**
   ```cmd
   set CLAUDE_API_KEY=your-api-key-here
   ```
   
   **Mac/Linux:**
   ```bash
   export CLAUDE_API_KEY="your-api-key-here"
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

## What the Server Does

- Serves the static files (HTML, CSS, JS)
- Acts as a proxy for Claude API requests
- Keeps your API key secure on the server side

## Troubleshooting

- **Port already in use?** Set a different port: `$env:PORT=3001` (then use `http://localhost:3001`)
- **API errors?** Make sure your `CLAUDE_API_KEY` is set correctly
- **Can't connect?** Check that the server is running and you're using the correct URL

## Notes

- The server runs on port 3000 by default
- Your API key is never exposed to the client
- All API requests go through the server proxy

