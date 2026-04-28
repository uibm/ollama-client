const app = (() => {
    let state = {
        currentConversationId: null,
        conversations: {},
        currentModel: null,
        models: [],
        userIP: null,
        isGenerating: false,
        incognitoMode: false,
        mode: 'chat',
        settings: {
            systemPrompt: '',
            temperature: 0.8,
            topP: 0.9,
            topK: 40,
            maxTokens: 2048
        }
    };

    const API_BASE = '';

    const utils = {
        formatBytes: (bytes) => {
            if (!bytes) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        },

        formatTime: (date) => {
            return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        },

        formatDate: (date) => {
            const d = new Date(date);
            const now = new Date();
            const diff = now - d;
            
            if (diff < 86400000) return 'Today';
            if (diff < 172800000) return 'Yesterday';
            return d.toLocaleDateString();
        },

        debounce: (func, wait) => {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
    };

    const api = {
        async getUserIP() {
            try {
                const response = await fetch(`${API_BASE}/api/user/ip`);
                const data = await response.json();
                return data.ip;
            } catch (error) {
                console.error('Failed to get IP:', error);
                return 'local';
            }
        },

        async loadConversations(ip) {
            try {
                const response = await fetch(`${API_BASE}/api/conversations?ip=${ip}`);
                return await response.json();
            } catch (error) {
                console.error('Failed to load conversations:', error);
                return {};
            }
        },

        async saveConversations(ip, conversations) {
            try {
                const response = await fetch(`${API_BASE}/api/conversations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip, conversations })
                });
                return await response.json();
            } catch (error) {
                console.error('Failed to save conversations:', error);
                throw error;
            }
        },

        async loadSettings(ip) {
            try {
                const response = await fetch(`${API_BASE}/api/settings?ip=${ip}`);
                return await response.json();
            } catch (error) {
                console.error('Failed to load settings:', error);
                return null;
            }
        },

        async saveSettings(ip, settings) {
            try {
                const response = await fetch(`${API_BASE}/api/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip, settings })
                });
                return await response.json();
            } catch (error) {
                console.error('Failed to save settings:', error);
                throw error;
            }
        },

        async loadModels() {
            try {
                const response = await fetch(`${API_BASE}/api/ollama/tags`);
                return await response.json();
            } catch (error) {
                console.error('Failed to load models:', error);
                throw error;
            }
        },

        async generateChat(model, messages, options, onChunk) {
            try {
                const response = await fetch(`${API_BASE}/api/ollama/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        messages,
                        stream: true,
                        options
                    })
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const json = JSON.parse(line);
                            await onChunk(json);
                        } catch (e) {
                            console.warn('Failed to parse chunk:', e);
                        }
                    }
                }
            } catch (error) {
                console.error('Generate chat error:', error);
                throw error;
            }
        },

        async generateCompletion(model, prompt, options, onChunk) {
            try {
                const response = await fetch(`${API_BASE}/api/ollama/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        prompt,
                        stream: true,
                        options
                    })
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const json = JSON.parse(line);
                            await onChunk(json);
                        } catch (e) {
                            console.warn('Failed to parse chunk:', e);
                        }
                    }
                }
            } catch (error) {
                console.error('Generate completion error:', error);
                throw error;
            }
        },

        async deleteModel(name) {
            const response = await fetch(`${API_BASE}/api/ollama/delete`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            return await response.json();
        },

        async pullModel(name) {
            const response = await fetch(`${API_BASE}/api/ollama/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            return response;
        }
    };

    const ui = {
        showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'toastSlideIn 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },

        updateConnectionStatus(connected) {
            const dot = document.getElementById('statusDot');
            const text = document.getElementById('statusText');
            
            if (connected) {
                dot.classList.remove('error');
                text.textContent = 'Connected';
            } else {
                dot.classList.add('error');
                text.textContent = 'Disconnected';
            }
        },

        renderConversationsList() {
            const container = document.getElementById('conversationsList');
            const sorted = Object.values(state.conversations).sort((a, b) => 
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );

            if (sorted.length === 0) {
                container.innerHTML = '<div class="empty-state" style="padding: 32px;"><div class="empty-state-text">No conversations yet</div></div>';
                return;
            }

            container.innerHTML = sorted.map(conv => `
                <div class="conversation-item ${conv.id === state.currentConversationId ? 'active' : ''}" 
                     onclick="app.selectConversation('${conv.id}')">
                    <div class="conversation-header">
                        <div class="conversation-title">${conv.title}</div>
                        <div class="conversation-actions">
                            <button class="conversation-action-btn" onclick="event.stopPropagation(); app.deleteConversation('${conv.id}')">
                                ✕
                            </button>
                        </div>
                    </div>
                    <div class="conversation-meta">
                        <span>${utils.formatDate(conv.updatedAt)}</span>
                        <span class="conversation-model">${conv.model || 'No model'}</span>
                    </div>
                </div>
            `).join('');
        },

        renderChat() {
            const chatArea = document.getElementById('chatArea');
            
            if (!state.currentConversationId) {
                chatArea.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-title">Start a Conversation</div>
                        <div class="empty-state-text">
                            Select a model and start chatting. ${state.incognitoMode ? 'Incognito mode is ON - this conversation will not be saved.' : 'Your conversations are saved to JSON files on the server.'}
                        </div>
                    </div>
                `;
                return;
            }

            const conversation = state.conversations[state.currentConversationId];
            if (!conversation) return;

            chatArea.innerHTML = conversation.messages.map(msg => ui.renderMessage(msg)).join('');
            chatArea.scrollTop = chatArea.scrollHeight;
        },

        renderMessage(message) {
            const time = utils.formatTime(message.timestamp);
            const content = marked.parse(message.content);
            
            return `
                <div class="message ${message.role}">
                    <div class="message-avatar">${message.role === 'user' ? 'U' : 'AI'}</div>
                    <div class="message-content">
                        <div class="message-header">
                            <span class="message-role">${message.role === 'user' ? 'You' : 'Assistant'}</span>
                            <span class="message-time">${time}</span>
                        </div>
                        <div class="message-text">${content}</div>
                        <div class="message-actions">
                            <button class="action-btn" onclick="app.copyMessage('${message.id}')">Copy</button>
                            ${message.role === 'assistant' ? `<button class="action-btn" onclick="app.regenerateResponse('${message.id}')">Regenerate</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
    };

    return {
        async init() {
            console.log('Initializing Local GPT...');
            
            state.userIP = await api.getUserIP();
            console.log('User IP:', state.userIP);
            
            await this.loadSettings();
            await this.loadConversations();
            await this.loadModels();
            this.setupTheme();
            this.setupMarkdown();

            ui.updateConnectionStatus(true);
            ui.showToast('Connected to Local GPT Server', 'success');
        },

        async loadSettings() {
            const saved = await api.loadSettings(state.userIP);
            if (saved && Object.keys(saved).length > 0) {
                state.settings = { ...state.settings, ...saved };
            }
            
            document.getElementById('systemPrompt').value = state.settings.systemPrompt;
            document.getElementById('temperature').value = state.settings.temperature;
            document.getElementById('temperatureValue').textContent = state.settings.temperature;
            document.getElementById('topP').value = state.settings.topP;
            document.getElementById('topPValue').textContent = state.settings.topP;
            document.getElementById('topK').value = state.settings.topK;
            document.getElementById('topKValue').textContent = state.settings.topK;
            document.getElementById('maxTokens').value = state.settings.maxTokens;
        },

        async saveSettings() {
            state.settings.systemPrompt = document.getElementById('systemPrompt').value;
            state.settings.temperature = parseFloat(document.getElementById('temperature').value);
            state.settings.topP = parseFloat(document.getElementById('topP').value);
            state.settings.topK = parseInt(document.getElementById('topK').value);
            state.settings.maxTokens = parseInt(document.getElementById('maxTokens').value);

            try {
                await api.saveSettings(state.userIP, state.settings);
                ui.showToast('Settings saved to server', 'success');
            } catch (error) {
                ui.showToast('Failed to save settings', 'error');
            }
        },

        async loadConversations() {
            if (state.incognitoMode) return;
            
            state.conversations = await api.loadConversations(state.userIP);
            ui.renderConversationsList();
        },

        async saveConversations() {
            if (state.incognitoMode) return;
            
            try {
                await api.saveConversations(state.userIP, state.conversations);
                ui.renderConversationsList();
            } catch (error) {
                ui.showToast('Failed to save conversations', 'error');
            }
        },

        async loadModels() {
            try {
                const data = await api.loadModels();
                state.models = data.models || [];
                
                const selector = document.getElementById('modelSelector');
                selector.innerHTML = state.models.map(model => 
                    `<option value="${model.name}">${model.name}</option>`
                ).join('');
                
                if (state.models.length > 0) {
                    state.currentModel = state.models[0].name;
                    selector.value = state.currentModel;
                }
                
                ui.updateConnectionStatus(true);
            } catch (error) {
                ui.showToast('Failed to load models. Is Ollama running?', 'error');
                ui.updateConnectionStatus(false);
            }
        },

        createNewConversation() {
            const id = Date.now().toString();
            const conv = {
                id,
                title: 'New Conversation',
                messages: [],
                model: state.currentModel,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            state.conversations[id] = conv;
            state.currentConversationId = id;
            
            if (!state.incognitoMode) {
                this.saveConversations();
            }
            
            ui.renderChat();
            ui.showToast(state.incognitoMode ? 'Incognito conversation started' : 'New conversation created', 'success');
        },

        selectConversation(id) {
            state.currentConversationId = id;
            ui.renderConversationsList();
            ui.renderChat();
        },

        async deleteConversation(id) {
            if (confirm('Delete this conversation?')) {
                delete state.conversations[id];
                if (state.currentConversationId === id) {
                    state.currentConversationId = null;
                    ui.renderChat();
                }
                await this.saveConversations();
                ui.showToast('Conversation deleted', 'success');
            }
        },

        toggleIncognito() {
            state.incognitoMode = !state.incognitoMode;
            const toggle = document.getElementById('incognitoToggle');
            toggle.classList.toggle('active');
            
            ui.showToast(state.incognitoMode ? 'Incognito mode enabled' : 'Incognito mode disabled', state.incognitoMode ? 'warning' : 'success');
        },

        setMode(mode) {
            state.mode = mode;
            document.getElementById('chatModeBtn').classList.toggle('active', mode === 'chat');
            document.getElementById('completionModeBtn').classList.toggle('active', mode === 'completion');
            ui.showToast(`Switched to ${mode} mode`, 'success');
        },

        async sendMessage() {
            if (state.isGenerating) return;

            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message) return;
            if (!state.currentConversationId) this.createNewConversation();
            if (!state.currentModel) {
                ui.showToast('Please select a model', 'error');
                return;
            }

            const conversation = state.conversations[state.currentConversationId];
            
            const userMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            };
            
            conversation.messages.push(userMessage);
            
            if (conversation.messages.length === 1) {
                conversation.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
            }
            
            conversation.updatedAt = new Date().toISOString();
            await this.saveConversations();
            ui.renderChat();

            input.value = '';
            this.autoResize(input);

            const chatArea = document.getElementById('chatArea');
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message assistant';
            typingDiv.id = 'typing-indicator';
            typingDiv.innerHTML = `
                <div class="message-avatar">AI</div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            `;
            chatArea.appendChild(typingDiv);
            chatArea.scrollTop = chatArea.scrollHeight;

            state.isGenerating = true;
            document.getElementById('sendBtn').disabled = true;

            try {
                const assistantMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: '',
                    timestamp: new Date().toISOString()
                };

                if (state.mode === 'chat') {
                    await this.generateChatResponse(conversation, assistantMessage);
                } else {
                    await this.generateCompletion(message, assistantMessage);
                }
                
                conversation.messages.push(assistantMessage);
                conversation.updatedAt = new Date().toISOString();
                await this.saveConversations();
                
                typingDiv.remove();
                ui.renderChat();
                
            } catch (error) {
                ui.showToast('Failed to generate response: ' + error.message, 'error');
                typingDiv.remove();
            } finally {
                state.isGenerating = false;
                document.getElementById('sendBtn').disabled = false;
            }
        },

        async generateChatResponse(conversation, assistantMessage) {
            const messages = conversation.messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            if (state.settings.systemPrompt) {
                messages.unshift({
                    role: 'system',
                    content: state.settings.systemPrompt
                });
            }

            await api.generateChat(
                state.currentModel,
                messages,
                {
                    temperature: state.settings.temperature,
                    top_p: state.settings.topP,
                    top_k: state.settings.topK,
                    num_predict: state.settings.maxTokens
                },
                (chunk) => {
                    if (chunk.message?.content) {
                        assistantMessage.content += chunk.message.content;
                    }
                }
            );
        },

        async generateCompletion(prompt, assistantMessage) {
            let fullPrompt = prompt;
            if (state.settings.systemPrompt) {
                fullPrompt = `${state.settings.systemPrompt}\n\n${prompt}`;
            }

            await api.generateCompletion(
                state.currentModel,
                fullPrompt,
                {
                    temperature: state.settings.temperature,
                    top_p: state.settings.topP,
                    top_k: state.settings.topK,
                    num_predict: state.settings.maxTokens
                },
                (chunk) => {
                    if (chunk.response) {
                        assistantMessage.content += chunk.response;
                    }
                }
            );
        },

        changeModel(modelName) {
            state.currentModel = modelName;
            if (state.currentConversationId) {
                state.conversations[state.currentConversationId].model = modelName;
                this.saveConversations();
            }
        },

        toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const container = document.getElementById('appContainer');
            
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('open');
            } else {
                container.classList.toggle('sidebar-collapsed');
            }
        },

        toggleSettings() {
            document.getElementById('settingsPanel').classList.toggle('open');
        },

        toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            
            const icon = document.getElementById('themeIcon');
            icon.textContent = next === 'light' ? '☀' : '◐';
        },

        setupTheme() {
            const saved = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', saved);
            
            const icon = document.getElementById('themeIcon');
            icon.textContent = saved === 'light' ? '☀' : '◐';
        },

        setupMarkdown() {
            marked.setOptions({
                highlight: function(code, lang) {
                    if (lang && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return hljs.highlightAuto(code).value;
                },
                breaks: true,
                gfm: true
            });

            marked.use({
                renderer: {
                    code(code, lang) {
                        const highlighted = lang && hljs.getLanguage(lang)
                            ? hljs.highlight(code, { language: lang }).value
                            : hljs.highlightAuto(code).value;
                        
                        return `<pre><button class="copy-code-btn" onclick="app.copyCode(this)">Copy</button><code class="hljs">${highlighted}</code></pre>`;
                    }
                }
            });
        },

        copyCode(button) {
            const code = button.nextElementSibling.textContent;
            navigator.clipboard.writeText(code);
            button.textContent = 'Copied!';
            setTimeout(() => button.textContent = 'Copy', 2000);
        },

        copyMessage(messageId) {
            const conversation = state.conversations[state.currentConversationId];
            const message = conversation.messages.find(m => m.id === messageId);
            navigator.clipboard.writeText(message.content);
            ui.showToast('Copied to clipboard', 'success');
        },

        async regenerateResponse(messageId) {
            const conversation = state.conversations[state.currentConversationId];
            const index = conversation.messages.findIndex(m => m.id === messageId);
            
            if (index > 0) {
                conversation.messages = conversation.messages.slice(0, index);
                await this.saveConversations();
                ui.renderChat();
                
                const lastUserMessage = conversation.messages[conversation.messages.length - 1];
                document.getElementById('messageInput').value = lastUserMessage.content;
                conversation.messages.pop();
                await this.sendMessage();
            }
        },

        exportConversation() {
            if (!state.currentConversationId) {
                ui.showToast('No conversation to export', 'error');
                return;
            }

            const conversation = state.conversations[state.currentConversationId];
            const data = JSON.stringify(conversation, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conversation_${conversation.id}.json`;
            a.click();
            URL.revokeObjectURL(url);
            ui.showToast('Conversation exported', 'success');
        },

        searchConversations: utils.debounce(function(query) {
            const items = document.querySelectorAll('.conversation-item');
            items.forEach(item => {
                const title = item.querySelector('.conversation-title').textContent.toLowerCase();
                item.style.display = title.includes(query.toLowerCase()) ? 'block' : 'none';
            });
        }, 300),

        async openModelManagement() {
            const content = `
                <div class="model-list">
                    ${state.models.map(model => `
                        <div class="model-item">
                            <div class="model-info">
                                <div class="model-name">${model.name}</div>
                                <div class="model-size">${utils.formatBytes(model.size)}</div>
                            </div>
                            <button class="delete-model-btn" onclick="app.deleteModel('${model.name}')">Delete</button>
                        </div>
                    `).join('')}
                </div>
                <div class="setting-group" style="margin-top: 24px;">
                    <label class="setting-label">Pull New Model</label>
                    <input type="text" class="setting-input" id="pullModelInput" placeholder="Enter model name (e.g., llama2)...">
                </div>
            `;

            this.openModal('Model Management', content, 'Pull Model', async () => {
                const modelName = document.getElementById('pullModelInput').value.trim();
                if (modelName) {
                    await this.pullModel(modelName);
                }
            });
        },

        async pullModel(modelName) {
            ui.showToast(`Pulling model: ${modelName}...`, 'warning');
            this.closeModal();
            
            try {
                await api.pullModel(modelName);
                ui.showToast('Model pulled successfully', 'success');
                await this.loadModels();
            } catch (error) {
                ui.showToast('Failed to pull model: ' + error.message, 'error');
            }
        },

        async deleteModel(modelName) {
            if (!confirm(`Delete model: ${modelName}?`)) return;

            try {
                await api.deleteModel(modelName);
                ui.showToast('Model deleted', 'success');
                await this.loadModels();
                this.closeModal();
            } catch (error) {
                ui.showToast('Failed to delete model: ' + error.message, 'error');
            }
        },

        openModal(title, content, actionText, actionCallback) {
            document.getElementById('modalHeader').textContent = title;
            document.getElementById('modalContent').innerHTML = content;
            document.getElementById('modalActionBtn').textContent = actionText;
            document.getElementById('modalActionBtn').onclick = actionCallback;
            document.getElementById('modalOverlay').classList.add('open');
        },

        closeModal(event) {
            if (!event || event.target.id === 'modalOverlay') {
                document.getElementById('modalOverlay').classList.remove('open');
            }
        },

        updateSliderValue(id, value) {
            document.getElementById(id + 'Value').textContent = value;
        },

        handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                this.sendMessage();
            }
        },

        autoResize(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
        }
    };
})();

window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
