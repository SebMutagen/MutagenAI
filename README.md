# Mutagen.AI - AI-Powered Brainstorming Assistant

A web-based brainstorming tool that helps you solve problems through structured creative thinking using Claude AI.

## Features

### Core Functionality
- **5-Phase Brainstorming Process**: 
  - **Contextualizing**: AI asks questions to understand your problem
  - **Persona Development**: AI creates a detailed user persona
  - **Problem Refinement**: AI reframes and clarifies the problem statement
  - **Creative Prompt Generation**: AI generates diverse brainstorming prompts (shallow and wide approach)
  - **Evaluation**: AI evaluates ideas and helps develop them further (deep and narrow approach)

### Key Features
- **Saved Ideas Panel**: Automatically saves all ideas you generate, paired with their inspiration prompts
- **CSV Export**: Export all saved ideas with titles, rationale, and content
- **Suggested Responses**: AI-generated quick reply suggestions (only when left sidebar is open)
- **Collapsible Sidebars**: Toggle left and right sidebars to maximize workspace
- **Enter Key Toggle**: Choose between "Enter = Send" or "Enter = Line break" (with Ctrl+Enter to send)
- **Phase Tracking**: Visual progress indicators showing your current phase
- **Responsive Design**: Works on desktop, laptop, and mobile devices

## Setup

### Prerequisites
- Node.js and npm installed
- Claude API key from [Anthropic](https://www.anthropic.com/)

### Installation

1. **Install dependencies**:
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

## How to Use

### Getting Started
1. **Start with a problem** - Describe what you want to solve in the chat
2. **Follow the 5-phase process** - The AI will guide you through each phase
3. **Generate ideas** - In the Creative Prompt Generation phase, respond to prompts with your ideas
4. **Review saved ideas** - All your ideas are automatically saved in the right sidebar
5. **Export ideas** - Click "Export Ideas" to download a CSV file with all your ideas

### Phase Details

#### 1. Contextualizing Phase
- AI asks questions to understand your problem deeply
- Answer questions about demographics, pain points, goals, behaviors, constraints, and emotional state
- You can move to the next phase at any time

#### 2. Persona Development Phase
- AI creates a detailed user persona based on your responses
- Review and refine the persona as needed
- The persona helps guide all subsequent brainstorming

#### 3. Problem Refinement Phase
- AI reframes your problem statement for better clarity
- Helps identify the core problem to solve
- Ensures focus on the right challenge

#### 4. Creative Prompt Generation Phase
- **Shallow and Wide Approach**: AI generates many different prompts exploring various angles
- Each prompt explores a fresh, different direction
- When you share an idea, AI generates a NEW prompt (not developing your idea)
- Ideas are automatically saved with their inspiration prompt
- Focus on variety and breadth, not depth

#### 5. Evaluation Phase
- **Deep and Narrow Approach**: AI helps develop and refine specific ideas
- Provides constructive feedback
- Asks questions to help develop ideas further
- Suggests improvements and variations

### Interface Features

#### Sidebars
- **Left Sidebar**: Shows problem statement, persona, and suggested responses
- **Right Sidebar**: Shows saved ideas with their associated prompts
- **Toggle Buttons**: Click the arrow buttons to collapse/expand sidebars
- **State Persistence**: Sidebar states are saved in localStorage

#### Chat Input
- **Enter Key Toggle**: Click the toggle button to switch between:
  - "Enter = Send" (default): Press Enter to send message
  - "Enter = Line break": Press Enter for new line, Ctrl+Enter to send
- **Visual Hint**: When in "Line break" mode, a hint appears below the input

#### Saved Ideas
- Ideas are automatically saved when you respond to prompts
- Each idea is paired with its inspiration prompt (title, rationale, and content)
- View all saved ideas in the right sidebar
- Export all ideas to CSV with three columns: Title, Rationale, Idea

#### Suggested Responses
- AI generates contextual quick reply suggestions
- Only appears when left sidebar is open
- Click any suggestion to use it as your message
- Suggestions are updated after each AI response

## Technical Details

### Architecture
- **Frontend**: Pure HTML/CSS/JavaScript
- **Backend**: Node.js/Express server
- **AI Integration**: Claude API via Anthropic
- **Data Storage**: localStorage for UI preferences (ideas refresh on page reload)

### Server Setup
- The server acts as a proxy for Claude API requests
- Keeps your API key secure on the server side
- Serves static files (HTML, CSS, JS)
- Runs on port 3000 by default

### File Structure
```
├── index.html          # Main application file
├── script.js           # JavaScript logic and AI integration
├── styles.css          # Responsive styling
├── server.js           # Express server and API proxy
├── package.json        # Node.js dependencies
├── SETUP.md            # Detailed setup instructions
└── README.md           # This file
```

## API Configuration

The application uses the Claude API from Anthropic. The API key is stored as an environment variable and never exposed to the client.

### Troubleshooting API Issues
1. **Check your API key**: Make sure `CLAUDE_API_KEY` is set correctly
2. **Verify server is running**: The server must be running for API calls to work
3. **Check console**: Open Developer Tools (F12) to see error messages
4. **Port conflicts**: If port 3000 is in use, set `PORT` environment variable to a different port

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

### Server Issues
- **Port already in use?** Set a different port: `$env:PORT=3001` (then use `http://localhost:3001`)
- **API errors?** Make sure your `CLAUDE_API_KEY` is set correctly
- **Can't connect?** Check that the server is running and you're using the correct URL

### Application Issues
1. **Check Console**: Open Developer Tools (F12) and look for error messages
2. **Clear Cache**: Try refreshing with Ctrl+F5 (or Cmd+Shift+R on Mac)
3. **Check localStorage**: Clear browser localStorage if experiencing state issues
4. **Verify Server**: Make sure the Node.js server is running

## Philosophy

### Ideation Phase: Shallow and Wide
- Generate many different prompts exploring various angles
- Focus on variety and breadth, not depth
- Each prompt explores a fresh, different direction
- Jump around to different ideas, not drill down on one

### Evaluation Phase: Deep and Narrow
- Develop and refine specific ideas in depth
- Ask questions to help develop ideas further
- Provide detailed feedback and suggestions
- This is where ideas get developed, not in ideation

## License

This project is open source and available under the MIT License.
