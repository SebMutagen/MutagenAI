# Mutagen.AI - AI-Powered Brainstorming Assistant

A web-based brainstorming tool that helps you solve problems through structured creative thinking.

## Features

- **5-Phase Brainstorming Process**: Contextualizing → Persona → Problem Refinement → Creative Prompts → Evaluation
- **Responsive Design**: Works on desktop, laptop, and mobile devices
- **AI-Powered**: Uses DeepSeek API for intelligent responses (with offline fallback)
- **Interactive Chat**: Natural conversation flow with suggested responses
- **Idea Management**: Save and organize your brainstorming ideas
- **Phase Tracking**: Clear progression through each brainstorming phase

## How to Use

1. **Open the application** by opening `index.html` in your web browser
2. **Start with a problem** - describe what you want to solve
3. **Follow the 5-phase process**:
   - **Contextualizing**: AI asks questions to understand your problem
   - **Persona**: AI creates a detailed user persona
   - **Problem Refinement**: AI reframes and clarifies the problem
   - **Creative Prompts**: AI generates brainstorming prompts
   - **Evaluation**: AI evaluates your ideas and suggests improvements

## Technical Details

- **Pure HTML/CSS/JavaScript**: No server required, runs entirely in the browser
- **DeepSeek API Integration**: For AI-powered responses
- **Offline Fallback**: Works even when API is unavailable
- **GitHub Pages Ready**: Can be hosted on GitHub Pages

## API Configuration

The application uses the DeepSeek API for AI responses. If you encounter API issues:

1. Check your internet connection
2. Verify the API key is valid
3. The application will automatically fall back to offline mode

## File Structure

```
├── index.html          # Main application file
├── script.js           # JavaScript logic and AI integration
├── styles.css          # Responsive styling
├── test-api.html       # API connection test page
└── README.md           # This file
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

If the application doesn't work:

1. **Check Console**: Open Developer Tools (F12) and look for error messages
2. **Test API**: Open `test-api.html` to test API connectivity
3. **Offline Mode**: The app will work in offline mode with basic responses
4. **Clear Cache**: Try refreshing with Ctrl+F5 (or Cmd+Shift+R on Mac)

## License

This project is open source and available under the MIT License.
