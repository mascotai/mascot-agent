#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Variables - You can change these ---

# The name of the resource group, based on your org and project.
RESOURCE_GROUP_NAME="mascotai-mascot-agent-prod-rg"

# The name of the Virtual Machine, based on your org and project.
VM_NAME="mascotai-mascot-agent-prod-vm"

# The Azure region where the resources will be created.
LOCATION="eastus"

# The username for the administrator on the VM.
ADMIN_USERNAME="mascotadmin"

# The size of the VM. "Standard_B1s" is a cost-effective choice for small apps.
VM_SIZE="Standard_B1s"

# The URN of the Azure Marketplace image.
IMAGE_URN="Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest"

# --- Script - Do not change below this line ---

echo "Creating resource group: $RESOURCE_GROUP_NAME..."
az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION"

echo "Creating Virtual Machine: $VM_NAME from image $IMAGE_URN..."
echo "This will take a few minutes."
echo "The command will use your default SSH public key (~/.ssh/id_rsa.pub), or generate one if it doesn't exist."

az vm create \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --name "$VM_NAME" \
    --image "$IMAGE_URN" \
    --size "$VM_SIZE" \
    --admin-username "$ADMIN_USERNAME" \
    --generate-ssh-keys

echo "Opening port 80 for HTTP traffic..."
az vm open-port --port 80 --resource-group "$RESOURCE_GROUP_NAME" --name "$VM_NAME" --priority 900

PUBLIC_IP=$(az vm show -d -g "$RESOURCE_GROUP_NAME" -n "$VM_NAME" --query publicIps -o tsv)

echo "---------------------------------------------------"
echo "✅ Provisioning Complete!"
echo ""
echo "Your server is now ready. You will need to install Docker manually."
echo "Connect to your VM using the following command:"
echo "ssh $ADMIN_USERNAME@$PUBLIC_IP"
echo ""
echo "Your VM's Public IP Address is: $PUBLIC_IP"
echo "---------------------------------------------------"