#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Updating package list ---"
sudo apt-get update

echo "--- Installing prerequisites for Docker ---"
sudo apt-get install -y ca-certificates curl gnupg

echo "--- Adding Docker's official GPG key ---"
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "--- Setting up Docker's repository ---"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

echo "--- Installing Docker Engine and Docker Compose ---"
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "--- Adding user \"$1\" to the docker group ---"
sudo usermod -aG docker "$1"

echo "---------------------------------------------------"
echo "✅ Server Setup Complete!"
echo ""
echo "IMPORTANT: You must log out and log back in for the user group changes to take effect."
echo "After logging back in, you can verify the installation by running:"
echo "docker --version && docker compose version"
echo "---------------------------------------------------"
