import { Service, logger, type IAgentRuntime, type UUID } from "@elizaos/core";
import { EncryptionService } from "./encryption.service";
import { DatabaseService } from "./database.service";
import type {
  IAuthService,
  ServiceName,
  ServiceCredential,
  OAuthSession,
  ConnectionStatus,
  TwitterCredentials,
} from "../types/auth.types";
import { LRUCache } from "lru-cache";

/**
 * Authentication service for managing agent credentials to external services
 */
export class AuthService extends Service implements IAuthService {
  static serviceType = "auth";

  private encryptionService: EncryptionService;
  private oauthCache: LRUCache<string, any>;

  private get databaseService(): DatabaseService {
    const dbService = this.runtime.getService("database") as DatabaseService;
    if (!dbService) {
      throw new Error("Database service not available");
    }
    return dbService;
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

    // Database operations are handled by our database service
    logger.info("✅ Auth service started - database operations handled by database service");

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
      // Test database connection through our database service
      await this.databaseService.validateConnection();
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
      // Encrypt credentials and store as JSON object
      const encryptedCredentials = this.encryptionService.encrypt(
        JSON.stringify(credentials),
      );

      // Store through database service
      await this.databaseService.storeCredentials(agentId, service, {
        encryptedData: encryptedCredentials,
      });

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
      const credentialsData = await this.databaseService.getCredentials(agentId, service);

      if (!credentialsData) {
        return null;
      }

      // Check if this is our encrypted format
      if (credentialsData.encryptedData) {
        try {
          const decryptedJson = this.encryptionService.decrypt(
            credentialsData.encryptedData,
          );
          return JSON.parse(decryptedJson);
        } catch (decryptError) {
          logger.error(
            `❌ Failed to decrypt credentials for ${service}:`,
            decryptError,
          );
          throw new Error(
            `Failed to decrypt credentials for ${service}: Invalid encryption or corrupted data`,
          );
        }
      }

      // Fallback for unencrypted data (legacy support)
      logger.warn(`⚠️ Found unencrypted credentials for ${service} - consider re-authenticating for better security`);
      return credentialsData;
    } catch (error) {
      logger.error(`❌ Failed to get credentials for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Delete credentials for a service (alias for revokeCredentials)
   */
  async deleteCredentials(agentId: UUID, service: ServiceName): Promise<void> {
    await this.revokeCredentials(agentId, service);
  }

  /**
   * Revoke credentials for a service
   */
  async revokeCredentials(agentId: UUID, service: ServiceName): Promise<void> {
    try {
      await this.databaseService.deleteCredentials(agentId, service);
      logger.info(`✅ Credentials revoked for agent ${agentId} and service ${service}`);
    } catch (error) {
      logger.error(`❌ Failed to revoke credentials for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Get connection status for a specific service
   */
  async getConnectionStatus(agentId: UUID, service: ServiceName): Promise<ConnectionStatus> {
    try {
      const hasCredentials = await this.databaseService.hasCredentials(agentId, service);
      return {
        serviceName: service,
        isConnected: hasCredentials,
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error(`❌ Failed to get connection status for ${service}:`, error);
      throw error;
    }
  }

  /**
   * Get connection status for all services for an agent
   */
  async getAllConnectionStatuses(agentId: UUID): Promise<ConnectionStatus[]> {
    try {
      return await this.databaseService.getConnectionStatus(agentId);
    } catch (error) {
      logger.error("❌ Failed to get connection status:", error);
      throw error;
    }
  }

  /**
   * Initiate OAuth flow for a service
   */
  async initiateOAuth(
    agentId: UUID,
    service: ServiceName,
    returnUrl?: string,
  ): Promise<string> {
    // This would be implemented by specific service handlers
    throw new Error(`OAuth initiation not implemented for ${service}`);
  }

  /**
   * Complete OAuth flow for a service
   */
  async completeOAuth(
    agentId: UUID,
    service: ServiceName,
    code: string,
    state: string,
  ): Promise<void> {
    // This would be implemented by specific service handlers
    throw new Error(`OAuth completion not implemented for ${service}`);
  }

  /**
   * Refresh credentials for a service
   */
  async refreshCredentials(agentId: UUID, service: ServiceName): Promise<void> {
    // This would be implemented by specific service handlers
    throw new Error(`Credential refresh not implemented for ${service}`);
  }

  /**
   * Check if service has credentials
   */
  async hasCredentials(agentId: UUID, service: ServiceName): Promise<boolean> {
    try {
      return await this.databaseService.hasCredentials(agentId, service);
    } catch (error) {
      logger.error(`❌ Failed to check credentials for ${service}:`, error);
      return false;
    }
  }

  // OAuth session management methods using cache
  
  /**
   * Store OAuth session data temporarily
   */
  storeOAuthSession(sessionId: string, sessionData: OAuthSession): void {
    logger.info(`Storing OAuth session: ${sessionId}`);
    this.oauthCache.set(`session:${sessionId}`, sessionData);
  }

  /**
   * Get OAuth session data
   */
  getOAuthSession(sessionId: string): OAuthSession | null {
    const sessionData = this.oauthCache.get(`session:${sessionId}`);
    if (!sessionData) {
      logger.info(`OAuth session not found: ${sessionId}`);
      return null;
    }
    return sessionData as OAuthSession;
  }

  /**
   * Delete OAuth session data
   */
  deleteOAuthSession(sessionId: string): void {
    logger.info(`Deleting OAuth session: ${sessionId}`);
    this.oauthCache.delete(`session:${sessionId}`);
  }

  /**
   * Store temporary OAuth credentials (for OAuth 1.0a request tokens)
   */
  storeTempCredentials(key: string, credentials: Record<string, any>): void {
    logger.info(`Storing temp credentials: ${key}`);
    this.oauthCache.set(`temp:${key}`, credentials);
  }

  /**
   * Get temporary OAuth credentials
   */
  getTempCredentials(key: string): Record<string, any> | null {
    const credentials = this.oauthCache.get(`temp:${key}`);
    if (!credentials) {
      logger.info(`Temp credentials not found: ${key}`);
      return null;
    }
    return credentials as Record<string, any>;
  }

  /**
   * Delete temporary OAuth credentials
   */
  deleteTempCredentials(key: string): void {
    logger.info(`Deleting temp credentials: ${key}`);
    this.oauthCache.delete(`temp:${key}`);
  }

  /**
   * Clean up expired sessions and temporary credentials
   */
  cleanupExpired(): void {
    // LRU cache handles TTL automatically, but we can clear all if needed
    logger.info("OAuth cache cleanup - TTL handled automatically by LRU cache");
  }

  /**
   * Create OAuth session - alias for storeOAuthSession for compatibility
   */
  async createOAuthSession(
    agentId: UUID,
    service: ServiceName,
    state: string,
    returnUrl?: string,
  ): Promise<void> {
    const sessionData: OAuthSession = {
      id: crypto.randomUUID() as UUID,
      agentId,
      serviceName: service,
      state,
      returnUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      createdAt: new Date(),
    };
    this.storeOAuthSession(state, sessionData);
  }

  /**
   * Validate OAuth session - alias for getOAuthSession for compatibility
   */
  validateOAuthSession(state: string): OAuthSession | null {
    return this.getOAuthSession(state);
  }
}