# Manual Database Setup for Twitter Auth Plugin

This is a **temporary workaround** for the ElizaOS plugin schema migration issue. Once the plugin schema migration is fixed, this setup can be removed.

## Files Added

### 1. SQL Script: `src/scripts/create-tables.sql`
- Contains all SQL DDL statements for creating the Twitter auth plugin tables
- Includes enums, tables, indexes, and constraints
- Uses `IF NOT EXISTS` to prevent errors on repeated runs

### 2. Setup Script: `src/scripts/db-setup.ts`
- TypeScript script that executes the SQL file
- Includes safety checks and error handling
- Uses environment flag to prevent duplicate setup
- Can be run manually or integrated into service startup

### 3. Package.json Scripts
- `bun run db:setup` - Run the database setup script
- `bun run db:setup:force` - Force re-run the setup (ignores completion flag)

### 4. Service Integration
- Modified `AuthService.start()` to automatically run database setup
- Added TODO comments for easy removal later
- Includes proper error handling and logging

## How to Use

### Option 1: Automatic (Recommended)
The database setup runs automatically when the AuthService starts. No manual intervention required.

### Option 2: Manual Setup
```bash
# Run database setup manually
bun run db:setup

# Or force re-run if needed
bun run db:setup:force
```

### Option 3: Direct SQL
```bash
# Connect to your PostgreSQL database and run:
psql $POSTGRES_URL -f src/scripts/create-tables.sql
```

## Environment Variables Required

```bash
# PostgreSQL connection (one of these)
POSTGRES_URL=postgresql://user:password@localhost:5432/database
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

## Dependencies

- **PostgreSQL**: Database server
- **psql**: Command-line tool (usually comes with PostgreSQL installation)

## Tables Created

1. **plugin_service_credentials** - Stores encrypted service credentials
2. **plugin_oauth_sessions** - Tracks OAuth authentication sessions

## Safety Features

- Uses `IF NOT EXISTS` to prevent duplicate table creation
- Environment flag (`TWITTER_AUTH_DB_SETUP_COMPLETE`) prevents repeated setup
- Comprehensive error handling and logging
- All SQL operations are idempotent

## Cleanup Instructions

When the ElizaOS plugin schema migration is fixed, remove:

1. `src/scripts/create-tables.sql`
2. `src/scripts/db-setup.ts`
3. `package.json.manual-db-setup` (reference file)
4. Database setup call from `AuthService.start()`
5. Database setup scripts from `package.json`
6. `pg` and `@types/pg` dependencies (if not used elsewhere)
7. This README file

## Database Schema

The setup creates the following database objects:

```sql
-- Enums
service_type (twitter, discord, etc.)
credential_status (active, inactive, etc.)
oauth_session_status (pending, authorized, etc.)

-- Tables with indexes and constraints
plugin_service_credentials
plugin_oauth_sessions
```

All tables include proper indexing for performance and unique constraints where appropriate.