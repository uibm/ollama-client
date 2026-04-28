#!/bin/bash

echo "=========================================="
echo "  Local GPT - Ollama Interface"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/version &> /dev/null; then
    echo "⚠️  Ollama is not running"
    echo "Please start Ollama first:"
    echo "  ollama serve"
    echo ""
    read -p "Press Enter to continue anyway or Ctrl+C to exit..."
else
    echo "✓ Ollama is running"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing dependencies..."
    npm install
fi

# Create data directory if it doesn't exist
mkdir -p data

echo ""
echo "=========================================="
echo "  Starting Local GPT Server..."
echo "=========================================="
echo ""

# Start the server
npm start
