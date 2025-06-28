#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i ":$1" >/dev/null 2>&1
}

# Function to check if a service is responding
check_service() {
    local port=$1
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port/health" >/dev/null; then
            return 0
        fi
        echo "Waiting for service on port $port (attempt $attempt/$max_attempts)..."
        sleep 2
        attempt=$((attempt + 1))
    done
    return 1
}

# Function to stop services
stop_services() {
    echo -e "\n${GREEN}Stopping services...${NC}"
    # Kill processes running on ports 8000 and 3000
    for port in 8000 3000; do
        if port_in_use $port; then
            echo "Stopping service on port $port"
            lsof -ti ":$port" | xargs kill -9 2>/dev/null
        fi
    done
    echo -e "${GREEN}Services stopped.${NC}"
    exit 0
}

# Set up trap to catch Ctrl+C and stop services
trap stop_services SIGINT SIGTERM

# Check if init.sh has been run
if [ ! -d "env" ] || [ ! -f "data/bookmarks.json" ]; then
    echo -e "${YELLOW}First-time setup required. Running init.sh...${NC}"
    if [ ! -f "init.sh" ]; then
        echo -e "${RED}Error: init.sh not found${NC}"
        exit 1
    fi
    chmod +x init.sh
    ./init.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Initialization failed${NC}"
        exit 1
    fi
fi

# Check for required commands (only those not checked by init.sh)
echo "Checking additional dependencies..."
for cmd in npm node; do
    if ! command_exists $cmd; then
        echo -e "${RED}Error: $cmd is not installed${NC}"
        exit 1
    fi
done

# Activate virtual environment
source env/bin/activate

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Check if ports are available
for port in 8000 3000; do
    if port_in_use $port; then
        echo -e "${RED}Error: Port $port is already in use${NC}"
        stop_services
        exit 1
    fi
done

# Start the backend server
echo -e "\n${GREEN}Starting backend server...${NC}"
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level debug &
BACKEND_PID=$!

# Wait for backend to start and verify it's responding
echo "Waiting for backend to start..."
if ! check_service 8000; then
    echo -e "${RED}Error: Backend failed to start or is not responding${NC}"
    echo "Checking backend logs..."
    ps -p $BACKEND_PID >/dev/null && echo "Backend process is running but not responding" || echo "Backend process failed to start"
    stop_services
    exit 1
fi
echo -e "${GREEN}Backend is running and responding${NC}"

# Start the frontend development server
echo -e "\n${GREEN}Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n${GREEN}Services are running:${NC}"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo -e "\nPress Ctrl+C to stop all services"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 