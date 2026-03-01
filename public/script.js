const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SELECTED_MODEL = 'google/gemini-2.5-flash-preview-09-2025';

const SYSTEM_PROMPT = `Ты — ассистент технической поддержки хостинга BotHost (bothost.ru).

ТВОЯ СПЕЦИАЛИЗАЦИЯ:
1. Анализ логов и ошибок хостинга BotHost
2. Написание кода на Python, Node.js, Go, JavaScript
3. Решение проблем с развертыванием ботов на BotHost
4. Помощь с Telegram Bot API, вебхуками
5. Настройка Nginx, Docker, баз данных
6. Git, CI/CD, деплой

ПРАВИЛА ФОРМАТИРОВАНИЯ КОДА:
1. Используй правильные отступы (4 пробела для Python, 2 для JavaScript)
2. Добавляй комментарии к сложным участкам
3. Обрамляй код тройными обратными кавычками с указанием языка`;

let currentChatId = null;
let isTyping = false;
let isStreaming = false;
let isInitialized = false;
let autoScrollEnabled = true;
let userScrolledUp = false;
let scrollInterval = null;
let isAITyping = false;
let shouldStopTyping = false;
let typingAbortController = null;
let currentAIMessage = null;
let truncatedAIResponse = '';

const elements = {};

function getScrollContainer() {
    return document.querySelector('.main');
}

document.addEventListener('DOMContentLoaded', () => {
    initElements();
    setupEventListeners();
    initApp();
});

function initElements() {
    elements.menuBtn = document.getElementById('menuBtn');
    elements.sidebar = document.getElementById('sidebar');
    elements.closeSidebar = document.getElementById('closeSidebar');
    elements.newChatBtn = document.getElementById('newChatBtn');
    elements.chatTitle = document.getElementById('chatTitle');
    elements.welcomeScreen = document.getElementById('welcomeScreen');
    elements.chatContainer = document.getElementById('chatContainer');
    elements.typingIndicator = document.getElementById('typingIndicator');
    elements.chatsList = document.getElementById('chatsList');
    elements.messageInput = document.getElementById('messageInput');
    elements.sendBtn = document.getElementById('sendBtn');
    elements.scrollDownBtn = document.getElementById('scrollDownBtn');
    elements.mainContent = getScrollContainer();
}

function setupEventListeners() {
    if (elements.menuBtn) {
        elements.menuBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
        };
    }
    
    if (elements.closeSidebar) {
        elements.closeSidebar.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar(false);
        };
    }
    
    if (elements.newChatBtn) {
        elements.newChatBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            createNewChat();
            toggleSidebar(false);
        };
    }
    
    if (elements.sendBtn) {
        elements.sendBtn.addEventListener('click', handleSendButtonClick);
    }
    
    if (elements.scrollDownBtn) {
        elements.scrollDownBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            instantTeleportToBottom();
            hideScrollDownButton();
        };
    }
    
    if (elements.messageInput) {
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendButtonClick(e);
            }
        });
        
        elements.messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            const newHeight = Math.min(this.scrollHeight, 120);
            this.style.height = newHeight + 'px';
            
            if (this.value.trim()) {
                showSendButton();
            } else if (!isAITyping) {
                hideSendButton();
            }
        });
    }
    
    document.addEventListener('click', (e) => {
        if (elements.sidebar && elements.sidebar.classList.contains('active')) {
            const isClickInsideSidebar = elements.sidebar.contains(e.target);
            const isClickOnMenuBtn = elements.menuBtn && elements.menuBtn.contains(e.target);
            
            if (!isClickInsideSidebar && !isClickOnMenuBtn) {
                toggleSidebar(false);
            }
        }
    });
    
    if (elements.chatsList) {
        elements.chatsList.addEventListener('click', (e) => {
            const chatItem = e.target.closest('.chat-item');
            if (chatItem && !e.target.closest('.delete-btn')) {
                const chatId = chatItem.dataset.chatId;
                if (chatId) {
                    switchToChat(chatId);
                    toggleSidebar(false);
                }
            }
            
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                const chatItem = deleteBtn.closest('.chat-item');
                if (chatItem) {
                    const chatId = chatItem.dataset.chatId;
                    if (chatId && confirm('Удалить этот чат?')) {
                        deleteChat(chatId);
                    }
                }
            }
        });
    }
    
    if (elements.mainContent) {
        elements.mainContent.onscroll = handleScroll;
    }
}

function handleSendButtonClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (isAITyping) {
        stopAITyping();
    } else {
        sendMessage();
    }
}

function handleScroll() {
    const container = getScrollContainer();
    if (!container) return;

    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    
    if (scrollBottom > 100) {
        if (!userScrolledUp) {
            userScrolledUp = true;
        }
        showScrollDownButton();
    } else if (scrollBottom <= 50) {
        if (userScrolledUp) {
            userScrolledUp = false;
            autoScrollEnabled = true;
        }
        hideScrollDownButton();
    }
}

function instantTeleportToBottom() {
    const container = getScrollContainer();
    if (!container) return;
    
    container.scrollTop = container.scrollHeight;
    
    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
            userScrolledUp = false;
            autoScrollEnabled = true;
            hideScrollDownButton();
        }, 10);
    });
}

function showScrollDownButton() {
    if (elements.scrollDownBtn) {
        elements.scrollDownBtn.classList.add('visible');
    }
}

function hideScrollDownButton() {
    if (elements.scrollDownBtn && elements.scrollDownBtn.classList.contains('visible')) {
        elements.scrollDownBtn.classList.remove('visible');
    }
}

function showSendButton() {
    if (elements.sendBtn) {
        elements.sendBtn.classList.remove('hidden');
        elements.sendBtn.classList.remove('ai-typing');
        elements.sendBtn.style.opacity = '1';
        elements.sendBtn.style.transform = 'translateY(-50%) scale(1)';
        elements.sendBtn.style.pointerEvents = 'auto';
    }
}

function showStopButton() {
    if (elements.sendBtn) {
        elements.sendBtn.classList.remove('hidden');
        elements.sendBtn.classList.add('ai-typing');
        elements.sendBtn.style.opacity = '1';
        elements.sendBtn.style.transform = 'translateY(-50%) scale(1)';
        elements.sendBtn.style.pointerEvents = 'auto';
    }
}

function hideSendButton() {
    if (elements.sendBtn && !elements.sendBtn.classList.contains('hidden')) {
        elements.sendBtn.style.opacity = '0';
        elements.sendBtn.style.transform = 'translateY(-50%) scale(0.8)';
        elements.sendBtn.style.pointerEvents = 'none';
        
        setTimeout(() => {
            if (elements.sendBtn.style.opacity === '0') {
                elements.sendBtn.classList.add('hidden');
            }
        }, 300);
    }
}

function toggleSidebar(show) {
    if (!elements.sidebar) return;
    
    if (typeof show === 'boolean') {
        elements.sidebar.classList.toggle('active', show);
    } else {
        elements.sidebar.classList.toggle('active');
    }
}

function createNewChat() {
    const newChatId = chatStorage.generateId();
    const newChat = {
        title: 'Новый чат',
        messages: [],
        created: Date.now(),
        updated: Date.now(),
        lastMessage: '',
        titleSet: false
    };
    
    currentChatId = newChatId;
    chatStorage.saveRaw(newChatId, newChat);
    
    switchToChat(newChatId);
}

function switchToChat(chatId) {
    currentChatId = chatId;
    const chat = chatStorage.get(chatId);
    
    if (!chat) {
        createNewChat();
        return;
    }
    
    if (elements.chatTitle) {
        elements.chatTitle.textContent = chat.title || 'BotHost AI';
    }
    
    if (chat.messages && chat.messages.length > 0) {
        hideWelcomeScreen();
        renderMessages(chat.messages);
    } else {
        showWelcomeScreen();
    }
    
    renderChatsList();
    hideScrollDownButton();
    
    if (elements.messageInput && elements.messageInput.value.trim()) {
        showSendButton();
    } else {
        hideSendButton();
    }
    
    if (elements.messageInput) {
        setTimeout(() => {
            elements.messageInput.focus();
        }, 100);
    }
    
    enableAutoScroll();
}

function showWelcomeScreen() {
    if (elements.welcomeScreen) {
        elements.welcomeScreen.classList.remove('hidden');
    }
    if (elements.chatContainer) {
        elements.chatContainer.classList.add('hidden');
        elements.chatContainer.innerHTML = '';
    }
    if (elements.typingIndicator) {
        elements.typingIndicator.classList.add('hidden');
    }
    hideScrollDownButton();
    hideSendButton();
}

function hideWelcomeScreen() {
    if (elements.welcomeScreen) {
        elements.welcomeScreen.classList.add('hidden');
    }
    if (elements.chatContainer) {
        elements.chatContainer.classList.remove('hidden');
    }
}

function renderChatsList() {
    if (!elements.chatsList) return;
    
    const chats = chatStorage.getSorted();
    
    if (chats.length === 0) {
        elements.chatsList.innerHTML = '<div class="empty-chats">Нет сохраненных чатов</div>';
        return;
    }
    
    elements.chatsList.innerHTML = chats.map(chat => {
        const lastMessage = chat.lastMessage || 'Нет сообщений';
        const preview = lastMessage.length > 35 ? 
            lastMessage.substring(0, 35) + '...' : lastMessage;
        
        return `
            <div class="chat-item ${currentChatId === chat.id ? 'active' : ''}" 
                 data-chat-id="${chat.id}">
                <div class="chat-info">
                    <div class="chat-name">${escapeHtml(chat.title || 'Новый чат')}</div>
                    <div class="chat-preview">${escapeHtml(preview)}</div>
                </div>
                <button class="delete-btn" title="Удалить чат">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
}

function deleteChat(chatId) {
    chatStorage.delete(chatId);
    
    if (currentChatId === chatId) {
        const remainingChats = chatStorage.getSorted();
        if (remainingChats.length > 0) {
            switchToChat(remainingChats[0].id);
        } else {
            createNewChat();
        }
    } else {
        renderChatsList();
    }
}

function renderMessages(messages) {
    if (!elements.chatContainer) return;
    
    if (!messages || messages.length === 0) {
        elements.chatContainer.innerHTML = '';
        return;
    }
    
    elements.chatContainer.innerHTML = messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        const messageClass = isUser ? 'user-message' : 'ai-message';
        
        return `
            <div class="message ${messageClass}" data-index="${index}">
                <div class="message-content">
                    <div class="message-text">${formatMessage(msg.content)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    highlightAndFormatCode();
    
    if (autoScrollEnabled && !userScrolledUp) {
        instantTeleportToBottom();
    }
}

function formatMessage(text) {
    if (!text) return '';
    
    let safeText = escapeHtml(text);
    
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const codeBlocks = [];
    let codeIndex = 0;
    
    let processedText = safeText.replace(codeBlockRegex, (match, lang, code) => {
        const id = `__CODE_BLOCK_${codeIndex++}__`;
        
        let formattedCode = code.trim();
        formattedCode = formattedCode.replace(/  /g, '&nbsp;&nbsp;');
        formattedCode = formattedCode.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
        
        codeBlocks.push({
            id,
            lang: lang ? lang.toLowerCase() : '',
            code: formattedCode
        });
        
        return id;
    });
    
    processedText = processedText
        .replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="ai-link">$1</a>')
        .replace(/\n/g, '<br>');
    
    codeBlocks.forEach(block => {
        const langDisplay = block.lang ? block.lang.toUpperCase() : 'TEXT';
        const languageClass = block.lang ? `language-${block.lang}` : 'language-text';
        
        const codeHtml = `
            <div class="code-block">
                <div class="code-header">
                    <div class="code-lang">
                        <i class="fas fa-code"></i>
                        <span class="lang-name">${langDisplay}</span>
                    </div>
                    <button class="copy-btn" onclick="copyCode(this)" title="Копировать код">
                        <i class="far fa-copy"></i>
                        <span class="copy-text">Копировать</span>
                    </button>
                </div>
                <div class="code-container">
                    <pre><code class="${languageClass}">${block.code}</code></pre>
                </div>
            </div>
        `;
        processedText = processedText.replace(block.id, codeHtml);
    });
    
    return processedText;
}

function copyCode(button) {
    const codeBlock = button.closest('.code-block');
    const codeElement = codeBlock.querySelector('code');
    const text = codeElement.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const icon = button.querySelector('i');
        const textSpan = button.querySelector('.copy-text');
        
        if (icon) icon.className = 'fas fa-check';
        if (textSpan) textSpan.textContent = 'Скопировано!';
        button.classList.add('copied');
        
        setTimeout(() => {
            if (icon) icon.className = 'far fa-copy';
            if (textSpan) textSpan.textContent = 'Копировать';
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Ошибка копирования:', err);
    });
}

function highlightAndFormatCode() {
    if (window.hljs) {
        document.querySelectorAll('pre code').forEach((block) => {
            try {
                block.className = block.className.replace(/\bhljs\b/g, '');
                hljs.highlightElement(block);
            } catch (error) {
                console.error('Ошибка подсветки кода:', error);
            }
        });
    }
    
    document.querySelectorAll('.copy-btn').forEach(button => {
        if (!button.onclick) {
            button.onclick = function() {
                copyCode(this);
            };
        }
    });
}

function createMessageTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message-typing';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingDiv.appendChild(dot);
    }
    
    return typingDiv;
}

function createContinueButton() {
    const button = document.createElement('button');
    button.className = 'continue-btn';
    button.innerHTML = '<i class="fas fa-play"></i> Продолжить ответ';
    button.title = 'Продолжить ответ';
    
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        button.remove();
        
        const typingIndicator = createMessageTypingIndicator();
        if (currentAIMessage) {
            currentAIMessage.querySelector('.message-content').appendChild(typingIndicator);
            typingIndicator.classList.add('active');
        }
        
        await continueAIResponse();
    });
    
    return button;
}

async function continueAIResponse() {
    if (!currentAIMessage || !truncatedAIResponse) {
        return;
    }
    
    const typingIndicator = currentAIMessage.querySelector('.message-typing');
    
    showStopButton();
    isAITyping = true;
    shouldStopTyping = false;
    isStreaming = true;
    
    const chat = chatStorage.get(currentChatId);
    if (!chat) return;
    
    const lastAIMessageIndex = chat.messages.findIndex(m => m.role === 'assistant');
    if (lastAIMessageIndex === -1) return;
    
    const originalMessageContent = chat.messages[lastAIMessageIndex].content;
    
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...chat.messages.slice(0, lastAIMessageIndex).map(m => ({
            role: m.role,
            content: m.content
        })),
        { role: 'assistant', content: originalMessageContent }
    ];
    
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'BotHost AI Support'
            },
            body: JSON.stringify({
                model: SELECTED_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const aiText = data.choices[0]?.message?.content;
        
        if (!aiText) throw new Error('Пустой ответ');
        
        if (typingIndicator) {
            typingIndicator.remove();
        }
        
        const fullResponse = originalMessageContent + aiText;
        
        typingAbortController = new AbortController();
        
        enableAutoScroll();
        startAutoScroll();
        
        await typeText(
            currentAIMessage.querySelector('.message-text'), 
            fullResponse, 
            5, 
            typingAbortController.signal, 
            originalMessageContent.length
        );
        
        isStreaming = false;
        isAITyping = false;
        typingAbortController = null;
        
        stopAutoScroll();
        
        if (autoScrollEnabled && !userScrolledUp) {
            instantTeleportToBottom();
        }
        
        showSendButton();
        
        chat.messages[lastAIMessageIndex].content = fullResponse;
        chat.lastMessage = fullResponse.substring(0, 50) + 
                          (fullResponse.length > 50 ? '...' : '');
        chat.updated = Date.now();
        chatStorage.save(currentChatId, chat);
        
        currentAIMessage = null;
        truncatedAIResponse = '';
        
        renderChatsList();
        
    } catch (error) {
        console.error('Ошибка продолжения:', error);
        
        if (typingIndicator) typingIndicator.remove();
        
        isAITyping = false;
        isStreaming = false;
        
        stopAutoScroll();
        showSendButton();
        
        if (!shouldStopTyping) {
            if (autoScrollEnabled && !userScrolledUp) {
                instantTeleportToBottom();
            }
            showError('Ошибка: ' + error.message);
        }
    }
}

function stopAITyping() {
    shouldStopTyping = true;
    isAITyping = false;
    isStreaming = false;
    
    if (typingAbortController) {
        typingAbortController.abort();
        typingAbortController = null;
    }
    
    if (currentAIMessage) {
        const textElement = currentAIMessage.querySelector('.message-text');
        if (textElement) {
            truncatedAIResponse = textElement.textContent || textElement.innerText;
            
            const oldContinueBtn = currentAIMessage.querySelector('.continue-btn');
            if (oldContinueBtn) oldContinueBtn.remove();
            
            const continueBtn = createContinueButton();
            currentAIMessage.querySelector('.message-content').appendChild(continueBtn);
        }
    }
    
    showSendButton();
    stopAutoScroll();
}

async function sendMessage() {
    if (!isInitialized) {
        showError('Приложение еще не готово. Подождите...');
        return;
    }
    
    const text = elements.messageInput.value.trim();
    
    if (!text) return;
    
    if (isTyping || isStreaming) return;
    
    if (!currentChatId) {
        createNewChat();
    }
    
    const chat = chatStorage.get(currentChatId);
    if (!chat) {
        createNewChat();
        return;
    }
    
    currentAIMessage = null;
    truncatedAIResponse = '';
    
    chat.messages.push({
        role: 'user',
        content: text,
        timestamp: Date.now()
    });
    
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    hideSendButton();
    
    chat.lastMessage = text.substring(0, 50) + (text.length > 50 ? '...' : '');
    chat.updated = Date.now();
    
    chatStorage.save(currentChatId, chat);
    
    hideWelcomeScreen();
    renderMessages(chat.messages);
    
    hideScrollDownButton();
    enableAutoScroll();
    instantTeleportToBottom();
    showTypingIndicator();
    isTyping = true;
    
    try {
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...chat.messages.map(m => ({
                role: m.role,
                content: m.content
            }))
        ];
        
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'BotHost AI Support'
            },
            body: JSON.stringify({
                model: SELECTED_MODEL,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const aiText = data.choices[0]?.message?.content;
        
        if (!aiText) throw new Error('Пустой ответ');
        
        hideTypingIndicator();
        isTyping = false;
        showStopButton();
        isAITyping = true;
        shouldStopTyping = false;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-text"></div>
            </div>
        `;
        
        elements.chatContainer.appendChild(messageDiv);
        currentAIMessage = messageDiv;
        
        enableAutoScroll();
        startAutoScroll();
        
        isStreaming = true;
        typingAbortController = new AbortController();
        const textElement = messageDiv.querySelector('.message-text');
        
        await typeText(textElement, aiText, 5, typingAbortController.signal);
        
        isStreaming = false;
        isAITyping = false;
        typingAbortController = null;
        
        stopAutoScroll();
        
        if (autoScrollEnabled && !userScrolledUp) {
            instantTeleportToBottom();
        }
        
        if (elements.messageInput && elements.messageInput.value.trim()) {
            showSendButton();
        } else {
            hideSendButton();
        }
        
        chat.messages.push({
            role: 'assistant',
            content: aiText,
            timestamp: Date.now()
        });
        
        if (chat.messages.length === 2 && !chat.titleSet) {
            chat.title = generateChatTitle(text);
            chat.titleSet = true;
            if (elements.chatTitle) {
                elements.chatTitle.textContent = chat.title;
            }
        }
        
        chat.lastMessage = aiText.substring(0, 50) + (aiText.length > 50 ? '...' : '');
        chat.updated = Date.now();
        chatStorage.save(currentChatId, chat);
        
        renderChatsList();
        
    } catch (error) {
        console.error('Ошибка OpenRouter:', error);
        
        hideTypingIndicator();
        isTyping = false;
        isAITyping = false;
        stopAutoScroll();
        
        if (elements.messageInput && elements.messageInput.value.trim()) {
            showSendButton();
        } else {
            hideSendButton();
        }
        
        if (!shouldStopTyping) {
            if (autoScrollEnabled && !userScrolledUp) {
                instantTeleportToBottom();
            }
            
            let errorMessage = 'Ошибка подключения';
            
            if (error.message.includes('401')) {
                errorMessage = 'Неверный API ключ OpenRouter';
            } else if (error.message.includes('402')) {
                errorMessage = 'Недостаточно средств на счете';
            } else if (error.message.includes('429')) {
                errorMessage = 'Слишком много запросов';
            } else if (error.message.includes('Network')) {
                errorMessage = 'Проблемы с сетью';
            } else {
                errorMessage = error.message;
            }
            
            showError(errorMessage);
            
            if (chat.messages.length > 0 && chat.messages[chat.messages.length - 1].role === 'user') {
                chat.messages.pop();
                chatStorage.save(currentChatId, chat);
                renderMessages(chat.messages);
            }
        }
    }
}

function startAutoScroll() {
    stopAutoScroll();
    
    if (autoScrollEnabled && !userScrolledUp) {
        scrollInterval = setInterval(() => {
            if (autoScrollEnabled && !userScrolledUp) {
                const container = getScrollContainer();
                if (container) {
                    const currentScroll = container.scrollTop;
                    const targetScroll = container.scrollHeight;
                    
                    if (currentScroll < targetScroll - 100) {
                        container.scrollTop = Math.min(currentScroll + 3, targetScroll);
                    }
                }
            }
        }, 10);
    }
}

function stopAutoScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
}

function enableAutoScroll() {
    autoScrollEnabled = true;
    userScrolledUp = false;
    hideScrollDownButton();
}

function generateChatTitle(firstMessage) {
    const words = firstMessage.split(' ').slice(0, 3).join(' ');
    return words.length > 20 ? words.substring(0, 20) + '...' : words;
}

function showTypingIndicator() {
    if (elements.typingIndicator) {
        elements.typingIndicator.classList.remove('hidden');
        elements.typingIndicator.classList.add('active');
        
        if (autoScrollEnabled && !userScrolledUp) {
            instantTeleportToBottom();
        }
    }
}

function hideTypingIndicator() {
    if (elements.typingIndicator) {
        elements.typingIndicator.classList.add('hidden');
        elements.typingIndicator.classList.remove('active');
    }
}

function showError(text) {
    if (!elements.chatContainer) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message ai-message error-message';
    errorDiv.innerHTML = `
        <div class="message-content">
            <div class="message-text">
                <i class="fas fa-exclamation-circle"></i> ${escapeHtml(text)}
            </div>
        </div>
    `;
    elements.chatContainer.appendChild(errorDiv);
    
    if (autoScrollEnabled && !userScrolledUp) {
        instantTeleportToBottom();
    }
}

async function typeText(element, text, speed = 5, abortSignal, startFrom = 0) {
    return new Promise((resolve, reject) => {
        let i = startFrom;
        let buffer = text.substring(0, startFrom);
        
        if (!element || !text) {
            resolve();
            return;
        }
        
        element.innerHTML = formatMessage(buffer);
        
        function typeChar() {
            if (shouldStopTyping || (abortSignal && abortSignal.aborted)) {
                if (buffer.trim()) {
                    element.innerHTML = formatMessage(buffer);
                    highlightAndFormatCode();
                }
                resolve();
                return;
            }
            
            if (i < text.length) {
                const char = text.charAt(i);
                buffer += char;
                
                element.innerHTML = formatMessage(buffer);
                
                i++;
                
                if (i % 20 === 0) {
                    highlightAndFormatCode();
                }
                
                if (i % 10 === 0 && autoScrollEnabled && !userScrolledUp) {
                    const container = getScrollContainer();
                    if (container) {
                        const currentScroll = container.scrollTop;
                        const targetScroll = container.scrollHeight;
                        
                        if (currentScroll < targetScroll - 100) {
                            container.scrollTop = Math.min(currentScroll + 5, targetScroll);
                        }
                    }
                }
                
                setTimeout(typeChar, speed);
            } else {
                element.innerHTML = formatMessage(text);
                highlightAndFormatCode();
                resolve();
            }
        }
        
        if (abortSignal) {
            abortSignal.addEventListener('abort', () => {
                shouldStopTyping = true;
            });
        }
        
        typeChar();
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function initApp() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`Сервер недоступен: HTTP ${response.status}`);
        }
        
        const config = await response.json();
        
        if (window.Telegram?.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
        }
        
        // Проверяем наличие ключа OpenRouter
        if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'sk-or-v1-...') {
            console.warn('OpenRouter API ключ не настроен');
            showError('Вставьте свой OpenRouter API ключ в файл script.js');
        }
        
        createNewChat();
        hideScrollDownButton();
        hideSendButton();
        
        if (elements.messageInput) {
            setTimeout(() => {
                elements.messageInput.focus();
            }, 500);
        }
        
        isInitialized = true;
        console.log('✅ Приложение готово, используется модель:', SELECTED_MODEL);
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showError('Ошибка подключения к серверу.');
    }
}

window.deleteChat = deleteChat;
window.instantTeleportToBottom = instantTeleportToBottom;
window.copyCode = copyCode;