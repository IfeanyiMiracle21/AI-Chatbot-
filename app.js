// app.js - Frontend JavaScript

class ChatBot {
    constructor() {
        this.messages = [];
        this.currentChatId = this.generateChatId();
        this.chatHistory = this.loadChatHistory();
        this.settings = this.loadSettings();
        this.isProcessing = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadCurrentChat();
        this.renderChatHistory();
    }

    initializeElements() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.chatForm = document.getElementById('chatForm');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.charCount = document.getElementById('charCount');
        this.themeToggle = document.getElementById('themeToggle');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettings = document.getElementById('closeSettings');
        this.saveSettings = document.getElementById('saveSettings');
        this.voiceBtn = document.getElementById('voiceBtn');
    }

    attachEventListeners() {
        // Form submission
        this.chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Enter to send, Shift+Enter for new line
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
            this.updateCharCount();
        });

        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        // New chat
        this.newChatBtn.addEventListener('click', () => this.startNewChat());

        // Clear chat
        this.clearBtn.addEventListener('click', () => this.clearChat());

        // Export chat
        this.exportBtn.addEventListener('click', () => this.exportChat());

        // Settings modal
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeSettings.addEventListener('click', () => this.closeSettingsModal());
        this.saveSettings.addEventListener('click', () => this.saveSettingsData());

        // Suggestion buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-btn')) {
                const prompt = e.target.dataset.prompt;
                this.messageInput.value = prompt;
                this.sendMessage();
            }
        });

        // Voice input
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());

        // Copy code buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-code-btn')) {
                this.copyCode(e.target);
            }
        });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message || this.isProcessing) return;

        // Hide welcome message
        const welcomeMsg = document.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.style.display = 'none';

        // Add user message
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.updateCharCount();

        // Show typing indicator
        this.showTyping();
        this.isProcessing = true;

        try {
            const response = await this.callAPI(message);
            this.hideTyping();
            this.addMessage('bot', response);
        } catch (error) {
            this.hideTyping();
            this.addMessage('bot', `❌ Error: ${error.message}. Please check if your backend server is running on ${this.settings.apiEndpoint}`);
        }

        this.isProcessing = false;
        this.saveChatHistory();
    }

    async callAPI(message) {
        const endpoint = this.settings.apiEndpoint || 'http://localhost:3000/api/chat';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                conversationHistory: this.messages.slice(-10) // Send last 10 messages for context
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response || data.message || 'No response from API';
    }

    addMessage(type, content) {
        const message = {
            type,
            content,
            timestamp: new Date().toISOString()
        };

        this.messages.push(message);

        const messageElement = this.createMessageElement(message);
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();

        // Process markdown and code highlighting
        if (type === 'bot') {
            this.processMarkdown(messageElement);
        }
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.type}-message`;

        const avatar = message.type === 'user' ? '👤' : '🤖';
        const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        div.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-bubble">${this.escapeHtml(message.content)}</div>
                <span class="message-time">${time}</span>
            </div>
        `;

        return div;
    }

    processMarkdown(element) {
        const bubble = element.querySelector('.message-bubble');
        const content = bubble.textContent;
        
        // Convert markdown to HTML
        bubble.innerHTML = marked.parse(content);

        // Highlight code blocks
        bubble.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
            this.addCopyButton(block.parentElement);
        });
    }

    addCopyButton(preElement) {
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.textContent = 'Copy';
        button.onclick = () => this.copyCode(button);
        preElement.style.position = 'relative';
        preElement.appendChild(button);
    }

    copyCode(button) {
        const codeBlock = button.parentElement.querySelector('code');
        const code = codeBlock.textContent;
        
        navigator.clipboard.writeText(code).then(() => {
            button.textContent = '✓ Copied!';
            setTimeout(() => {
                button.textContent = 'Copy';
            }, 2000);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showTyping() {
        this.typingIndicator.classList.add('active');
        this.scrollToBottom();
    }

    hideTyping() {
        this.typingIndicator.classList.remove('active');
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = `${count} / 4000`;
        
        if (count > 4000) {
            this.charCount.style.color = '#e53e3e';
        } else {
            this.charCount.style.color = 'var(--text-secondary)';
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const icon = this.themeToggle;
        icon.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    }

    startNewChat() {
        if (this.messages.length > 0) {
            this.saveChatHistory();
        }
        
        this.currentChatId = this.generateChatId();
        this.messages = [];
        this.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🤖</div>
                <h2>Welcome to AI Chatbot!</h2>
                <p>I'm powered by Claude AI. Ask me anything - from coding help to creative writing!</p>
                <div class="suggestions">
                    <button class="suggestion-btn" data-prompt="Explain quantum computing in simple terms">Explain quantum computing</button>
                    <button class="suggestion-btn" data-prompt="Write a Python function to sort a list">Help me code in Python</button>
                    <button class="suggestion-btn" data-prompt="Give me creative writing prompts">Creative writing ideas</button>
                    <button class="suggestion-btn" data-prompt="What are the latest trends in web development?">Web dev trends</button>
                </div>
            </div>
        `;
        
        this.renderChatHistory();
    }

    clearChat() {
        if (confirm('Are you sure you want to clear this chat?')) {
            this.messages = [];
            this.startNewChat();
        }
    }

    exportChat() {
        const chatData = {
            id: this.currentChatId,
            timestamp: new Date().toISOString(),
            messages: this.messages
        };

        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${this.currentChatId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveChatHistory() {
        if (!this.settings.saveHistory) return;

        const chatIndex = this.chatHistory.findIndex(chat => chat.id === this.currentChatId);
        
        const chatData = {
            id: this.currentChatId,
            title: this.messages[0]?.content.substring(0, 50) || 'New Chat',
            timestamp: new Date().toISOString(),
            messages: this.messages
        };

        if (chatIndex !== -1) {
            this.chatHistory[chatIndex] = chatData;
        } else {
            this.chatHistory.unshift(chatData);
        }

        // Keep only last 50 chats
        if (this.chatHistory.length > 50) {
            this.chatHistory = this.chatHistory.slice(0, 50);
        }

        localStorage.setItem('chatHistory', JSON.stringify(this.chatHistory));
        this.renderChatHistory();
    }

    loadChatHistory() {
        const history = localStorage.getItem('chatHistory');
        return history ? JSON.parse(history) : [];
    }

    loadCurrentChat() {
        const savedChat = this.chatHistory.find(chat => chat.id === this.currentChatId);
        if (savedChat) {
            this.messages = savedChat.messages;
            this.renderMessages();
        }
    }

    renderMessages() {
        this.messagesContainer.innerHTML = '';
        this.messages.forEach(msg => {
            const element = this.createMessageElement(msg);
            this.messagesContainer.appendChild(element);
            if (msg.type === 'bot') {
                this.processMarkdown(element);
            }
        });
        this.scrollToBottom();
    }

    renderChatHistory() {
        const historyList = document.getElementById('chatHistoryList');
        historyList.innerHTML = '';

        this.chatHistory.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = chat.title;
            item.onclick = () => this.loadChat(chat.id);
            historyList.appendChild(item);
        });
    }

    loadChat(chatId) {
        const chat = this.chatHistory.find(c => c.id === chatId);
        if (chat) {
            this.currentChatId = chatId;
            this.messages = chat.messages;
            this.renderMessages();
            
            const welcomeMsg = document.querySelector('.welcome-message');
            if (welcomeMsg) welcomeMsg.style.display = 'none';
        }
    }

    openSettings() {
        this.settingsModal.classList.add('active');
        document.getElementById('apiEndpoint').value = this.settings.apiEndpoint;
        document.getElementById('maxTokens').value = this.settings.maxTokens;
        document.getElementById('streamResponse').checked = this.settings.streamResponse;
        document.getElementById('saveHistory').checked = this.settings.saveHistory;
    }

    closeSettingsModal() {
        this.settingsModal.classList.remove('active');
    }

    saveSettingsData() {
        this.settings = {
            apiEndpoint: document.getElementById('apiEndpoint').value,
            maxTokens: parseInt(document.getElementById('maxTokens').value),
            streamResponse: document.getElementById('streamResponse').checked,
            saveHistory: document.getElementById('saveHistory').checked
        };

        localStorage.setItem('chatbotSettings', JSON.stringify(this.settings));
        this.closeSettingsModal();
        alert('Settings saved successfully!');
    }

    loadSettings() {
        const saved = localStorage.getItem('chatbotSettings');
        return saved ? JSON.parse(saved) : {
            apiEndpoint: 'http://localhost:3000/api/chat',
            maxTokens: 1024,
            streamResponse: true,
            saveHistory: true
        };
    }

    toggleVoiceInput() {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser. Please use Chrome.');
            return;
        }

        if (this.voiceBtn.classList.contains('recording')) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }

    startVoiceInput() {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            this.voiceBtn.classList.add('recording');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.messageInput.value = transcript;
            this.autoResizeTextarea();
            this.updateCharCount();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stopVoiceInput();
        };

        recognition.onend = () => {
            this.stopVoiceInput();
        };

        this.recognition = recognition;
        recognition.start();
    }

    stopVoiceInput() {
        if (this.recognition) {
            this.recognition.stop();
        }
        this.voiceBtn.classList.remove('recording');
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggle').textContent = '☀️';
    }

    // Initialize chatbot
    window.chatbot = new ChatBot();
});
