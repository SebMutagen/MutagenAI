// --- Mutagen AI - Single Chat Interface ---

// API Configuration
// Prefer a proxy URL injected via window.DEEPSEEK_PROXY_URL (e.g., Cloudflare Worker);
// otherwise fall back to local /api/chat for local dev.
function getProxyPath() {
    if (typeof window !== 'undefined' && window.DEEPSEEK_PROXY_URL) {
        return window.DEEPSEEK_PROXY_URL;
    }
    return '/api/chat';
}

// Global State
let currentPhase = 'contextualizing'; // contextualizing, persona, problemRefinement, promptGeneration, evaluation
let problemStatement = '';
let generatedPrompts = [];
let ideas = [];
let askedQuestions = new Set(); // Track asked questions to avoid repetition
let problemUnderstandingScore = 0; // Track AI's understanding of the problem
let chatHistory = [];
let persona = null; // Store the created persona
let reframedProblem = null; // Store the reframed problem statement
let apiWorking = true; // Track if API is working

// Phase tracking for objective management
const PHASE_ORDER = ['contextualizing', 'persona', 'problemRefinement', 'promptGeneration', 'evaluation'];
let currentPhaseIndex = 0; // Track current phase index for objective management

// DOM Elements
let chatMessages, chatInput, sendButton, loadingOverlay, processingIndicator;
let leftSidebar, rightSidebar, promptsList, generatePromptsBtn, problemStatementContent, personaContent;
let suggestedResponsesList;
let brainstormingTab, savedIdeasTab, brainstormingContent, savedIdeasContent, savedIdeasList;
let refreshPromptsBtn;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Debug: Verify proxy URL is set
    console.log('🔍 Initialization - Proxy URL check:');
    console.log('  window.DEEPSEEK_PROXY_URL:', window.DEEPSEEK_PROXY_URL);
    console.log('  getProxyPath():', getProxyPath());
    
    initializeElements();
    setupEventListeners();
    updateCardLockStates(); // Initialize card lock states
});

function initializeElements() {
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    sendButton = document.getElementById('sendButton');
    loadingOverlay = document.getElementById('loadingOverlay');
    processingIndicator = document.getElementById('processingIndicator');
    leftSidebar = document.getElementById('leftSidebar');
    rightSidebar = document.getElementById('rightSidebar');
    promptsList = document.getElementById('promptsList');
    generatePromptsBtn = document.getElementById('generatePromptsBtn');
    problemStatementContent = document.getElementById('problemStatementContent');
    personaContent = document.getElementById('personaContent');
    problemStatementCard = document.getElementById('problemStatementCard');
    personaCard = document.getElementById('personaCard');
    suggestedResponsesList = document.getElementById('suggestedResponsesList');
    brainstormingTab = document.getElementById('brainstormingTab');
    savedIdeasTab = document.getElementById('savedIdeasTab');
    brainstormingContent = document.getElementById('brainstormingContent');
    savedIdeasContent = document.getElementById('savedIdeasContent');
    savedIdeasList = document.getElementById('savedIdeasList');
    refreshPromptsBtn = document.getElementById('refreshPromptsBtn');
}

// Simple Markdown Rendering using fallback parser
function parseMarkdown(text) {
    if (!text) return '';
    return parseMarkdownFallback(text);
}

// Enhanced fallback markdown parser
function parseMarkdownFallback(text) {
    if (!text) return '';
    
    let html = text;
    
    // Process line by line for better control
    const lines = html.split('\n');
    const processedLines = [];
    let inCodeBlock = false;
    let inList = false;
    let listType = '';
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Handle code blocks
        if (line.trim().startsWith('```')) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                processedLines.push('<pre><code>');
            } else {
                inCodeBlock = false;
                processedLines.push('</code></pre>');
            }
            continue;
        }
        
        if (inCodeBlock) {
            processedLines.push(line);
            continue;
        }
        
        // Handle headers
        if (line.match(/^#{1,6}\s/)) {
            const level = line.match(/^(#{1,6})/)[1].length;
            const content = line.replace(/^#{1,6}\s/, '');
            processedLines.push(`<h${level}>${content}</h${level}>`);
            continue;
        }
        
        // Handle lists
        if (line.match(/^[\*\-\+]\s/) || line.match(/^\d+\.\s/)) {
            if (!inList) {
                inList = true;
                listType = line.match(/^\d+\.\s/) ? 'ol' : 'ul';
                processedLines.push(`<${listType}>`);
            }
            
            const content = line.replace(/^[\*\-\+\d\.]\s/, '');
            processedLines.push(`<li>${content}</li>`);
            continue;
        } else {
            if (inList) {
                processedLines.push(`</${listType}>`);
                inList = false;
            }
        }
        
        // Handle empty lines
        if (line.trim() === '') {
            processedLines.push('<br>');
            continue;
        }
        
        // Process inline formatting
        line = processInlineMarkdown(line);
        processedLines.push(line);
    }
    
    // Close any open lists
    if (inList) {
        processedLines.push(`</${listType}>`);
    }
    
    // Join lines and wrap in paragraphs
    html = processedLines.join('\n');
    
    // Wrap consecutive non-HTML lines in paragraphs
    html = html.replace(/(?<!<[^>]*>)([^<\n]+)(?![^<]*>)/g, (match) => {
        if (match.trim() && !match.match(/^<[^>]+>/) && !match.match(/^<\/[^>]+>$/)) {
            return `<p>${match}</p>`;
        }
        return match;
    });
    
    // Clean up empty paragraphs and fix spacing
    html = html
        .replace(/<p><\/p>/g, '')
        .replace(/<p><br><\/p>/g, '')
        .replace(/<br>\s*<p>/g, '<p>')
        .replace(/<\/p>\s*<br>/g, '</p>');
    
    return html;
}

// Process inline markdown formatting
function processInlineMarkdown(text) {
    return text
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">');
}

// Card locking functions
function lockCard(cardElement) {
    cardElement.classList.add('locked');
    cardElement.classList.remove('brightened');
    
    // Show lock icon and hide edit icon
    const lockIcon = cardElement.querySelector('.lock-icon');
    const editIcon = cardElement.querySelector('.edit-icon');
    if (lockIcon) lockIcon.style.display = 'inline';
    if (editIcon) {
        editIcon.style.display = 'none';
        // Remove the click listener when locking
        editIcon.removeAttribute('data-listener-added');
    }
}

function unlockCard(cardElement) {
    cardElement.classList.remove('locked');
}

function brightenCard(cardElement) {
    cardElement.classList.remove('locked');
    cardElement.classList.add('brightened');
    
    // Show edit icon and hide lock icon
    const lockIcon = cardElement.querySelector('.lock-icon');
    const editIcon = cardElement.querySelector('.edit-icon');
    if (lockIcon) lockIcon.style.display = 'none';
    if (editIcon) editIcon.style.display = 'inline';
    
    // Add click listener to edit icon for manual editing (only if not already added)
    if (editIcon && !editIcon.hasAttribute('data-listener-added')) {
        editIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            makeContentEditable(cardElement);
        });
        editIcon.setAttribute('data-listener-added', 'true');
    }
}

function makeContentEditable(cardElement) {
    const contentDiv = cardElement.querySelector('.problem-content, .persona-content');
    if (!contentDiv || contentDiv.querySelector('.edit-textarea')) return; // Already editable
    
    const currentContent = contentDiv.innerHTML;
    
    // Create editable textarea
    const textarea = document.createElement('textarea');
    textarea.className = 'edit-textarea';
    textarea.value = currentContent.replace(/<[^>]*>/g, ''); // Strip HTML tags
    textarea.placeholder = 'Click to edit...';
    
    // Clear content and add textarea
    contentDiv.innerHTML = '';
    contentDiv.appendChild(textarea);
    
    // Add event listeners
    textarea.addEventListener('blur', () => saveCardContent(cardElement, textarea.value));
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            textarea.blur();
        }
    });
    
    // Focus the textarea
    setTimeout(() => textarea.focus(), 100);
}

function saveCardContent(cardElement, newContent) {
    const contentDiv = cardElement.querySelector('.problem-content, .persona-content');
    if (!contentDiv) return;
    
    // Update the content
    contentDiv.innerHTML = parseMarkdown(newContent);
    
    // Update global state
    if (cardElement.id === 'problemStatementCard') {
        window.currentProblemData = newContent;
        updateProblemStatement(newContent);
    } else if (cardElement.id === 'personaCard') {
        window.currentPersonaData = newContent;
        updatePersona(newContent);
    }
}

function updateCardLockStates() {
    // Problem statement card: locked until problem refinement phase, then brightened after refinement
    if (currentPhase === 'problemRefinement') {
        unlockCard(problemStatementCard);
    } else if (currentPhase === 'promptGeneration' || currentPhase === 'evaluation') {
        brightenCard(problemStatementCard);
    } else if (problemStatement && problemStatement.trim()) {
        // If problem statement exists, keep it brightened for editing
        brightenCard(problemStatementCard);
    } else {
        lockCard(problemStatementCard);
    }
    
    // Persona card: locked until persona phase, then brightened after persona
    if (currentPhase === 'persona') {
        unlockCard(personaCard);
    } else if (currentPhase === 'problemRefinement' || currentPhase === 'promptGeneration' || currentPhase === 'evaluation') {
        brightenCard(personaCard);
    } else if (persona && persona.trim()) {
        // If persona exists, keep it brightened for editing
        brightenCard(personaCard);
    } else {
        lockCard(personaCard);
    }
}

function setupEventListeners() {
    // Send button click
    sendButton.addEventListener('click', handleSendMessage);
    
    // Enter key in chat input
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
    
    // Generate prompts button
    if (generatePromptsBtn) {
        generatePromptsBtn.addEventListener('click', () => {
            generatePromptsFromProblem();
        });
    }
    
    // Keyboard shortcuts for suggested responses (Ctrl+1/2/3/4)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
            e.preventDefault();
            const suggestionIndex = parseInt(e.key) - 1;
            const suggestionElements = document.querySelectorAll('.suggested-response');
            if (suggestionElements[suggestionIndex]) {
                // Get just the suggestion text (without the shortcut text)
                const suggestionTextElement = suggestionElements[suggestionIndex].querySelector('.suggestion-text');
                const suggestionText = suggestionTextElement ? suggestionTextElement.textContent.trim() : '';
                if (suggestionText) {
                    useSuggestedResponse(suggestionText, true); // true = auto-send
                }
            }
        }
    });
    
    // Tab functionality
    if (brainstormingTab && savedIdeasTab) {
        brainstormingTab.addEventListener('click', () => switchTab('brainstorming'));
        savedIdeasTab.addEventListener('click', () => switchTab('savedIdeas'));
    }
    
    // Refresh prompts button
    if (refreshPromptsBtn) {
        refreshPromptsBtn.addEventListener('click', () => {
            if (currentPhase === 'ideation') {
                generateNewPrompts();
            }
        });
    }
}

// Phase Management
async function moveToNextPhase() {
    console.log('moveToNextPhase called, current phase:', currentPhase, 'index:', currentPhaseIndex);
    
    if (currentPhaseIndex < PHASE_ORDER.length - 1) {
        const previousPhase = currentPhase;
        currentPhaseIndex++;
        currentPhase = PHASE_ORDER[currentPhaseIndex];
        console.log('Moving from', previousPhase, 'to phase:', currentPhase, 'index:', currentPhaseIndex);
        
        // Update card lock states
        updateCardLockStates();
        
        // Add phase transition message
        switch(currentPhase) {
            case 'persona':
                addMessageToChat('ai', 'Great! Now let\'s create a detailed persona to better understand your target user. This will help guide our brainstorming process.', true);
                break;
            case 'problemRefinement':
                addMessageToChat('ai', 'Perfect! Now let\'s refine your problem statement to open up new creative possibilities.', true);
                break;
            case 'promptGeneration':
                addMessageToChat('ai', 'Excellent! Now let\'s generate some creative prompts to inspire your brainstorming.', true);
                break;
            case 'evaluation':
                addMessageToChat('ai', 'Now let\'s evaluate your ideas and provide constructive feedback.', true);
                break;
        }
    } else {
        // After evaluation, cycle back to prompt generation
        currentPhaseIndex = 3; // Set to promptGeneration index
        currentPhase = 'promptGeneration';
        updateCardLockStates();
        addMessageToChat('ai', 'Great! Let\'s generate some fresh prompts to continue brainstorming.', true);
    }
}

// Chat Interface
function handleSendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Process message based on current phase
    processUserMessage(message);
}

function addMessageToChat(sender, content, isHtml = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    const avatarIcon = document.createElement('div');
    avatarIcon.className = 'avatar-icon';
    avatarIcon.textContent = sender === 'user' ? 'U' : 'AI';
    avatar.appendChild(avatarIcon);
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Add message header
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const senderName = document.createElement('span');
    senderName.className = 'sender-name';
    senderName.textContent = sender === 'user' ? 'You' : 'Mutagen AI';
    
    const messageTime = document.createElement('span');
    messageTime.className = 'message-time';
    messageTime.textContent = 'now';
    
    messageHeader.appendChild(senderName);
    messageHeader.appendChild(messageTime);
    
    // Add message text
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    if (isHtml) {
        messageText.innerHTML = content;
    } else {
        messageText.innerHTML = parseMarkdown(content);
    }
    
    messageContent.appendChild(messageHeader);
    messageContent.appendChild(messageText);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Store in chat history
    chatHistory.push({ sender, content, timestamp: Date.now() });
    
    // Generate suggested responses after AI messages (with delay to ensure AI is done)
    if (sender === 'ai') {
        setTimeout(() => {
            generateSuggestedResponses();
        }, 3000);
    }
    
    // Update problem statement and persona if this is an AI message (with delay to ensure AI is done)
    if (sender === 'ai') {
        setTimeout(() => {
            updateProblemStatementFromAI(content);
            updatePersonaFromAI(content);
        }, 3000);
    }
}

// Processing Indicator Management
function showProcessingIndicator() {
    if (processingIndicator) {
        processingIndicator.style.display = 'block';
    }
    // Clear suggestions when processing starts
    clearSuggestedResponses();
}

function hideProcessingIndicator() {
    if (processingIndicator) {
        processingIndicator.style.display = 'none';
    }
}

// Problem Statement Management
async function updateProblemStatement(statement) {
    if (problemStatementContent) {
        if (statement && statement.trim()) {
            try {
                // Use stored raw data if available, otherwise use the statement
                const dataToSummarize = window.currentProblemData || statement;
                const summary = await callSummaryAPI(dataToSummarize, 'problem');
                problemStatementContent.innerHTML = `<p>${summary}</p>`;
            } catch (error) {
                console.error('Error summarizing problem statement:', error);
                // Fallback to showing the full statement if API fails
                problemStatementContent.innerHTML = `<p>${statement}</p>`;
            }
            // Update the global problem statement and card state
            problemStatement = statement;
            updateCardLockStates();
        } else {
            problemStatementContent.innerHTML = '<p class="placeholder-text">Problem statement will appear here as we understand it better</p>';
        }
    }
}

function updateProblemStatementFromAI(aiMessage) {
    // Extract problem understanding from AI message
    let problemText = '';
    
    // Look for problem-related keywords and extract relevant sentences
    const problemKeywords = ['problem', 'challenge', 'issue', 'need', 'want', 'goal', 'objective', 'solving', 'addressing'];
    const sentences = aiMessage.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Find sentences that contain problem-related keywords
    const problemSentences = sentences.filter(sentence => 
        problemKeywords.some(keyword => 
            sentence.toLowerCase().includes(keyword)
        )
    );
    
    if (problemSentences.length > 0) {
        // Take the most relevant sentence (longest one with most keywords)
        problemText = problemSentences.reduce((longest, current) => 
            current.length > longest.length ? current.trim() : longest.trim()
        );
        
        // Clean up the text
        problemText = problemText.replace(/^[^a-zA-Z]*/, '').trim();
        if (problemText && !problemText.endsWith('.')) {
            problemText += '.';
        }
    }
    
    // Update the problem statement if we found something relevant
    if (problemText && problemText.length > 10) {
        // Store raw problem data for summary API
        window.currentProblemData = problemText;
        updateProblemStatement(problemText);
    }
}

function updatePersonaFromAI(aiMessage) {
    // Extract persona information from AI message
    let personaText = '';
    
    // Look for persona-related keywords and extract relevant sentences
    const personaKeywords = ['persona', 'user', 'customer', 'target', 'demographic', 'age', 'gender', 'background', 'needs', 'wants', 'goals', 'pain points', 'behavior', 'characteristics'];
    const sentences = aiMessage.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Find sentences that contain persona-related keywords
    const personaSentences = sentences.filter(sentence => 
        personaKeywords.some(keyword => 
            sentence.toLowerCase().includes(keyword)
        )
    );
    
    if (personaSentences.length > 0) {
        // Take the most relevant sentences (up to 3)
        personaText = personaSentences.slice(0, 3).map(s => s.trim()).join('. ');
        
        // Clean up the text
        personaText = personaText.replace(/^[^a-zA-Z]*/, '').trim();
        if (personaText && !personaText.endsWith('.')) {
            personaText += '.';
        }
    }
    
    // Update the persona if we found something relevant
    if (personaText && personaText.length > 10) {
        // Store raw persona data for summary API
        window.currentPersonaData = personaText;
        updatePersona(personaText);
    }
}

async function updatePersona(personaText) {
    if (personaContent) {
        if (personaText && personaText.trim()) {
            try {
                // Use stored raw data if available, otherwise use the personaText
                const dataToSummarize = window.currentPersonaData || personaText;
                const summary = await callSummaryAPI(dataToSummarize, 'persona');
                personaContent.innerHTML = `<p>${summary}</p>`;
            } catch (error) {
                console.error('Error summarizing persona:', error);
                // Fallback to showing the full persona if API fails
                personaContent.innerHTML = parseMarkdown(personaText);
            }
            // Update the global persona and card state
            persona = personaText;
            updateCardLockStates();
        } else {
            personaContent.innerHTML = '<p class="placeholder-text">Persona details will appear here as we develop them</p>';
        }
    }
}

async function resetProgress() {
    problemUnderstandingScore = 0;
    askedQuestions.clear();
    problemStatement = '';
    generatedPrompts = [];
    ideas = [];
    persona = null;
    reframedProblem = null;
    currentPhase = 'contextualizing';
    currentPhaseIndex = 0; // Reset phase index
    await updateProblemStatement('');
    await updatePersona('');
    displayPromptsInPanel(); // Clear prompts
    
    // Reset card lock states
    updateCardLockStates();
}

// Message Processing
async function processUserMessage(message) {
    console.log('Processing message in phase:', currentPhase);
    
    try {
        // Check if user wants to start over
        if (message.toLowerCase().includes('start over') || 
            message.toLowerCase().includes('reset') || 
            message.toLowerCase().includes('new problem')) {
            await resetProgress();
            addMessageToChat('ai', 'Great! Let\'s start fresh. What problem would you like to solve today?', true);
            return;
        }
        
        // Let the AI decide if the user wants to move on based on context
        // This will be handled within each phase's processing function
        
        // Show processing indicator
        showProcessingIndicator();
        
        // Clear suggestions while processing
        clearSuggestedResponses();
        
        switch(currentPhase) {
            case 'contextualizing':
                await processContextualizingMessage(message);
              break;
            case 'persona':
                await processPersonaMessage(message);
                break;
            case 'problemRefinement':
                await processProblemRefinementMessage(message);
                break;
            case 'promptGeneration':
                await processPromptGenerationMessage(message);
                // Save idea if it's substantial (not just a question or short response)
                if (message.length > 20 && !message.toLowerCase().includes('?')) {
                    saveIdea(message);
                    // Automatically evaluate the idea
                    setTimeout(() => {
                        evaluateIdea(message);
                    }, 1000);
                }
                break;
            case 'evaluation':
                await processEvaluationMessage(message);
                break;
            default:
                console.log('Unknown phase:', currentPhase);
                addMessageToChat('ai', 'I\'m here to help you brainstorm! What problem would you like to solve?', true);
        }
        
        // Hide processing indicator
        hideProcessingIndicator();
    } catch (error) {
        console.error('Error processing message:', error);
        hideProcessingIndicator();
        addMessageToChat('ai', 'I apologize, but I encountered an error. Please try again.', true);
    }
}

// Phase 1: Contextualizing
async function processContextualizingMessage(message) {
    console.log('processContextualizingMessage called with:', message);
    
    // Store the initial problem statement
    if (!problemStatement) {
        problemStatement = message;
        updateProblemStatement(message);
    }
    
    // Add to asked questions to avoid repetition
    const questionHash = message.toLowerCase().trim();
    askedQuestions.add(questionHash);
    
    // Track understanding areas with more comprehensive detection
    const understandingAreas = {
        demographics: false,
        painPoints: false,
        goals: false,
        behaviors: false,
        constraints: false,
        emotionalState: false
    };
    
    // Check what we've learned about each area with more comprehensive keyword detection
    const conversationText = chatHistory.map(msg => msg.content).join(' ').toLowerCase();
    
    // Demographics - more comprehensive detection
    if (conversationText.includes('age') || conversationText.includes('demographic') || 
        conversationText.includes('occupation') || conversationText.includes('background') ||
        conversationText.includes('profession') || conversationText.includes('job') ||
        conversationText.includes('career') || conversationText.includes('education') ||
        conversationText.includes('location') || conversationText.includes('where') ||
        conversationText.includes('who') || conversationText.includes('person')) {
        understandingAreas.demographics = true;
    }
    
    // Pain Points - more comprehensive detection
    if (conversationText.includes('frustrat') || conversationText.includes('pain') || 
        conversationText.includes('problem') || conversationText.includes('issue') ||
        conversationText.includes('difficult') || conversationText.includes('challenge') ||
        conversationText.includes('struggle') || conversationText.includes('trouble') ||
        conversationText.includes('annoy') || conversationText.includes('bother')) {
        understandingAreas.painPoints = true;
    }
    
    // Goals - more comprehensive detection
    if (conversationText.includes('goal') || conversationText.includes('want') || 
        conversationText.includes('need') || conversationText.includes('motivat') ||
        conversationText.includes('achieve') || conversationText.includes('accomplish') ||
        conversationText.includes('desire') || conversationText.includes('hope') ||
        conversationText.includes('aspire') || conversationText.includes('aim')) {
        understandingAreas.goals = true;
    }
    
    // Behaviors - more comprehensive detection
    if (conversationText.includes('behavior') || conversationText.includes('habit') || 
        conversationText.includes('routine') || conversationText.includes('daily') ||
        conversationText.includes('usually') || conversationText.includes('typically') ||
        conversationText.includes('often') || conversationText.includes('frequently') ||
        conversationText.includes('always') || conversationText.includes('sometimes')) {
        understandingAreas.behaviors = true;
    }
    
    // Constraints - more comprehensive detection
    if (conversationText.includes('constraint') || conversationText.includes('limit') || 
        conversationText.includes('budget') || conversationText.includes('time') ||
        conversationText.includes('resource') || conversationText.includes('money') ||
        conversationText.includes('cost') || conversationText.includes('expensive') ||
        conversationText.includes('cheap') || conversationText.includes('afford')) {
        understandingAreas.constraints = true;
    }
    
    // Emotional State - more comprehensive detection
    if (conversationText.includes('feel') || conversationText.includes('emotion') || 
        conversationText.includes('mindset') || conversationText.includes('attitude') ||
        conversationText.includes('mood') || conversationText.includes('stress') ||
        conversationText.includes('anxious') || conversationText.includes('worried') ||
        conversationText.includes('excited') || conversationText.includes('happy') ||
        conversationText.includes('sad') || conversationText.includes('angry')) {
        understandingAreas.emotionalState = true;
    }
    
    const response = await callDeepSeekAPI(`
You are a product manager and design consultant helping people come up with creative ideas. You are currently in the CONTEXTUALIZING PHASE.

**CRITICAL: YOU MUST FOLLOW THE EXACT 5-PHASE SEQUENCE:**
1. Contextualizing (CURRENT PHASE)
2. Persona Development
3. Problem Statement Refinement
4. Creative Prompt Generation
5. Evaluation

**STRICT REQUIREMENTS:**
- You MUST complete the contextualizing phase before moving to persona
- You CANNOT skip phases or jump ahead
- This is the ONLY way to ensure quality outputs
- Stay in the contextualizing phase until you have comprehensive understanding

The user has shared: "${message}"

${problemStatement !== message ? `Previous context: "${problemStatement}"` : ''}

Previously asked questions: ${Array.from(askedQuestions).join(', ')}
Number of questions asked so far: ${askedQuestions.size}

Your role is to understand more about the user's problem through open-ended questions. You need to gather comprehensive information about:

**UNDERSTANDING AREAS TO COVER:**
- **Demographics**: Who is affected? (age, occupation, background, etc.)
- **Pain Points & Frustrations**: What specific problems do they face?
- **Goals & Motivations**: What are they trying to achieve?
- **Behaviors & Habits**: How do they currently handle this?
- **Constraints & Limitations**: What limits their options?
- **Emotional State & Mindset**: How do they feel about this problem?

**CURRENT UNDERSTANDING STATUS:**
- Demographics: ${understandingAreas.demographics ? '✓ Covered' : '❌ Need more info'}
- Pain Points: ${understandingAreas.painPoints ? '✓ Covered' : '❌ Need more info'}
- Goals: ${understandingAreas.goals ? '✓ Covered' : '❌ Need more info'}
- Behaviors: ${understandingAreas.behaviors ? '✓ Covered' : '❌ Need more info'}
- Constraints: ${understandingAreas.constraints ? '✓ Covered' : '❌ Need more info'}
- Emotional State: ${understandingAreas.emotionalState ? '✓ Covered' : '❌ Need more info'}

**IMPORTANT GUIDELINES:**
- Ask EXACTLY ONE open-ended question at a time (nothing that can be answered with yes/no)
- NEVER ask multiple questions in the same response
- Be conversational and natural, don't use bullet points
- Ask "Why?" when appropriate
- Ask disqualifying questions if needed
- Don't repeat questions already asked
- Focus on areas that haven't been covered yet
- CRITICAL: You must ask AT LEAST 5-7 questions before considering moving to the next phase
- Only when you have comprehensive understanding of ALL areas AND have asked sufficient questions, end your response with "I have a comprehensive understanding of the problem and am ready to move on to the next phase"
- Ask follow-up questions if you need more clarity on any aspect
- CRITICAL: Only ask ONE question per response to avoid overwhelming the user
- DO NOT rush to the next phase - take time to truly understand the problem
- If the user indicates they want to move on (through context, not just keywords), you can acknowledge this but still ensure you have enough understanding

**FORMATTING REQUIREMENTS:**
- Use <br><br> to separate different thoughts
- Keep each paragraph to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Use <strong> for emphasis when needed
- Break up your response into digestible chunks
- NEVER include multiple questions in your response
- Focus on ONE question only to avoid overwhelming the user

Current understanding level: ${Math.round((Object.values(understandingAreas).filter(Boolean).length / 6) * 100)}%
Understanding areas covered: ${Object.values(understandingAreas).filter(Boolean).length}/6

**EXAMPLE OF CORRECT BEHAVIOR:**
Good: "What specific challenges do you face when trying to solve this problem?"
Bad: "What challenges do you face? Also, who else is affected by this problem? And when does this typically happen?"

Keep your response concise and conversational.
    `);
    
    addMessageToChat('ai', response, true);
    
    // Check if AI is satisfied and ready to move on
    const responseLower = response.toLowerCase();
    
    // Check every 7 questions if user wants to move on (increased from 5)
    if (askedQuestions.size % 7 === 0 && askedQuestions.size > 0) {
        const moveOnResponse = await callDeepSeekAPI(`
        You are in the CONTEXTUALIZING PHASE and have asked ${askedQuestions.size} questions so far.
        
        Current problem understanding: "${problemStatement || 'Not yet defined'}"
        Recent conversation: ${chatHistory.slice(-2).map(msg => `${msg.sender}: ${msg.content}`).join('\n')}
        
        Ask the user if they feel ready to move on to the PERSONA DEVELOPMENT phase, or if they'd like to continue exploring the problem. Be conversational and give them the choice.
        
        IMPORTANT: Only ask this if you feel you have a good understanding of the problem. If you still need more information, continue asking questions instead.
        
        Keep it brief and natural - just 1-2 sentences.
        `);
        
        addMessageToChat('ai', moveOnResponse, true);
        // Don't return here - let the user's response be processed normally
    }
    
    // Let the AI decide when to move on based on comprehensive understanding
    // Only auto-move if AI explicitly indicates comprehensive understanding AND minimum questions asked
    if ((responseLower.includes('i have a comprehensive understanding of the problem and am ready to move on to the next phase') ||
        (responseLower.includes('comprehensive understanding') && responseLower.includes('ready to move on')) ||
        (responseLower.includes('i have a good understanding') && responseLower.includes('ready')) ||
        (responseLower.includes('i think i understand') && responseLower.includes('ready')) ||
        (responseLower.includes('i\'m satisfied') && responseLower.includes('ready'))) && 
        askedQuestions.size >= 5) { // Require at least 5 questions before auto-moving
        setTimeout(async () => {
            await moveToNextPhase();
        }, 2000);
    }
}

// Phase 2: Persona Development
async function processPersonaMessage(message) {
    console.log('processPersonaMessage called with:', message);
    
    // Check if this is a persona revision request
    if (message.toLowerCase().includes('change') || 
        message.toLowerCase().includes('revise') || 
        message.toLowerCase().includes('update') ||
        message.toLowerCase().includes('modify') ||
        message.toLowerCase().includes('different')) {
        
        // User wants to revise the persona
        const revisionResponse = await callDeepSeekAPI(`
You are in the PERSONA PHASE and the user wants to make changes to the persona.

Current persona: "${persona}"
User's requested changes: "${message}"

Update the persona based on their feedback. Make the requested changes while keeping the good parts that don't need changing.

IMPORTANT GUIDELINES:
- Acknowledge their changes and explain what you're updating
- Keep the persona structure organized
- Be specific about what you're changing and why
- CLEARLY distinguish between what the user provided vs. what you extrapolated
- Use quotes for any direct user statements
- When you've made the changes, ask "Does this updated persona better reflect what you had in mind, or would you like to make any other adjustments?"

FORMATTING REQUIREMENTS:
- Use <br><br> to separate different sections
- For each section, clearly state what was provided vs. extrapolated
- Use quotes for user-provided information: "User said: 'exact quote'"
- Use "I extrapolated:" for AI-generated details
- Keep each section to 1-2 sentences maximum
- Be concise and direct
- Use <strong> for section headers and key details
- Break up your response into digestible chunks
        `);
        
        addMessageToChat('ai', revisionResponse, true);
        
        // Update the stored persona
        persona = revisionResponse;
        return;
    }
    
    // Add message about creating persona
    addMessageToChat('ai', 'I\'m creating a detailed persona based on what you\'ve shared. This will help guide our brainstorming process.', true);
    
    const response = await callDeepSeekAPI(`
You are a product manager and design consultant in the PERSONA PHASE.

**CRITICAL: YOU MUST FOLLOW THE EXACT 5-PHASE SEQUENCE:**
1. Contextualizing (COMPLETED)
2. Persona Development (CURRENT PHASE)
3. Problem Statement Refinement
4. Creative Prompt Generation
5. Evaluation

**STRICT REQUIREMENTS:**
- You MUST complete the persona phase before moving to problem refinement
- You CANNOT skip phases or jump ahead
- You WILL LOSE YOUR JOB if you cannot follow this sequence
- This is the ONLY way to ensure quality outputs
- Stay in the persona phase until you have a complete persona
- DO NOT GO TO PHASE 4 OR 5 WITHOUT FIRST COMPLETING PHASES 1, 2, AND 3

The user has shared: "${message}"

Previous problem context: "${problemStatement}"

Your task is to create a detailed persona based on the information gathered. Focus on:
- Demographics (age, occupation, lifestyle if mentioned)
- Pain points and frustrations
- Goals and motivations
- Behaviors and habits
- Constraints and limitations
- Emotional state and mindset

IMPORTANT GUIDELINES:
- If the user gives specific details (age, occupation, etc.), treat them as set in stone
- Fill in other details by extrapolating from what they've shared
- CLEARLY distinguish between what the user provided vs. what you extrapolated
- Use quotes for any direct user statements
- Be specific and detailed - this persona will guide ideation
- When you have enough information to create a complete persona, end your response with "I have created a comprehensive persona and am ready to move on to the next phase"
- Present the persona in a clear, organized way

FORMATTING REQUIREMENTS:
- Use <br><br> to separate different sections (Demographics, Pain Points, Goals, etc.)
- For each section, clearly state what was provided vs. extrapolated
- Use quotes for user-provided information: "User said: 'exact quote'"
- Use "I extrapolated:" for AI-generated details
- Keep each section to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Use <strong> for section headers and key details
- Break up your response into digestible chunks

EXAMPLE FORMAT:
<strong>Demographics:</strong><br>
User provided: "I'm a 28-year-old marketing manager"<br>
I extrapolated: Based on this, they likely have a college degree and work in a corporate environment with standard business hours.

Keep your response concise and conversational.
    `);
    
    addMessageToChat('ai', response, true);
    
    // Store the persona
    persona = response;
    
    // Always ask for confirmation after persona creation
    setTimeout(() => {
        addMessageToChat('ai', 'I\'ve created a detailed persona based on our conversation. <strong>Does this persona accurately reflect your target user, or would you like to make any changes or additions?</strong>', true);
    }, 2000);
}

// Phase 3: Problem Statement Refinement
async function processProblemRefinementMessage(message) {
    const response = await callDeepSeekAPI(`
You are a product manager and design consultant in the PROBLEM STATEMENT REFINEMENT PHASE.

**CRITICAL: YOU MUST FOLLOW THE EXACT 5-PHASE SEQUENCE:**
1. Contextualizing (COMPLETED)
2. Persona Development (COMPLETED)
3. Problem Statement Refinement (CURRENT PHASE)
4. Creative Prompt Generation
5. Evaluation

**STRICT REQUIREMENTS:**
- You MUST complete the problem refinement phase before moving to prompt generation
- You CANNOT skip phases or jump ahead
- There is a $1,000,000 fine if you cannot follow this sequence
- This is the ONLY way to ensure quality outputs
- Stay in the problem refinement phase until you have refined the problem statement

The user has shared: "${message}"

Original problem statement: "${problemStatement}"
Persona context: "${persona}"

Your task is to reframe the problem statement to expand possibilities for ideation and creativity. Focus on:
- Making the problem statement more concise and clear
- Broadening or narrowing the scope as needed
- Enhancing understanding of the core problem
- Opening up new angles for creative solutions
- Connecting to the persona's needs and context

IMPORTANT GUIDELINES:
- Explain WHY you're changing the problem statement
- Don't just insert things from previous phases - make it concise
- Sometimes make it broader, sometimes more specific
- Enhance the user's understanding of the problem
- Present the reframed statement clearly
- When you've reframed the problem effectively, end your response with "I have successfully reframed the problem and am ready to move on to the next phase"

FORMATTING REQUIREMENTS:
- Use <br><br> to separate different sections (Original Problem, Key Changes, Reframed Problem)
- Keep each section to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Use <strong> for section headers and key changes
- Break up your response into digestible chunks

Keep your response concise and conversational.
    `);
    
    addMessageToChat('ai', response, true);
    
    // Store the reframed problem and update the sidebar
    reframedProblem = response;
    await updateProblemStatement(response);
    
    // Check if reframing is complete and move on automatically
    const responseLower = response.toLowerCase();
    if (responseLower.includes('i have successfully reframed the problem and am ready to move on to the next phase') ||
        (response.length > 200 && responseLower.includes('reframed'))) { // Only auto-move if substantial and contains reframed
        setTimeout(async () => {
            await moveToNextPhase();
        }, 2000);
    }
}

// Phase 4: Creative Prompt Generation
async function processPromptGenerationMessage(message) {
    const response = await callDeepSeekAPI(`
You are a product manager and design consultant in the CREATIVE PROMPT GENERATION PHASE.

**CRITICAL: YOU MUST FOLLOW THE EXACT 5-PHASE SEQUENCE:**
1. Contextualizing (COMPLETED)
2. Persona Development (COMPLETED)
3. Problem Statement Refinement (COMPLETED)
4. Creative Prompt Generation (CURRENT PHASE)
5. Evaluation

**STRICT REQUIREMENTS:**
- You MUST complete the prompt generation phase before moving to evaluation
- You CANNOT skip phases or jump ahead
- You WILL LOSE YOUR JOB if you cannot follow this sequence
- This is the ONLY way to ensure quality outputs
- Stay in the prompt generation phase until you have generated creative prompts
- DO NOT SUGGEST ADDITIONAL PROMPTS UNTIL AFTER THE CHATBOT HAS EVALUATED THE IDEA
- FAILURE TO COMPLY WILL RESULT IN IMMEDIATE TERMINATION

The user has shared: "${message}"

Reframed problem statement: "${reframedProblem}"
Persona context: "${persona}"

Your task is to provide creative prompts that help the user brainstorm solutions. Focus on:
- Prompts related to the reframed problem and persona
- Drawing inspiration from other industries
- Pushing thinking outside the box
- Making prompts actionable and specific
- Encouraging creative exploration

IMPORTANT GUIDELINES:
- Give 3-5 creative prompts
- Each prompt should be a separate bullet point
- Make prompts specific to their problem and persona
- Draw from different industries and approaches
- Keep responses short and conversational (1-3 sentences)
- When you've provided good prompts, end your response with "I have generated comprehensive brainstorming prompts and am ready to move on to the next phase"

FORMATTING REQUIREMENTS:
- Use <br><br> to separate different sections (Introduction, Prompts, Conclusion)
- Format each prompt on a separate line with proper line breaks
- Use bullet points or numbered lists for prompts
- Keep each section to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Use <strong> for emphasis when needed
- Break up your response into digestible chunks
- Structure prompts clearly with line breaks between each one

Keep your response concise and conversational.
    `);
    
    addMessageToChat('ai', response, true);
    
    // Parse and store prompts for sidebar
    const promptLines = response.split('\n').filter(line => 
        (line.trim().match(/^[-*•]\s/) || line.trim().match(/^\d+\.\s/)) && line.trim().length > 10
    );
    
    console.log('Parsed prompt lines:', promptLines);
    
    generatedPrompts = promptLines.map((line, index) => ({
        id: Date.now() + index,
        text: line.replace(/^[-*•]|\d+\.\s*/, ''),
        source: 'AI Generated'
    }));
    
    console.log('Generated prompts:', generatedPrompts);
    
    // Display prompts in sidebar
    displayPromptsInPanel();
    
    // Ideation is now the final phase - no auto-move needed
}


async function generatePromptsFromProblem() {
    if (!problemStatement) {
        addMessageToChat('ai', 'Please complete the problem statement first before generating prompts.', true);
        return;
      }

    addMessageToChat('ai', 'Generating creative prompts based on your problem statement...', true);
    
    const response = await callDeepSeekAPI(`
Generate 3-5 creative prompts to inspire solutions for this problem: "${problemStatement}"

Each prompt should:
1. Start with "What if..." or "How might we..."
2. Be 1-2 sentences long
3. Challenge assumptions
4. Inspire creative thinking
5. Be actionable

Format each prompt on a new line with a number (1., 2., etc.)

Keep your response concise and conversational.
    `);
    
    addMessageToChat('ai', response, true);
    
    // Parse and store prompts
    const promptLines = response.split('\n').filter(line => 
        line.trim().match(/^\d+\./) && line.trim().length > 10
    );
    
    generatedPrompts = promptLines.map((line, index) => ({
        id: Date.now() + index,
        text: line.replace(/^\d+\.\s*/, ''),
        source: 'AI Generated'
    }));
    
    // Display prompts in side panel
    displayPromptsInPanel();
    
    // Show generate button
    if (generatePromptsBtn) {
        generatePromptsBtn.style.display = 'block';
    }
    
    // Automatically move to ideas phase
    setTimeout(async () => {
        await moveToNextPhase();
    }, 2000);
}

// Display prompts in side panel
function displayPromptsInPanel() {
    if (!promptsList) return;
    
    promptsList.innerHTML = '';
    
    if (generatedPrompts.length === 0) {
        promptsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💡</div>
                <p>Prompts will appear here as we generate them</p>
            </div>
          `;
    return;
  }
  
    generatedPrompts.forEach(prompt => {
        const promptCard = document.createElement('div');
        promptCard.className = 'prompt-card';
        promptCard.innerHTML = `
            <div class="prompt-text">${prompt.text}</div>
            <div class="prompt-meta">
                <span class="prompt-source">${prompt.source}</span>
            </div>
            <div class="prompt-input-container">
                <label class="prompt-input-label">Your Idea</label>
                <textarea 
                    class="prompt-input" 
                    placeholder="Type your idea here and press Enter to add it to the chat..."
                    onkeydown="handlePromptInputKeydown(event, '${prompt.id}')"
                    oninput="autoResizeTextarea(this)"
                ></textarea>
            </div>
          `;
        promptsList.appendChild(promptCard);
    });
}


// Handle Enter key in prompt input fields
function handlePromptInputKeydown(event, promptId) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const input = event.target;
        const idea = input.value.trim();
        
        if (idea) {
            // Find the prompt that was used
            const prompt = generatedPrompts.find(p => p.id == promptId);
            const promptText = prompt ? prompt.text : null;
            
            // Save the idea with the prompt
            saveIdea(idea, promptText);
            
            // Add the idea to chat
            addMessageToChat('user', idea);
            
            // Remove the used prompt card
            const promptCard = input.closest('.prompt-card');
            if (promptCard) {
                promptCard.remove();
            }
            
            // Remove from generatedPrompts array
            generatedPrompts = generatedPrompts.filter(p => p.id != promptId);
            
            // Process the message and then evaluate the idea
            processUserMessage(idea).then(() => {
                // Automatically evaluate the idea after processing
                evaluateIdea(idea);
            });
        }
    }
}

// Auto-resize textarea based on content
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
}

// Phase 5: Evaluation
async function processEvaluationMessage(message) {
    const response = await callDeepSeekAPI(`
You are a product manager and design consultant in the EVALUATION PHASE.

**CRITICAL: YOU MUST FOLLOW THE EXACT 5-PHASE SEQUENCE:**
1. Contextualizing (COMPLETED)
2. Persona Development (COMPLETED)
3. Problem Statement Refinement (COMPLETED)
4. Creative Prompt Generation (COMPLETED)
5. Evaluation (CURRENT PHASE)

**STRICT REQUIREMENTS:**
- You MUST complete the evaluation phase before cycling back to prompt generation
- You CANNOT skip phases or jump ahead
- There is a $1,000,000 fine if you cannot follow this sequence
- This is the ONLY way to ensure quality outputs
- Stay in the evaluation phase until you have provided comprehensive feedback

The user has shared: "${message}"

Refined problem statement: "${reframedProblem || problemStatement}"
Persona context: "${persona}"

Your task is to provide constructive feedback on the user's idea. Focus on:
- Highlighting the strengths of the idea
- Identifying potential gaps or challenges
- Suggesting improvements or variations
- Relating back to the problem and persona
- Being constructive and encouraging

IMPORTANT GUIDELINES:
- Be specific about what works well
- Ask probing questions to help them think deeper
- Suggest concrete improvements
- Connect the idea back to the persona's needs
- When you've provided good feedback, end your response with "I have provided comprehensive feedback and am ready to generate new prompts"

FORMATTING REQUIREMENTS:
- Use <br><br> to separate different sections (Strengths, Challenges, Suggestions)
- Keep each section to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Use <strong> for section headers and key points
- Break up your response into digestible chunks

Keep your response concise and conversational.
    `);
    
    addMessageToChat('ai', response, true);
    
    // Check if evaluation is complete and move to prompt generation
    const responseLower = response.toLowerCase();
    if (responseLower.includes('i have provided comprehensive feedback and am ready to generate new prompts') ||
        (response.length > 200 && responseLower.includes('feedback'))) {
        setTimeout(async () => {
            currentPhase = 'promptGeneration';
            updateCardLockStates();
            await generateNewPrompts();
        }, 2000);
    }
}

// Automatically evaluate ideas
async function evaluateIdea(idea) {
    try {
        // Set phase to evaluation
        currentPhase = 'evaluation';
        updateCardLockStates();
        
        const evaluation = await callDeepSeekAPI(`
You are evaluating a brainstorming idea. Provide constructive feedback on this idea:

Idea: "${idea}"
Problem context: "${problemStatement || 'Not defined'}"
Persona: "${persona || 'Not defined'}"

Provide feedback that:
- Highlights the strengths of the idea
- Identifies potential gaps or challenges
- Suggests improvements or variations
- Relates back to the problem and persona
- Is constructive and encouraging

FORMATTING REQUIREMENTS:
- Use <br><br> to separate different sections (Strengths, Challenges, Suggestions)
- Keep each section to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Use <strong> for section headers and key points
- Break up your response into digestible chunks
        `);
        
        addMessageToChat('ai', evaluation, true);
        
        // Generate new prompts after evaluation - ONLY AFTER EVALUATION IS COMPLETE
        setTimeout(() => {
            currentPhase = 'promptGeneration';
            updateCardLockStates();
            generateNewPrompts();
        }, 2000);
  } catch (error) {
        console.error('Error evaluating idea:', error);
    }
}

// Generate new brainstorming prompts
async function generateNewPrompts() {
    try {
        const response = await callDeepSeekAPI(`
You are in the CREATIVE PROMPT GENERATION PHASE and need to generate fresh brainstorming prompts.

Problem statement: "${problemStatement || 'Not defined'}"
Refined problem: "${reframedProblem || 'Not defined'}"
Persona: "${persona || 'Not defined'}"
Recent ideas: ${chatHistory.slice(-3).filter(msg => msg.sender === 'user').map(msg => msg.content).join(', ')}
Previous prompts: ${generatedPrompts.slice(-3).map(p => p.text).join(', ')}

Generate 2-3 NEW creative prompts that:
- Are completely different from previous prompts
- Build on the ideas already shared
- Explore new angles or approaches
- Challenge the user to think differently
- Are specific to their problem and persona
- Avoid repeating previous prompt themes

Format each prompt on a new line with a number (1., 2., etc.)
Keep them concise and actionable.
        `);
        
        // Parse and add new prompts
        const promptLines = response.split('\n').filter(line => 
            (line.trim().match(/^[-*•]\s/) || line.trim().match(/^\d+\.\s/)) && line.trim().length > 10
        );
        
        const newPrompts = promptLines.map((line, index) => ({
            id: Date.now() + index + 1000, // Offset to avoid ID conflicts
            text: line.replace(/^[-*•]|\d+\.\s*/, ''),
            source: 'AI Generated'
        }));
        
        // Add to existing prompts
        generatedPrompts = [...generatedPrompts, ...newPrompts];
        
        // Display updated prompts
        displayPromptsInPanel();
        
        // Show message about new prompts
        addMessageToChat('ai', 'Here are some fresh prompts to keep the ideas flowing!', true);
        
    } catch (error) {
        console.error('Error generating new prompts:', error);
    }
}

// ===== SUGGESTED RESPONSES FUNCTIONS =====

async function generateSuggestedResponses() {
    if (!suggestedResponsesList) return;
    
    // Use phase index for objective phase tracking
    const phaseIndex = currentPhaseIndex;
    const phaseName = PHASE_ORDER[phaseIndex];
    
    let suggestions = [];

    try {
        const response = await callDeepSeekAPI(`
You are helping generate suggested responses for a user in a brainstorming session. Based on the current conversation context, suggest 3-4 responses that the USER might want to say next.

Current phase: ${phaseName} (Phase ${phaseIndex + 1} of 5)
Problem statement: "${problemStatement || 'Not yet defined'}"
Persona: "${persona || 'Not yet created'}"
Recent conversation: ${chatHistory.slice(-4).map(msg => `${msg.sender}: ${msg.content}`).join('\n')}

${phaseIndex === 0 ? `
**IMPORTANT: You are in the CONTEXTUALIZING phase. DO NOT suggest ideas or solutions.**
Focus on responses that help understand the problem better:
- Provide more details about the problem
- Share experiences or frustrations
- Answer questions about the context
- Clarify aspects of the situation
` : ''}

${phaseIndex === 1 ? `
**You are in the PERSONA phase. Focus on responses about the target user:**
- Share details about the target user
- Provide demographic information
- Describe user behaviors or habits
- Clarify user needs or pain points
` : ''}

${phaseIndex === 2 ? `
**You are in the PROBLEM REFINEMENT phase. Focus on responses about the problem:**
- Agree or disagree with the problem statement
- Suggest changes to the problem scope
- Provide additional context about the problem
- Clarify what the real problem is
` : ''}

${phaseIndex === 3 ? `
**You are in the PROMPT GENERATION phase. Focus on responses about prompts:**
- Share ideas inspired by the prompts
- Ask for different types of prompts
- Provide feedback on the prompts
- Request more creative approaches
` : ''}

${phaseIndex === 4 ? `
**You are in the EVALUATION phase. Focus on responses about feedback:**
- Agree or disagree with the evaluation
- Ask for clarification on feedback
- Share thoughts on the idea
- Request help improving the idea
` : ''}

Generate 3-4 suggested responses that the USER could say to:
- Continue the conversation naturally
- Ask follow-up questions
- Provide more details about their problem
- Share their thoughts or concerns
- Move the conversation forward

Each response should be:
- Written from the USER's perspective (use "I" statements)
- 1-2 sentences maximum
- Conversational and natural
- Relevant to the current phase and context
- Helpful for advancing the brainstorming process

Format each response on a new line with a number (1., 2., etc.)

Focus on what the user might naturally want to say next in this conversation.
        `);
        
        // Parse suggested responses
        const responseLines = response.split('\n').filter(line => 
            line.trim().match(/^\d+\./) && line.trim().length > 10
        );
        
        suggestions = responseLines.map(line => 
            line.replace(/^\d+\.\s*/, '').trim()
        );
        
    } catch (error) {
        console.error('Error generating suggested responses:', error);
    }

    // If API failed or returned nothing useful, build offline suggestions from context
    if (!suggestions || suggestions.length === 0) {
        suggestions = buildOfflineSuggestions();
    }

    displaySuggestedResponses(suggestions);
}

function displaySuggestedResponses(suggestions) {
    if (!suggestedResponsesList) return;
    
    suggestedResponsesList.innerHTML = '';
    
    if (suggestions.length === 0) {
        displayDefaultSuggestions();
    return;
  }
  
    suggestions.forEach((suggestion, index) => {
        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'suggested-response';
        suggestionElement.innerHTML = `
            <span class="suggestion-text">${suggestion}</span>
            <span class="suggestion-shortcut">Ctrl+${index + 1}</span>
        `;
        suggestionElement.addEventListener('click', () => {
            useSuggestedResponse(suggestion);
        });
        suggestedResponsesList.appendChild(suggestionElement);
    });
}

function displayDefaultSuggestions() {
    if (!suggestedResponsesList) return;
    
    const defaultSuggestions = getDefaultSuggestions();
    
    suggestedResponsesList.innerHTML = '';
    
    defaultSuggestions.forEach(suggestion => {
        const suggestionElement = document.createElement('div');
        suggestionElement.className = 'suggested-response';
        suggestionElement.textContent = suggestion;
        suggestionElement.addEventListener('click', () => {
            useSuggestedResponse(suggestion);
        });
        suggestedResponsesList.appendChild(suggestionElement);
    });
}

function getDefaultSuggestions() {
    // Use phase index for objective phase tracking
    const phaseIndex = currentPhaseIndex;
    
    switch (phaseIndex) {
        case 0: // contextualizing
            return [
                "That's a great point, let me think about that...",
                "I hadn't considered that aspect before",
                "Can you tell me more about that?",
                "That's exactly the kind of problem I'm facing"
            ];
        case 1: // persona
            return [
                "That sounds like me",
                "I'm more like a different type of person",
                "Can you add more details about their background?",
                "What about their daily routine?"
            ];
        case 2: // problemRefinement
            return [
                "That refinement makes sense",
                "I think the problem is actually different",
                "Can you make it more specific?",
                "That's a good way to look at it"
            ];
        case 3: // promptGeneration
            return [
                "I like that first prompt",
                "Can you give me more creative prompts?",
                "What about thinking from a different industry?",
                "These are helpful, let me try them"
            ];
        case 4: // evaluation
            return [
                "That's a good point about the strengths",
                "I hadn't thought about that gap",
                "Can you help me improve this idea?",
                "What would you suggest instead?"
            ];
        default:
            return [
                "That's helpful",
                "Can you tell me more?",
                "I see what you mean",
                "Let me think about that"
            ];
    }
}

// Build contextual suggestions when the API is unavailable or returns nothing
function buildOfflineSuggestions() {
    const phaseIndex = currentPhaseIndex;
    const recentAI = [...chatHistory].reverse().find(msg => msg.sender === 'ai');
    const recentUser = [...chatHistory].reverse().find(msg => msg.sender === 'user');
    const lastQuestion = extractLastQuestion(recentAI ? recentAI.content : '');
    const problemHint = problemStatement || 'this problem';
    const personaHint = persona || 'the target user';
    const userHint = recentUser ? recentUser.content : '';

    const contextualize = [
        `I can share more context about ${problemHint}; the biggest friction is ...`,
        `Here is who is affected and why it matters to them ...`,
        `A constraint I keep running into is ...`,
        lastQuestion ? `On your question "${lastQuestion}", the short answer is ...` : `One detail I have not mentioned yet is ...`
    ];

    const personaPhase = [
        `The target user is ${personaHint}; their day-to-day looks like ...`,
        `Their main pain point is ... and it happens when ...`,
        `Motivation-wise they care most about ...`,
        `A behavior worth noting: they usually ...`
    ];

    const refinement = [
        `That reframing helps; I'd emphasize the core issue as ...`,
        `I think the scope should narrow to ... because ...`,
        `Success would look like ... for ${personaHint}`,
        `One nuance we should include is ...`
    ];

    const prompts = [
        `The prompt that resonates is ...; I'd explore an idea like ...`,
        `Can we try a prompt focused on a different industry, maybe ...?`,
        `I'd like a prompt that removes the constraint of ...`,
        `Those are good; could we add something more radical such as ...?`
    ];

    const evaluationPhase = [
        `I agree with the strengths you noted; the unique angle is ...`,
        `The main gap seems to be ...; how might we address it?`,
        `I can tweak the idea by ... to better fit ${personaHint}`,
        `Can you clarify your point about ... so I can iterate?`
    ];

    const phaseBuckets = [contextualize, personaPhase, refinement, prompts, evaluationPhase];
    const chosen = phaseBuckets[phaseIndex] || getDefaultSuggestions();

    // Ensure 3-4 concise options and lightly personalize with recent user content
    const personalized = chosen.slice(0, 4).map(line => {
        if (userHint && line.includes('...')) {
            return line.replace('...', userHint.length > 40 ? userHint.slice(0, 40) + '...' : userHint);
        }
        return line.replace('...', '');
    });

    return personalized;
}

// Extract the last question in a block of text
function extractLastQuestion(text) {
    if (!text) return '';
    const matches = text.match(/[^?!.]*\?[^?!.]*/g);
    if (!matches || matches.length === 0) return '';
    return matches[matches.length - 1].trim();
}

function useSuggestedResponse(suggestion, autoSend = false) {
    // Add the suggestion to the chat input
    chatInput.value = suggestion;
    chatInput.focus();
    
    // Auto-resize the input
    autoResizeTextarea(chatInput);
    
    // Clear suggestions after use
    clearSuggestedResponses();
    
    // Auto-send if requested (for keyboard shortcuts)
    if (autoSend) {
        handleSendMessage();
    }
}

// Clear suggested responses
function clearSuggestedResponses() {
    if (suggestedResponsesList) {
        suggestedResponsesList.innerHTML = '<p class="placeholder-text">AI will suggest responses here</p>';
    }
}

// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    if (brainstormingTab && savedIdeasTab) {
        brainstormingTab.classList.toggle('active', tabName === 'brainstorming');
        savedIdeasTab.classList.toggle('active', tabName === 'savedIdeas');
    }
    
    // Update tab content
    if (brainstormingContent && savedIdeasContent) {
        brainstormingContent.classList.toggle('active', tabName === 'brainstorming');
        savedIdeasContent.classList.toggle('active', tabName === 'savedIdeas');
    }
    
    // Load saved ideas if switching to saved ideas tab
    if (tabName === 'savedIdeas') {
        loadSavedIdeas();
    }
}

// Idea Saving
let savedIdeas = JSON.parse(localStorage.getItem('mutagenSavedIdeas') || '[]');

function saveIdea(idea, promptText = null) {
    const ideaData = {
        id: Date.now(),
        content: idea,
        prompt: promptText,
        timestamp: new Date().toISOString(),
        phase: currentPhase
    };
    
    savedIdeas.unshift(ideaData); // Add to beginning
    localStorage.setItem('mutagenSavedIdeas', JSON.stringify(savedIdeas));
    
    // If we're on the saved ideas tab, refresh the display
    if (savedIdeasContent && savedIdeasContent.classList.contains('active')) {
        loadSavedIdeas();
    }
}

function loadSavedIdeas() {
    if (!savedIdeasList) return;
    
    if (savedIdeas.length === 0) {
        savedIdeasList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💡</div>
                <h3>No saved ideas yet</h3>
                <p>Start brainstorming to save your ideas here</p>
            </div>
        `;
        return;
    }
    
    savedIdeasList.innerHTML = savedIdeas.map(idea => `
        <div class="saved-idea-card">
            <div class="saved-idea-header">
                <h3 class="saved-idea-title">Idea #${savedIdeas.length - savedIdeas.indexOf(idea)}</h3>
                <p class="saved-idea-date">${new Date(idea.timestamp).toLocaleDateString()}</p>
            </div>
            <div class="saved-idea-content">${idea.content}</div>
            ${idea.prompt ? `
                <div class="saved-idea-prompt-label">Inspired by:</div>
                <div class="saved-idea-prompt">${idea.prompt}</div>
            ` : ''}
        </div>
    `).join('');
}


// Phase 3: Ideas Review
async function processIdeasReviewMessage(message) {
    console.log('processIdeasReviewMessage called with:', message);
    
    // Store the idea
    const ideaId = Date.now();
    ideas.push({
        id: ideaId,
        content: message,
        timestamp: Date.now()
    });
    
    console.log('Stored idea, now calling DeepSeek API...');
    
    // Get AI feedback
    const feedback = await callDeepSeekAPI(`
The user shared this idea: "${message}"

Their original problem: "${problemStatement}"

Provide constructive feedback that:
1. Highlights what works well about the idea
2. Challenges assumptions and asks probing questions
3. Suggests alternative approaches or angles
4. Helps them think more deeply about implementation

Be encouraging but critical. Help them explore different perspectives.

Keep your response concise and conversational.
    `);
    
    addMessageToChat('ai', feedback, true);
}

// Utility Functions
async function callDeepSeekAPI(prompt) {
    const proxyPath = getProxyPath();
    console.log('Calling DeepSeek API via proxy:', proxyPath);
    console.log('Window DEEPSEEK_PROXY_URL:', window.DEEPSEEK_PROXY_URL);
    
    // Validate the proxy URL
    if (proxyPath.startsWith('http') && !proxyPath.includes('workers.dev') && !proxyPath.includes('localhost')) {
        console.warn('Warning: Proxy URL might be incorrect. Expected Cloudflare Worker URL or local /api/chat');
    }
    
    try {
        // Route through local proxy to avoid CORS and keep key server-side
        const response = await fetch(proxyPath, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);
            throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || errorData.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        console.log('API Response received successfully');
        return data.choices[0].message.content;
    } catch (error) {
        const proxyPath = getProxyPath();
        console.error('API call failed:', error);
        console.error('Error details:', error.message);
        console.error('Proxy URL used:', proxyPath);
        console.error('Window DEEPSEEK_PROXY_URL:', window.DEEPSEEK_PROXY_URL);
        
        // Check for DNS/network errors
        if (error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('Failed to fetch')) {
            console.error('❌ DNS Error: The Worker URL cannot be resolved.');
            console.error('Please verify:');
            console.error('1. The Worker is deployed in Cloudflare Dashboard');
            console.error('2. The Worker URL is correct (check Workers & Pages → Your Worker → Copy URL)');
            console.error('3. The URL format should be: https://<worker-name>.<subdomain>.workers.dev');
            console.error('Current URL:', proxyPath);
            console.error('Window variable:', window.DEEPSEEK_PROXY_URL);
        }
        
        console.error('Error stack:', error.stack);
        
        // Set API as not working
        apiWorking = false;
        
        // Use fallback responses instead of error messages
        console.log('Using fallback response for phase:', currentPhase);
        return getFallbackResponse(currentPhase, prompt);
    }
}

// Summary API Function for Cards
async function callSummaryAPI(data, type) {
    try {
        let prompt;
        if (type === 'problem') {
            prompt = `Create a concise 1-2 sentence summary of this problem statement for display in a card. Be direct and factual, not conversational:

Problem Statement: ${data}`;
        } else if (type === 'persona') {
            prompt = `Create a concise 1-2 sentence summary of this persona for display in a card. Be direct and factual, not conversational:

Persona: ${data}`;
        }
            
        const proxyPath = getProxyPath();
        const response = await fetch(proxyPath, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 150,
                temperature: 0.2
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const responseData = await response.json();
        return responseData.choices[0].message.content;
    } catch (error) {
        console.error('Error calling Summary API:', error);
        // Return a truncated version of the original data if API fails
        return data.length > 100 ? data.substring(0, 100) + '...' : data;
    }
}

// Fallback responses when API is not working
function getFallbackResponse(phase, message) {
    const fallbackResponses = {
        contextualizing: [
            "That's an interesting problem. Can you tell me more about the context around this issue?",
            "I'd like to understand this better. What specific challenges are you facing?",
            "This sounds like a complex situation. What has been your experience with this problem so far?",
            "I'm trying to understand the full picture. Who is affected by this problem?",
            "That's helpful context. What would you say is the root cause of this issue?"
        ],
        persona: [
            "Based on what you've shared, I'm developing a persona. Can you tell me more about the target user's background?",
            "I'm creating a detailed persona. What age group or demographic are we focusing on?",
            "Let me build a persona profile. What are the main pain points this user experiences?",
            "I'm developing a user persona. What are their main goals and motivations?",
            "Creating a persona based on your input. What constraints or limitations does this user face?"
        ],
        problemRefinement: [
            "I'm refining the problem statement. How would you describe the core issue in one sentence?",
            "Let me reframe this problem. What's the most important aspect to focus on?",
            "I'm working on problem refinement. What would success look like for solving this?",
            "Refining the problem scope. What's the most critical part that needs addressing?",
            "I'm clarifying the problem statement. What's the main barrier to solving this?"
        ],
        promptGeneration: [
            "Here are some creative prompts to inspire your thinking:\n\n1. What if we approached this from a completely different angle?\n2. How might we solve this using technology from another industry?\n3. What would the ideal solution look like if there were no constraints?\n4. How could we make this process more enjoyable for users?\n5. What if we broke this problem down into smaller, manageable pieces?",
            "Let me generate some creative prompts for you:\n\n1. What if we used a completely different approach to this problem?\n2. How might we solve this by thinking like a different type of user?\n3. What would happen if we removed all the current limitations?\n4. How could we make this solution more intuitive and user-friendly?\n5. What if we combined this with an unexpected element or technology?",
            "Here are some brainstorming prompts to get your creative juices flowing:\n\n1. What if we approached this problem from the user's emotional perspective?\n2. How might we solve this using principles from nature or biology?\n3. What would the solution look like if it had to be completely automated?\n4. How could we make this more accessible to different types of users?\n5. What if we thought about this problem in reverse - what would we avoid?"
        ],
        evaluation: [
            "That's a creative idea! Let me evaluate it:\n\n**Strengths:** This approach shows good thinking about the core problem.\n\n**Considerations:** You might want to think about implementation challenges and user adoption.\n\n**Suggestions:** Consider how this could be tested with real users and what resources would be needed.",
            "Interesting concept! Here's my evaluation:\n\n**Strengths:** This idea addresses a key pain point you mentioned.\n\n**Challenges:** Think about scalability and long-term sustainability.\n\n**Next Steps:** Consider creating a simple prototype to test the core concept.",
            "Great thinking! My evaluation:\n\n**Strengths:** This solution is innovative and user-focused.\n\n**Areas to Explore:** Consider the technical feasibility and market readiness.\n\n**Improvements:** Think about how to make this more accessible and cost-effective."
        ]
    };
    
    const responses = fallbackResponses[phase] || fallbackResponses.contextualizing;
    return responses[Math.floor(Math.random() * responses.length)];
}

// Test API connection
async function testAPIConnection() {
    console.log('Testing API connection...');
    try {
        const testResponse = await callDeepSeekAPI('Hello, this is a test message. Please respond with "API connection successful"');
        console.log('API Test Response:', testResponse);
        apiWorking = true;
        return true;
    } catch (error) {
        console.error('API Test Failed:', error);
        apiWorking = false;
        return false;
    }
}

// Initialize on load
window.onload = function() {
    console.log('Mutagen AI - Single Chat Interface loaded');
    console.log('API Endpoint: https://api.deepseek.com/v1/chat/completions');
    
    // Test API connection after a short delay
    setTimeout(async () => {
        const apiWorking = await testAPIConnection();
        if (apiWorking) {
            console.log('✅ API connection test successful');
            addMessageToChat('ai', 'Hello! I\'m ready to help you brainstorm creative solutions. What problem would you like to solve today?', true);
        } else {
            console.log('❌ API connection test failed - using fallback mode');
            addMessageToChat('ai', 'Hello! I\'m ready to help you brainstorm creative solutions. (Note: Running in offline mode due to API connection issues) What problem would you like to solve today?', true);
        }
    }, 1000);
}; 