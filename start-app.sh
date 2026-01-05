#!/bin/bash

# MaintainUK - Application Startup Script (Linux/Mac)
# This script starts all required services for the application

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "              🚀 MaintainUK - Starting Application 🚀"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if Docker is running
echo "🔍 Checking Docker..."
if docker ps &> /dev/null; then
    echo "✅ Docker is running"
    DOCKER_RUNNING=true
else
    echo "⚠️  Docker is not running. Starting services without Docker..."
    echo "   (Redis and MinIO will not be available)"
    DOCKER_RUNNING=false
fi

# Start Docker Compose services if Docker is running
if [ "$DOCKER_RUNNING" = true ]; then
    echo ""
    echo "📦 Starting Docker services (Redis, MinIO)..."
    docker-compose up -d
    if [ $? -eq 0 ]; then
        echo "✅ Docker services started"
    else
        echo "⚠️  Failed to start Docker services"
    fi
    sleep 2
fi

# Start Backend API in a new terminal
echo ""
echo "🔧 Starting Backend API..."
API_PATH="$SCRIPT_DIR/apps/api"
if [ -d "$API_PATH" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "tell app \"Terminal\" to do script \"cd '$API_PATH' && echo '🔧 Backend API Starting...' && dotnet run --urls 'http://localhost:5000'\""
    else
        # Linux
        gnome-terminal -- bash -c "cd '$API_PATH' && echo '🔧 Backend API Starting...' && dotnet run --urls 'http://localhost:5000'; exec bash"
    fi
    echo "✅ Backend API starting in new terminal (Port 5000)"
else
    echo "❌ Backend API path not found: $API_PATH"
fi

sleep 3

# Start Jobs Service (optional)
echo ""
echo "⚙️  Starting Jobs Service..."
JOBS_PATH="$SCRIPT_DIR/apps/jobs"
if [ -d "$JOBS_PATH" ]; then
    read -p "Start Jobs Service? (Y/n): " START_JOBS
    if [ "$START_JOBS" != "n" ] && [ "$START_JOBS" != "N" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            osascript -e "tell app \"Terminal\" to do script \"cd '$JOBS_PATH' && echo '⚙️  Jobs Service Starting...' && npm start\""
        else
            gnome-terminal -- bash -c "cd '$JOBS_PATH' && echo '⚙️  Jobs Service Starting...' && npm start; exec bash"
        fi
        echo "✅ Jobs Service starting in new terminal"
        sleep 2
    else
        echo "⏭️  Skipping Jobs Service"
    fi
else
    echo "⚠️  Jobs Service path not found: $JOBS_PATH"
fi

# Start Frontend in a new terminal
echo ""
echo "🎨 Starting Frontend..."
WEB_PATH="$SCRIPT_DIR/apps/web"
if [ -d "$WEB_PATH" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "tell app \"Terminal\" to do script \"cd '$WEB_PATH' && echo '🎨 Frontend Starting...' && npm start\""
    else
        gnome-terminal -- bash -c "cd '$WEB_PATH' && echo '🎨 Frontend Starting...' && npm start; exec bash"
    fi
    echo "✅ Frontend starting in new terminal (Port 4200)"
else
    echo "❌ Frontend path not found: $WEB_PATH"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "                  ✅ Application Starting! ✅"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📍 ACCESS POINTS:"
echo "   Frontend:  http://localhost:4200"
echo "   Backend:   http://localhost:5000"
echo ""
echo "⏱️  WAIT TIME:"
echo "   Backend:   ~5-10 seconds"
echo "   Frontend:  ~20-30 seconds"
echo ""
echo "💡 TIP: Check the new terminal windows for startup logs"
echo "💡 TIP: Press Ctrl+C in each window to stop services"
echo ""

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 15

# Try to open browser
echo "🌐 Opening browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:4200"
else
    xdg-open "http://localhost:4200" 2>/dev/null || echo "⚠️  Could not open browser automatically"
fi

echo ""
echo "🎉 Setup complete! Happy coding! 🎉"
echo ""

