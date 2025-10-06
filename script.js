// --- Mutagen AI - Single Chat Interface ---

// API Configuration
const DEEPSEEK_API_KEY = 'sk-7ca0b43ee9234ee192fab611c38ef55b';

// Global State
let currentPhase = 'contextualizing'; // contextualizing, persona, reframing, ideation, evaluation
let problemStatement = '';
let generatedPrompts = [];
let ideas = [];
let askedQuestions = new Set(); // Track asked questions to avoid repetition
let problemUnderstandingScore = 0; // Track AI's understanding of the problem
let chatHistory = [];
let persona = null; // Store the created persona
let reframedProblem = null; // Store the reframed problem statement

// DOM Elements
let chatMessages, chatInput, sendButton, loadingOverlay, processingIndicator;
let leftSidebar, rightSidebar, promptsList, generatePromptsBtn, problemStatementContent, personaContent;
let suggestedResponsesList;
let brainstormingTab, savedIdeasTab, brainstormingContent, savedIdeasContent, savedIdeasList;
let refreshPromptsBtn;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
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
    // Problem statement card: locked until reframing phase, then brightened after reframing
    if (currentPhase === 'reframing') {
        unlockCard(problemStatementCard);
    } else if (currentPhase === 'ideation' || currentPhase === 'evaluation') {
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
    } else if (currentPhase === 'reframing' || currentPhase === 'ideation' || currentPhase === 'evaluation') {
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
    console.log('moveToNextPhase called, current phase:', currentPhase);
    const phaseOrder = ['contextualizing', 'persona', 'reframing', 'ideation'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    
    if (currentIndex < phaseOrder.length - 1) {
        currentPhase = phaseOrder[currentIndex + 1];
        console.log('Moving to phase:', currentPhase);
        
        // Update card lock states
        updateCardLockStates();
        
        switch(currentPhase) {
            case 'persona':
                // No announcement - seamless transition
                break;
            case 'reframing':
                // No announcement - seamless transition
                break;
            case 'ideation':
                // No announcement - seamless transition
                await generatePromptsFromProblem();
                break;
            case 'evaluation':
                // No announcement - seamless transition
                break;
        }
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
        
        // Check if user wants to move to next phase
        if (message.toLowerCase().includes('next phase') || 
            message.toLowerCase().includes('move on') ||
            message.toLowerCase().includes('ready to move') ||
            message.toLowerCase().includes('let\'s move on') ||
            message.toLowerCase().includes('yes') ||
            message.toLowerCase().includes('sure') ||
            message.toLowerCase().includes('okay') ||
            message.toLowerCase().includes('ok') ||
            message.toLowerCase().includes('ready')) {
            console.log('User wants to move on, current phase:', currentPhase);
            await moveToNextPhase();
            console.log('After moveToNextPhase, current phase:', currentPhase);
            // After moving to next phase, process the message in the new phase
            if (currentPhase === 'persona') {
                console.log('Processing persona phase');
                await processPersonaMessage('Ready to create persona');
            } else if (currentPhase === 'reframing') {
                console.log('Processing reframing phase');
                await processReframingMessage('Ready to reframe the problem');
            } else if (currentPhase === 'ideation') {
                console.log('Processing ideation phase');
                await processIdeationMessage('Ready to generate prompts');
            }
            return;
        }
        
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
            case 'reframing':
                await processReframingMessage(message);
                break;
            case 'ideation':
                await processIdeationMessage(message);
                // Save idea if it's substantial (not just a question or short response)
                if (message.length > 20 && !message.toLowerCase().includes('?')) {
                    saveIdea(message);
                    // Automatically evaluate the idea
                    setTimeout(() => {
                        evaluateIdea(message);
                    }, 1000);
                }
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
    
    const response = await callDeepSeekAPI(`
You are a product manager and design consultant helping people come up with creative ideas. You are currently in the CONTEXTUALIZING PHASE.

The user has shared: "${message}"

${problemStatement !== message ? `Previous context: "${problemStatement}"` : ''}

Previously asked questions: ${Array.from(askedQuestions).join(', ')}
Number of questions asked so far: ${askedQuestions.size}

Your role is to understand more about the user's problem through open-ended questions. Focus on:
- Understanding the context and background
- Why this problem exists
- What has been tried before
- Who is affected by this problem
- When and where this problem occurs

IMPORTANT GUIDELINES:
- Ask ONE open-ended question at a time (nothing that can be answered with yes/no)
- Be conversational and natural, don't use bullet points
- Ask "Why?" when appropriate
- Ask disqualifying questions if needed
- Don't repeat questions already asked
- Continue asking questions until you have a comprehensive understanding of the problem
- When you're satisfied with your understanding, end your response with "I have a comprehensive understanding of the problem and am ready to move on to the next phase"
- Ask follow-up questions if you need more clarity on any aspect

FORMATTING REQUIREMENTS:
- Use <br><br> to separate different thoughts or questions
- Keep each paragraph to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Use <strong> for emphasis when needed
- Break up your response into digestible chunks

Current understanding level: ${problemUnderstandingScore}%

Keep your response concise and conversational.
    `);
    
    addMessageToChat('ai', response, true);
    
    // Check if AI is satisfied and ready to move on
    const responseLower = response.toLowerCase();
    
    // Check every 5 questions if user wants to move on
    if (askedQuestions.size % 5 === 0 && askedQuestions.size > 0) {
        const moveOnResponse = await callDeepSeekAPI(`
        You are in the CONTEXTUALIZING PHASE and have asked ${askedQuestions.size} questions so far.
        
        Current problem understanding: "${problemStatement || 'Not yet defined'}"
        Recent conversation: ${chatHistory.slice(-2).map(msg => `${msg.sender}: ${msg.content}`).join('\n')}
        
        Ask the user if they feel ready to move on to the next phase, or if they'd like to continue exploring the problem. Be conversational and give them the choice.
        
        Keep it brief and natural - just 1-2 sentences.
        `);
        
        addMessageToChat('ai', moveOnResponse, true);
        // Don't return here - let the user's response be processed normally
    }
    
    // Auto-move if AI indicates satisfaction
    if (responseLower.includes('i have a comprehensive understanding of the problem and am ready to move on to the next phase') ||
        responseLower.includes('i have a good understanding') || 
        responseLower.includes('i think i understand') ||
        responseLower.includes('i\'m satisfied') ||
        responseLower.includes('ready to move') ||
        responseLower.includes('let\'s move on') ||
        responseLower.includes('comprehensive understanding') ||
        (askedQuestions.size >= 3 && responseLower.includes('now'))) {
        setTimeout(async () => {
            await moveToNextPhase();
        }, 2000);
    }
}

// Phase 2: Persona Development
async function processPersonaMessage(message) {
    console.log('processPersonaMessage called with:', message);
    
    // Add message about creating persona
    addMessageToChat('ai', 'I\'m creating a detailed persona based on what you\'ve shared. This will help guide our brainstorming process.', true);
    
    const response = await callDeepSeekAPI(`
You are a product manager and design consultant in the PERSONA PHASE.

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
- Clearly call out what parts of the persona you've filled in vs. what they provided
- Be specific and detailed - this persona will guide ideation
- When you have enough information to create a complete persona, end your response with "I have created a comprehensive persona and am ready to move on to the next phase"
- Present the persona in a clear, organized way

FORMATTING REQUIREMENTS:
- Use <br><br> to separate different sections (Demographics, Pain Points, Goals, etc.)
- Keep each section to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Use <strong> for section headers and key details
- Break up your response into digestible chunks

Keep your response concise and conversational.
    `);
    
    addMessageToChat('ai', response, true);
    
    // Store the persona
    persona = response;
    
    // Check if persona is complete and move on automatically
    const responseLower = response.toLowerCase();
    if (responseLower.includes('i have created a comprehensive persona and am ready to move on to the next phase') ||
        (response.length > 300 && responseLower.includes('persona'))) { // Only auto-move if substantial and contains persona
        setTimeout(async () => {
            await moveToNextPhase();
        }, 2000);
    }
}

// Phase 3: Problem Reframing
async function processReframingMessage(message) {
    const response = await callDeepSeekAPI(`
You are a product manager and design consultant in the REFRAMING PHASE.

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

// Phase 4: Ideation
async function processIdeationMessage(message) {
    const response = await callDeepSeekAPI(`
You are a product manager and design consultant in the IDEATION PHASE.

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
- Keep each section to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Use <strong> for emphasis when needed
- Break up your response into digestible chunks

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

// Automatically evaluate ideas
async function evaluateIdea(idea) {
    try {
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
        
        // Generate new prompts after evaluation
        if (currentPhase === 'ideation') {
            setTimeout(() => {
                generateNewPrompts();
            }, 2000);
        }
  } catch (error) {
        console.error('Error evaluating idea:', error);
    }
}

// Generate new brainstorming prompts
async function generateNewPrompts() {
    try {
        const response = await callDeepSeekAPI(`
You are in the IDEATION PHASE and need to generate fresh brainstorming prompts.

Problem statement: "${problemStatement || 'Not defined'}"
Reframed problem: "${reframedProblem || 'Not defined'}"
Persona: "${persona || 'Not defined'}"
Recent ideas: ${chatHistory.slice(-3).filter(msg => msg.sender === 'user').map(msg => msg.content).join(', ')}

Generate 2-3 NEW creative prompts that:
- Are different from previous prompts
- Build on the ideas already shared
- Explore new angles or approaches
- Challenge the user to think differently
- Are specific to their problem and persona

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
    
    try {
        const response = await callDeepSeekAPI(`
You are helping generate suggested responses for a user in a brainstorming session. Based on the current conversation context, suggest 3-4 responses that the USER might want to say next.

Current phase: ${currentPhase}
Problem statement: "${problemStatement || 'Not yet defined'}"
Persona: "${persona || 'Not yet created'}"
Recent conversation: ${chatHistory.slice(-4).map(msg => `${msg.sender}: ${msg.content}`).join('\n')}

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

Examples of good user responses:
- "I think the main issue is that users don't understand how to use it"
- "What if we approached this from a different angle?"
- "I'm not sure if this would work for our target audience"
- "Can you help me think through the implementation challenges?"

Focus on what the user might naturally want to say next in this conversation.
        `);
        
        // Parse suggested responses
        const responseLines = response.split('\n').filter(line => 
            line.trim().match(/^\d+\./) && line.trim().length > 10
        );
        
        const suggestions = responseLines.map(line => 
            line.replace(/^\d+\.\s*/, '').trim()
        );
        
        displaySuggestedResponses(suggestions);
        
    } catch (error) {
        console.error('Error generating suggested responses:', error);
        // Show default suggestions based on phase
        displayDefaultSuggestions();
    }
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
    switch (currentPhase) {
        case 'contextualizing':
            return [
                "That's a great point, let me think about that...",
                "I hadn't considered that aspect before",
                "Can you tell me more about that?",
                "That's exactly the kind of problem I'm facing"
            ];
        case 'persona':
            return [
                "That sounds like me",
                "I'm more like a different type of person",
                "Can you add more details about their background?",
                "What about their daily routine?"
            ];
        case 'reframing':
            return [
                "That reframing makes sense",
                "I think the problem is actually different",
                "Can you make it more specific?",
                "That's a good way to look at it"
            ];
        case 'ideation':
            return [
                "I like that first prompt",
                "Can you give me more creative prompts?",
                "What about thinking from a different industry?",
                "These are helpful, let me try them"
            ];
        case 'evaluation':
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
    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
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

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('API call failed:', error);
        return "I apologize, but I'm having trouble connecting to the AI service. Please check your internet connection and try again.";
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
            
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
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

// Initialize on load
window.onload = function() {
    console.log('Mutagen AI - Single Chat Interface loaded');
}; 