#!/bin/bash
set -e

# Simple Azure VPS Deployment Script for MascotAgent
# Based on ElizaOS patterns and Azure Flexible Server PostgreSQL

echo "🚀 Starting MascotAgent deployment to Azure VPS..."

# Configuration
PROJECT_NAME="mascot-agent"
IMAGE_NAME="mascot-agent:latest"
CONTAINER_NAME="mascot-agent"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found! Please create one based on .env.example"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running! Please start Docker first."
    exit 1
fi

# Step 1: Build the Docker image
print_status "Building Docker image..."
docker build -t $IMAGE_NAME .

if [ $? -eq 0 ]; then
    print_status "Docker image built successfully"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Step 2: Stop and remove existing container if it exists
print_status "Stopping existing container (if running)..."
docker-compose down || true

# Step 3: Start the new container
print_status "Starting MascotAgent container..."
docker-compose up -d

if [ $? -eq 0 ]; then
    print_status "Container started successfully"
else
    print_error "Failed to start container"
    exit 1
fi

# Step 4: Wait for health check
print_status "Waiting for health check..."
sleep 10

# Step 5: Verify deployment
print_status "Verifying deployment..."
if docker-compose ps | grep -q "Up"; then
    print_status "✅ Deployment successful! MascotAgent is running."
    
    # Show container status
    echo ""
    echo "Container Status:"
    docker-compose ps
    
    echo ""
    print_status "View logs with: docker-compose logs -f"
    print_status "Stop service with: docker-compose down"
    print_status "Access UI at: http://localhost:3000 (if ELIZA_UI_ENABLE=true)"
    
else
    print_error "❌ Deployment failed! Container is not running properly."
    echo ""
    echo "Container logs:"
    docker-compose logs --tail=20
    exit 1
fi

echo ""
print_status "🎉 MascotAgent deployment completed successfully!"