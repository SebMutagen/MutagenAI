# Mutagen AI - Three-Step Chat Interface

## Overview

Mutagen AI has been completely redesigned as a three-step chat-based brainstorming interface that guides users through problem definition, prompt generation, and idea review.

## Key Changes

### 1. API Migration
- **Replaced DeepSeek API with Claude API** throughout the entire codebase
- Updated all API calls to use Anthropic's Claude 3 Sonnet model
- Maintained backward compatibility with existing functionality

### 2. New Three-Step Interface

#### Step 1: Problem Statement
- AI acts as a user researcher
- Asks clarifying questions to refine the problem statement
- Focuses on understanding user persona, goals, constraints, and root causes
- Conversational approach with follow-up questions

#### Step 2: Prompt Generation
- Generates creative prompts based on the refined problem statement
- Chat interface allows users to share ideas for prompt creation
- AI helps refine ideas into actionable prompts
- Prompts are displayed in a clean card format

#### Step 3: Ideas Review
- Users can share their ideas for feedback
- AI provides constructive criticism and challenges assumptions
- Suggests alternative approaches and different angles
- Helps users think more deeply about implementation

### 3. Modern UI Design
- **Glassmorphism design** with translucent elements and backdrop blur
- Gradient background with purple-to-cyan color scheme
- Responsive design that works on desktop and mobile
- Smooth animations and transitions
- Clean, modern typography using Inter font

### 4. Chat Interface Features
- Real-time messaging with AI
- Auto-resizing text input
- Loading states and smooth animations
- Message history and context preservation
- Step navigation with visual indicators

## Technical Implementation

### Frontend
- Pure HTML5, CSS3, and JavaScript (no frameworks)
- CSS Grid and Flexbox for layout
- CSS Custom Properties for theming
- Responsive design with mobile-first approach

### Backend Integration
- Anthropic Claude API for all AI interactions
- RESTful API calls with proper error handling
- State management for multi-step workflow
- Local storage for session persistence

### File Structure
```
Mutagen/
├── index.html          # Main application HTML
├── script.js           # JavaScript application logic
├── styles.css          # CSS styles and animations
├── README.md           # This documentation
└── [legacy files]      # Original files preserved
```

## Usage

1. **Start the application**: Open `index.html` in a web browser or serve via HTTP server
2. **Step 1**: Describe your problem and answer AI's clarifying questions
3. **Step 2**: Generate creative prompts and refine ideas through chat
4. **Step 3**: Share ideas and get AI feedback and challenges

## API Configuration

Update the `CLAUDE_API_KEY` constant in `script.js` with your Anthropic API key:

```javascript
const CLAUDE_API_KEY = 'your-api-key-here';
```

## Browser Compatibility

- Modern browsers with ES6+ support
- CSS Grid and Flexbox support required
- Backdrop-filter support recommended for full glassmorphism effect

## Future Enhancements

- User authentication and session management
- Export functionality for prompts and ideas
- Collaborative features for team brainstorming
- Integration with external design tools
- Advanced AI models and customization options
