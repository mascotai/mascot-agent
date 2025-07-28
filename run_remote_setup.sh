#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Variables ---
# Replace with your actual resource group and VM name if not providing them as arguments
RESOURCE_GROUP_NAME=${1:-"mascotai-mascot-agent-prod-rg"}
VM_NAME=${2:-"mascotai-mascot-agent-prod-vm"}
ADMIN_USERNAME=${3:-"mascotadmin"}

echo "Executing setup script on VM: $VM_NAME in resource group: $RESOURCE_GROUP_NAME..."

az vm run-command invoke \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --name "$VM_NAME" \
    --command-id RunShellScript \
    --scripts @setup_vps.sh --parameters "$ADMIN_USERNAME"

echo "---------------------------------------------------"
echo "✅ Remote setup script execution finished!"
echo "---------------------------------------------------"
