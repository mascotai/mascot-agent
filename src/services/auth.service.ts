import { Service, logger, type IAgentRuntime, type UUID } from "@elizaos/core";
import { EncryptionService } from "./encryption.service";
import type {
  IAuthService,
  ServiceName,
  ServiceCredential,
  OAuthSession,
  ConnectionStatus,
  TwitterCredentials,
} from "../types/auth.types";
import { serviceCredentialsTable, oauthSessionsTable } from "../schema";
import { eq, and, sql } from "drizzle-orm";
import { setupDatabase } from "../scripts/db-setup";

/**
 * Authentication service for managing agent credentials to external services
 */
export class AuthService extends Service implements IAuthService {
  static serviceType = "auth";

  private encryptionService: EncryptionService;
  private get db() {
    // Access the database through the SQL plugin service
    const sqlService = this.runtime.getService("sql");
    if (!sqlService) {
      throw new Error("SQL service not available");
    }
    return (sqlService as any).db;
  }

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.encryptionService = new EncryptionService();
  }

  get capabilityDescription(): string {
    return "Authentication service for managing agent credentials to external services";
  }

  static async start(runtime: IAgentRuntime): Promise<AuthService> {
    logger.info("🔐 Starting Auth service...");

    const service = new AuthService(runtime);
    
    // TODO: Remove this manual database setup once ElizaOS plugin schema migration is fixed
    try {
      await setupDatabase();
      logger.info("✅ Database setup completed for Auth service");
    } catch (error) {
      logger.error("❌ Failed to setup database for Auth service:", error);
      throw error;
    }
    
    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info("🔐 Stopping Auth service...");
    const service = runtime.getService(AuthService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  async stop(): Promise<void> {
    logger.info("🔐 Auth service stopped");
  }

  private async validateDatabaseConnection(): Promise<void> {
    try {
      // Test database connection by executing a simple query
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
    logger.info(
      `Storing credentials for agent ${agentId} and service ${service}`,
    );

    if (!this.db) {
      throw new Error("Database not available");
    }

    try {
      // Encrypt credentials
      const encryptedCredentials = this.encryptionService.encrypt(
        JSON.stringify(credentials),
      );

      // Use upsert pattern - first try to update existing, then insert if none exists
      try {
        const updateResult = await this.db
          .update(serviceCredentialsTable)
          .set({
            credentials: encryptedCredentials,
            isActive: true,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(serviceCredentialsTable.agentId, agentId),
              eq(serviceCredentialsTable.serviceName, service),
            ),
          );

        // If no rows were updated, insert a new record
        if (updateResult.rowCount === 0) {
          await this.db.insert(serviceCredentialsTable).values({
            agentId,
            serviceName: service,
            credentials: encryptedCredentials,
            isActive: true,
          });
        }
      } catch (insertError) {
        // Handle potential race condition where another process inserted between update and insert
        logger.warn(`Potential race condition when storing credentials for ${service}, retrying update...`);
        
        await this.db
          .update(serviceCredentialsTable)
          .set({
            credentials: encryptedCredentials,
            isActive: true,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(serviceCredentialsTable.agentId, agentId),
              eq(serviceCredentialsTable.serviceName, service),
            ),
          );
      }

      logger.info(`✅ Credentials stored successfully for ${service}`);
    } catch (error) {
      logger.error(`❌ Failed to store credentials for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt credentials for a service
   */
  async getCredentials(
    agentId: UUID,
    service: ServiceName,
  ): Promise<Record<string, any> | null> {
    if (!this.db) {
      logger.error("Database not available");
      return null;
    }

    try {
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
        return null;
      }

      const encryptedCredentials = result[0].credentials;
      const decryptedCredentials = this.encryptionService.decrypt(
        encryptedCredentials as string,
      );

      return JSON.parse(decryptedCredentials);
    } catch (error) {
      logger.error(`❌ Failed to retrieve credentials for ${service}:`, error);
      return null;
    }
  }

  /**
   * Revoke credentials for a service
   */
  async revokeCredentials(agentId: UUID, service: ServiceName): Promise<void> {
    logger.info(
      `Revoking credentials for agent ${agentId} and service ${service}`,
    );

    if (!this.db) {
      throw new Error("Database not available");
    }

    try {
      await this.db
        .update(serviceCredentialsTable)
        .set({
          isActive: false,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(serviceCredentialsTable.agentId, agentId),
            eq(serviceCredentialsTable.serviceName, service),
          ),
        );

      logger.info(`✅ Credentials revoked successfully for ${service}`);
    } catch (error) {
      logger.error(`❌ Failed to revoke credentials for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Get connection status for a service
   */
  async getConnectionStatus(
    agentId: UUID,
    service: ServiceName,
  ): Promise<ConnectionStatus> {
    try {
      const credentials = await this.getCredentials(agentId, service);

      if (!credentials) {
        return {
          serviceName: service,
          isConnected: false,
          lastChecked: new Date(),
        };
      }

      // For Twitter, extract user info if available
      let username: string | undefined;
      let userId: string | undefined;

      if (service === "twitter" && credentials.username) {
        username = credentials.username;
        userId = credentials.userId;
      }

      return {
        serviceName: service,
        isConnected: true,
        username,
        userId,
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error(`❌ Failed to get connection status for ${service}:`, error);
      return {
        serviceName: service,
        isConnected: false,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Create OAuth session for tracking
   */
  async createOAuthSession(
    agentId: UUID,
    service: ServiceName,
    state: string,
    returnUrl?: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    try {
      await this.db.insert(oauthSessionsTable).values({
        agentId,
        serviceName: service,
        state,
        returnUrl,
        expiresAt,
      });

      logger.info(`✅ OAuth session created for ${service}`);
    } catch (error) {
      logger.error(`❌ Failed to create OAuth session for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Validate OAuth session
   */
  async validateOAuthSession(
    agentId: UUID,
    service: ServiceName,
    state: string,
  ): Promise<OAuthSession | null> {
    try {
      const result = await this.db
        .select()
        .from(oauthSessionsTable)
        .where(
          and(
            eq(oauthSessionsTable.agentId, agentId),
            eq(oauthSessionsTable.serviceName, service),
            eq(oauthSessionsTable.state, state),
          ),
        )
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const session = result[0];

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        await this.cleanupExpiredSessions();
        return null;
      }

      return session;
    } catch (error) {
      logger.error(`❌ Failed to validate OAuth session:`, error);
      return null;
    }
  }

  /**
   * Clean up expired OAuth sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await this.db.delete(oauthSessionsTable).where(sql`expires_at < NOW()`);

      logger.info("✅ Expired OAuth sessions cleaned up");
    } catch (error) {
      logger.error("❌ Failed to cleanup expired OAuth sessions:", error);
    }
  }

  // Placeholder methods for OAuth flows - will be implemented by service-specific handlers
  async initiateOAuth(
    agentId: UUID,
    service: ServiceName,
    returnUrl?: string,
  ): Promise<string> {
    throw new Error(`OAuth initiation not implemented for ${service}`);
  }

  async completeOAuth(
    agentId: UUID,
    service: ServiceName,
    code: string,
    state: string,
  ): Promise<void> {
    throw new Error(`OAuth completion not implemented for ${service}`);
  }

  async refreshCredentials(agentId: UUID, service: ServiceName): Promise<void> {
    throw new Error(`Credential refresh not implemented for ${service}`);
  }
}