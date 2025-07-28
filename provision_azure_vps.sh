#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Variables - You can change these ---

# The base name for all resources.
BASE_NAME="mascotai-mascot-agent"

# The Azure region where the resources will be created.
LOCATION="westus3"

# The username for the administrator on the VM.
ADMIN_USERNAME="mascotadmin"

# The password for the PostgreSQL administrator.
# IMPORTANT: Change this to a strong, unique password.
POSTGRES_ADMIN_PASSWORD="your-strong-password-here"

# The size of the VM. "Standard_B1s" is a cost-effective choice for small apps.
VM_SIZE="Standard_B1s"

# The URN of the Azure Marketplace image.
IMAGE_URN="Canonical:0001-com-ubuntu-server-jammy:22_04-lts:latest"

# --- Constructed Variables - Do not change below this line ---

RESOURCE_GROUP_NAME="${BASE_NAME}-prod-rg-${LOCATION}"
VM_NAME="${BASE_NAME}-prod-vm"
POSTGRES_SERVER_NAME="${BASE_NAME}-prod-db"
POSTGRES_DATABASE_NAME="mascotagentprod"
POSTGRES_ADMIN_USERNAME="mascotadmin"


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

echo "Creating PostgreSQL Flexible Server: $POSTGRES_SERVER_NAME..."
az postgres flexible-server create \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --name "$POSTGRES_SERVER_NAME" \
    --location "$LOCATION" \
    --admin-user "$POSTGRES_ADMIN_USERNAME" \
    --admin-password "$POSTGRES_ADMIN_PASSWORD" \
    --yes

echo "Creating database: $POSTGRES_DATABASE_NAME..."
az postgres flexible-server db create \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --server-name "$POSTGRES_SERVER_NAME" \
    --database-name "$POSTGRES_DATABASE_NAME"

VM_PUBLIC_IP=$(az vm show -d -g "$RESOURCE_GROUP_NAME" -n "$VM_NAME" --query publicIps -o tsv)

echo "Allowing connection from VM to PostgreSQL server..."
az postgres flexible-server firewall-rule create \
    --resource-group "$RESOURCE_GROUP_NAME" \
    --name "$POSTGRES_SERVER_NAME" \
    --rule-name "AllowVMAccess" \
    --start-ip-address "$VM_PUBLIC_IP" \
    --end-ip-address "$VM_PUBLIC_IP"

POSTGRES_HOST=$(az postgres flexible-server show --resource-group "$RESOURCE_GROUP_NAME" --name "$POSTGRES_SERVER_NAME" --query "fullyQualifiedDomainName" -o tsv)
POSTGRES_URL="postgresql://$POSTGRES_ADMIN_USERNAME:$POSTGRES_ADMIN_PASSWORD@$POSTGRES_HOST:5432/$POSTGRES_DATABASE_NAME?sslmode=require"

echo "---------------------------------------------------"
echo "✅ Provisioning Complete!"
echo ""
echo "Your server and database are now ready."
echo ""
echo "Connect to your VM using the following command:"
echo "ssh $ADMIN_USERNAME@$VM_PUBLIC_IP"
echo ""
echo "Your VM's Public IP Address is: $VM_PUBLIC_IP"
echo ""
echo "Your PostgreSQL Connection URL is:"
echo "$POSTGRES_URL"
echo "---------------------------------------------------"
