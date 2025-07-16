# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment Variables

### Authentication Service (plugin-mascot)
- `AUTH_ENCRYPTION_KEY` - 32+ character encryption key for secure credential storage
- `TWITTER_API_KEY` - Twitter API consumer key (matches plugin-twitter)
- `TWITTER_API_SECRET_KEY` - Twitter API consumer secret (matches plugin-twitter)

### Twitter Plugin (plugin-twitter)
- `TWITTER_ACCESS_TOKEN` - Twitter access token for bot posting
- `TWITTER_ACCESS_TOKEN_SECRET` - Twitter access token secret for bot posting
- `TWITTER_ENABLE_POST` - Enable automated posting (default: false)
- `TWITTER_ENABLE_REPLIES` - Enable reply interactions (default: true)
- `TWITTER_ENABLE_ACTIONS` - Enable likes/retweets/quotes (default: false)

Note: The plugin-mascot uses the same Twitter API credential names as plugin-twitter for consistency.

## Development Commands

### Primary Development
- `elizaos dev` - Start development with hot-reloading (recommended)
- `elizaos start` - Start without hot-reloading (requires `bun run build` after changes)
- `elizaos test` - Run all tests (component + e2e)

### Build and Quality
- `bun run build` - Build the project (TypeScript compilation + Vite build + tsup)
- `bun run type-check` - Run TypeScript type checking
- `bun run type-check:watch` - Watch mode for type checking
- `bun run lint` / `bun run format` - Format code with Prettier
- `bun run format:check` - Check formatting without changes
- `bun run check-all` - Run type-check + format:check + test

### Testing
- `bun run test:component` - Run component tests only
- `bun run test:e2e` - Run e2e tests only
- `bun run test:coverage` - Run tests with coverage
- `bun run test:watch` - Run tests in watch mode
- `bun run cy:open` - Open Cypress test runner
- `bun run cypress:component` - Run Cypress component tests
- `bun run cypress:e2e` - Run Cypress e2e tests

## Project Architecture

This is an ElizaOS project starter that demonstrates the structure for creating AI agents. The architecture follows ElizaOS patterns:

### Core Structure
- `src/index.ts` - Main project entry point, exports `projectAgent` with character and plugins
- `src/character.ts` - Character definition (Eliza) with plugins, system prompt, bio, and conversation examples
- `src/plugin.ts` - Example starter plugin with actions, providers, services, and event handlers

### Key Components
- **ProjectAgent**: Main agent configuration combining character definition and initialization
- **Character**: Defines personality, capabilities, and plugin loading based on environment variables
- **Plugin System**: Extensible architecture for actions, providers, services, and API routes
- **Testing**: Comprehensive setup with both component tests (Vitest) and e2e tests (ElizaOS runtime)

### Plugin Architecture
Plugins follow ElizaOS patterns and include:
- **Actions**: Executable behaviors (e.g., `HELLO_WORLD` action)
- **Providers**: Data sources for context
- **Services**: Background processes and capabilities
- **Events**: Handlers for runtime events (MESSAGE_RECEIVED, WORLD_CONNECTED, etc.)
- **Models**: Custom model implementations for text generation
- **Routes**: HTTP API endpoints
- **Frontend**: React-based UI components for web interfaces, dashboards, and visual components (full plugins only)

### Environment-Based Plugin Loading
The character configuration dynamically loads plugins based on available environment variables:
- Core plugins: `@elizaos/plugin-sql`
- AI providers: OpenAI, Anthropic, OpenRouter, Google GenAI, Ollama
- Platform integrations: Discord, Twitter, Telegram
- Bootstrap plugin (can be disabled with `IGNORE_BOOTSTRAP=true`)

### Test Structure
- `src/__tests__/` - Component and integration tests using Vitest
- `src/__tests__/e2e/` - End-to-end tests using ElizaOS test interface
- `src/__tests__/cypress/` - Cypress component and e2e tests
- Test utilities in `src/__tests__/utils/` and `src/__tests__/test-utils.ts`

### Frontend Structure (Full Plugins)
The `src/frontend/` folder contains React-based UI components for creating web interfaces and dashboards:
- **Purpose**: Extends plugins beyond backend functionality with visual interfaces, interactive dashboards, and configuration screens
- **Technology**: React with Vite build system, Tailwind CSS for styling
- **Integration**: Integrates with the main ElizaOS dashboard to provide plugin-specific UI components
- **Components**: 
  - `index.tsx` - Main entry point and React root
  - `components/` - Reusable UI components
  - `utils/` - Frontend utilities and helpers
- **Build**: Builds to `dist/frontend/` via Vite, served through plugin routes
- **Perfect for**: Plugins that need web UI, dashboards, or visual components

## Development Notes

The project uses Bun as the package manager and includes comprehensive testing infrastructure. The character is designed to be conversational and helpful, with plugin-based extensibility for various AI providers and platforms.

When adding new functionality, follow the existing patterns in the starter plugin and ensure proper environment variable handling for conditional plugin loading.

## ElizaOS Framework Reference

### Core Concepts

#### Plugin Architecture
ElizaOS uses a modular plugin system with several core components:
- **Actions**: Executable behaviors triggered by user input (e.g., `HELLO_WORLD`, `CHECK_WEATHER`)
- **Providers**: Data sources that provide context to the agent (e.g., `characterProvider`, `timeProvider`)
- **Services**: Background processes and capabilities (e.g., model providers, database connections)
- **Events**: Handlers for runtime events (`MESSAGE_RECEIVED`, `WORLD_CONNECTED`, etc.)
- **Evaluators**: Logic for evaluating responses and determining next actions
- **Routes**: HTTP API endpoints for external integrations

#### Agent Runtime
The `AgentRuntime` is the core orchestrator that:
- Manages plugin loading and initialization
- Handles message processing and response generation
- Manages state and memory
- Coordinates between different services and providers

### API Reference

#### Core Classes and Interfaces
- `AgentRuntime`: Main runtime class for agent execution
- `Plugin`: Interface for defining plugin structure
- `Action`: Interface for defining executable behaviors
- `Provider`: Interface for data sources
- `Service`: Interface for background services

#### Common Methods
- `runtime.useModel(ModelType, options)`: Generate text using configured models
- `runtime.createMemory(memory)`: Store information in agent memory
- `runtime.getMemories(options)`: Retrieve stored memories
- `runtime.getSetting(key)`: Get configuration values
- `runtime.composeState(message, filters)`: Compose state for prompts
- `parseKeyValueXml(xmlString)`: Parse XML responses from models

### Migration Guide (v0 to v1)

#### Key Changes
1. **Prompt Composition**: 
   - `composeContext` → `composePrompt` or `composePromptFromState`
   - `updateRecentMessageState` → `composeState(message, ['RECENT_MESSAGES'])`

2. **Model Interaction**:
   - `generateText` → `runtime.useModel(ModelType.TEXT_*)`
   - `generateObject` → `runtime.useModel` + `parseKeyValueXml`
   - `ModelClass` → `ModelType` enum

3. **Memory Management**:
   - `Memory.userId` → `Memory.entityId`
   - `runtime.messageManager.createMemory` → `runtime.createMemory`

4. **Data Parsing**:
   - JSON format → XML format for templates
   - Direct object parsing → `parseKeyValueXml`

### Platform Integrations

#### Twitter Plugin (@elizaos/plugin-twitter)

**Quick Setup:**
1. Get Twitter Developer account → https://developer.twitter.com
2. Create app with "Read and write" permissions
3. Get OAuth 1.0a credentials (NOT OAuth 2.0!)
4. Add to `.env` and run

**Required Environment Variables:**
```bash
# OAuth 1.0a Credentials (from "Consumer Keys" section)
TWITTER_API_KEY=your_api_key_here                    
TWITTER_API_SECRET_KEY=your_api_key_secret_here      

# OAuth 1.0a Tokens (from "Authentication Tokens" section)
TWITTER_ACCESS_TOKEN=your_access_token_here          # Must have "Read and Write"
TWITTER_ACCESS_TOKEN_SECRET=your_token_secret_here   

# Basic Configuration
TWITTER_DRY_RUN=false              # Set to true for testing
TWITTER_ENABLE_POST=true           # Enable autonomous posting
TWITTER_POST_IMMEDIATELY=true      # Post on startup (testing)
```

**Complete Configuration Options:**
```bash
# Feature Toggles
TWITTER_ENABLE_POST=false          # Autonomous tweet posting
TWITTER_ENABLE_REPLIES=true        # Mention and reply handling
TWITTER_ENABLE_ACTIONS=false       # Timeline actions (likes, retweets, quotes)
TWITTER_ENABLE_DISCOVERY=          # Discovery service (defaults to true if ACTIONS enabled)

# Timing Configuration (minutes)
TWITTER_POST_INTERVAL=120          # Fixed interval between posts
TWITTER_POST_INTERVAL_MIN=90       # Minimum minutes between posts
TWITTER_POST_INTERVAL_MAX=150      # Maximum minutes between posts

TWITTER_ENGAGEMENT_INTERVAL=30     # Fixed interval for interactions
TWITTER_ENGAGEMENT_INTERVAL_MIN=20 # Minimum minutes between engagements
TWITTER_ENGAGEMENT_INTERVAL_MAX=40 # Maximum minutes between engagements

# Discovery Service
TWITTER_DISCOVERY_INTERVAL_MIN=15  # Minimum discovery cycle time
TWITTER_DISCOVERY_INTERVAL_MAX=30  # Maximum discovery cycle time
TWITTER_MIN_FOLLOWER_COUNT=100     # Minimum followers for accounts to follow
TWITTER_MAX_FOLLOWS_PER_CYCLE=5    # Maximum accounts to follow per cycle

# Engagement Limits
TWITTER_MAX_ENGAGEMENTS_PER_RUN=5  # Maximum interactions per cycle
TWITTER_MAX_TWEET_LENGTH=280       # Maximum tweet length
TWITTER_TARGET_USERS=              # Comma-separated usernames ("*" for all)
TWITTER_RETRY_LIMIT=5              # Maximum retry attempts
```

**Features:**
- ✅ Autonomous tweet posting with configurable intervals
- ✅ Timeline monitoring and interaction
- ✅ Mention and reply handling
- ✅ Search functionality and direct message support
- ✅ Advanced timeline algorithms with weighted scoring
- ✅ Comprehensive caching system
- ✅ Built-in rate limiting and retry mechanisms
- ✅ Discovery service for autonomous content discovery and growth

**Discovery Service:**
The discovery service enables autonomous growth by:
- Searching for content related to your agent's topics
- Identifying high-quality accounts to follow
- Engaging with relevant tweets through likes, replies, and quotes
- Building up your agent's timeline by following interesting accounts

**Common Issues & Solutions:**
- **403 Errors**: Check app has "Read and write" permissions, regenerate tokens
- **"Could not authenticate"**: Use OAuth 1.0a credentials, not OAuth 2.0
- **Bot not posting**: Ensure `TWITTER_ENABLE_POST=true` and `@elizaos/plugin-bootstrap` installed
- **Timeline not loading**: Check rate limiting and credentials

**Testing:**
```bash
# Test without posting
TWITTER_DRY_RUN=true bun start

# Test immediate posting
TWITTER_POST_IMMEDIATELY=true bun start

# Debug logging
DEBUG=eliza:* bun start
```

**Character Configuration:**
```typescript
const character = {
    plugins: [
        "@elizaos/plugin-bootstrap",  // Required for content generation
        "@elizaos/plugin-twitter"     // Twitter functionality
    ],
    postExamples: [                   // Examples for tweet generation
        "Just discovered an amazing pattern in the data...",
        "The future of AI is collaborative intelligence",
        // ... more examples
    ],
    topics: [                         // For discovery service
        "artificial intelligence",
        "machine learning",
        "web3"
    ]
};
```

#### Discord Plugin
- **Setup**: Discord Application with bot token
- **Configuration**: Application ID, bot token, channel permissions
- **Features**: Message handling, reactions, voice support
- **Error Handling**: Specific Discord API error codes

#### Telegram Plugin
- **Setup**: Telegram Bot Token from @BotFather
- **Configuration**: Bot token, webhook settings
- **Features**: Text messages, media handling, inline keyboards
- **Architecture**: Uses Telegraf client for API interactions

### Testing Framework

#### Unit Testing
- Uses Vitest for component tests
- Mock utilities for external APIs
- Test utilities for agent runtime testing

#### E2E Testing
- ElizaOS runtime testing interface
- Cypress for browser-based testing
- Mock services for external dependencies

#### Best Practices
- Always mock external API calls
- Use proper type definitions
- Test error handling scenarios
- Validate plugin configurations

### Development Best Practices

#### Security
- Store API keys in environment variables
- Use OAuth 1.0a for user context
- Validate all user inputs
- Implement proper error handling

#### Performance
- Use efficient caching strategies
- Implement proper rate limiting
- Optimize database queries
- Monitor memory usage

#### Code Quality
- Follow TypeScript best practices
- Use proper error handling
- Document plugin interfaces
- Write comprehensive tests

### Common Commands

#### CLI Commands
- `elizaos start`: Start the agent server
- `elizaos dev`: Start with hot-reloading
- `elizaos test`: Run all tests
- `elizaos create <name>`: Create new agent

#### Development Commands
- `bun run build`: Build the project
- `bun run type-check`: TypeScript type checking
- `bun run lint`: Format code
- `bun run test:coverage`: Run tests with coverage