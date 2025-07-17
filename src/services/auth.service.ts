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
import { serviceCredentialsTable } from "../schema/service-credentials";
import { eq, and, sql } from "drizzle-orm";
import { LRUCache } from "lru-cache";

/**
 * Authentication service for managing agent credentials to external services
 */
export class AuthService extends Service implements IAuthService {
  static serviceType = "auth";

  private encryptionService: EncryptionService;
  private oauthCache: LRUCache<string, any>;

  private get db() {
    // Access the database through the runtime (ElizaOS standard pattern)
    if (!this.runtime.db) {
      logger.error("Database not available - check that @elizaos/plugin-sql is loaded");
      throw new Error("Database not available - check that @elizaos/plugin-sql is loaded");
    }
    return this.runtime.db;
  }


  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.encryptionService = new EncryptionService();
    
    // Initialize unified OAuth cache with 15 minute TTL
    // Uses single cache with prefixed keys for both sessions and temp credentials
    this.oauthCache = new LRUCache<string, any>({
      max: 1000,
      ttl: 1000 * 60 * 15, // 15 minutes
    });
  }

  get capabilityDescription(): string {
    return "Authentication service for managing agent credentials to external services";
  }

  static async start(runtime: IAgentRuntime): Promise<AuthService> {
    logger.info("🔐 Starting Auth service...");

    const service = new AuthService(runtime);

    // Database tables are created automatically by ElizaOS plugin system
    logger.info("✅ Auth service started - tables handled by plugin system");

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
        logger.warn(
          `Potential race condition when storing credentials for ${service}, retrying update...`,
        );

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
      
      // If database is not available, return disconnected status
      if (error instanceof Error && error.message.includes("Database not available")) {
        logger.warn(`Database not available for ${service} connection status - returning disconnected`);
        return {
          serviceName: service,
          isConnected: false,
          lastChecked: new Date(),
        };
      }
      
      return {
        serviceName: service,
        isConnected: false,
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Create OAuth session for tracking using cache
   */
  async createOAuthSession(
    agentId: UUID,
    service: ServiceName,
    state: string,
    returnUrl?: string,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    const cacheKey = `session:${agentId}:${service}:${state}`;

    try {
      const sessionData: OAuthSession = {
        id: crypto.randomUUID(),
        agentId,
        serviceName: service,
        state,
        status: "pending",
        returnUrl,
        expiresAt,
        createdAt: new Date(),
      };

      // Store in cache (TTL handled by LRU cache)
      this.oauthCache.set(cacheKey, sessionData);

      logger.info(`✅ OAuth session created for ${service} (cached)`);
    } catch (error) {
      logger.error(`❌ Failed to create OAuth session for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Validate OAuth session using cache
   */
  async validateOAuthSession(
    agentId: UUID,
    service: ServiceName,
    state: string,
  ): Promise<OAuthSession | null> {
    const cacheKey = `session:${agentId}:${service}:${state}`;

    try {
      const sessionData = this.oauthCache.get(cacheKey);

      if (!sessionData) {
        return null;
      }

      // Check if session is expired (double-check even with TTL)
      if (new Date() > sessionData.expiresAt) {
        this.oauthCache.delete(cacheKey);
        return null;
      }

      return sessionData;
    } catch (error) {
      logger.error(`❌ Failed to validate OAuth session:`, error);
      return null;
    }
  }

  /**
   * Clean up expired OAuth sessions (cache handles TTL automatically)
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      // With cache TTL, expired sessions are automatically removed
      // This method is kept for compatibility but does nothing since cache handles cleanup
      logger.info(
        "✅ Expired OAuth sessions cleaned up (cache TTL handles automatic cleanup)",
      );
    } catch (error) {
      logger.error("❌ Failed to cleanup expired OAuth sessions:", error);
    }
  }

  /**
   * Update OAuth session status in cache
   */
  async updateOAuthSession(
    agentId: UUID,
    service: ServiceName,
    state: string,
    updates: Partial<OAuthSession>,
  ): Promise<void> {
    const cacheKey = `session:${agentId}:${service}:${state}`;

    try {
      const sessionData = this.oauthCache.get(cacheKey);

      if (!sessionData) {
        logger.warn(`OAuth session not found for update: ${cacheKey}`);
        return;
      }

      const updatedSession = { ...sessionData, ...updates };

      // Check if session is still valid
      if (new Date() < updatedSession.expiresAt) {
        this.oauthCache.set(cacheKey, updatedSession);
        logger.info(`✅ OAuth session updated for ${service}`);
      } else {
        // Session expired, remove it
        this.oauthCache.delete(cacheKey);
        logger.warn(`OAuth session expired during update for ${service}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to update OAuth session for ${service}:`, error);
    }
  }

  /**
   * Delete OAuth session from cache
   */
  async deleteOAuthSession(
    agentId: UUID,
    service: ServiceName,
    state: string,
  ): Promise<void> {
    const cacheKey = `session:${agentId}:${service}:${state}`;

    try {
      this.oauthCache.delete(cacheKey);
      logger.info(`✅ OAuth session deleted for ${service}`);
    } catch (error) {
      logger.error(`❌ Failed to delete OAuth session for ${service}:`, error);
    }
  }

  /**
   * Store temporary credentials in cache
   */
  storeTempCredentials(key: string, credentials: any): void {
    this.oauthCache.set(`temp:${key}`, credentials);
  }

  /**
   * Get temporary credentials from cache
   */
  getTempCredentials(key: string): any {
    return this.oauthCache.get(`temp:${key}`);
  }

  /**
   * Delete temporary credentials from cache
   */
  deleteTempCredentials(key: string): void {
    this.oauthCache.delete(`temp:${key}`);
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
