# ElizaOS CLI Deployment Guide

This document provides comprehensive guidance for deploying MascotAgent using the ElizaOS CLI.

## Overview

MascotAgent is now fully integrated with ElizaOS CLI (Option B: Enhanced VPS approach), providing:

- ✅ **ElizaOS CLI Commands**: `elizaos start`, `elizaos dev`, `elizaos test`, `elizaos agent`
- ✅ **Character Management**: Environment-specific character files 
- ✅ **Azure VPS Deployment**: Docker-based deployment on Azure infrastructure
- ✅ **GitHub Actions Integration**: CI/CD pipeline with ElizaOS CLI validation
- ✅ **Environment Management**: ElizaOS-compatible configuration and setup scripts

## Quick Start

### 1. Initial Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd mascot-agent
bun install

# Set up ElizaOS environment
bun run elizaos:setup

# Validate configuration
bun run elizaos:validate
```

### 2. Development

```bash
# Start development server with local character
bun run dev
# or
elizaos dev --character characters/local.json

# Run tests
elizaos test
# or
bun run test
```

### 3. Production Deployment

```bash
# Build application
bun run build

# Start production server
elizaos start --character characters/production.json
# or
bun run start:prod
```

## Environment Configuration

### Required Environment Variables

Create `.env` from `.env.example` and configure:

```bash
# ElizaOS Core Configuration
NODE_ENV=production                          # Environment mode
ELIZA_UI_ENABLE=false                       # Web UI (disable in production)
ELIZA_NONINTERACTIVE=true                   # Headless mode for VPS

# AI Provider (Required)
OPENAI_API_KEY=your_openai_api_key_here

# Database (Required)
POSTGRES_URL=postgresql://user:pass@your-azure-db.postgres.database.azure.com:5432/dbname?sslmode=require

# Authentication (Required for custom plugin)
AUTH_ENCRYPTION_KEY=your-32-character-encryption-key-here

# Optional Services
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET_KEY=your_twitter_secret
TWITTER_ACCESS_TOKEN=your_access_token  
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
```

### Environment-Specific Characters

The project includes character variants for different environments:

- **`characters/local.json`**: Local development with enhanced debugging
- **`characters/development.json`**: Development environment configuration
- **`characters/staging.json`**: Pre-production testing with production-like setup
- **`characters/production.json`**: Production deployment configuration

## ElizaOS CLI Commands

### Core Commands

```bash
# Start agent with specific character
elizaos start --character characters/production.json

# Development mode with hot-reload
elizaos dev --character characters/local.json

# Run all tests
elizaos test

# Agent management
elizaos agent list
elizaos agent start
elizaos agent stop
```

### Custom Scripts

We've added convenient npm scripts for ElizaOS operations:

```bash
# Environment setup and validation
bun run elizaos:setup      # Complete ElizaOS setup
bun run elizaos:validate   # Validate configuration
bun run elizaos:quick-test # Quick functionality test

# Character-specific starts
bun run start:prod         # Production character
bun run start:dev          # Development character  
bun run start:staging      # Staging character
bun run start:local        # Local development character

# Development workflows
bun run dev                # Hot-reload development
bun run dev:character      # Development with specific character
```

## Azure VPS Deployment

### Docker Deployment

The project uses Docker for consistent deployment:

```bash
# Build Docker image
docker build -t mascot-agent:latest .

# Run with docker-compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### GitHub Actions CI/CD

The deployment pipeline includes ElizaOS-specific validations:

1. **ElizaOS CLI Checks**: Validates CLI installation and availability
2. **Configuration Validation**: Runs `scripts/validate-config.ts`
3. **CLI Compatibility Tests**: Runs `scripts/test-elizaos-cli.ts`  
4. **ElizaOS Testing**: Uses `elizaos test` command
5. **Production Start Test**: Validates `elizaos start` with production character

### Dockerfile Integration

The Docker container includes:

- ElizaOS CLI installed globally (`@elizaos/cli@latest`)
- Production character file (`characters/production.json`)
- ElizaOS-compatible startup command
- Health checks using ElizaOS patterns

## Character Configuration

### Single Source of Truth: `src/character.ts`

The project uses **TypeScript as the single source of truth** for character definition:

- **`src/character.ts`**: Master character definition with 13+ detailed messageExamples
- **`characters/*.json`**: Generated variants for ElizaOS CLI usage
- **Generation Script**: `bun run characters:generate` creates JSON from TypeScript

### Character Variants (Auto-Generated)

```bash
# Generate all character variants from src/character.ts
bun run characters:generate

# Generated files:
characters/local.json       # Local development (3 plugins, debug focus)
characters/development.json # Development environment (4 plugins, Twitter testing)
characters/staging.json     # Pre-production testing (4 plugins, production-like)
characters/production.json  # Full production (5 plugins, all features)
```

### Character Generation Workflow

1. **Edit `src/character.ts`** - Make all character changes here
2. **Run `bun run characters:generate --force`** - Generate JSON variants
3. **Deploy** - ElizaOS CLI uses generated JSON files

### Plugin Loading Strategy

Based on the rich TypeScript character definition:

- **Core Plugins**: Always loaded (`@elizaos/plugin-bootstrap`, `@elizaos/plugin-sql`)
- **Conditional Loading**: Dynamic based on environment variables in TypeScript
- **Environment Variants**: JSON files have static plugin arrays optimized per environment
- **Custom Plugin**: `@mascotai/plugin-connections` added to production variant

## Troubleshooting

### Common Issues

1. **ElizaOS CLI Not Found**
   ```bash
   # Install globally
   npm install -g @elizaos/cli@latest
   
   # Or use local version
   bun x elizaos --version
   ```

2. **Character Loading Errors**
   ```bash
   # Validate character JSON
   elizaos start --character characters/local.json --dry-run
   
   # Check logs
   LOG_LEVEL=debug elizaos start --character characters/local.json
   ```

3. **Database Connection Issues**
   ```bash
   # Test Azure PostgreSQL connection
   bun run test:azure
   
   # Validate environment
   bun run env:validate
   ```

4. **Plugin Loading Failures**
   ```bash
   # Rebuild plugins
   bun run build
   
   # Test plugin compatibility
   bun run test:elizaos
   ```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set debug environment
LOG_LEVEL=debug elizaos start --character characters/local.json

# Or in .env
LOG_LEVEL=debug
ELIZA_DEBUG=true
```

## Validation Scripts

### Configuration Validation

```bash
# Full configuration check
bun run env:validate

# Specific validations
bun run scripts/validate-config.ts
bun run scripts/test-elizaos-cli.ts  
bun run scripts/test-azure-connection.ts
```

### Health Checks

The deployment includes comprehensive health monitoring:

- Docker health checks on port 3000
- ElizaOS startup validation
- Database connection verification
- Plugin loading confirmation

## Azure Integration

### Services Used

- **Azure Flexible Server PostgreSQL**: Managed database with SSL
- **Azure Virtual Machine**: Ubuntu VPS for Docker deployment
- **GitHub Container Registry**: Docker image storage
- **Azure Networking**: Security groups and load balancing

### Security Configuration

- PostgreSQL with SSL required (`sslmode=require`)
- Encrypted credential storage using AES-256-GCM
- OAuth 1.0a authentication flows
- Secure environment variable management

## Development Workflows

### Local Development

```bash
# Start local development
bun run elizaos:setup          # First-time setup
elizaos dev --character characters/local.json

# Make changes and test
bun run build
bun run test
```

### Testing Pipeline

```bash
# Quick functionality test
bun run elizaos:quick-test

# Full test suite
elizaos test

# Azure-specific tests
bun run test:azure
```

### Deployment Process

1. **Development**: Local testing with `characters/local.json`
2. **Staging**: Pre-production validation with `characters/staging.json`  
3. **Production**: GitHub Actions deployment with `characters/production.json`

## Support and Resources

### Documentation

- [ElizaOS Official Documentation](https://elizaos.github.io/eliza/)
- [ElizaOS CLI Reference](https://elizaos.github.io/eliza/docs/cli)
- [Azure PostgreSQL Documentation](https://docs.microsoft.com/en-us/azure/postgresql/)

### Helpful Commands

```bash
# ElizaOS help
elizaos --help
elizaos start --help
elizaos dev --help

# Project-specific help
bun run elizaos --help
bun run elizaos:setup
```

### Community

- GitHub Issues: Report bugs and feature requests
- ElizaOS Discord: Community support and discussions
- Documentation: Comprehensive guides and examples

---

This deployment approach provides the best of both worlds: the robustness of Azure infrastructure with the convenience and compatibility of ElizaOS CLI tools.