// --- Creative Prompt Bot ---

const DIFFBOT_API = 'https://api.diffbot.com/v3/article';
const PERPLEXITY_API_KEY = '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';
const DIFFBOT_API_KEY = '159610ff529396e52d01b69ff6a896e2';
const DEEPSEEK_API_KEY = 'sk-7ca0b43ee9234ee192fab611c38ef55b';

// Perplexity API call function with automatic fallback
async function searchWithPerplexity(problem) {
  try {
    const response = await fetch('https://api.perplexity.ai/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        "model": "mistral-7b-instruct",
        "messages": [
          { 
            "role": "system", 
            "content": "You are a research assistant. Given a problem, find relevant URLs that might help solve it. You must return ONLY a valid JSON array of URLs, with no additional text, explanations, or formatting. Example: [\"https://example1.com\", \"https://example2.com\"]" 
          },
          { "role": "user", "content": problem }
        ],
        "max_tokens": 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', {
        status: response.status,
        response: errorText
      });
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Perplexity raw response:', data);
    
    // Try different ways to extract content from the response
    let content = null;
    
    if (data.choices && data.choices[0]) {
      const choice = data.choices[0];
      if (choice.message && choice.message.content) {
        content = choice.message.content;
      } else if (choice.text) {
        content = choice.text;
      }
    }
    
    if (!content) {
      console.error('No content found in Perplexity response:', data);
      throw new Error('No content received from Perplexity API');
    }
    
    console.log('Extracted content:', content);
    
    // Try to parse as JSON, but handle different formats
    try {
      // First, try to parse directly
      return JSON.parse(content);
    } catch (parseError) {
      console.log('Direct JSON parse failed, trying to extract URLs...');
      
      // Try to extract URLs from text if JSON parsing fails
      const urlRegex = /(https?:\/\/[^\s"<>]+)/g;
      const urls = content.match(urlRegex);
      
      if (urls && urls.length > 0) {
        console.log('Extracted URLs from text:', urls);
        return urls;
      }
      
      // If no URLs found, try to clean the content and parse again
      const cleanedContent = content.trim();
      if (cleanedContent.startsWith('[') && cleanedContent.endsWith(']')) {
        try {
          return JSON.parse(cleanedContent);
        } catch (secondParseError) {
          console.error('Second JSON parse attempt failed:', secondParseError);
        }
      }
      
      console.error('Failed to extract URLs from content:', content);
      throw new Error(`Could not extract URLs from Perplexity response. Raw content: ${content.substring(0, 200)}...`);
    }
  } catch (error) {
    console.error('Perplexity API call failed:', error);
    
    // Check if it's a CORS/network error
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      // This is a CORS/network issue - show manual input option
      throw new Error('CORS_BLOCKED: Perplexity API is blocked due to network restrictions. Please use the Manual Sources section below to paste URLs from Perplexity.ai');
    }
    
    throw error;
  }
}

// Diffbot API call function
async function scrapeWithDiffbot(url) {


  const apiUrl = `${DIFFBOT_API}?token=${DIFFBOT_API_KEY}&url=${encodeURIComponent(url)}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new Error(`Diffbot API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.objects || !data.objects.length) {
    throw new Error('No content found in URL');
  }

  return {
    title: data.objects[0].title || '',
    text: data.objects[0].text || '',
    html: data.objects[0].html || ''
  };
}

// Deepseek API call function
async function generateWithDeepseek(content, problem) {


  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a creative problem solver. Given some content and a problem, generate innovative solutions.' },
        { role: 'user', content: `Content: ${content}\n\nProblem: ${problem}\n\nGenerate 2-3 creative solutions based on the insights from the content.` }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Deepseek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Main flow function
async function processUserProblem(problem) {
  // Step 1: Search with Perplexity
  const urls = await searchWithPerplexity(problem);
  
  // Step 2: Scrape URLs with Diffbot
  const scrapedContent = [];
  for (const url of urls) {
    try {
      const content = await scrapeWithDiffbot(url);
      scrapedContent.push({ url, ...content });
    } catch (e) {
      console.error(`Failed to scrape ${url}:`, e);
    }
  }

  // Step 3: Generate prompts with Deepseek
  const prompts = [];
  for (const content of scrapedContent) {
    try {
      const prompt = await generateWithDeepseek(content.text, problem);
      prompts.push({
        prompt,
        url: content.url,
        title: content.title
      });
    } catch (e) {
      console.error(`Failed to generate prompt for ${content.url}:`, e);
    }
  }

  return {
    urls: scrapedContent.map(c => ({ url: c.url, title: c.title })),
    prompts
  };
}

let urlInput, processBtn, promptSection, historyPanel, historyGroups, 
    systemPromptInput, referenceMaterialInput, problemDescriptionInput, clearHistoryBtn;

// Initialize DOM elements after the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize all elements
  urlInput = document.getElementById('urlInput');
  processBtn = document.getElementById('processBtn');
  promptSection = document.getElementById('promptSection');
  historyPanel = document.getElementById('historyPanel');
  historyGroups = document.getElementById('historyGroups');
  systemPromptInput = document.getElementById('systemPrompt');
  referenceMaterialInput = document.getElementById('referenceMaterial');
  problemDescriptionInput = document.getElementById('problemDescription');
  clearHistoryBtn = document.getElementById('clearHistoryBtn');

  // Initialize search button
  const searchWebBtn = document.getElementById('searchWebBtn');

  // Add event listener for web search button
  if (searchWebBtn) {
    searchWebBtn.addEventListener('click', async () => {
      const problemDescriptionInput = document.getElementById('problemDescription');
      if (!problemDescriptionInput || !problemDescriptionInput.value.trim()) {
        alert('Please describe your problem first');
        return;
      }

      searchWebBtn.disabled = true;
      const searchResults = document.getElementById('searchResults');
      const generatedPrompts = document.getElementById('generatedPrompts');
      
      try {
        // Step 1: Search with Perplexity
        searchWebBtn.textContent = 'Searching with Perplexity...';
        searchResults.innerHTML = '<div class="loading">Searching for relevant articles...</div>';
        generatedPrompts.innerHTML = '';
        const urls = await searchWithPerplexity(problemDescriptionInput.value.trim());
        
        // Display raw URLs from Perplexity
        searchResults.innerHTML = '<div style="margin-bottom:20px;"><h3>Found URLs:</h3>' + 
          urls.map(url => `
            <div class="search-result" style="margin-bottom:8px;">
              <a href="${url}" target="_blank" rel="noopener">${url}</a>
            </div>
          `).join('') + '</div>';

        // Step 2: Process URLs with Diffbot and Deepseek
        searchWebBtn.textContent = 'Processing content...';
        searchResults.innerHTML += '<div class="loading">Processing article content...</div>';
        const result = await processUserProblem(problemDescriptionInput.value.trim());
        
        // Display processed results
        searchResults.innerHTML += '<div><h3>Processed Results:</h3>' + 
          result.urls.map(url => `
            <div class="search-result">
              <h4>${url.title}</h4>
              <p><a href="${url.url}" target="_blank" rel="noopener">${url.url}</a></p>
            </div>
          `).join('') + '</div>';

        // Display generated prompts
        generatedPrompts.innerHTML = result.prompts.map(prompt => `
          <div class="generated-prompt">
            <h4>${prompt.title}</h4>
            <pre>${prompt.prompt}</pre>
            <p><a href="${prompt.url}" target="_blank" rel="noopener">Source</a></p>
          </div>
        `).join('');
      } catch (error) {
        console.error('Search failed:', error);
        
        let errorMessage = error.message;
        let errorDetails = '';
        
        if (error.message.includes('CORS_BLOCKED')) {
          errorDetails = `
            <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
              <strong>Network Restriction Detected:</strong><br>
              The Perplexity API is blocked due to network restrictions (common in Hong Kong).<br><br>
              <strong>Solution:</strong><br>
              • Use the "Manual Sources" section below<br>
              • Go to <a href="https://www.perplexity.ai" target="_blank" style="color: #1976d2;">perplexity.ai</a> in a new tab<br>
              • Copy the sources from Perplexity results<br>
              • Paste them in the Manual Sources field and click "Process Manual Sources"
            </div>
          `;
        } else if (error.message.includes('Perplexity API error:')) {
          errorDetails = `
            <div style="margin-top: 10px; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
              <strong>API Error:</strong><br>
              • Check if your Perplexity API key is valid<br>
              • Verify your internet connection<br>
              • Try refreshing the page
            </div>
          `;
        }
        
        searchResults.innerHTML = `
          <div style="color: red; padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
            <strong>Error: ${errorMessage}</strong>
            ${errorDetails}
          </div>
        `;
        generatedPrompts.innerHTML = '';
      } finally {
        searchWebBtn.disabled = false;
        searchWebBtn.textContent = 'Search Web with Perplexity';
      }
    });
  }
  const systemPromptBlock = document.getElementById('systemPromptBlock');
  const problemDescriptionBlock = document.getElementById('problemDescriptionBlock');
  const toggleSystemPrompt = document.getElementById('toggleSystemPrompt');
  const toggleProblemDescription = document.getElementById('toggleProblemDescription');

  // Log initialization status
  console.log('Element initialization status:', {
    urlInput: !!urlInput,
    processBtn: !!processBtn,
    promptSection: !!promptSection,
    historyPanel: !!historyPanel,
    historyGroups: !!historyGroups,
    systemPromptInput: !!systemPromptInput,
    referenceMaterialInput: !!referenceMaterialInput,
    problemDescriptionInput: !!problemDescriptionInput,
    clearHistoryBtn: !!clearHistoryBtn
  });

  // Expand and minimizes the system prompt and problem statement 
  function setupToggle(blockEl, toggleBtn) {
    if (!blockEl || !toggleBtn) return;
    const img = toggleBtn.querySelector('img');
    const updateIcon = (expanded) => {
      toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      if (img) {
        img.src = expanded ? 'minimize.png' : 'expand.png';
        img.alt = expanded ? 'Minimize' : 'Expand';
      }
    };
    // initial: collapsed in HTML, so show expand icon
    updateIcon(false);
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = blockEl.classList.contains('collapsed');
      if (isCollapsed) {
        blockEl.classList.remove('collapsed');
        updateIcon(true);
      } else {
        blockEl.classList.add('collapsed');
        updateIcon(false);
      }
    });
  }

  setupToggle(systemPromptBlock, toggleSystemPrompt);
  setupToggle(problemDescriptionBlock, toggleProblemDescription);

  // Add click event listener for URL processing
  if (processBtn && urlInput) {
    console.log('URL processing elements found and initialized');
    processBtn.addEventListener('click', async () => {
      try {
        console.log('Process button clicked');
        const url = urlInput.value.trim();
        console.log('Processing URL:', url);
        
        if (!url) {
          console.log('No URL provided');
          promptSection.innerHTML = '<div style="color:red;">Please enter a URL</div>';
          return;
        }

        // Remove @ if present at the start of the URL
        const cleanUrl = url.startsWith('@') ? url.substring(1) : url;
        
        processBtn.disabled = true;
        processBtn.textContent = 'Processing...';
        promptSection.innerHTML = '<div>Processing article...</div>';
        
        const article = await fetchArticle(cleanUrl);
        console.log('Article fetched:', article);
        
        const sections = splitIntoSections(article);
        console.log('Article sections:', sections);
        
        const allPrompts = [];
        for (const section of sections) {
          const promptText = await generatePrompts(section.text, section.header);
          const prompts = promptText.split(/\n\d+\. |\n- |\n• |\n/).filter(Boolean);
          prompts.forEach(pr => {
            const match = pr.match(/"([^"]+)"/);
            allPrompts.push({
              prompt: pr.trim(),
              citation: match ? `Inspired by: "${match[1]}"` : `Section: ${section.header}`
            });
          });
        }
        
        renderPrompts(allPrompts, article.title, url);
        allPrompts.forEach(pr => savePromptToHistory(pr, article.title, url));
      } catch (e) {
        console.error('Error processing URL:', e);
        promptSection.innerHTML = `<div style="color:red;">Error: ${e.message}</div>`;
      } finally {
        processBtn.disabled = false;
        processBtn.textContent = 'Process';
      }
    });
  } else {
    console.error('URL processing elements not found:', {
      processBtn: !!processBtn,
      urlInput: !!urlInput
    });
  }
});

// --- System Prompt: Load/Save from file and localStorage ---
async function saveSystemPromptToStorage(prompt) {
  localStorage.setItem('systemPrompt', prompt);
}

function loadSystemPromptFromStorage() {
  return localStorage.getItem('systemPrompt') || '';
}

async function loadSystemPromptFromFile() {
  try {
    const res = await fetch('system_prompt.txt');
    if (!res.ok) {
      console.log('System prompt file not found, using default');
      return '';
    }
    return await res.text();
  } catch (error) {
    console.log('Could not load system prompt file, using default:', error);
    return '';
  }
}

// Get the best available system prompt
async function getSystemPrompt() {
  // Try localStorage first
  let prompt = loadSystemPromptFromStorage();
  
  // If not in localStorage, try file
  if (!prompt) {
    prompt = await loadSystemPromptFromFile();
  }
  
  // If still no prompt, use default
  if (!prompt) {
    prompt = 'You are a creative assistant that turns article sections into creative prompts. Always cite the quote or section that inspired each prompt.';
    console.log('Using default system prompt');
  }
  
  return prompt;
}

// --- Utility: Save/Load History ---
function saveHistory(history) {
  localStorage.setItem('promptHistory', JSON.stringify(history));
}
function loadHistory() {
  return JSON.parse(localStorage.getItem('promptHistory') || '[]');
}

// --- Utility: Grouping ---
function groupPrompts(history) {
  // Simple grouping by article title
  const groups = {};
  history.forEach(item => {
    if (!groups[item.title]) groups[item.title] = [];
    groups[item.title].push(item);
  });
  return groups;
}

// --- Diffbot: Fetch Article ---
async function fetchArticle(url) {
  try {
    console.log('Fetching article from:', url);
    const apiUrl = `${DIFFBOT_API}?token=${DIFFBOT_API_KEY}&url=${encodeURIComponent(url)}`;
    console.log('Diffbot API URL:', apiUrl);
    
    const res = await fetch(apiUrl);
    console.log('Diffbot response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Diffbot API error:', errorText);
      throw new Error(`Failed to fetch article (Status: ${res.status})`);
    }
    
    const data = await res.json();
    console.log('Diffbot API response:', data);
    
    if (!data.objects || !data.objects.length) {
      console.error('No article content found in response:', data);
      throw new Error('No article content found');
    }
    
    const article = data.objects[0];
    return {
      title: article.title || 'Untitled',
      content: article.text || '',
      html: article.html || ''
    };
  } catch (error) {
    console.error('Error in fetchArticle:', error);
    throw error;
  }
}

// --- Sectioning: Split Article into Sections ---
function splitIntoSections(article) {
  // Try to use HTML if available, else fallback to plain text
  if (article.html) {
    const temp = document.createElement('div');
    temp.innerHTML = article.html;
    const sections = [];
    let current = { header: article.title, text: '' };
    Array.from(temp.childNodes).forEach(node => {
      if (node.tagName && (node.tagName === 'H2' || node.tagName === 'H3')) {
        if (current.text.trim()) sections.push({ ...current });
        current = { header: node.textContent, text: '' };
      } else if (node.textContent && node.textContent.trim()) {
        current.text += node.textContent + '\n';
      }
    });
    if (current.text.trim()) sections.push(current);
    return sections;
  } else {
    // Fallback: split plain text into sections by double newlines
    const paragraphs = article.content.split(/\n\n+/);
    return paragraphs.map((para, idx) => ({
      header: idx === 0 ? article.title : `Section ${idx + 1}`,
      text: para
    })).filter(sec => sec.text.trim());
  }
}

// --- DeepSeek: Generate Prompts ---
async function generatePrompts(sectionText, sectionHeader) {
  // Get the best available system prompt
  const systemPrompt = await getSystemPrompt();
  
  const referenceMaterial = (referenceMaterialInput && referenceMaterialInput.value.trim()) || '';
  const problemDesc = (problemDescriptionInput && problemDescriptionInput.value.trim()) || '';
  
  let userPrompt = `Read the following section from an article and generate 1-2 creative prompts that could spark new ideas. Do not number or bullet the prompts. Each prompt should be concise (1-2 sentences), actionable, and in the style of a Mutagen card (see example below). Each prompt should cite the quote or section it was inspired by.\n\nSection: ${sectionHeader}\n${sectionText}`;
  
  if (problemDesc) {
    userPrompt += `\n\nFocus on solving this problem: ${problemDesc}`;
  }
  
  if (referenceMaterial) {
    userPrompt += `\n\nReference Material:\n${referenceMaterial}`;
  }
  
  userPrompt += `\n\nExample Mutagen card prompt style: What if your app had different versions for different types of busy professionals (new cooks vs. experienced but time-strapped)? How could you create distinct experiences for users who lack confidence versus those who just need efficiency?`;
  
  console.log('Generating prompts with:', {
    systemPromptSource: systemPrompt === '' ? 'default' : (systemPrompt.startsWith('You are') ? 'default' : 'custom'),
    hasReferenceMaterial: !!referenceMaterial,
    hasProblemDesc: !!problemDesc
  });

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 400
    })
  });

  if (!res.ok) {
    console.error('DeepSeek API error:', await res.text());
    throw new Error('Failed to generate prompts');
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// --- UI: Fixed-height textarea ---
function autoExpandTextarea(textarea) {
  textarea.style.height = '20px';
}


// --- Deck Logic ---
async function getShortTitle(promptText) {
  // Use DeepSeek API to generate a short title (max 8 words)
  const systemPrompt = 'Summarize the following creative prompt in a short, catchy title of no more than 8 words.';
  const userPrompt = `${promptText}`;
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 32
    })
  });
  if (!res.ok) return '';
  const data = await res.json();
  return data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
}

async function savePromptToDeck(promptObj, articleTitle, url) {
  const deck = loadDeck();
  // Generate a short title for the prompt using DeepSeek
  const shortTitle = await getShortTitle(promptObj.prompt);
  deck.push({ ...promptObj, title: shortTitle, url, ts: Date.now() });
  localStorage.setItem('deckPrompts', JSON.stringify(deck));
  renderDeck();
}
function loadDeck() {
  return JSON.parse(localStorage.getItem('deckPrompts') || '[]');
}
function renderDeck() {
  const deckPromptsDiv = document.getElementById('deckPrompts');
  const deckPanel = document.getElementById('deckPanel');
  const deckTrash = document.getElementById('deckTrash');
  if (!deckPromptsDiv) return;
  let deck = loadDeck();
  deckPromptsDiv.innerHTML = '';
  setTimeout(() => {
    const visibleCards = deckPromptsDiv.querySelectorAll('.deck-prompt-card').length;
    if (deckPanel) {
      if (visibleCards > 12) {
        deckPanel.classList.add('deck-scrollable');
      } else {
        deckPanel.classList.remove('deck-scrollable');
      }
    }
  }, 0);
  deck.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'deck-prompt-card';
    card.draggable = true;
    let expanded = false;
    // Clean the prompt text for display
    const cleanedPrompt = cleanPromptText(item.prompt);
    function renderCardContent() {
      if (expanded) {
        card.classList.add('expanded');
        card.innerHTML = `
          <div class="card-header">
            <div style='font-weight:bold;'>${item.title}</div>
            <img src="minimize.png" alt="Minimize" class="expand-icon" style="width:16px;height:16px;cursor:pointer;">
          </div>
          <div>${cleanedPrompt.replace(/\n/g, '<br>')}</div>
          <div style='color:#888;font-size:0.92rem;margin-top:6px;'>${item.url ? `<a href="${item.url}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">${item.citation}</a>` : item.citation}</div>`;
      } else {
        card.classList.remove('expanded');
        card.innerHTML = `
          <div class="card-header">
            <div style='font-weight:bold;'>${item.title}</div>
            <img src="expand.png" alt="Expand" class="expand-icon" style="width:16px;height:16px;cursor:pointer;">
          </div>
          <div>${cleanedPrompt.length > 60 ? cleanedPrompt.slice(0, 60) + '...' : cleanedPrompt}</div>
          <div style='color:#888;font-size:0.92rem;margin-top:6px;'>${item.url ? `<a href="${item.url}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;">${item.citation}</a>` : item.citation}</div>`;
      }
    }
    renderCardContent();
    card.addEventListener('click', (e) => {
      // Check if clicked element is the expand/minimize icon
      if (e.target.classList.contains('expand-icon')) {
        expanded = !expanded;
        renderCardContent();
        e.stopPropagation();
      } else if (e.target === card || e.target.closest('.card-header')) {
        expanded = !expanded;
        renderCardContent();
      }
    });
    // Drag and drop logic
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
      if (deckTrash) deckTrash.classList.add('drag-active');
    });
    card.addEventListener('dragend', (e) => {
      card.classList.remove('dragging');
      if (deckTrash) deckTrash.classList.remove('drag-active', 'drag-over');
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', (e) => {
      card.classList.remove('drag-over');
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (fromIdx !== idx) {
        const moved = deck.splice(fromIdx, 1)[0];
        deck.splice(idx, 0, moved);
        localStorage.setItem('deckPrompts', JSON.stringify(deck));
        renderDeck();
      }
    });
    deckPromptsDiv.appendChild(card);
  });
  // Trashcan drag-over and drop logic
  if (deckTrash) {
    deckTrash.ondragover = (e) => {
      e.preventDefault();
      deckTrash.classList.add('drag-over');
    };
    deckTrash.ondragleave = (e) => {
      deckTrash.classList.remove('drag-over');
    };
    deckTrash.ondrop = (e) => {
      e.preventDefault();
      deckTrash.classList.remove('drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      deck.splice(fromIdx, 1);
      localStorage.setItem('deckPrompts', JSON.stringify(deck));
      renderDeck();
    };
    // Double-click to delete all prompts in the deck
    deckTrash.ondblclick = () => {
      if (confirm('Are you sure you want to delete ALL prompts in the deck?')) {
        localStorage.removeItem('deckPrompts');
        renderDeck();
      }
    };
  }
}
// Render deck on load
window.addEventListener('DOMContentLoaded', () => {
  // Landing page logic
  const landingOverlay = document.getElementById('landingOverlay');
  const landingForm = document.getElementById('landingForm');
  const landingUser = document.getElementById('landingUser');
  const landingGoal = document.getElementById('landingGoal');
  const landingWhy = document.getElementById('landingWhy');
  const landingConstraints = document.getElementById('landingConstraints');
  const problemDescriptionInput = document.getElementById('problemDescription');

  const cookingExampleBtn = document.getElementById('cookingExampleBtn');
  const flightExampleBtn = document.getElementById('flightExampleBtn');

  if (landingOverlay && landingForm && landingUser && landingGoal && landingWhy && landingConstraints && problemDescriptionInput) {
    // Only show landing page if not previously dismissed in this session
    if (!sessionStorage.getItem('landingDismissed')) {
      landingOverlay.style.display = 'flex';
    } else {
      landingOverlay.style.display = 'none';
    }

    // Cooking example button
    if (cookingExampleBtn) {
      cookingExampleBtn.addEventListener('click', () => {
        landingUser.value = "Sprite is a 25-year-old management consultant who is very health conscious. She works around 60-80 hours a week and travels for work from time to time. She likes picking up new recipes and ingredients from these countries she travels to, but doesn't have the confidence to cook them.";
        landingGoal.value = "Learn how to cook quickly at her own convenience. She wants to learn the basics as well as specific, exotic dishes. She wants to get to the level where she can improvise dishes instead of having to follow a recipe word for word.";
        landingWhy.value = "She finds the prospect of learning how to cook daunting. There's a lot of different ingredients, techniques, etc. to learn and she doesn't know where to start.";
        landingConstraints.value = "Sprite wants to learn how to cook, do not suggest things like takeout or meal planning services. Any solution must also be relatively time efficient, as Sprite does not have a lot of time every day -- even on weekends.";
        
        // Submit the form
        const submitEvent = new Event('submit');
        landingForm.dispatchEvent(submitEvent);
      });
    }

    // Flight booking example button
    if (flightExampleBtn) {
      flightExampleBtn.addEventListener('click', () => {
        landingUser.value = 'Bob is a 60-year-old man who is a retired taxi driver in New York.';
        landingGoal.value = 'He flies to Atlanta several times a year to see his kids.';
        landingWhy.value = 'The online flight booking process has many complicated fields that Bob has trouble filling out. If he takes too long, the website times out and he has to restart everything, which is frustrating.';
        landingConstraints.value = 'Bob must fly to see his children so you cannot suggest something';
        
        // Submit the form
        const submitEvent = new Event('submit');
        landingForm.dispatchEvent(submitEvent);
      });
    }

    landingForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const user = landingUser.value.trim();
      const goal = landingGoal.value.trim();
      const why = landingWhy.value.trim();
      const constraints = landingConstraints.value.trim();
      let combined = '';
      if (user) combined += `User: ${user}\n`;
      if (goal) combined += `Goal: ${goal}\n`;
      if (why) combined += `Why: ${why}\n`;
      if (constraints) combined += `Constraints: ${constraints}`;
      problemDescriptionInput.value = combined.trim();
      landingOverlay.style.display = 'none';
      sessionStorage.setItem('landingDismissed', '1');
    });
  }

  // Reference Material processing logic
  const referenceMaterialInputField = document.getElementById('referenceMaterialInput');
  const processReferenceBtn = document.getElementById('processReferenceBtn');
  if (referenceMaterialInputField && processReferenceBtn) {
    processReferenceBtn.addEventListener('click', async () => {
      const refText = referenceMaterialInputField.value.trim();
      if (!refText) {
        promptSection.innerHTML = '<div style="color:red;">Please enter some reference material to process.</div>';
        return;
      }
      processReferenceBtn.disabled = true;
      processReferenceBtn.textContent = 'Processing...';
      promptSection.innerHTML = '';
      try {
        // Use the same logic as for article sections
        const sectionHeader = 'Reference Material';
        const promptText = await generatePrompts(refText, sectionHeader);
        // Try to split into 1-2 prompts, and extract citation if possible
        const prompts = promptText.split(/\n\d+\. |\n- |\n• |\n/).filter(Boolean);
        const allPrompts = [];
        prompts.forEach(pr => {
          // Try to extract citation (e.g., quoted text in "...")
          const match = pr.match(/"([^"]+)"/);
          allPrompts.push({
            prompt: pr.trim(),
            citation: match ? `Inspired by: "${match[1]}"` : `Section: ${sectionHeader}`
          });
        });
        renderPrompts(allPrompts, sectionHeader, '');
        // Save all prompts to history
        allPrompts.forEach(pr => savePromptToHistory(pr, sectionHeader, ''));
      } catch (e) {
        promptSection.innerHTML = `<div style=\"color:red;\">${e.message}</div>`;
      }
      processReferenceBtn.disabled = false;
      processReferenceBtn.textContent = 'Process Reference Material';
    });
  }
});

// --- Prompt cleaning for generation/history ---
function cleanPromptText(text) {
  // Remove leading numbers, asterisks, bullets, and anything in (Inspired by: ...)
  let cleaned = text.replace(/^\s*([0-9]+\.|[-*•])\s*/gm, '').replace(/^\s*\d+\)/gm, '').trim();
  cleaned = cleaned.replace(/\(Inspired by:[^)]+\)/gi, '').trim();
  return cleaned;
}
// --- UI: Render Prompts ---
function renderPrompts(prompts, articleTitle, url) {
  promptSection.innerHTML = '';
  prompts.forEach((promptObj, idx) => {
    const card = document.createElement('div');
    card.className = 'prompt-card';

    // Create prompt text area
    const textarea = document.createElement('textarea');
    textarea.className = 'prompt-edit';
    textarea.value = cleanPromptText(promptObj.prompt);
    autoExpandTextarea(textarea);
    textarea.addEventListener('change', () => {
      promptObj.prompt = textarea.value;
      savePromptToHistory(promptObj, articleTitle, url);
    });

    // Create citation div
    const citation = document.createElement('div');
    citation.className = 'prompt-citation';
    citation.textContent = promptObj.citation;

    // Add save to deck button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save to Deck';
    saveBtn.style.marginTop = '6px';
    saveBtn.addEventListener('click', async () => {
      const promptForDeck = { ...promptObj }; // Keep citation
      await savePromptToDeck(promptForDeck, articleTitle, url);
      saveBtn.textContent = 'Saved!';
      saveBtn.disabled = true;
      setTimeout(() => {
        saveBtn.textContent = 'Save to Deck';
        saveBtn.disabled = false;
      }, 1200);
    });

    card.appendChild(textarea);
    card.appendChild(citation);
    card.appendChild(saveBtn);
    promptSection.appendChild(card);
  });
}

// --- Save Prompt to History ---
function savePromptToHistory(promptObj, articleTitle, url) {
  const history = loadHistory();
  history.push({ ...promptObj, title: articleTitle, url, ts: Date.now() });
  saveHistory(history);
  renderHistory();
}

// --- Render History ---
function renderHistory() {
  const history = loadHistory();
  const groups = groupPrompts(history);
  historyGroups.innerHTML = '';
  Object.keys(groups).forEach(title => {
    const group = groups[title];
    if (!group.length) return;
    const groupDiv = document.createElement('div');
    groupDiv.className = 'history-group';
    // Article title as a link
    const articleUrl = group[0].url;
    const groupTitle = document.createElement('div');
    groupTitle.className = 'history-group-title';
    groupTitle.innerHTML = `<a href="${articleUrl}" target="_blank" rel="noopener" style="text-decoration:underline;color:#2a5db0;">${title}</a>`;
    const groupPrompts = document.createElement('div');
    groupPrompts.className = 'history-prompts';
    group.forEach((item, idx) => {
      const p = document.createElement('div');
      // Show inspiration (citation) and prompt itself
      p.innerHTML = `<div style='color:#888;font-size:0.95em;margin-bottom:2px;'>${item.citation || ''}</div><div style='margin-bottom:8px;'>${item.prompt}</div>`;
      groupPrompts.appendChild(p);
      if (idx < group.length - 1) {
        groupPrompts.appendChild(document.createElement('br'));
      }
    });
    groupDiv.appendChild(groupTitle);
    groupDiv.appendChild(groupPrompts);
    historyGroups.appendChild(groupDiv);
  });
}

// --- On Load: Render History and System Prompt ---
window.onload = async () => {
  renderHistory();
  // Load system prompt from localStorage or file
  let sysPrompt = await getSystemPrompt();
  if (sysPrompt) {
    systemPromptInput.value = sysPrompt;
  }
  systemPromptInput.addEventListener('input', () => {
    saveSystemPromptToStorage(systemPromptInput.value);
  });
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all prompt history?')) {
        localStorage.removeItem('promptHistory');
        renderHistory();
      }
    });
  }
}; 