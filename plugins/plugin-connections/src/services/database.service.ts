import { Service, logger, type IAgentRuntime, type UUID } from "@elizaos/core";
import { eq, and, sql } from "drizzle-orm";
import { serviceCredentialsTable } from "../schema/service-credentials";
import type {
  ServiceName,
  ServiceCredential,
  OAuthSession,
  ConnectionStatus,
  TwitterCredentials,
} from "../types/auth.types";

/**
 * Database service that handles all database operations for the connections plugin
 * This service creates tables and manages all database operations internally
 */
export class DatabaseService extends Service {
  static serviceType = "database";
  private tablesCreated = false;

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  get capabilityDescription(): string {
    return "Database service for managing connections plugin database operations";
  }

  /**
   * Get database connection from runtime
   */
  private get db() {
    if (!this.runtime?.db) {
      throw new Error("Database not available - check that @elizaos/plugin-sql is loaded");
    }
    return this.runtime.db;
  }

  /**
   * Static method to create and start the database service
   */
  static async start(runtime: IAgentRuntime): Promise<DatabaseService> {
    logger.info("🗄️ Starting Database service...");
    
    const service = new DatabaseService(runtime);
    await service.initialize();
    
    logger.info("✅ Database service started successfully");
    return service;
  }

  /**
   * Static method to stop the database service
   */
  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(DatabaseService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  /**
   * Stop the database service
   */
  async stop(): Promise<void> {
    logger.info("🗄️ Database service stopped");
  }

  /**
   * Initialize the database service and create tables
   */
  async initialize(): Promise<void> {
    try {
      logger.info("🔄 Initializing database service...");
      
      // Ensure we have database access
      if (!this.runtime?.db) {
        throw new Error("Database not available - check that @elizaos/plugin-sql is loaded");
      }

      // Create tables if they don't exist
      await this.createTables();
      
      logger.info("✅ Database service initialized successfully");
    } catch (error) {
      logger.error("❌ Failed to initialize database service:", error);
      throw error;
    }
  }

  /**
   * Create all necessary tables for the connections plugin
   * Creates tables in a dedicated plugin_connections schema for better organization
   */
  private async createTables(): Promise<void> {
    if (this.tablesCreated) {
      logger.info("📋 Tables already created, skipping");
      return;
    }

    try {
      logger.info("🔧 Creating database tables...");

      // Test database connection first
      await this.db.execute(sql`SELECT 1`);
      logger.info("✅ Database connection verified");

      // Create plugin_connections schema if it doesn't exist
      await this.db.execute(sql`CREATE SCHEMA IF NOT EXISTS plugin_connections`);
      logger.info("🔧 Created plugin_connections schema");

      // Set search_path to include plugin_connections schema
      await this.db.execute(sql`SET search_path TO plugin_connections, public`);
      logger.info("🔧 Set search_path to plugin_connections, public");

      // Create service_type enum in plugin_connections schema if it doesn't exist
      logger.info("🔧 Creating service_type enum...");
      await this.db.execute(sql`
        DO $$ BEGIN
          CREATE TYPE plugin_connections.service_type AS ENUM (
            'twitter', 'discord', 'telegram', 'github', 'google', 
            'facebook', 'linkedin', 'instagram', 'tiktok', 'youtube', 'other'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create credential_status enum in plugin_connections schema if it doesn't exist
      logger.info("🔧 Creating credential_status enum...");
      await this.db.execute(sql`
        DO $$ BEGIN
          CREATE TYPE plugin_connections.credential_status AS ENUM (
            'active', 'inactive', 'expired', 'revoked', 'pending'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create the service credentials table in plugin_connections schema
      logger.info("🔧 Creating service_credentials table...");
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS plugin_connections.service_credentials (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_id UUID NOT NULL,
          service_name plugin_connections.service_type NOT NULL,
          status plugin_connections.credential_status NOT NULL DEFAULT 'pending',
          credentials JSONB NOT NULL DEFAULT '{}',
          is_active BOOLEAN NOT NULL DEFAULT true,
          expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          
          -- Unique constraint for one active credential per agent/service
          CONSTRAINT service_credentials_agent_service_unique 
            UNIQUE (agent_id, service_name)
        );
      `);

      // Create indexes for performance
      logger.info("🔧 Creating indexes...");
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS service_credentials_agent_id_idx 
          ON plugin_connections.service_credentials (agent_id);
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS service_credentials_service_name_idx 
          ON plugin_connections.service_credentials (service_name);
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS service_credentials_status_idx 
          ON plugin_connections.service_credentials (status);
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS service_credentials_is_active_idx 
          ON plugin_connections.service_credentials (is_active);
      `);
      await this.db.execute(sql`
        CREATE INDEX IF NOT EXISTS service_credentials_created_at_idx 
          ON plugin_connections.service_credentials (created_at);
      `);

      // Test that the table is accessible
      try {
        await this.db.select().from(serviceCredentialsTable).limit(1);
        logger.info("✅ service_credentials table is accessible");
      } catch (error) {
        logger.warn("⚠️ Table created but not accessible via Drizzle:", error);
      }

      this.tablesCreated = true;
      logger.info("✅ Database tables created in plugin_connections schema");
    } catch (error) {
      logger.error("❌ Failed to create database tables:", error);
      throw error;
    }
  }

  /**
   * Validate database connection
   */
  async validateConnection(): Promise<void> {
    try {
      await this.db.execute(sql`SELECT 1`);
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  /**
   * Store encrypted credentials for a service
   */
  async storeCredentials(
    agentId: UUID,
    service: ServiceName,
    credentials: Record<string, any>,
  ): Promise<void> {
    logger.info(`🔐 Storing credentials for agent ${agentId} and service ${service}`);

    try {
      await this.validateConnection();

      // Use upsert to handle race conditions
      await this.db
        .insert(serviceCredentialsTable)
        .values({
          agentId,
          serviceName: service,
          credentials: credentials,
          isActive: true,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [serviceCredentialsTable.agentId, serviceCredentialsTable.serviceName],
          set: {
            credentials: credentials,
            updatedAt: new Date(),
          },
        });

      logger.info(`✅ Credentials stored successfully for ${service}`);
    } catch (error) {
      logger.error(`❌ Failed to store credentials for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Get encrypted credentials for a service
   */
  async getCredentials(
    agentId: UUID,
    service: ServiceName,
  ): Promise<Record<string, any> | null> {
    try {
      await this.validateConnection();

      const result = await this.db
        .select()
        .from(serviceCredentialsTable)
        .where(
          and(
            eq(serviceCredentialsTable.agentId, agentId),
            eq(serviceCredentialsTable.serviceName, service),
            eq(serviceCredentialsTable.isActive, true),
          ),
        )
        .limit(1);

      if (result.length === 0) {
        logger.info(`No credentials found for agent ${agentId} and service ${service}`);
        return null;
      }

      const credentialData = result[0];
      return credentialData.credentials as Record<string, any>;
    } catch (error) {
      logger.error(`❌ Failed to get credentials for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Delete credentials for a service
   */
  async deleteCredentials(agentId: UUID, service: ServiceName): Promise<void> {
    try {
      await this.validateConnection();

      await this.db
        .delete(serviceCredentialsTable)
        .where(
          and(
            eq(serviceCredentialsTable.agentId, agentId),
            eq(serviceCredentialsTable.serviceName, service),
          ),
        );

      logger.info(`✅ Credentials deleted for agent ${agentId} and service ${service}`);
    } catch (error) {
      logger.error(`❌ Failed to delete credentials for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Get connection status for all services for an agent
   */
  async getConnectionStatus(agentId: UUID): Promise<ConnectionStatus[]> {
    try {
      await this.validateConnection();

      const credentials = await this.db
        .select()
        .from(serviceCredentialsTable)
        .where(eq(serviceCredentialsTable.agentId, agentId));

      return credentials.map((cred: any) => ({
        serviceName: cred.serviceName,
        isConnected: true,
        lastChecked: cred.updatedAt,
      }));
    } catch (error) {
      logger.error("❌ Failed to get connection status:", error);
      throw error;
    }
  }

  /**
   * Check if service has credentials
   */
  async hasCredentials(agentId: UUID, service: ServiceName): Promise<boolean> {
    try {
      const credentials = await this.getCredentials(agentId, service);
      return credentials !== null;
    } catch (error) {
      logger.error(`❌ Failed to check credentials for ${service}:`, error);
      return false;
    }
  }
}