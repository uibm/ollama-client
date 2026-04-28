const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DATA_DIR = path.join(__dirname, '../data');

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create data directory:', error);
    }
}

// Get user data file path
function getUserDataPath(ip) {
    const sanitizedIP = ip.replace(/[^a-zA-Z0-9]/g, '_');
    return path.join(DATA_DIR, `conversations_${sanitizedIP}.json`);
}

// Load conversations for user
async function loadConversations(ip) {
    try {
        const filePath = getUserDataPath(ip);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        throw error;
    }
}

// Save conversations for user
async function saveConversations(ip, conversations) {
    try {
        const filePath = getUserDataPath(ip);
        await fs.writeFile(filePath, JSON.stringify(conversations, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Failed to save conversations:', error);
        throw error;
    }
}

// Load settings for user
async function loadSettings(ip) {
    try {
        const sanitizedIP = ip.replace(/[^a-zA-Z0-9]/g, '_');
        const filePath = path.join(DATA_DIR, `settings_${sanitizedIP}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

// Save settings for user
async function saveSettings(ip, settings) {
    try {
        const sanitizedIP = ip.replace(/[^a-zA-Z0-9]/g, '_');
        const filePath = path.join(DATA_DIR, `settings_${sanitizedIP}.json`);
        await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        throw error;
    }
}

// API Routes

// Get user IP
app.get('/api/user/ip', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'local';
    res.json({ ip });
});

// Get conversations
app.get('/api/conversations', async (req, res) => {
    try {
        const ip = req.query.ip || 'local';
        const conversations = await loadConversations(ip);
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load conversations' });
    }
});

// Save conversations
app.post('/api/conversations', async (req, res) => {
    try {
        const { ip, conversations } = req.body;
        await saveConversations(ip || 'local', conversations);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save conversations' });
    }
});

// Delete conversation
app.delete('/api/conversations/:id', async (req, res) => {
    try {
        const { ip } = req.query;
        const { id } = req.params;
        const conversations = await loadConversations(ip || 'local');
        delete conversations[id];
        await saveConversations(ip || 'local', conversations);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

// Get settings
app.get('/api/settings', async (req, res) => {
    try {
        const ip = req.query.ip || 'local';
        const settings = await loadSettings(ip);
        res.json(settings || {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to load settings' });
    }
});

// Save settings
app.post('/api/settings', async (req, res) => {
    try {
        const { ip, settings } = req.body;
        await saveSettings(ip || 'local', settings);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// Export conversation
app.get('/api/conversations/:id/export', async (req, res) => {
    try {
        const { ip } = req.query;
        const { id } = req.params;
        const conversations = await loadConversations(ip || 'local');
        const conversation = conversations[id];
        
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="conversation_${id}.json"`);
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error: 'Failed to export conversation' });
    }
});

// Import conversation
app.post('/api/conversations/import', async (req, res) => {
    try {
        const { ip, conversation } = req.body;
        const conversations = await loadConversations(ip || 'local');
        
        const newId = Date.now().toString();
        conversation.id = newId;
        conversations[newId] = conversation;
        
        await saveConversations(ip || 'local', conversations);
        res.json({ success: true, id: newId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to import conversation' });
    }
});

// Proxy Ollama API - List models
app.get('/api/ollama/tags', async (req, res) => {
    try {
        const response = await axios.get(`${OLLAMA_URL}/api/tags`);
        res.json(response.data);
    } catch (error) {
        console.error('Ollama API error:', error.message);
        res.status(500).json({ error: 'Failed to fetch models from Ollama' });
    }
});

// Proxy Ollama API - List running models
app.get('/api/ollama/ps', async (req, res) => {
    try {
        const response = await axios.get(`${OLLAMA_URL}/api/ps`);
        res.json(response.data);
    } catch (error) {
        console.error('Ollama API error:', error.message);
        res.status(500).json({ error: 'Failed to fetch running models from Ollama' });
    }
});

// Proxy Ollama API - Show model details
app.post('/api/ollama/show', async (req, res) => {
    try {
        const response = await axios.post(`${OLLAMA_URL}/api/show`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Ollama API error:', error.message);
        res.status(500).json({ error: 'Failed to show model details' });
    }
});

// Proxy Ollama API - Pull model
app.post('/api/ollama/pull', async (req, res) => {
    try {
        const response = await axios.post(`${OLLAMA_URL}/api/pull`, req.body, {
            responseType: 'stream'
        });
        
        response.data.pipe(res);
    } catch (error) {
        console.error('Ollama API error:', error.message);
        res.status(500).json({ error: 'Failed to pull model' });
    }
});

// Proxy Ollama API - Delete model
app.delete('/api/ollama/delete', async (req, res) => {
    try {
        const response = await axios.delete(`${OLLAMA_URL}/api/delete`, { data: req.body });
        res.json(response.data);
    } catch (error) {
        console.error('Ollama API error:', error.message);
        res.status(500).json({ error: 'Failed to delete model' });
    }
});

// Proxy Ollama API - Chat (streaming)
app.post('/api/ollama/chat', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const response = await axios.post(`${OLLAMA_URL}/api/chat`, req.body, {
            responseType: 'stream'
        });
        
        response.data.pipe(res);
    } catch (error) {
        console.error('Ollama API error:', error.message);
        res.status(500).json({ error: 'Failed to generate chat response' });
    }
});

// Proxy Ollama API - Generate (streaming)
app.post('/api/ollama/generate', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const response = await axios.post(`${OLLAMA_URL}/api/generate`, req.body, {
            responseType: 'stream'
        });
        
        response.data.pipe(res);
    } catch (error) {
        console.error('Ollama API error:', error.message);
        res.status(500).json({ error: 'Failed to generate completion' });
    }
});

// Proxy Ollama API - Get version
app.get('/api/ollama/version', async (req, res) => {
    try {
        const response = await axios.get(`${OLLAMA_URL}/api/version`);
        res.json(response.data);
    } catch (error) {
        console.error('Ollama API error:', error.message);
        res.status(500).json({ error: 'Failed to get Ollama version' });
    }
});

// Proxy Ollama API - Generate embeddings
app.post('/api/ollama/embeddings', async (req, res) => {
    try {
        const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Ollama API error:', error.message);
        res.status(500).json({ error: 'Failed to generate embeddings' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
    await ensureDataDir();
    app.listen(PORT, () => {
        console.log(`\n🚀 Local GPT Server running on http://localhost:${PORT}`);
        console.log(`📁 Data directory: ${DATA_DIR}`);
        console.log(`🤖 Ollama URL: ${OLLAMA_URL}\n`);
    });
}

start().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
