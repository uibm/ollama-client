# Quick Start Guide - Local GPT

## Installation (One-Time Setup)

### Step 1: Install Prerequisites

**1. Install Node.js**
- Download from: https://nodejs.org/
- Choose the LTS (Long Term Support) version
- Install with default settings

**2. Install Ollama**
- Download from: https://ollama.ai/
- Install with default settings
- Pull at least one model:
  ```bash
  ollama pull llama2
  ```

### Step 2: Extract the Project
- Extract the `local-gpt-app` folder to your desired location
- Navigate into the folder

### Step 3: Install Dependencies
Open a terminal/command prompt in the project folder and run:
```bash
npm install
```

## Running the Application

### Option 1: Use the Startup Scripts (Easiest)

**On Linux/Mac:**
```bash
./start.sh
```

**On Windows:**
- Double-click `start.bat`
- Or run in command prompt: `start.bat`

### Option 2: Manual Start

**1. Start Ollama (if not running):**
```bash
ollama serve
```

**2. Start the application:**
```bash
npm start
```

**3. Open your browser:**
- Go to: http://localhost:3000

## First Time Usage

1. **Select a Model**
   - Choose from the dropdown in the header
   - If no models appear, install one:
     ```bash
     ollama pull llama2
     ```

2. **Start Chatting**
   - Type your message in the input box
   - Press Enter or click Send

3. **Explore Features**
   - Click 📦 to manage models
   - Click ⚙ to adjust settings
   - Toggle Incognito mode for private chats
   - Switch between Chat and Completion modes

## Important Notes

### Conversations are Saved
- All conversations are saved as JSON files in the `data/` folder
- Each user (by IP address) has their own file
- Incognito mode prevents saving

### Where is Data Stored?
```
local-gpt-app/
└── data/
    ├── conversations_xxx.json  (your chats)
    └── settings_xxx.json       (your preferences)
```

### Stopping the Server
- Press `Ctrl+C` in the terminal
- Or close the terminal window

## Troubleshooting

### Can't Connect
**Problem**: "Failed to load models"
**Solution**: 
1. Make sure Ollama is running: `ollama serve`
2. Check if you have models: `ollama list`
3. Install a model if needed: `ollama pull llama2`

### Port Already in Use
**Problem**: "Port 3000 is already in use"
**Solution**: Use a different port
```bash
PORT=8080 npm start
```

### Can't Type in Input Box
**Problem**: Message input is not editable
**Solution**: 
1. Refresh the browser (F5)
2. Clear browser cache
3. Try a different browser

### Conversations Not Saving
**Problem**: Chats disappear after refresh
**Solution**:
1. Check that Incognito mode is OFF
2. Look for errors in the terminal
3. Make sure `data/` folder is writable

## Keyboard Shortcuts

- `Enter` - Send message
- `Shift + Enter` - New line
- `Ctrl+C` (in terminal) - Stop server

## Advanced Configuration

### Change Port
```bash
PORT=8080 npm start
```

### Use Remote Ollama
```bash
OLLAMA_URL=http://192.168.1.100:11434 npm start
```

### Development Mode (Auto-reload)
```bash
npm run dev
```

## Getting Help

1. Check the README.md for full documentation
2. Look at server logs in the terminal
3. Check Ollama documentation: https://ollama.ai
4. Review browser console for JavaScript errors (F12)

## Updating

To get the latest version:
1. Download the new version
2. Copy your `data/` folder to the new version
3. Run `npm install` again
4. Start the server

## Uninstalling

1. Stop the server (Ctrl+C)
2. Delete the `local-gpt-app` folder
3. Optionally uninstall Node.js and Ollama

---

**Enjoy using Local GPT!**
