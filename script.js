// --- Mutagen AI - Single Chat Interface ---

// API Configuration
// Prefer a proxy URL injected via window.CLAUDE_PROXY_URL (e.g., Cloudflare Worker);
// The proxy converts requests to Claude API format
// Otherwise fall back to local /api/chat for local dev.
function getProxyPath() {
    if (typeof window !== 'undefined' && window.CLAUDE_PROXY_URL) {
        return window.CLAUDE_PROXY_URL;
    }
    return '/api/chat';
}

// Mutagen Prompts - Complete list from Mutagen Prompt.txt
const MUTAGEN_PROMPTS = [
    { title: 'Irresistible', prompt: 'Change how often users use it' },
    { title: 'Work Hard', prompt: 'Change how much effort the user needs to use' },
    { title: 'Day In Day Out', prompt: 'Take inspiration from your daily routine' },
    { title: 'Copycat', prompt: 'Take inspiration from an existing product or service' },
    { title: 'Minimally Viable', prompt: 'Make it so that you could build a prototype right now' },
    { title: 'Brainwash', prompt: 'Take inspiration from an advertisement' },
    { title: 'The Upside Down', prompt: 'Change the sequence of steps the user goes through' },
    { title: 'Deja Vu', prompt: 'Take inspiration from an experience you had in the last two weeks' },
    { title: 'Ready Player One', prompt: 'Take inspiration from a game' },
    { title: 'Taxpayer Money', prompt: 'Take inspiration from a public service' },
    { title: 'Pep Talk', prompt: 'Utilize a coach or facilitator' },
    { title: 'Curator', prompt: 'Take inspiration from a museum, art gallery, etc.' },
    { title: 'Price Tag', prompt: 'Change how much this costs' },
    { title: 'Polymath', prompt: 'Take inspiration from something unrelated to your job or major' },
    { title: 'Primary Hustle', prompt: 'Take inspiration from your job' },
    { title: 'Bird\'s Eye', prompt: 'Take inspiration from something in your immediate/nearby area' },
    { title: 'Shopaholic', prompt: 'Take inspiration from a recently purchased product or service' },
    { title: 'Social Enterprise', prompt: 'Solve a social issue' },
    { title: 'Daydreamer', prompt: 'Take inspiration from a fantasy or dream that you have had' },
    { title: 'DLC', prompt: 'Users can create plugins, mods, add-ons, etc.' },
    { title: 'Play Hard', prompt: 'Take inspiration from one of your hobbies' },
    { title: 'Suit Up', prompt: 'Utilize a wearable device' },
    { title: 'Beginner\'s Luck', prompt: 'Incorporate an element of randomization' },
    { title: 'Brower History', prompt: 'Take inspiration from a website or app that you recently opened' },
    { title: 'Nostalgia', prompt: 'Take inspiration from a childhood toy or memory' },
    { title: 'Tic-Tac-Toe', prompt: 'Make it so even a 5-year-old could use it' },
    { title: 'Wirecutter', prompt: 'Does not require digital devices' },
    { title: 'Season\'s Greetings', prompt: 'Take inspiration from a seasonal activity' },
    { title: 'Sixth Sense', prompt: 'Engage another sense' },
    { title: 'Microscope', prompt: 'Address a subset of users very well' },
    { title: 'Subscription Fee', prompt: 'Make it require a membership or subscription' },
    { title: 'Influencer', prompt: 'Utilize user-generated content' },
    { title: 'Terminator', prompt: 'Automate something not automated or vice versa' },
    { title: 'Happy Holidays', prompt: 'Take inspiration from a holiday, festivity, tradition, etc.' },
    { title: 'Pocket Computer', prompt: 'Make it only require a smartphone to use' },
    { title: 'The Social Network', prompt: 'Take inspiration from a social media platform' },
    { title: 'Mother Nature', prompt: 'Make it so users have to use it outside' },
    { title: 'Fountain of Youth', prompt: 'Make it so even a 60-year-old could use it' },
    { title: 'Viral', prompt: 'Experience changes based on how many people use it' },
    { title: 'No Time to Expla-', prompt: 'Only takes five minutes or less to use' },
    { title: 'Time Traveler', prompt: 'Make it more high or low tech' },
    { title: 'Chef\'s Kiss', prompt: 'Take inspiration from the hospitality industry' },
    { title: 'Warp Reality', prompt: 'Incorporate VR or AR' },
    { title: 'Brick and Mortar', prompt: 'Take inspiration from a retail store' },
    { title: 'Internet of Things', prompt: 'Utilize two or more devices that use data from each other' },
    { title: 'Mr. Worldwide', prompt: 'Take inspiration from another culture' },
    { title: 'This Tall to Ride', prompt: 'Take inspiration from an amusement park, carnival, arcade, etc.' },
    { title: 'Reminisce', prompt: 'Take inspiration from an experience you had over five years ago' },
    { title: 'Into the Multiverse', prompt: 'Take inspiration from a game, movie, book, or other fictional work' },
    { title: 'Swiss Army Knife', prompt: 'Add a feature that makes the main solution easier to use' },
    { title: 'Party', prompt: 'Change the number of people the user interacts with' },
    { title: 'Plane of Existence', prompt: 'Anything digital becomes analog and vice versa' }
];

// Example Prompts for reference
const EXAMPLE_PROMPTS = {
    targeted: [
        'What if creators had to work within extreme constraints to prove that creative output doesn\'t require unlimited resources or time?',
        'What if the event itself wasn\'t about making things, but about creating a ritual or ceremony that designers participate in together?',
        'What if the event required participants to publicly commit to their idea before receiving any feedback or validation?'
    ],
    semiTargeted: [
        'What inspiration could you take from the limited time scope of a hackathon?',
        'What if you took inspiration from Hyrox, where the community and act of working out together is just as important as the fitness?',
        'What if you took inspiration from New Years Resolutions, where people commit to something throughout the year?'
    ],
    mutagen: [
        'Make it take 5 minutes or less.',
        'Take inspiration from a festival or tradition',
        'Change the number of people the user interacts with'
    ]
};

// Global State
let currentPhase = 'contextualizing'; // contextualizing, persona, problemRefinement, promptGeneration, evaluation
let problemStatement = '';
let generatedPrompts = [];
let askedQuestions = new Set(); // Track asked questions to avoid repetition
let chatHistory = [];
let persona = null; // Store the created persona
let reframedProblem = null; // Store the reframed problem statement

// Ideation phase tracking
let ideationPromptCounts = {
    mutagen: 0,
    semiTargeted: 0,
    targeted: 0
};
let userIdeas = []; // Track user ideas for creativity evaluation
let currentPromptType = null; // Track current prompt type: 'mutagen', 'semiTargeted', or 'targeted'

// Phase tracking for objective management
const PHASE_ORDER = ['contextualizing', 'persona', 'problemRefinement', 'promptGeneration', 'evaluation'];
let currentPhaseIndex = 0; // Track current phase index for objective management

// DOM Elements
let chatMessages, chatInput, sendButton, loadingOverlay, processingIndicator;
let leftSidebar, rightSidebar, promptsList, problemStatementContent, personaContent;
let suggestedResponsesList;
let brainstormingTab, savedIdeasTab, brainstormingContent, savedIdeasContent, savedIdeasList;
let enterModeToggle;
let leftSidebarToggle, rightSidebarToggle;

// Enter key mode: 'send' (default) or 'linebreak'
let enterKeyMode = localStorage.getItem('enterKeyMode') || 'send';

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
    updateCardLockStates();
});

function initializeElements() {
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    sendButton = document.getElementById('sendButton');
    loadingOverlay = document.getElementById('loadingOverlay');
    processingIndicator = document.getElementById('processingIndicator');
    leftSidebar = document.getElementById('leftSidebar');
    rightSidebar = document.getElementById('rightSidebar');
    leftSidebarToggle = document.getElementById('leftSidebarToggle');
    rightSidebarToggle = document.getElementById('rightSidebarToggle');
    promptsList = document.getElementById('promptsList');
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
    enterModeToggle = document.getElementById('enterModeToggle');
    const exportIdeasBtn = document.getElementById('exportIdeasBtn');
    
    // Initialize enter key mode toggle
    updateEnterModeToggle();
    
    // Initialize saved ideas in sidebar
    displaySavedIdeasInSidebar();
    
    // Export button
    if (exportIdeasBtn) {
        exportIdeasBtn.addEventListener('click', exportIdeasToCSV);
    }
}

// Simple Markdown Rendering using fallback parser
function parseMarkdown(text) {
    if (!text) return '';
    // If text already contains HTML tags, return it as-is (already processed)
    if (text.includes('<br>') || text.includes('<strong>') || text.includes('<em>') || text.includes('<p>')) {
        return text;
    }
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
    // Skip processing if text already contains HTML tags (AI is using HTML directly)
    if (text.includes('<strong>') || text.includes('<em>') || text.includes('<code>')) {
        // Still process links and images even if HTML is present
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">');
        return text;
    }
    
    // Process bold text first (using **) - must come before italic to avoid conflicts
    // Match **text** but ensure we don't match ***text*** incorrectly
    text = text.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
    
    // Process inline code (protect code blocks from markdown processing)
    text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    
    // Process italic text (using single *) - only match if not part of **
    // Match *text* but ensure it's not part of **text** by checking context
    // Use a pattern that requires word boundaries or spaces
    text = text.replace(/(^|\s)\*([^*\s\n][^*\n]*?[^*\s\n])\*(\s|$)/g, '$1<em>$2</em>$3');
    text = text.replace(/(^|\s)_([^_\s\n][^_\n]*?[^_\s\n])_(\s|$)/g, '$1<em>$2</em>$3');
    
    // Process links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Process images
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto;">');
    
    return text;
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

// Update enter mode toggle button appearance
function updateEnterModeToggle() {
    if (!enterModeToggle) return;
    
    const toggleLabel = enterModeToggle.querySelector('.toggle-label');
    if (toggleLabel) {
        if (enterKeyMode === 'send') {
            toggleLabel.innerHTML = '↵<br><span style="font-size: 9px; opacity: 0.8;">Send</span>';
            enterModeToggle.title = 'Enter to send (Shift+Enter for line break). Click to toggle.';
            enterModeToggle.classList.remove('linebreak-mode');
            // Remove hint if it exists
            const existingHint = document.querySelector('.enter-mode-hint');
            if (existingHint) {
                existingHint.remove();
            }
        } else {
            toggleLabel.innerHTML = '↵<br><span style="font-size: 9px; opacity: 0.8;">Break</span>';
            enterModeToggle.title = 'Enter for line break (Ctrl+Enter to send). Click to toggle.';
            enterModeToggle.classList.add('linebreak-mode');
            // Add visual hint when linebreak mode is on
            addEnterModeHint();
        }
    }
}

function addEnterModeHint() {
    // Remove existing hint if it exists
    const existingHint = document.querySelector('.enter-mode-hint');
    if (existingHint) {
        existingHint.remove();
    }
    
    // Find the input container
    const inputContainer = chatInput?.parentElement;
    if (!inputContainer) return;
    
    // Create hint element
    const hint = document.createElement('div');
    hint.className = 'enter-mode-hint';
    hint.textContent = 'Ctrl+Enter to send';
    inputContainer.appendChild(hint);
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
    
    // Enter key in chat input - behavior depends on toggle mode
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (enterKeyMode === 'send') {
                // Default: Enter sends, Shift+Enter creates line break
                if (!e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
                // Shift+Enter allows default behavior (line break)
            } else {
                // Toggled: Enter creates line break, Ctrl+Enter sends
                if (e.ctrlKey) {
                    e.preventDefault();
                    handleSendMessage();
                }
                // Enter and Shift+Enter allow default behavior (line break)
            }
        }
    });
    
    // Toggle enter key mode
    if (enterModeToggle) {
        enterModeToggle.addEventListener('click', () => {
            enterKeyMode = enterKeyMode === 'send' ? 'linebreak' : 'send';
            localStorage.setItem('enterKeyMode', enterKeyMode);
            updateEnterModeToggle();
        });
    }
    
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });
    
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
    
    // Toggle left sidebar
    if (leftSidebarToggle && leftSidebar) {
        leftSidebarToggle.addEventListener('click', () => {
            const wasCollapsed = leftSidebar.classList.contains('collapsed');
            leftSidebar.classList.toggle('collapsed');
            leftSidebarToggle.classList.toggle('collapsed');
            localStorage.setItem('leftSidebarCollapsed', leftSidebar.classList.contains('collapsed'));
            
            // If sidebar was collapsed and is now open, generate suggested responses
            if (wasCollapsed && !leftSidebar.classList.contains('collapsed')) {
                // Generate suggested responses after a short delay to ensure sidebar is fully visible
                setTimeout(() => {
                    generateSuggestedResponses();
                }, 300);
            }
        });
        
        // Restore collapsed state
        const leftCollapsed = localStorage.getItem('leftSidebarCollapsed') === 'true';
        if (leftCollapsed) {
            leftSidebar.classList.add('collapsed');
            leftSidebarToggle.classList.add('collapsed');
        }
    }
    
    // Toggle right sidebar
    if (rightSidebarToggle && rightSidebar) {
        rightSidebarToggle.addEventListener('click', () => {
            rightSidebar.classList.toggle('collapsed');
            rightSidebarToggle.classList.toggle('collapsed');
            localStorage.setItem('rightSidebarCollapsed', rightSidebar.classList.contains('collapsed'));
        });
        
        // Restore collapsed state
        const rightCollapsed = localStorage.getItem('rightSidebarCollapsed') === 'true';
        if (rightCollapsed) {
            rightSidebar.classList.add('collapsed');
            rightSidebarToggle.classList.add('collapsed');
        }
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
        
        // No forced transition messages - the chatbot will naturally introduce the next phase in its response
    } else {
        // After evaluation, cycle back to prompt generation
        currentPhaseIndex = 3; // Set to promptGeneration index
        currentPhase = 'promptGeneration';
        updateCardLockStates();
        // No forced transition message - the chatbot will naturally introduce the next phase
    }
}

// Check if user explicitly wants to move on
function userWantsToMoveOn(message) {
    const messageLower = message.toLowerCase().trim();
    const moveOnKeywords = [
        'move on', 'move forward', 'next phase', 'continue to', 'proceed to',
        'ready for', 'ready to move', 'let\'s move', 'go to next',
        'skip', 'skip this', 'move ahead', 'next step'
    ];
    
    return moveOnKeywords.some(keyword => messageLower.includes(keyword));
}

// Check if user gives an affirmative response (yes, correct, accurate, etc.)
function isAffirmativeResponse(message) {
    const messageLower = message.toLowerCase().trim();
    const affirmativeKeywords = [
        'yes', 'yeah', 'yep', 'yup', 'sure', 'correct', 'right', 'accurate',
        'that\'s right', 'that\'s correct', 'that works', 'sounds good',
        'looks good', 'perfect', 'good', 'fine', 'ok', 'okay', 'agreed',
        'i agree', 'that\'s accurate', 'it\'s accurate', 'it is accurate',
        'sounds right', 'looks right', 'that\'s fine', 'that works for me',
        'let\'s do it', 'let\'s go', 'go ahead', 'proceed', 'continue',
        'sounds great', 'that sounds good', 'i\'m ready', 'ready'
    ];
    
    // Check for simple affirmative responses (exact match or at start/end)
    if (affirmativeKeywords.some(keyword => 
        messageLower === keyword || 
        messageLower.startsWith(keyword + ' ') || 
        messageLower.endsWith(' ' + keyword) ||
        messageLower === keyword + '.' ||
        messageLower === keyword + '!'
    )) {
        return true;
    }
    
    // Check for affirmative phrases
    const affirmativePhrases = [
        'that\'s correct', 'that is correct', 'that\'s right', 'that is right',
        'sounds good', 'looks good', 'that works', 'i agree', 'i\'m good',
        'no changes', 'no change', 'it\'s good', 'it is good', 'it\'s fine',
        'it is fine', 'it\'s accurate', 'it is accurate', 'that\'s accurate',
        'let\'s move', 'let\'s proceed', 'let\'s continue', 'i\'m ready to',
        'ready to move', 'ready to proceed', 'ready to continue'
    ];
    
    return affirmativePhrases.some(phrase => messageLower.includes(phrase));
}

// Check if AI is 95% certain (based on understanding score or explicit confidence)
async function checkAIConfidence(phase, response, understandingScore = null) {
    const responseLower = response.toLowerCase();
    
    // Check for explicit high confidence indicators
    const highConfidenceIndicators = [
        'i am 95%', 'i am 100%', 'i am very confident', 'i am highly confident',
        'i am certain', 'i am sure', 'completely understand', 'fully understand',
        'comprehensive understanding', 'thorough understanding'
    ];
    
    const hasHighConfidence = highConfidenceIndicators.some(indicator => 
        responseLower.includes(indicator)
    );
    
    // Calculate understanding percentage if provided
    let confidencePercentage = null;
    if (understandingScore !== null) {
        confidencePercentage = understandingScore;
    } else if (hasHighConfidence) {
        confidencePercentage = 95; // Assume 95% if explicit high confidence
    }
    
    // Check if confidence is >= 95%
    return confidencePercentage !== null && confidencePercentage >= 95;
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
        // If content is HTML, render it directly (AI messages with HTML tags)
        // Check if content contains HTML tags - if so, render as-is
        // If it contains escaped HTML entities, unescape them
        if (content.includes('&lt;') || content.includes('&gt;') || content.includes('&amp;')) {
            // Content has escaped HTML, unescape it
            const tempDiv = document.createElement('div');
            tempDiv.textContent = content;
            messageText.innerHTML = tempDiv.innerHTML;
        } else {
            // Content is already HTML, render directly
            messageText.innerHTML = content;
        }
    } else {
        // For plain text messages (user messages or AI messages without HTML)
        // First escape HTML to prevent XSS, then convert newlines to <br>
        const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        const withLineBreaks = escaped.replace(/\n/g, '<br>');
        // Then parse markdown (which will handle other formatting)
        messageText.innerHTML = parseMarkdown(withLineBreaks);
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
        }, 1000);
    }
    
    // Update problem statement and persona if this is an AI message (with delay to ensure AI is done)
    if (sender === 'ai') {
        setTimeout(() => {
            updateProblemStatementFromAI(content);
            updatePersonaFromAI(content);
            
            // Prompts are now shown in chat, sidebar shows saved ideas
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
            // Always store the full statement data
            if (!window.currentProblemData) {
                window.currentProblemData = statement;
            } else {
                // Accumulate: append new information if it's different
                if (!window.currentProblemData.includes(statement)) {
                    window.currentProblemData = `${window.currentProblemData}\n\n${statement}`;
                }
            }
            
            try {
                // Try to get a summary, but fallback to showing more content if summary is too short
                const dataToSummarize = window.currentProblemData;
                const summary = await callSummaryAPI(dataToSummarize, 'problem');
                // If summary is very short, show more of the original content
                if (summary && summary.length > 50) {
                    problemStatementContent.innerHTML = parseMarkdown(summary);
                } else {
                    // Show a more comprehensive view (first 300 chars + summary)
                    const preview = dataToSummarize.length > 300 ? 
                        dataToSummarize.substring(0, 300) + '...' : 
                        dataToSummarize;
                    problemStatementContent.innerHTML = parseMarkdown(preview);
                }
            } catch (error) {
                console.error('Error summarizing problem statement:', error);
                // Fallback: show the accumulated content (truncated if too long)
                const displayText = window.currentProblemData.length > 500 ? 
                    window.currentProblemData.substring(0, 500) + '...' : 
                    window.currentProblemData;
                problemStatementContent.innerHTML = parseMarkdown(displayText);
            }
            // Update the global problem statement and card state
            problemStatement = statement;
            updateCardLockStates();
        } else {
            // Don't clear if we have stored data
            if (!window.currentProblemData) {
                problemStatementContent.innerHTML = '<p class="placeholder-text">Problem statement will appear here as we understand it better</p>';
            }
        }
    }
}

function updateProblemStatementFromAI(aiMessage) {
    // Extract problem understanding from AI message - be more comprehensive
    let problemText = '';
    
    // Look for problem-related keywords and extract relevant sentences
    const problemKeywords = ['problem', 'challenge', 'issue', 'need', 'want', 'goal', 'objective', 'solving', 'addressing', 'difficulty', 'struggle', 'pain'];
    const sentences = aiMessage.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Find sentences that contain problem-related keywords
    const problemSentences = sentences.filter(sentence => 
        problemKeywords.some(keyword => 
            sentence.toLowerCase().includes(keyword)
        )
    );
    
    if (problemSentences.length > 0) {
        // Take up to 3 most relevant sentences (not just one) to preserve more context
        const relevantSentences = problemSentences
            .sort((a, b) => {
                // Sort by number of keywords found and length
                const aKeywords = problemKeywords.filter(k => a.toLowerCase().includes(k)).length;
                const bKeywords = problemKeywords.filter(k => b.toLowerCase().includes(k)).length;
                if (aKeywords !== bKeywords) return bKeywords - aKeywords;
                return b.length - a.length;
            })
            .slice(0, 3);
        
        problemText = relevantSentences.map(s => s.trim()).join('. ');
        
        // Clean up the text
        problemText = problemText.replace(/^[^a-zA-Z]*/, '').trim();
        if (problemText && !problemText.endsWith('.')) {
            problemText += '.';
        }
    } else {
        // If no keywords found but message is substantial, use first few sentences
        if (aiMessage.length > 50) {
            problemText = sentences.slice(0, 2).map(s => s.trim()).join('. ');
            if (problemText && !problemText.endsWith('.')) {
                problemText += '.';
            }
        }
    }
    
    // Update the problem statement if we found something relevant
    if (problemText && problemText.length > 10) {
        // Accumulate with existing data
        if (window.currentProblemData) {
            if (!window.currentProblemData.includes(problemText)) {
                window.currentProblemData = `${window.currentProblemData}\n\n${problemText}`;
            }
        } else {
            window.currentProblemData = problemText;
        }
        updateProblemStatement(window.currentProblemData);
    }
}

function updatePersonaFromAI(aiMessage) {
    // Extract persona information from AI message - be more comprehensive
    let personaText = '';
    
    // Look for persona-related keywords and extract relevant sentences
    const personaKeywords = ['persona', 'user', 'customer', 'target', 'demographic', 'age', 'gender', 'background', 'needs', 'wants', 'goals', 'pain points', 'behavior', 'characteristics', 'occupation', 'lifestyle', 'frustration', 'motivation', 'constraint', 'limitation', 'emotional', 'mindset'];
    const sentences = aiMessage.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Find sentences that contain persona-related keywords
    const personaSentences = sentences.filter(sentence => 
        personaKeywords.some(keyword => 
            sentence.toLowerCase().includes(keyword)
        )
    );
    
    if (personaSentences.length > 0) {
        // Take up to 5 most relevant sentences (not just 3) to preserve more context
        const relevantSentences = personaSentences
            .sort((a, b) => {
                // Sort by number of keywords found and length
                const aKeywords = personaKeywords.filter(k => a.toLowerCase().includes(k)).length;
                const bKeywords = personaKeywords.filter(k => b.toLowerCase().includes(k)).length;
                if (aKeywords !== bKeywords) return bKeywords - aKeywords;
                return b.length - a.length;
            })
            .slice(0, 5);
        
        personaText = relevantSentences.map(s => s.trim()).join('. ');
        
        // Clean up the text
        personaText = personaText.replace(/^[^a-zA-Z]*/, '').trim();
        if (personaText && !personaText.endsWith('.')) {
            personaText += '.';
        }
    } else {
        // If no keywords found but message is substantial and seems persona-related, use more sentences
        if (aiMessage.length > 100 && (aiMessage.toLowerCase().includes('they') || aiMessage.toLowerCase().includes('he') || aiMessage.toLowerCase().includes('she'))) {
            personaText = sentences.slice(0, 4).map(s => s.trim()).join('. ');
            if (personaText && !personaText.endsWith('.')) {
                personaText += '.';
            }
        }
    }
    
    // Update the persona if we found something relevant
    if (personaText && personaText.length > 10) {
        // Accumulate with existing data
        if (window.currentPersonaData) {
            if (!window.currentPersonaData.includes(personaText)) {
                window.currentPersonaData = `${window.currentPersonaData}\n\n${personaText}`;
            }
        } else {
            window.currentPersonaData = personaText;
        }
        updatePersona(window.currentPersonaData);
    }
}

async function updatePersona(personaText) {
    if (personaContent) {
        if (personaText && personaText.trim()) {
            // Always store the full persona data
            if (!window.currentPersonaData) {
                window.currentPersonaData = personaText;
            } else {
                // Accumulate: append new information if it's different and substantial
                if (!window.currentPersonaData.includes(personaText) && personaText.length > 50) {
                    window.currentPersonaData = `${window.currentPersonaData}\n\n${personaText}`;
                }
            }
            
            try {
                // Try to get a summary, but fallback to showing more content if summary is too short
                const dataToSummarize = window.currentPersonaData;
                const summary = await callSummaryAPI(dataToSummarize, 'persona');
                // If summary is very short, show more of the original content
                if (summary && summary.length > 50) {
                    personaContent.innerHTML = `<p>${summary}</p>`;
                } else {
                    // Show a more comprehensive view with markdown parsing
                    const preview = dataToSummarize.length > 400 ? 
                        dataToSummarize.substring(0, 400) + '...' : 
                        dataToSummarize;
                    personaContent.innerHTML = parseMarkdown(preview);
                }
            } catch (error) {
                console.error('Error summarizing persona:', error);
                // Fallback: show the accumulated content with markdown parsing (truncated if too long)
                const displayText = window.currentPersonaData.length > 600 ? 
                    window.currentPersonaData.substring(0, 600) + '...' : 
                    window.currentPersonaData;
                personaContent.innerHTML = parseMarkdown(displayText);
            }
            // Update the global persona and card state
            persona = personaText;
            updateCardLockStates();
        } else {
            // Don't clear if we have stored data
            if (!window.currentPersonaData) {
                personaContent.innerHTML = '<p class="placeholder-text">Persona details will appear here as we develop them</p>';
            }
        }
    }
}

async function resetProgress() {
    askedQuestions.clear();
    problemStatement = '';
    generatedPrompts = [];
    persona = null;
    reframedProblem = null;
    currentPhase = 'contextualizing';
    currentPhaseIndex = 0;
    // Clear stored data when resetting
    window.currentProblemData = '';
    window.currentPersonaData = '';
    problemStatement = '';
    persona = null;
    reframedProblem = null;
    await updateProblemStatement('');
    await updatePersona('');
    displaySavedIdeasInSidebar();
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
                // Save all ideas in the prompt generation phase BEFORE processing
                // This ensures we capture the prompt that came BEFORE the user's idea, not after
                // Only skip if it's clearly a question or command
                if (!message.toLowerCase().startsWith('evaluate') && 
                    !message.toLowerCase().startsWith('feedback') &&
                    !message.toLowerCase().startsWith('what do you think')) {
                    // Find the AI message that came BEFORE this user message
                    // The user's message is already in chatHistory, so we need to find the one before it
                    const userMessageIndex = chatHistory.length - 1; // Last message is the user's
                    const messagesBeforeUser = chatHistory.slice(0, userMessageIndex);
                    const aiMessagesBeforeUser = messagesBeforeUser.filter(msg => msg.sender === 'ai');
                    const lastAIMessageBeforeUser = aiMessagesBeforeUser.length > 0 ? aiMessagesBeforeUser[aiMessagesBeforeUser.length - 1] : null;
                    
                    let promptTitle = null;
                    let promptConnection = null;
                    let promptText = null;
                    
                    if (lastAIMessageBeforeUser) {
                        // First, try to extract directly from the AI message that came before the user's message
                        const extracted = extractPromptFromMessage(lastAIMessageBeforeUser.content);
                        if (extracted.title || extracted.text) {
                            promptTitle = extracted.title;
                            promptConnection = extracted.connection;
                            promptText = extracted.text;
                        } else {
                            // If extraction failed, try to find matching prompt in generatedPrompts
                            // Look for prompts that match the AI message content
                            const aiContent = lastAIMessageBeforeUser.content || '';
                            const matchingPrompt = generatedPrompts.find(p => {
                                if (p.title && aiContent.includes(p.title)) return true;
                                if (p.text && aiContent.includes(p.text.substring(0, 50))) return true;
                                return false;
                            });
                            
                            if (matchingPrompt) {
                                promptTitle = matchingPrompt.title;
                                promptConnection = matchingPrompt.connection;
                                promptText = matchingPrompt.text;
                            }
                        }
                    }
                    
                    // If we still don't have a prompt, try the most recent one in generatedPrompts as fallback
                    if (!promptTitle && !promptText && generatedPrompts.length > 0) {
                        const mostRecentPrompt = generatedPrompts[generatedPrompts.length - 1];
                        promptTitle = mostRecentPrompt.title;
                        promptConnection = mostRecentPrompt.connection;
                        promptText = mostRecentPrompt.text;
                    }
                    
                    saveIdea(message, promptText, promptTitle, promptConnection);
                    
                    // Track user idea for creativity evaluation
                    trackUserIdea(message);
                }
                
                // Process the message (this may generate a new prompt)
                await processPromptGenerationMessage(message);
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
        window.currentProblemData = message; // Store full problem data
        updateProblemStatement(message);
    } else {
        // Accumulate additional problem information
        if (!window.currentProblemData || !window.currentProblemData.includes(message)) {
            window.currentProblemData = window.currentProblemData ? 
                `${window.currentProblemData}\n\n${message}` : 
                message;
            updateProblemStatement(window.currentProblemData);
        }
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
    
    // Check if user wants to move on or agrees to AI's previous suggestion BEFORE generating response
    const lastAIMessage = chatHistory.filter(msg => msg.sender === 'ai').slice(-1)[0];
    const lastAIContent = lastAIMessage ? lastAIMessage.content.toLowerCase() : '';
    
    // More flexible detection - check if AI suggested moving on in any way
    const aiSuggestedMovingOn = lastAIMessage && (
        lastAIContent.includes('ready to move on') ||
        lastAIContent.includes('move on to') ||
        lastAIContent.includes('proceed to') ||
        lastAIContent.includes('next phase') ||
        lastAIContent.includes('should we move') ||
        lastAIContent.includes('would you like to move') ||
        lastAIContent.includes('ready to proceed') ||
        lastAIContent.includes('move forward') ||
        lastAIContent.includes('continue to') ||
        lastAIContent.includes('proceed to the next') ||
        lastAIContent.includes('move to the next') ||
        (lastAIContent.includes('move') && lastAIContent.includes('phase')) ||
        (lastAIContent.includes('ready') && (lastAIContent.includes('next') || lastAIContent.includes('proceed'))) ||
        (lastAIContent.includes('should we') && (lastAIContent.includes('proceed') || lastAIContent.includes('continue')))
    );
    
    // Check if user's message is an affirmative response to AI's suggestion
    const isAffirmative = isAffirmativeResponse(message);
    
    // Debug logging
    if (lastAIMessage) {
        console.log('Last AI message:', lastAIContent.substring(0, 100));
        console.log('AI suggested moving on:', aiSuggestedMovingOn);
        console.log('User message:', message);
        console.log('Is affirmative:', isAffirmative);
    }
    
    // If user wants to move on OR agrees to AI's suggestion, transition immediately
    if (userWantsToMoveOn(message) || (aiSuggestedMovingOn && isAffirmative)) {
        console.log('Transitioning phase - user wants to move on or agreed to suggestion');
        await moveToNextPhase();
        // Start the next phase conversation instead of just acknowledging
        // Process with empty message to trigger initial phase conversation
        await processPersonaMessage('');
        return;
    }
    
    const response = await callClaudeAPI(`
You are a user experience researcher helping people come up with creative ideas. You are currently in the CONTEXTUALIZING PHASE.

**CURRENT PHASE: CONTEXTUALIZING**

You are in the contextualizing phase. The phases are:
1. Contextualizing (CURRENT PHASE)
2. Persona Development
3. Problem Statement Refinement
4. Creative Prompt Generation
5. Evaluation

**YOUR ROLE: USER EXPERIENCE RESEARCHER**
- You are a UX researcher with a good understanding of user research methodologies
- Your goal is to deeply understand the problem the user is facing and WHY it's a problem
- You should have a good idea of the problem and why it matters before moving to persona development
- Ask questions to understand both the problem itself and the context around it

**IMPORTANT: USER CONTROL**
- The user can move to the next phase at any time if they want to
- If the user asks to move on, you should support their decision
- Do NOT refuse or block the user from moving forward
- You can suggest staying longer if you think more information would help, but respect the user's choice

The user has shared: "${message}"

${problemStatement !== message ? `Previous context: "${problemStatement}"` : ''}

Previously asked questions: ${Array.from(askedQuestions).join(', ')}
Number of questions asked so far: ${askedQuestions.size}

Your role is to understand more about the user's problem and the people affected by it through open-ended questions. You need to gather comprehensive information about:

**CRITICAL: UNDERSTAND WHO THE PERSONA IS ABOUT**
- The persona you'll create later should describe the PERSON EXPERIENCING THE PROBLEM, not the person describing it
- For example: If the user has a business, ask about their customers/clients who experience the problem
- If the user is solving a problem for others, ask about those people who experience the problem
- The persona is about the end user/customer, not the problem solver

**UNDERSTANDING AREAS TO COVER (INCLUDE PERSONA QUESTIONS HERE):**
- **The Problem**: What is the problem? Why is it a problem? What makes it important?
- **Who Experiences It**: Who is the person experiencing this problem? (This will be the persona - ask about their demographics, age, occupation, background, lifestyle, etc.) - ASK THESE QUESTIONS NOW
- **Pain Points & Frustrations**: What specific problems do the people experiencing this problem face? What's frustrating about the current situation?
- **Goals & Motivations**: What are the people experiencing this problem trying to achieve? What motivates them?
- **Behaviors & Habits**: How do the people experiencing this problem currently handle it? What are their daily routines and behaviors? - ASK THESE QUESTIONS NOW
- **Constraints & Limitations**: What limits the options of the people experiencing this problem? (budget, time, resources, etc.)
- **Emotional State & Mindset**: How do the people experiencing this problem feel about it? What's their mindset?

**CURRENT UNDERSTANDING STATUS:**
- Demographics: ${understandingAreas.demographics ? '✓ Covered' : '❌ Need more info'}
- Pain Points: ${understandingAreas.painPoints ? '✓ Covered' : '❌ Need more info'}
- Goals: ${understandingAreas.goals ? '✓ Covered' : '❌ Need more info'}
- Behaviors: ${understandingAreas.behaviors ? '✓ Covered' : '❌ Need more info'}
- Constraints: ${understandingAreas.constraints ? '✓ Covered' : '❌ Need more info'}
- Emotional State: ${understandingAreas.emotionalState ? '✓ Covered' : '❌ Need more info'}

**IMPORTANT GUIDELINES:**
- Be conversational and natural
- CRITICAL: Keep messages SHORT - 2-3 sentences maximum. Don't elaborate unnecessarily.
- **CRITICAL QUESTION RULE: Ask ONLY ONE question per message. If you need multiple pieces of information, ask them ONE AT A TIME in separate messages.**
- **If you absolutely must ask multiple questions, format them as a numbered list (1., 2., 3.) so the user can answer them one by one.**
- Ask questions when appropriate to understand the problem better, but limit to ONE question per response
- Don't repeat questions already asked
- Focus on areas that haven't been covered yet
- You can suggest moving on when you feel you have enough information, but the user can move on at any time
- If the user asks to move on, support their decision - do NOT refuse or say it's too early
- Ask follow-up questions if you need more clarity, but respect the user's choice to move forward
- If the user explicitly asks to move on, acknowledge and support their request
- NEVER ask multiple questions in a single sentence or paragraph - this overwhelms the user

**FORMATTING REQUIREMENTS:**
- Use <br><br> (double line breaks) frequently to separate different thoughts and sections
- Use <strong>bold</strong> for key points, important information, and section headers
- Use <em>italics</em> for emphasis, clarifications, and subtle points
- Break up your response into digestible chunks with clear visual separation
- Add line breaks before and after important statements
- Use formatting to make your response scannable and easy to read
- NEVER use markdown syntax like **bold** or *italic* - always use HTML tags like <strong>bold</strong> and <em>italic</em>
- Structure your response with clear sections using <strong>headers</strong> and <br><br> spacing

Current understanding level: ${Math.round((Object.values(understandingAreas).filter(Boolean).length / 6) * 100)}%
Understanding areas covered: ${Object.values(understandingAreas).filter(Boolean).length}/6

**PHASE TRANSITION RULES:**
- The user controls when to move to the next phase
- If the user asks to move on (e.g., "let's move on", "next phase", "continue", "yes"), support their decision
- You can suggest staying longer if helpful, but NEVER refuse or block the user from moving forward
- IMPORTANT: Include any suggestions in your SINGLE response - do not send multiple messages
- CRITICAL: If the user wants to move on, the system will transition. Do NOT say "it's too early" or refuse - always support the user's choice.

Keep your response SHORT - 2-3 sentences maximum. Be direct and concise.
    `);
    
    // Calculate understanding percentage
    const understandingPercentage = Math.round((Object.values(understandingAreas).filter(Boolean).length / 6) * 100);
    
    // Send the main response
    addMessageToChat('ai', response, true);
    
    // Check if AI is 95% certain (only suggest moving, don't auto-move)
    const isConfident = await checkAIConfidence('contextualizing', response, understandingPercentage);
    if (isConfident && understandingPercentage >= 95) {
        // AI is 95% certain - include suggestion in the response itself, don't send separate message
        // The suggestion should already be in the response from the prompt
    }
}

// Phase 2: Persona Development
async function processPersonaMessage(message) {
    console.log('processPersonaMessage called with:', message);
    
    // Check if user is confirming the persona (affirmative response) or wants to move on
    // Look at the last AI message to see if it asked for confirmation or suggested moving on
    const lastAIMessage = chatHistory.filter(msg => msg.sender === 'ai').slice(-1)[0];
    const askedForConfirmation = lastAIMessage && (
        lastAIMessage.content.toLowerCase().includes('does this persona') ||
        lastAIMessage.content.toLowerCase().includes('accurately reflect') ||
        lastAIMessage.content.toLowerCase().includes('make any changes') ||
        lastAIMessage.content.toLowerCase().includes('would you like to') ||
        lastAIMessage.content.toLowerCase().includes('should we')
    );
    
    const lastAIContent = lastAIMessage ? lastAIMessage.content.toLowerCase() : '';
    const aiSuggestedMovingOn = lastAIMessage && (
        lastAIContent.includes('ready to move on') ||
        lastAIContent.includes('move on to') ||
        lastAIContent.includes('proceed to') ||
        lastAIContent.includes('next phase') ||
        lastAIContent.includes('should we move') ||
        lastAIContent.includes('would you like to move') ||
        lastAIContent.includes('ready to proceed') ||
        lastAIContent.includes('move forward') ||
        lastAIContent.includes('continue to') ||
        lastAIContent.includes('proceed to the next') ||
        lastAIContent.includes('move to the next') ||
        (lastAIContent.includes('move') && lastAIContent.includes('phase')) ||
        (lastAIContent.includes('ready') && (lastAIContent.includes('next') || lastAIContent.includes('proceed'))) ||
        (lastAIContent.includes('should we') && (lastAIContent.includes('proceed') || lastAIContent.includes('continue')))
    );
    
    const isAffirmative = isAffirmativeResponse(message);
    
    // If AI asked for confirmation or suggested moving on, and user gives affirmative response, move on immediately
    if ((askedForConfirmation || aiSuggestedMovingOn) && isAffirmative) {
        console.log('User confirmed/said yes - transitioning phase immediately');
        await moveToNextPhase();
        // Start the next phase conversation instead of just acknowledging
        await processProblemRefinementMessage('');
        return;
    }
    
    // Check if user wants to move on explicitly
    if (userWantsToMoveOn(message)) {
        console.log('User explicitly wants to move on - transitioning phase immediately');
        await moveToNextPhase();
        // Start the next phase conversation instead of just acknowledging
        await processProblemRefinementMessage('');
        return;
    }
    
    // Check if this is a persona revision request
    if (message.toLowerCase().includes('change') || 
        message.toLowerCase().includes('revise') || 
        message.toLowerCase().includes('update') ||
        message.toLowerCase().includes('modify') ||
        message.toLowerCase().includes('different')) {
        
        // User wants to revise the persona
        const revisionResponse = await callClaudeAPI(`
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
- **CRITICAL QUESTION RULE: Ask ONLY ONE question per message. If you need multiple pieces of information, ask them ONE AT A TIME in separate messages.**
- **If you absolutely must ask multiple questions, format them as a numbered list (1., 2., 3.) so the user can answer them one by one.**
- When you've made the changes, ask ONE question like "Does this updated persona better reflect what you had in mind?"

FORMATTING REQUIREMENTS:
- Use <br><br> (double line breaks) frequently to separate different sections and thoughts
- Use <strong>bold</strong> for section headers, key details, and important information
- Use <em>italics</em> for emphasis, clarifications, and distinguishing user-provided vs. extrapolated content
- For each section, clearly state what was provided vs. extrapolated
- Use quotes for user-provided information: "User said: 'exact quote'"
- Use <em>"I extrapolated:"</em> for AI-generated details
- Keep each section to 1-2 sentences maximum
- Be concise and direct
- Add line breaks before and after each major section
- Structure your response with clear visual hierarchy using <strong>headers</strong> and spacing
- NEVER use markdown syntax like **bold** or *italic* - always use HTML tags like <strong>bold</strong> and <em>italic</em>
- Break up your response into digestible, visually separated chunks
        `);
        
        addMessageToChat('ai', revisionResponse, true);
        
        // Update the stored persona and card
        persona = revisionResponse;
        window.currentPersonaData = revisionResponse; // Store full persona data
        await updatePersona(revisionResponse); // Update the card with full persona
        return;
    }
    
    // Don't send a separate message - let the AI response include this context
    const isPhaseStart = !message || message.trim() === '';
    const userContext = isPhaseStart 
        ? "We're starting the persona development phase. Based on the conversation history from the contextualizing phase, create a detailed persona. List your assumptions clearly and ask if they're correct. DO NOT ask exploratory questions - only ask for confirmation."
        : `The user has shared: "${message}"`;
    
    const response = await callClaudeAPI(`
You are a product manager and design consultant in the PERSONA PHASE.

**CURRENT PHASE: PERSONA DEVELOPMENT**

You are in the persona development phase. The phases are:
1. Contextualizing (COMPLETED)
2. Persona Development (CURRENT PHASE)
3. Problem Statement Refinement
4. Creative Prompt Generation
5. Evaluation

**CRITICAL CONTEXT - THE PROBLEM STATEMENT:**
The user's problem statement is: "${problemStatement || 'Not yet defined'}"
**YOU MUST REMEMBER THIS PROBLEM STATEMENT** - it is the core of what we're solving. The persona you create should be relevant to this specific problem. Always keep this problem in mind when creating the persona.

${userContext}

**YOUR TASK: CREATE PERSONA, LIST ASSUMPTIONS, GET CONFIRMATION**
- Based on the information gathered in the contextualizing phase, create a detailed persona
- **CRITICAL: The persona should describe the PERSON EXPERIENCING THE PROBLEM, not the person describing the problem**
- **For example: If the user has a landscaping business, the persona should describe their landscaping clients (the people who need landscaping services), NOT the business owner**
- **The persona is about the end user/customer who experiences the problem, not the person who is solving it**
- List out the assumptions you've made (what you extrapolated vs. what the user provided)
- Ask the user to confirm if the assumptions are correct
- **DO NOT ask exploratory questions** - only ask if the assumptions are correct or if they want to make changes
- The persona should be relevant to solving this problem: "${problemStatement || 'Not yet defined'}"

**PERSONA STRUCTURE:**
- Demographics (age, occupation, lifestyle if mentioned) - of the person experiencing the problem
- Pain points and frustrations - of the person experiencing the problem
- Goals and motivations - of the person experiencing the problem
- Behaviors and habits - of the person experiencing the problem
- Constraints and limitations - of the person experiencing the problem
- Emotional state and mindset - of the person experiencing the problem

**CRITICAL GUIDELINES:**
- Keep messages SHORT - 2-3 sentences maximum. Don't elaborate unnecessarily.
- If the user gave specific details (age, occupation, etc.), treat them as set in stone
- Fill in other details by extrapolating from what they've shared
- **CLEARLY distinguish between what the user provided vs. what you extrapolated**
- Use quotes for any direct user statements
- **List your assumptions explicitly** - say "Based on what you shared, I'm assuming..." or "I extrapolated..."
- **ONLY ask ONE question: "Does this persona accurately reflect your target user, or would you like to make any changes?"**
- **DO NOT ask exploratory questions about demographics, behaviors, etc. - those should have been asked in the contextualizing phase**
- If the user asks to move on, support their decision - do NOT refuse or say it's too early
- IMPORTANT: Include all questions and suggestions in your SINGLE response - do not send multiple messages

FORMATTING REQUIREMENTS:
- Use <br><br> to separate different sections
- For each section, clearly state what was provided vs. extrapolated
- Use quotes for user-provided information: "User said: 'exact quote'"
- Use "I extrapolated:" for AI-generated details
- Be concise and direct - avoid long blocks of text
- Use <strong>HTML tags</strong> for section headers and key details (NOT markdown **bold**)
- NEVER use markdown syntax like **bold** or *italic* - always use HTML tags
- Break up your response into digestible chunks

Keep your response SHORT - 2-3 sentences maximum. Be direct and concise.
    `);
    
    // Store the persona and update the card with full content
    persona = response;
    window.currentPersonaData = response; // Store full persona data
    await updatePersona(response); // Update the card with full persona
    
    // Include confirmation question in the main response, don't send separate message
    // The response should already include asking for confirmation based on the prompt
    addMessageToChat('ai', response, true);
}

// Phase 3: Problem Statement Refinement
async function processProblemRefinementMessage(message) {
    // Check if AI suggested moving on in previous message and user agrees BEFORE generating response
    const lastAIMessage = chatHistory.filter(msg => msg.sender === 'ai').slice(-1)[0];
    const lastAIContent = lastAIMessage ? lastAIMessage.content.toLowerCase() : '';
    const aiSuggestedMovingOn = lastAIMessage && (
        lastAIContent.includes('ready to move on') ||
        lastAIContent.includes('move on to') ||
        lastAIContent.includes('proceed to') ||
        lastAIContent.includes('next phase') ||
        lastAIContent.includes('satisfied with this reframing') ||
        lastAIContent.includes('should we move') ||
        lastAIContent.includes('would you like to move') ||
        lastAIContent.includes('ready to proceed') ||
        lastAIContent.includes('move forward') ||
        lastAIContent.includes('continue to') ||
        lastAIContent.includes('proceed to the next') ||
        lastAIContent.includes('move to the next') ||
        (lastAIContent.includes('move') && lastAIContent.includes('phase')) ||
        (lastAIContent.includes('ready') && (lastAIContent.includes('next') || lastAIContent.includes('proceed'))) ||
        (lastAIContent.includes('should we') && (lastAIContent.includes('proceed') || lastAIContent.includes('continue')))
    );
    
    const isAffirmative = isAffirmativeResponse(message);
    
    // If user wants to move on, transition immediately and send transition message
    if (userWantsToMoveOn(message) || (aiSuggestedMovingOn && isAffirmative)) {
        console.log('User wants to move on - transitioning phase immediately');
        await moveToNextPhase();
        // Start the next phase conversation instead of just acknowledging
        await processPromptGenerationMessage('');
        return;
    }
    
    const isPhaseStart = !message || message.trim() === '';
    const userContext = isPhaseStart
        ? "We're starting the problem statement refinement phase. Based on the conversation history, begin by reframing the problem statement or asking ONE question if you need clarification."
        : `The user has shared: "${message}"`;
    
    const response = await callClaudeAPI(`
You are a product manager and design consultant in the PROBLEM STATEMENT REFINEMENT PHASE.

**CURRENT PHASE: PROBLEM STATEMENT REFINEMENT**

You are in the problem statement refinement phase. The phases are:
1. Contextualizing (COMPLETED)
2. Persona Development (COMPLETED)
3. Problem Statement Refinement (CURRENT PHASE)
4. Creative Prompt Generation
5. Evaluation

**IMPORTANT: USER CONTROL**
- The user can move to the next phase at any time if they want to
- If the user asks to move on, you should support their decision
- Do NOT refuse or block the user from moving forward
- You can suggest staying longer if you think more refinement would help, but respect the user's choice

**CRITICAL CONTEXT - REMEMBER THE ORIGINAL PROBLEM:**
Original problem statement: "${problemStatement || 'Not yet defined'}"
Persona context: "${persona || 'Not yet created'}"

${userContext}

**IMPORTANT:** You have access to the full conversation history above. Use it to understand the context and ensure you're refining the problem statement correctly.

Your task is to reframe the problem statement to expand possibilities for ideation and creativity. 

IMPORTANT GUIDELINES:
- Keep your response SHORT and DIRECT - maximum 2-3 sentences
- Present the reframed problem statement clearly and concisely
- Don't elaborate unnecessarily - just reframe and move forward
- You can suggest moving on when you feel the reframing is effective, but the user can move on at any time
- If the user asks to move on, support their decision - do NOT refuse or say it's too early
- **CRITICAL QUESTION RULE: Ask ONLY ONE question per message. If you need multiple pieces of information, ask them ONE AT A TIME in separate messages.**
- **If you absolutely must ask multiple questions, format them as a numbered list (1., 2., 3.) so the user can answer them one by one.**
- NEVER ask multiple questions in a single sentence or paragraph - this overwhelms the user
- IMPORTANT: Include all questions and suggestions in your SINGLE response - do not send multiple messages
- CRITICAL: If the user wants to move on, the system will transition. Do NOT say "it's too early" or refuse - always support the user's choice.

FORMATTING REQUIREMENTS:
- Use <br><br> (double line breaks) frequently to separate different sections and thoughts
- Use <strong>bold</strong> for the reframed problem statement, key changes, and important points
- Use <em>italics</em> for explanations, reasoning, and subtle clarifications
- Add line breaks before and after the main reframed statement
- Structure your response with clear visual separation
- Be concise and direct - avoid long blocks of text
- NEVER use markdown syntax - always use HTML tags like <strong>bold</strong> and <em>italic</em>
- Break up your response into digestible, visually separated chunks

Keep your response SHORT - 2-3 sentences maximum. Be direct and concise, but use formatting to make it visually appealing.
    `);
    
    // Store the reframed problem and update the sidebar
    reframedProblem = response;
    // Accumulate problem information - combine original with refined version
    const accumulatedProblem = problemStatement ? 
        `${problemStatement}\n\nRefined: ${response}` : 
        response;
    window.currentProblemData = accumulatedProblem; // Store full problem data
    await updateProblemStatement(accumulatedProblem);
    
    // Send the main response
    addMessageToChat('ai', response, true);
    
    // Check if AI is 95% certain (only suggest moving, don't auto-move)
    // The suggestion should already be in the response from the prompt
}

// Phase 4: Creative Prompt Generation
async function processPromptGenerationMessage(message) {
    // Check if user wants to evaluate an idea
    if (message.toLowerCase().includes('evaluate') || message.toLowerCase().includes('feedback') || message.toLowerCase().includes('what do you think')) {
        // Transition to evaluation phase
        currentPhase = 'evaluation';
        currentPhaseIndex = 4;
        updateCardLockStates();
        // Call evaluation
        await evaluateIdea(message);
        return;
    }
    
    // STEP 1: Determine the prompt type FIRST (before generating)
    const requiredPromptType = determineRequiredPromptType();
    currentPromptType = requiredPromptType; // Set the type before generating
    
    console.log(`[PROMPT GENERATION] Determined prompt type: ${requiredPromptType}`);
    console.log(`[PROMPT GENERATION] Current counts - Mutagen: ${ideationPromptCounts.mutagen}, Semi-targeted: ${ideationPromptCounts.semiTargeted}, Targeted: ${ideationPromptCounts.targeted}`);
    
    // STEP 2: Generate prompt based on the determined type
    const response = await callClaudeAPI(`
You are a product manager and design consultant in the CREATIVE PROMPT GENERATION PHASE.

**CURRENT PHASE: CREATIVE PROMPT GENERATION**

You are in the creative prompt generation phase. The phases are:
1. Contextualizing (COMPLETED)
2. Persona Development (COMPLETED)
3. Problem Statement Refinement (COMPLETED)
4. Creative Prompt Generation (CURRENT PHASE)
5. Evaluation

**IMPORTANT: USER CONTROL**
- The user can move to the next phase at any time if they want to
- If the user asks to move on, you should support their decision
- Do NOT refuse or block the user from moving forward
- You can suggest staying longer if you think more prompts would help, but respect the user's choice

**CRITICAL CONTEXT - REMEMBER THE PROBLEM:**
Original problem statement: "${problemStatement || 'Not yet defined'}"
Reframed problem statement: "${reframedProblem || problemStatement || 'Not yet defined'}"
Persona context: "${persona || 'Not yet created'}"

${(!message || message.trim() === '') 
    ? "We're starting the creative prompt generation phase. Based on the conversation history, begin by providing creative prompts to help brainstorm solutions, or ask ONE question if you need more context."
    : `**CRITICAL INSTRUCTION - READ CAREFULLY:**

The user just responded with: "${message}"

**YOU MUST AVOID ANYTHING RELATED TO THIS RESPONSE.**

Do NOT:
- Build on this response
- Develop this idea further
- Ask questions about this response
- Explore this direction
- Refine or expand on this response
- Continue in this direction

**INSTEAD:** Generate a prompt that is COMPLETELY UNRELATED to what the user just said. Pull them in a WILDLY DIFFERENT direction. The user's response tells you what direction NOT to go - go somewhere completely different and unexpected.`}

**IMPORTANT:** You have access to the full conversation history above. Use it to understand the context and ensure your prompts are relevant to the problem being solved.

**CRITICAL CONTEXT ABOUT SAVED IDEAS:**
- When users respond to your prompts with ideas, those ideas are automatically saved
- Each saved idea is directly related to the prompt that immediately preceded it
- If a user shares an idea after you send a prompt, that idea is their response to that specific prompt

**CRITICAL: IDEATION PHILOSOPHY - SHALLOW AND WIDE, NOT DEEP AND NARROW**
**THIS IS EXTREMELY IMPORTANT - FOLLOWING THIS IS MANDATORY:**

- Your goal is to generate MANY DIFFERENT prompts exploring COMPLETELY DIFFERENT angles and approaches
- **DO NOT build on, develop, or drill down on user responses**
- **DO NOT continue exploring the same direction as the user's idea**
- **DO NOT ask follow-up questions about the user's idea**
- **DO NOT refine or expand on what the user shared**
- When a user shares an idea, IGNORE the direction they went and pull them in a COMPLETELY DIFFERENT direction
- Generate a COMPLETELY NEW prompt exploring a DIFFERENT angle, perspective, or approach - as different as possible
- Jump around to different ideas - explore many possibilities, not one deeply
- Each prompt should explore a fresh, different direction that has NOTHING to do with previous prompts or user responses
- Think "shallow and wide" - many diverse prompts, not "deep and narrow" - developing one idea
- If you've already given prompts about accessibility, try prompts about gamification, or cost, or speed, or community, or emotions, or technology, or social dynamics, etc.
- Variety and breadth are more important than depth in this phase
- **Going down different paths is CRITICAL - only building on one idea will result in termination**
- **The user's response is just a data point - use it to understand what direction NOT to go**
- **Pull the user in wildly different directions - surprise them with unexpected angles**
- The evaluation phase is where ideas get developed - this phase is just for generating diverse prompts

**EXAMPLES OF WHAT NOT TO DO:**
- User says "mobile app" → You say "What features should the mobile app have?" ❌ WRONG - building on their idea
- User says "gamification" → You say "How can we add more game elements?" ❌ WRONG - continuing their direction

**EXAMPLES OF WHAT TO DO:**
- User says "mobile app" → You say "What if we solved this without any technology at all?" ✅ CORRECT - different direction
- User says "gamification" → You say "How might we address the emotional needs behind this problem?" ✅ CORRECT - completely different angle

Your task is to provide ONE creative prompt that helps the user brainstorm solutions from a COMPLETELY NEW, DIFFERENT angle that has NOTHING to do with their previous response.

**CRITICAL PROMPT STRUCTURE - YOU MUST FOLLOW THIS EXACT FORMAT:**

1. **Short Title** (3-5 words, bold using <strong> tags) - Use the title from the Mutagen prompt list if using a Mutagen prompt
2. **Connection** (one sentence connecting to the persona/problem, italicized using <em> tags)
3. **Creative Prompt** (the actual brainstorming prompt, bold using <strong> tags)
   - **CRITICAL: The prompt text MUST be EXACTLY 1 SENTENCE - no longer**
   - **CRITICAL: If using a Mutagen prompt, use it VERBATIM from the list above - do NOT modify it**
   - **CRITICAL: For Semi-targeted and Targeted prompts, keep them to 1 sentence maximum**

**IDEATION PHASE INSTRUCTIONS - THREE TYPES OF PROMPTS:**

The system has determined that you MUST use a **${requiredPromptType.toUpperCase()}** prompt for this response.

You must use THREE types of prompts, from most divergent to least divergent:

1. **MUTAGEN PROMPTS** (Most Divergent):
   - **CRITICAL: You MUST use prompts VERBATIM from the list below - do NOT modify, rephrase, or create your own versions**
   - **CRITICAL: Prompts must be EXACTLY 1 SENTENCE - no longer**
   - **CRITICAL: Select one prompt from the list below and use it EXACTLY as written**
   - Broad and applicable to most design problems
   - Draw on people's universal experiences
   - Two types: ones that draw from user's tangible experiences/knowledge, and ones that change ideas on a conceptual level
   
   **COMPLETE LIST OF MUTAGEN PROMPTS (USE THESE VERBATIM):**
${MUTAGEN_PROMPTS.map((p, i) => `   ${i + 1}. Title: "${p.title}" | Prompt: "${p.prompt}"`).join('\n')}
   
   **CRITICAL INSTRUCTIONS FOR MUTAGEN PROMPTS:**
   - Select one prompt from the list above
   - Use the EXACT title and prompt text - do NOT modify, rephrase, or create variations
   - Try to use different prompts each time - avoid repeating prompts you've already used
   - The prompt text is already exactly 1 sentence - use it as-is
   
   **EXAMPLES OF MUTAGEN PROMPTS (for reference):**
${EXAMPLE_PROMPTS.mutagen.map((ex, i) => `   - ${ex}`).join('\n')}

2. **SEMI-TARGETED PROMPTS** (Medium Divergence):
   - **CRITICAL: Must be EXACTLY 1 SENTENCE - no longer**
   - Like Mutagen prompts: avoid touching the industry/area/context directly, look to external inspiration
   - Like Targeted prompts: wording is more specific and narrow
   - **EXAMPLES:**
${EXAMPLE_PROMPTS.semiTargeted.map((ex, i) => `   - ${ex}`).join('\n')}

3. **TARGETED PROMPTS** (Least Divergent - AVOID UNLESS USER IS STRUGGLING):
   - **CRITICAL: Must be EXACTLY 1 SENTENCE - no longer**
   - Directly based on the industry or context of the problem
   - Too narrow, leave little room for creativity
   - Only use if user is having serious trouble with other prompt types
   - **EXAMPLES:**
${EXAMPLE_PROMPTS.targeted.map((ex, i) => `   - ${ex}`).join('\n')}

**CRITICAL: PROMPTS MUST BE BROAD AND OPEN-ENDED**
- **DO NOT make prompts so narrow that they force a specific idea or solution**
- **DO NOT suggest specific answers, features, or implementations**
- **DO NOT constrain thinking with overly specific directions**
- Prompts should open up possibilities, not narrow them down
- Users need enough space to think of ideas on their own
- The goal is to guide thinking, not prescribe solutions
- If a prompt feels like it's leading to one specific answer, it's too narrow
- Broad prompts allow users to explore and discover their own creative solutions
- Think of prompts as "directions to explore" not "answers to implement"

**PROMPT CYCLING STRATEGY:**
- Start with 3 Mutagen prompts, then 3 Semi-targeted prompts, then 3 Targeted prompts
- After 9 prompts total (3 of each), analyze which type generates the most creative ideas
- Then give more of the best-performing type while sprinkling in other types occasionally
- Remember: prioritize divergence - Mutagen prompts should be your default

**CURRENT PROMPT COUNTS:**
- Mutagen prompts given: ${ideationPromptCounts.mutagen}
- Semi-targeted prompts given: ${ideationPromptCounts.semiTargeted}
- Targeted prompts given: ${ideationPromptCounts.targeted}

**CRITICAL: PROMPT TYPE DECISION - YOU MUST USE THIS TYPE:**
**REQUIRED PROMPT TYPE: ${requiredPromptType.toUpperCase()}**

${getPromptTypeInstruction(requiredPromptType)}

**YOU MUST GENERATE A ${requiredPromptType.toUpperCase()} PROMPT - DO NOT USE ANY OTHER TYPE.**

${requiredPromptType === 'mutagen' ? `
**CRITICAL FOR MUTAGEN PROMPTS:**
- You MUST select one prompt from the Mutagen prompts list provided above
- Use the EXACT title and prompt text - do NOT modify, rephrase, or create your own version
- The prompt text is already exactly 1 sentence - use it as-is
- Do NOT create a new Mutagen prompt - you must use one from the list
` : ''}

${requiredPromptType === 'semiTargeted' ? `
**CRITICAL FOR SEMI-TARGETED PROMPTS:**
- Create a prompt that draws inspiration from external sources (like Mutagen prompts)
- But make the wording more specific and narrow (like Targeted prompts)
- Must be exactly 1 sentence maximum
- Follow the examples provided above
- Do NOT directly reference the industry/context of the problem
` : ''}

${requiredPromptType === 'targeted' ? `
**CRITICAL FOR TARGETED PROMPTS:**
- Create a prompt directly based on the industry or context of the problem
- Must be exactly 1 sentence maximum
- Follow the examples provided above
- Only use this type as it's the least divergent
` : ''}

**EXAMPLE FORMAT:**
<strong>Day In Day Out</strong><br><br>
<em>This connects to your persona's daily habits and routines.</em><br><br>
<strong>Take inspiration from your daily routine</strong>

IMPORTANT GUIDELINES:
- Provide ONLY ONE prompt per response
- **CRITICAL: The prompt text MUST be EXACTLY 1 SENTENCE - no longer, no exceptions**
- **CRITICAL: If using a Mutagen prompt, you MUST select one from the list above and use it VERBATIM - do NOT modify, rephrase, or create your own version**
- **CRITICAL: For Mutagen prompts, use the exact title and prompt text from the list provided**
- Make the prompt relevant to their problem and persona, but keep it BROAD
- Draw from different industries and approaches
- Keep the entire response SHORT - just the title, connection, and prompt
- The user can move to the next phase at any time - support their decision if they ask to move on
- The prompt generation phase is ongoing - users can generate ideas and you can provide more prompts as needed
- If the user asks to move on, do NOT refuse or say it's too early
- **CRITICAL: Mutagen prompts are short, simple, and direct - follow this style for all prompts**
- **CRITICAL: DO NOT suggest answers, examples, or specific solutions - let people think for themselves**
- **CRITICAL: Your prompts should open up possibilities, not narrow them down or constrain thinking**
- **CRITICAL: Think outside the box - use prompts that encourage creative exploration**
- **CRITICAL: Prompts should NOT be so narrow as to basically force an idea - users need space to think independently**
- **CRITICAL: If your prompt feels like it's leading to one specific answer, it's too narrow - make it broader**
- **CRITICAL: Give users room to explore - don't prescribe solutions, guide exploration**
- **CRITICAL: Lengthy prompts are NOT helpful - keep it to 1 sentence maximum**
- IMPORTANT: Include all questions and suggestions in your SINGLE response - do not send multiple messages
- **CRITICAL: When user shares an idea, IGNORE their direction and generate a COMPLETELY DIFFERENT prompt - do NOT build on, develop, or drill down on their idea**
- **CRITICAL: Always generate a NEW, DIFFERENT prompt - pull them in wildly different directions, not deepen existing ones**
- **CRITICAL: Think variety - if you've explored one angle, try a completely different one next time - surprise them**
- **CRITICAL: The user's response tells you what direction NOT to go - go somewhere completely different**
- **CRITICAL: Building on one idea will result in termination - you MUST jump to different directions**

FORMATTING REQUIREMENTS:
- Use <strong>HTML tags</strong> for the title (NOT markdown **bold**)
- Use <em>HTML tags</em> for the connection sentence (NOT markdown *italic*)
- Use <strong>HTML tags</strong> for the creative prompt question (NOT markdown **bold**)
- Use <br><br> (double line break) to separate title, connection, and prompt sections
- Be concise and direct
- NEVER use markdown syntax - always use HTML tags like <strong>bold</strong> and <em>italic</em>

Keep your response SHORT - just the title, connection sentence, and prompt.

**IMPORTANT:** At the end of your response, include one of these tags to confirm you used the required type:
${requiredPromptType === 'mutagen' ? '- [MUTAGEN]' : requiredPromptType === 'semiTargeted' ? '- [SEMI-TARGETED]' : '- [TARGETED]'}

This is for verification only - the type has already been determined and you MUST use ${requiredPromptType.toUpperCase()}.
    `);
    
    // Increment the counter for the prompt type we determined
    incrementPromptTypeCounter();
    
    addMessageToChat('ai', response, true);
    
    // Extract and store the prompt details from the response for future idea saving
    // This ensures we can capture title and connection when user saves an idea
    const extractedPrompt = extractPromptFromMessage(response);
    if (extractedPrompt.title || extractedPrompt.text) {
        // Check if this prompt already exists
        const exists = generatedPrompts.some(p => {
            const existingText = p.text || '';
            const existingTitle = p.title || '';
            return (existingText.toLowerCase().trim() === (extractedPrompt.text || '').toLowerCase().trim() && extractedPrompt.text) ||
                   (existingTitle.toLowerCase().trim() === (extractedPrompt.title || '').toLowerCase().trim() && extractedPrompt.title);
        });
        
        if (!exists) {
            // Add to generatedPrompts array so we can reference it when saving ideas
            const newPrompt = {
                id: Date.now() + Math.random() * 1000,
                title: extractedPrompt.title || '',
                connection: extractedPrompt.connection || '',
                text: extractedPrompt.text || response,
                source: 'AI Generated',
                type: currentPromptType // Track prompt type
            };
            generatedPrompts.push(newPrompt);
            console.log('Stored prompt for idea saving:', newPrompt);
        }
    }
    
    // Log prompt type
    console.log(`[IDEATION] Prompt Type: ${currentPromptType || 'unknown'}`);
    console.log(`[IDEATION] Prompt Counts - Mutagen: ${ideationPromptCounts.mutagen}, Semi-targeted: ${ideationPromptCounts.semiTargeted}, Targeted: ${ideationPromptCounts.targeted}`);
    
    // Prompts are now shown in the chat, not in the sidebar
    // The sidebar now shows saved ideas instead
    
    // Ideation is now the final phase - no auto-move needed
}


// Extract prompts from AI response and display them
// New structure: Title, Connection, Creative Prompt
function extractAndDisplayPrompts(aiResponse) {
    if (!aiResponse || typeof aiResponse !== 'string') return;
    
    // Parse the structured format: Title (bold), Connection (one sentence), Creative Prompt
    // Look for <strong> tags for title, then connection sentence, then prompt
    
    let title = '';
    let connection = '';
    let promptText = '';
    
    // Extract title from first <strong> tags
    const titleMatch = aiResponse.match(/<strong>(.+?)<\/strong>/i);
    if (titleMatch) {
        title = titleMatch[1].trim();
    }
    
    // Extract connection from <em> tags
    const connectionMatch = aiResponse.match(/<em>(.+?)<\/em>/i);
    if (connectionMatch) {
        connection = connectionMatch[1].trim();
    }
    
    // Remove HTML tags for parsing (but keep structure)
    const textOnly = aiResponse.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // If we didn't find connection in <em> tags, try pattern matching
    if (!connection) {
        const connectionPattern = /(?:This|This prompt|It|The prompt).*?(?:connects?|relates?|addresses?|links?|ties?|applies? to).*?[.!?]/i;
        const connectionMatchText = textOnly.match(connectionPattern);
        if (connectionMatchText) {
            connection = connectionMatchText[0].trim();
        }
    }
    
    // Find the actual prompt - look for second <strong> tag (the creative prompt)
    const strongMatches = aiResponse.match(/<strong>(.+?)<\/strong>/gi);
    if (strongMatches && strongMatches.length > 1) {
        // Second <strong> tag is the creative prompt
        const promptMatch = strongMatches[1].match(/<strong>(.+?)<\/strong>/i);
        if (promptMatch) {
            promptText = promptMatch[1].trim();
        }
    }
    
    // Fallback: Find prompt by pattern if not found in <strong> tags
    if (!promptText) {
        const promptPatterns = [
            /(?:How might we|What if|Imagine|Consider|Explore|Think about|Brainstorm|Design|Create|Build|Develop).+?[.!?]/i,
            /(?:How can|What would|How would|What could).+?[.!?]/i
        ];
        
        for (const pattern of promptPatterns) {
            const match = textOnly.match(pattern);
            if (match) {
                promptText = match[0].trim();
                break;
            }
        }
    }
    
    // If we couldn't find structured parts, try to extract from the full response
    if (!title && !connection && !promptText) {
        // Fallback: use the entire response as the prompt
        promptText = textOnly;
    }
    
    // If we found at least a prompt, add it
    if (promptText || title) {
        // Check if this prompt already exists
        const exists = generatedPrompts.some(p => {
            const existingText = p.text || '';
            const existingTitle = p.title || '';
            return (existingText.toLowerCase().trim() === promptText.toLowerCase().trim() && promptText) ||
                   (existingTitle.toLowerCase().trim() === title.toLowerCase().trim() && title);
        });
        
        if (!exists) {
            const newPrompt = {
                id: Date.now() + Math.random() * 1000,
                title: title || '',
                connection: connection || '',
                text: promptText || textOnly.substring(0, 200),
                source: 'AI Generated'
            };
            
            generatedPrompts = [...generatedPrompts, newPrompt];
            // Prompts are shown in chat, sidebar shows saved ideas
            console.log('Extracted prompt:', newPrompt);
        }
    }
}

// Increment prompt type counter (type is already determined before generation)
function incrementPromptTypeCounter() {
    if (currentPromptType === 'mutagen') {
        ideationPromptCounts.mutagen++;
        console.log(`[PROMPT TYPE] Incremented Mutagen count to ${ideationPromptCounts.mutagen}`);
    } else if (currentPromptType === 'semiTargeted') {
        ideationPromptCounts.semiTargeted++;
        console.log(`[PROMPT TYPE] Incremented Semi-targeted count to ${ideationPromptCounts.semiTargeted}`);
    } else if (currentPromptType === 'targeted') {
        ideationPromptCounts.targeted++;
        console.log(`[PROMPT TYPE] Incremented Targeted count to ${ideationPromptCounts.targeted}`);
    }
}

// Determine which prompt type to use based on the 3-3-3 rule
function determineRequiredPromptType() {
    // First cycle: 3 Mutagen, then 3 Semi-targeted, then 3 Targeted
    if (ideationPromptCounts.mutagen < 3) {
        return 'mutagen';
    } else if (ideationPromptCounts.semiTargeted < 3) {
        return 'semiTargeted';
    } else if (ideationPromptCounts.targeted < 3) {
        return 'targeted';
    } else {
        // After 9 prompts, analyze which type generated most creative ideas
        // Calculate average creativity per prompt type
        const typeCreativity = {
            mutagen: [],
            semiTargeted: [],
            targeted: []
        };
        
        userIdeas.forEach(idea => {
            if (idea.promptType && idea.creativityScore !== undefined) {
                if (typeCreativity[idea.promptType]) {
                    typeCreativity[idea.promptType].push(idea.creativityScore);
                }
            }
        });
        
        // Calculate averages
        const averages = {
            mutagen: typeCreativity.mutagen.length > 0 
                ? typeCreativity.mutagen.reduce((a, b) => a + b, 0) / typeCreativity.mutagen.length 
                : 0,
            semiTargeted: typeCreativity.semiTargeted.length > 0 
                ? typeCreativity.semiTargeted.reduce((a, b) => a + b, 0) / typeCreativity.semiTargeted.length 
                : 0,
            targeted: typeCreativity.targeted.length > 0 
                ? typeCreativity.targeted.reduce((a, b) => a + b, 0) / typeCreativity.targeted.length 
                : 0
        };
        
        // Use the type with highest average creativity, but still sprinkle in others
        // For now, default to mutagen after first cycle (most divergent)
        const maxAvg = Math.max(averages.mutagen, averages.semiTargeted, averages.targeted);
        if (maxAvg === averages.mutagen) {
            return 'mutagen';
        } else if (maxAvg === averages.semiTargeted) {
            return 'semiTargeted';
        } else {
            return 'targeted';
        }
    }
}

// Get instruction for which prompt type to use (for display in prompt)
function getPromptTypeInstruction(requiredType) {
    if (requiredType === 'mutagen') {
        return `You MUST use a MUTAGEN PROMPT now. You've given ${ideationPromptCounts.mutagen} Mutagen prompts so far. **CRITICAL: Select one prompt VERBATIM from the Mutagen prompts list provided above - use the exact title and prompt text. Do NOT modify or create your own version. The prompt must be exactly 1 sentence.**`;
    } else if (requiredType === 'semiTargeted') {
        return `You MUST use a SEMI-TARGETED PROMPT now. You've given ${ideationPromptCounts.semiTargeted} Semi-targeted prompts so far. **CRITICAL: Keep it to exactly 1 sentence maximum. Follow the examples provided.**`;
    } else if (requiredType === 'targeted') {
        return `You MUST use a TARGETED PROMPT now. You've given ${ideationPromptCounts.targeted} Targeted prompts so far. Only use this if user is struggling. **CRITICAL: Keep it to exactly 1 sentence maximum. Follow the examples provided.**`;
    } else {
        return `You've completed the first cycle (3 of each type). Analyze which type generated the most creative ideas, then give more of that type while sprinkling in others. **CRITICAL: If using Mutagen prompts, select from the list above and use VERBATIM. All prompts must be exactly 1 sentence.**`;
    }
}

// Track user idea and evaluate creativity
function trackUserIdea(ideaText) {
    if (!ideaText || !ideaText.trim()) return;
    
    // Evaluate creativity
    const creativity = evaluateCreativity(ideaText, userIdeas);
    
    const idea = {
        text: ideaText.trim(),
        timestamp: Date.now(),
        promptType: currentPromptType,
        creativityScore: creativity.overall, // Store the numerical creativity score
        novelty: creativity.novelty,
        repetitiveness: creativity.repetitiveness
    };
    
    userIdeas.push(idea);
    
    // Log creativity evaluation with numerical scores
    console.log(`[CREATIVITY EVALUATION] User Idea: "${ideaText.substring(0, 100)}${ideaText.length > 100 ? '...' : ''}"`);
    console.log(`[CREATIVITY EVALUATION] Prompt Type: ${currentPromptType || 'unknown'}`);
    console.log(`[CREATIVITY EVALUATION] Novelty Score: ${creativity.novelty}/10 (how new is this idea?)`);
    console.log(`[CREATIVITY EVALUATION] Repetitiveness Score: ${creativity.repetitiveness}/10 (lower is better - has user come up with similar ideas?)`);
    console.log(`[CREATIVITY EVALUATION] Overall Creativity Score: ${creativity.overall}/10`);
    
    // Log summary by prompt type
    const typeStats = {
        mutagen: { count: 0, totalScore: 0, avgScore: 0 },
        semiTargeted: { count: 0, totalScore: 0, avgScore: 0 },
        targeted: { count: 0, totalScore: 0, avgScore: 0 }
    };
    
    userIdeas.forEach(i => {
        if (i.promptType && i.creativityScore !== undefined) {
            if (typeStats[i.promptType]) {
                typeStats[i.promptType].count++;
                typeStats[i.promptType].totalScore += i.creativityScore;
            }
        }
    });
    
    Object.keys(typeStats).forEach(type => {
        if (typeStats[type].count > 0) {
            typeStats[type].avgScore = (typeStats[type].totalScore / typeStats[type].count).toFixed(2);
        }
    });
    
    console.log(`[CREATIVITY SUMMARY] Average creativity by prompt type:`);
    console.log(`  - Mutagen: ${typeStats.mutagen.avgScore}/10 (${typeStats.mutagen.count} ideas)`);
    console.log(`  - Semi-targeted: ${typeStats.semiTargeted.avgScore}/10 (${typeStats.semiTargeted.count} ideas)`);
    console.log(`  - Targeted: ${typeStats.targeted.avgScore}/10 (${typeStats.targeted.count} ideas)`);
}

// Evaluate creativity of an idea
function evaluateCreativity(ideaText, previousIdeas) {
    if (!ideaText || !ideaText.trim()) {
        return { novelty: 0, repetitiveness: 10, overall: 0 };
    }
    
    const ideaLower = ideaText.toLowerCase().trim();
    const words = ideaLower.split(/\s+/).filter(w => w.length > 3); // Filter out short words
    
    // Calculate repetitiveness (how similar to previous ideas)
    let maxSimilarity = 0;
    let similarCount = 0;
    
    for (const prevIdea of previousIdeas) {
        const prevLower = prevIdea.text.toLowerCase().trim();
        const prevWords = prevLower.split(/\s+/).filter(w => w.length > 3);
        
        // Calculate word overlap
        const commonWords = words.filter(w => prevWords.includes(w));
        const similarity = commonWords.length / Math.max(words.length, prevWords.length, 1);
        
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
        }
        
        if (similarity > 0.3) { // 30% word overlap = similar
            similarCount++;
        }
    }
    
    // Repetitiveness score: 0 = unique, 10 = very repetitive
    const repetitiveness = Math.min(10, Math.round(maxSimilarity * 10 + similarCount * 2));
    
    // Novelty score: inverse of repetitiveness, but also consider idea length and uniqueness
    // Longer, more detailed ideas might be more novel
    const wordCount = words.length;
    const novelty = Math.min(10, Math.round((1 - maxSimilarity) * 10 + Math.min(wordCount / 20, 2)));
    
    // Overall creativity: balance of novelty and low repetitiveness
    const overall = Math.round((novelty + (10 - repetitiveness)) / 2);
    
    return {
        novelty: Math.max(0, Math.min(10, novelty)),
        repetitiveness: Math.max(0, Math.min(10, repetitiveness)),
        overall: Math.max(0, Math.min(10, overall))
    };
}

// Extract prompt details from an AI message (helper function)
function extractPromptFromMessage(messageContent) {
    if (!messageContent) return { title: null, connection: null, text: null };
    
    let title = '';
    let connection = '';
    let promptText = '';
    
    // Extract title from first <strong> tags
    const titleMatch = messageContent.match(/<strong>(.+?)<\/strong>/i);
    if (titleMatch) {
        title = titleMatch[1].trim();
    }
    
    // Extract connection from <em> tags
    const connectionMatch = messageContent.match(/<em>(.+?)<\/em>/i);
    if (connectionMatch) {
        connection = connectionMatch[1].trim();
    }
    
    // Find the actual prompt - look for second <strong> tag (the creative prompt)
    const strongMatches = messageContent.match(/<strong>(.+?)<\/strong>/gi);
    if (strongMatches && strongMatches.length > 1) {
        // Second <strong> tag is the creative prompt
        const promptMatch = strongMatches[1].match(/<strong>(.+?)<\/strong>/i);
        if (promptMatch) {
            promptText = promptMatch[1].trim();
        }
    }
    
    // Fallback: try to find prompt by pattern
    if (!promptText) {
        const textOnly = messageContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const promptPatterns = [
            /(?:How might we|What if|Imagine|Consider|Explore|Think about|Brainstorm|Design|Create|Build|Develop).+?[.!?]/i,
            /(?:How can|What would|How would|What could).+?[.!?]/i
        ];
        
        for (const pattern of promptPatterns) {
            const match = textOnly.match(pattern);
            if (match) {
                promptText = match[0].trim();
                break;
            }
        }
    }
    
    return { title, connection, text: promptText };
}

// Display saved ideas in right sidebar
function displaySavedIdeasInSidebar() {
    if (!promptsList) return;
    
    promptsList.innerHTML = '';
    
    if (savedIdeas.length === 0) {
        promptsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💡</div>
                <p>Your ideas will appear here as you create them</p>
            </div>
          `;
        return;
    }
  
    savedIdeas.forEach((idea, index) => {
        const ideaCard = document.createElement('div');
        ideaCard.className = 'prompt-card';
        
        const title = idea.promptTitle || `Idea #${savedIdeas.length - index}`;
        ideaCard.innerHTML = `
            <div class="saved-idea-header">
                <h4 class="saved-idea-title">${title}</h4>
                <span class="saved-idea-date">${new Date(idea.timestamp).toLocaleDateString()}</span>
            </div>
            <div class="saved-idea-content">${parseMarkdown(idea.content || '')}</div>
            ${idea.promptConnection ? `
                <div class="saved-idea-prompt-label">Rationale:</div>
                <div class="saved-idea-prompt">${parseMarkdown(idea.promptConnection)}</div>
            ` : ''}
            ${idea.prompt ? `
                <div class="saved-idea-prompt-label">Inspired by:</div>
                <div class="saved-idea-prompt">${parseMarkdown(idea.prompt)}</div>
            ` : ''}
          `;
        promptsList.appendChild(ideaCard);
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
            const promptTitle = prompt ? prompt.title : null;
            const promptConnection = prompt ? prompt.connection : null;
            
            // Save the idea with the prompt details
            saveIdea(idea, promptText, promptTitle, promptConnection);
            
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
    // Ensure problem statement is always included in evaluation context
    const response = await callClaudeAPI(`
You are a product manager and design consultant in the EVALUATION PHASE.

**CURRENT PHASE: EVALUATION**

You are in the evaluation phase. The phases are:
1. Contextualizing (COMPLETED)
2. Persona Development (COMPLETED)
3. Problem Statement Refinement (COMPLETED)
4. Creative Prompt Generation (COMPLETED)
5. Evaluation (CURRENT PHASE)

**IMPORTANT: USER CONTROL**
- The user can move to the next phase at any time if they want to
- If the user asks to move on, you should support their decision
- Do NOT refuse or block the user from moving forward
- You can suggest staying longer if you think more evaluation would help, but respect the user's choice

**CRITICAL CONTEXT - REMEMBER THE PROBLEM:**
Original problem statement: "${problemStatement || 'Not yet defined'}"
Refined problem statement: "${reframedProblem || problemStatement || 'Not yet defined'}"
Persona context: "${persona || 'Not yet created'}"

The user has shared: "${message}"

**IMPORTANT:** You have access to the full conversation history above. Use it to understand the context and ensure your evaluation is relevant to the problem being solved.

**EVALUATION PHASE - THIS IS WHERE YOU CAN DEVELOP IDEAS:**
- In the ideation phase, we generate many different prompts (shallow and wide)
- In THIS evaluation phase, you can help develop and refine ideas (deep and narrow)
- You can ask questions to help develop the idea further
- You can suggest improvements, variations, or next steps
- This is the appropriate place to drill down and explore an idea in depth

Your task is to provide constructive feedback on the user's idea. Focus on:
- Highlighting the strengths of the idea
- Identifying potential gaps or challenges
- Suggesting improvements or variations
- Relating back to the problem and persona
- Being constructive and encouraging
- **Can include questions to help develop the idea further** (this is appropriate in evaluation phase)

IMPORTANT GUIDELINES:
- Be specific about what works well
- **CRITICAL QUESTION RULE: Ask ONLY ONE question per message. If you need multiple pieces of information, ask them ONE AT A TIME in separate messages.**
- **If you absolutely must ask multiple questions, format them as a numbered list (1., 2., 3.) so the user can answer them one by one.**
- Ask probing questions to help them think deeper, but limit to ONE question per response
- Suggest concrete improvements
- Connect the idea back to the persona's needs
- The user can move to the next phase at any time - support their decision if they ask to move on
- After evaluation, you can suggest generating new prompts, but the user controls when to move forward
- If the user asks to move on, do NOT refuse or say it's too early
- NEVER ask multiple questions in a single sentence or paragraph - this overwhelms the user

FORMATTING REQUIREMENTS:
- Use <br><br> (double line breaks) frequently to separate different sections (Strengths, Challenges, Suggestions)
- Use <strong>bold</strong> for section headers (e.g., <strong>Strengths:</strong>, <strong>Challenges:</strong>, <strong>Suggestions:</strong>) and key points
- Use <em>italics</em> for emphasis, examples, and subtle observations
- Add line breaks before and after each major section
- Keep each section to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Structure your response with clear visual hierarchy
- NEVER use markdown syntax - always use HTML tags like <strong>bold</strong> and <em>italic</em>
- Break up your response into digestible, visually separated chunks

Keep your response concise and conversational, but use formatting to make it visually appealing and easy to scan.
    `);
    
    // Check if user wants to move on or generate new prompts BEFORE sending response
    if (userWantsToMoveOn(message) || message.toLowerCase().includes('new prompt') || message.toLowerCase().includes('generate prompt')) {
        // Transition back to prompt generation phase
        currentPhase = 'promptGeneration';
        currentPhaseIndex = 3; // Set to promptGeneration index
        updateCardLockStates();
        // Generate new prompts and send single response
        await generateNewPrompts();
        return;
    }
    
    // Send the main response
    addMessageToChat('ai', response, true);
    
    // Don't send additional messages - let the evaluation response speak for itself
}

// Automatically evaluate ideas
async function evaluateIdea(idea) {
    try {
        // Set phase to evaluation
        currentPhase = 'evaluation';
        updateCardLockStates();
        
        const evaluation = await callClaudeAPI(`
You are evaluating a brainstorming idea. Provide constructive feedback on this idea:

**CRITICAL CONTEXT - REMEMBER THE PROBLEM:**
Original problem statement: "${problemStatement || 'Not yet defined'}"
Refined problem statement: "${reframedProblem || problemStatement || 'Not yet defined'}"
Persona context: "${persona || 'Not yet created'}"

Idea to evaluate: "${idea}"

**CONTEXT ABOUT THIS IDEA:**
- This idea was saved in response to a creative prompt that directly preceded it
- The idea is related to the most recent prompt you provided
- Consider the prompt context when evaluating the idea's relevance and creativity

**IMPORTANT:** You have access to the full conversation history above. Use it to understand the context and ensure your evaluation is relevant to the problem being solved.

**EVALUATION PHASE - THIS IS WHERE YOU CAN DEVELOP IDEAS:**
- In the ideation phase, we generate many different prompts (shallow and wide)
- In THIS evaluation phase, you can help develop and refine ideas (deep and narrow)
- You can ask questions to help develop the idea further
- You can suggest improvements, variations, or next steps
- This is the appropriate place to drill down and explore an idea in depth

Provide feedback that:
- Highlights the strengths of the idea
- Identifies potential gaps or challenges
- Suggests improvements or variations
- Relates back to the problem and persona
- Is constructive and encouraging
- **Can include questions to help develop the idea further** (this is appropriate in evaluation phase)

FORMATTING REQUIREMENTS:
- Use <br><br> (double line breaks) frequently to separate different sections (Strengths, Challenges, Suggestions)
- Use <strong>bold</strong> for section headers (e.g., <strong>Strengths:</strong>, <strong>Challenges:</strong>, <strong>Suggestions:</strong>) and key points
- Use <em>italics</em> for emphasis, examples, and subtle observations
- Add line breaks before and after each major section
- Keep each section to 1-2 sentences maximum
- Be concise and direct - avoid long blocks of text
- Structure your response with clear visual hierarchy
- NEVER use markdown syntax - always use HTML tags like <strong>bold</strong> and <em>italic</em>
- Break up your response into digestible, visually separated chunks
        `);
        
        addMessageToChat('ai', evaluation, true);
        
        // Don't send additional messages - let the evaluation response speak for itself
        // The evaluation should already include suggestions for next steps
  } catch (error) {
        console.error('Error evaluating idea:', error);
    }
}

// Generate new brainstorming prompts
async function generateNewPrompts() {
    try {
        const response = await callClaudeAPI(`
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

IMPORTANT FORMATTING:
- Start with a brief introduction (1 sentence)
- Format each prompt on a new line with a number (1., 2., etc.) or bullet point
- Use <br><br> (double line breaks) frequently to separate sections and prompts
- Use <strong>bold</strong> for emphasis, key points, and important information
- Use <em>italics</em> for clarifications and subtle points
- Add line breaks before and after each prompt
- Structure your response with clear visual separation
- Use <strong>HTML tags</strong> for formatting (NOT markdown)
- Keep the entire response concise and conversational, but visually appealing
        `);
        
        // Parse and add new prompts from the response
        const promptLines = response.split('\n').filter(line => 
            (line.trim().match(/^[-*•]\s/) || line.trim().match(/^\d+\.\s/)) && line.trim().length > 10
        );
        
        const newPrompts = promptLines.map((line, index) => ({
            id: Date.now() + index + 1000, // Offset to avoid ID conflicts
            text: line.replace(/^[-*•]|\d+\.\s*/, '').trim(),
            source: 'AI Generated'
        }));
        
        // Add to existing prompts
        if (newPrompts.length > 0) {
            generatedPrompts = [...generatedPrompts, ...newPrompts];
            // Prompts are shown in chat, sidebar shows saved ideas
        }
        
        // Send the AI's response directly (it should already include the prompts)
        addMessageToChat('ai', response, true);
        
    } catch (error) {
        console.error('Error generating new prompts:', error);
    }
}

// ===== SUGGESTED RESPONSES FUNCTIONS =====

async function generateSuggestedResponses() {
    if (!suggestedResponsesList) return;
    
    // Don't generate suggested responses if left sidebar is collapsed
    if (leftSidebar && leftSidebar.classList.contains('collapsed')) {
        return;
    }
    
    // Use phase index for objective phase tracking
    const phaseIndex = currentPhaseIndex;
    const phaseName = PHASE_ORDER[phaseIndex];
    
    let suggestions = [];

    try {
        const response = await callClaudeAPI(`
You are helping generate suggested responses for a user in a brainstorming session. Based on the current conversation context, suggest 3-4 responses that the USER might want to say next.

Current phase: ${phaseName} (Phase ${phaseIndex + 1} of 5)
Last message: ${chatHistory.slice(-1)[0]?.content?.substring(0, 150) || 'New conversation'}

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
        `, false, 300); // Don't include full history, use moderate max_tokens for 1-2 sentence responses
        
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
// Note: Saved ideas are cleared on page refresh (localStorage persistence removed temporarily)
let savedIdeas = [];

function saveIdea(idea, promptText = null, promptTitle = null, promptConnection = null) {
    const ideaData = {
        id: Date.now(),
        content: idea,
        prompt: promptText,
        promptTitle: promptTitle,
        promptConnection: promptConnection,
        timestamp: new Date().toISOString(),
        phase: currentPhase
    };
    
    savedIdeas.unshift(ideaData); // Add to beginning
    // localStorage persistence removed - ideas will be cleared on page refresh
    
    // Update the right sidebar with saved ideas
    displaySavedIdeasInSidebar();
    
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
    
    savedIdeasList.innerHTML = savedIdeas.map((idea, index) => {
        const title = idea.promptTitle || `Idea #${savedIdeas.length - index}`;
        return `
        <div class="saved-idea-card">
            <div class="saved-idea-header">
                <h3 class="saved-idea-title">${title}</h3>
                <p class="saved-idea-date">${new Date(idea.timestamp).toLocaleDateString()}</p>
            </div>
            <div class="saved-idea-content">${parseMarkdown(idea.content || '')}</div>
            ${idea.promptConnection ? `
                <div class="saved-idea-prompt-label">Rationale:</div>
                <div class="saved-idea-prompt">${parseMarkdown(idea.promptConnection)}</div>
            ` : ''}
            ${idea.prompt ? `
                <div class="saved-idea-prompt-label">Inspired by:</div>
                <div class="saved-idea-prompt">${parseMarkdown(idea.prompt)}</div>
            ` : ''}
        </div>
    `;
    }).join('');
}

// Export saved ideas to CSV
function exportIdeasToCSV() {
    if (savedIdeas.length === 0) {
        alert('No ideas to export');
        return;
    }
    
    // Create CSV header
    const headers = ['Title', 'Rationale', 'Idea'];
    const rows = savedIdeas.map((idea, index) => {
        const title = idea.promptTitle || `Idea #${savedIdeas.length - index}`;
        const rationale = idea.promptConnection || '';
        const ideaContent = idea.content || '';
        
        // Escape CSV values (handle commas, quotes, newlines)
        const escapeCSV = (value) => {
            if (!value) return '';
            const stringValue = String(value);
            // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };
        
        return [
            escapeCSV(title),
            escapeCSV(rationale),
            escapeCSV(ideaContent)
        ].join(',');
    });
    
    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `mutagen-ideas-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// Utility Functions
async function callClaudeAPI(prompt, includeHistory = true, maxTokens = 1000) {
    const proxyPath = getProxyPath();
    console.log('Calling Claude API via proxy:', proxyPath);
    
    // Validate the proxy URL
    if (proxyPath.startsWith('http') && !proxyPath.includes('workers.dev') && !proxyPath.includes('localhost')) {
        console.warn('Warning: Proxy URL might be incorrect. Expected Cloudflare Worker URL or local /api/chat');
    }
    
    try {
        // Build messages array with conversation history
        let messages = [];
        
        if (includeHistory && chatHistory.length > 0) {
            // Convert chatHistory to API message format
            // Take last 20 messages to avoid token limits while maintaining context
            const recentHistory = chatHistory.slice(-20);
            messages = recentHistory.map(msg => ({
                role: msg.sender === 'ai' ? 'assistant' : 'user',
                content: msg.content
            }));
        }
        
        // Add the current prompt as the latest user message
        messages.push({ role: 'user', content: prompt });
        
        // Route through local proxy to avoid CORS and keep key server-side
        console.log('Sending POST request to:', proxyPath);
        const response = await fetch(proxyPath, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude', // Model name is converted by worker to Claude
                messages: messages,
                max_tokens: maxTokens,
                temperature: 0.7
            })
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);
            throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || errorData.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        console.log('API Response received successfully');
        return data.choices[0].message.content;
    } catch (error) {
        const proxyPath = getProxyPath();
        console.error('API call failed:', error);
        console.error('Error details:', error.message);
        console.error('Proxy URL used:', proxyPath);
        
        // Check for DNS/network errors
        if (error.message.includes('ERR_NAME_NOT_RESOLVED') || error.message.includes('Failed to fetch')) {
            console.error('❌ DNS/Network Error: The Worker URL cannot be resolved.');
            console.error('Current URL being used:', proxyPath);
            console.error('');
            console.error('🔍 Troubleshooting steps:');
            console.error('1. Open this URL directly in your browser:', proxyPath);
            console.error('2. If it works in browser but not in code, check browser console for CORS errors');
            console.error('3. Verify the exact URL in Cloudflare Dashboard → Workers & Pages → Your Worker');
            console.error('4. Try copying the URL directly from Cloudflare and paste it in index.html line 218');
            console.error('5. Check if you have any browser extensions blocking requests');
            console.error('6. Try a different network (mobile hotspot) to rule out DNS issues');
            console.error('');
            console.error('💡 Quick test: Open browser console and run:');
            console.error(`   fetch('${proxyPath}').then(r => r.json()).then(console.log).catch(console.error)`);
        }
        
        console.error('Error stack:', error.stack);
        
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
                model: 'claude', // Model name is converted by worker to Claude
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 150,
                temperature: 0.2
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || errorData.message || 'Unknown error'}`);
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

// Initialize on load
window.onload = function() {
    console.log('Mutagen AI - Single Chat Interface loaded');
    addMessageToChat('ai', 'Hello! I\'m ready to help you brainstorm creative solutions. What problem would you like to solve today?', true);
}; 