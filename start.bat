@echo off
echo ==========================================
echo   Local GPT - Ollama Interface
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo X Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo + Node.js found
node --version

REM Check if Ollama is running
curl -s http://localhost:11434/api/version >nul 2>nul
if %errorlevel% neq 0 (
    echo ! Ollama is not running
    echo Please start Ollama first
    echo.
    pause
) else (
    echo + Ollama is running
)

REM Install dependencies if needed
if not exist "node_modules\" (
    echo.
    echo Installing dependencies...
    call npm install
)

REM Create data directory if it doesn't exist
if not exist "data\" mkdir data

echo.
echo ==========================================
echo   Starting Local GPT Server...
echo ==========================================
echo.

REM Start the server
call npm start
