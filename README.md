# Local GPT - Full-Featured Ollama UI

A production-ready, full-stack web application for interfacing with Ollama. Features conversation management with JSON file persistence, incognito mode, dual chat/completion modes, and complete Ollama API integration.

## Features

### Core Features
- **Full Ollama API Integration**: All endpoints supported (chat, generate, tags, show, pull, delete, ps, embeddings, version)
- **Persistent Storage**: Conversations saved to JSON files on the server, organized by IP address
- **Incognito Mode**: Private conversations that won't be saved
- **Dual Modes**: 
  - Chat Mode: Conversations with full history
  - Completion Mode: Single-shot completions without context
- **Model Management**: Pull, delete, and view model details
- **Real-time Streaming**: Live responses as they're generated
- **Responsive Design**: Works on desktop, tablet, and mobile

### UI Features
- Modern, clean interface with dark/light themes
- Conversation search and filtering
- Message actions (copy, regenerate)
- Code syntax highlighting
- Export/import conversations
- Advanced settings (temperature, top_p, top_k, max tokens)
- System prompt customization

## Prerequisites

- Node.js (v14 or higher)
- Ollama installed and running locally
- npm or yarn

## Installation

1. Clone or download this project:
```bash
cd local-gpt-app
```

2. Install dependencies:
```bash
npm install
```

3. Make sure Ollama is running:
```bash
ollama serve
```

## Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Configuration

### Environment Variables

You can customize the application using environment variables:

```bash
# Server port (default: 3000)
PORT=3000

# Ollama API URL (default: http://localhost:11434)
OLLAMA_URL=http://localhost:11434
```

Example:
```bash
PORT=8080 OLLAMA_URL=http://localhost:11434 npm start
```

## Project Structure

```
local-gpt-app/
├── server/
│   └── server.js          # Express backend
├── public/
│   ├── index.html         # Frontend UI
│   └── app.js             # Frontend JavaScript
├── data/                  # Conversation and settings storage (auto-created)
│   ├── conversations_*.json
│   └── settings_*.json
├── package.json
└── README.md
```

## Data Storage

### Conversations
- Stored in `data/conversations_{IP}.json`
- Each user (identified by IP) has their own file
- Format: JSON object with conversation IDs as keys

### Settings
- Stored in `data/settings_{IP}.json`
- Per-user settings for system prompt, temperature, etc.

### Incognito Mode
- When enabled, conversations are not saved to disk
- Exists only in memory during the session

## API Endpoints

### Conversation Management
- `GET /api/conversations?ip={ip}` - Load conversations
- `POST /api/conversations` - Save conversations
- `DELETE /api/conversations/:id?ip={ip}` - Delete conversation
- `GET /api/conversations/:id/export?ip={ip}` - Export conversation
- `POST /api/conversations/import` - Import conversation

### Settings
- `GET /api/settings?ip={ip}` - Load settings
- `POST /api/settings` - Save settings

### Ollama Proxy
- `GET /api/ollama/tags` - List models
- `GET /api/ollama/ps` - List running models
- `POST /api/ollama/show` - Show model details
- `POST /api/ollama/chat` - Generate chat response (streaming)
- `POST /api/ollama/generate` - Generate completion (streaming)
- `POST /api/ollama/pull` - Pull model
- `DELETE /api/ollama/delete` - Delete model
- `POST /api/ollama/embeddings` - Generate embeddings
- `GET /api/ollama/version` - Get Ollama version

## Usage

### Starting a Conversation
1. Select a model from the dropdown
2. Type your message
3. Press Enter or click Send

### Incognito Mode
- Toggle the switch in the sidebar
- Conversations won't be saved to disk
- Perfect for private/temporary chats

### Chat vs Completion Mode
- **Chat**: Full conversation with context and history
- **Completion**: Single prompt without previous context

### Managing Models
1. Click the 📦 icon in the header
2. View installed models
3. Pull new models by entering the name (e.g., "llama2", "mistral")
4. Delete models you don't need

### Settings
- Click the ⚙ icon to open settings
- Customize system prompt, temperature, top_p, top_k, and max tokens
- Settings are saved per user (by IP)

### Export/Import
- Click ↓ to export current conversation as JSON
- Click ↑ to import a previously exported conversation

## Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line in message input

## Troubleshooting

### "Failed to load models"
- Make sure Ollama is running: `ollama serve`
- Check that Ollama is accessible at `http://localhost:11434`
- Verify you have at least one model installed: `ollama list`

### Port already in use
- Change the port: `PORT=8080 npm start`

### Conversations not saving
- Check that the `data/` directory exists and is writable
- Look for errors in the server console
- Verify incognito mode is not enabled

### Can't type in message input
- Make sure JavaScript is enabled in your browser
- Check browser console for errors
- Try refreshing the page

## Development

To contribute or modify:

1. Edit `server/server.js` for backend changes
2. Edit `public/index.html` and `public/app.js` for frontend changes
3. The server automatically serves static files from `public/`
4. Use `npm run dev` for auto-reload during development

## License

MIT

## Support

For issues or questions, please check:
1. Ollama documentation: https://ollama.ai
2. Project issues on GitHub
3. Server console logs for errors
