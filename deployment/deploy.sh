#!/bin/bash

set -e

# Determine which environment is currently active
if docker ps | grep -q "agent-production-blue"; then
  ACTIVE_ENV="blue"
  INACTIVE_ENV="green"
else
  ACTIVE_ENV="green"
  INACTIVE_ENV="blue"
fi

echo "Deploying to production"
echo "Active environment: $ACTIVE_ENV"
echo "Inactive environment: $INACTIVE_ENV"

# Pull the latest code
git checkout main
git pull

# Build the new Docker image
docker-compose -f docker-compose.production.yml build

# Start the new environment
docker-compose -f docker-compose.production.yml up -d agent-production-$INACTIVE_ENV

# Wait for the new environment to be healthy
# (This is a simple health check, a more robust one should be implemented)
sleep 10

# Switch traffic to the new environment
sed -i "s/agent-production-$ACTIVE_ENV/agent-production-$INACTIVE_ENV/g" nginx.production.conf
docker-compose -f docker-compose.nginx.production.yml up -d --no-deps nginx-production

# Stop the old environment
docker-compose -f docker-compose.production.yml down

echo "Deployment successful. New active environment: $INACTIVE_ENV"
