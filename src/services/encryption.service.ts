import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { logger } from "@elizaos/core";
import type { IEncryptionService } from "../types/auth.types.js";

/**
 * Encryption service for securing stored credentials
 */
export class EncryptionService implements IEncryptionService {
  private encryptionKey: string | null = null;
  private algorithm = "aes-256-cbc";

  constructor() {
    this.encryptionKey = process.env.AUTH_ENCRYPTION_KEY || null;

    if (!this.encryptionKey) {
      logger.warn(
        "AUTH_ENCRYPTION_KEY not provided - credential encryption disabled",
      );
    } else if (this.encryptionKey.length < 32) {
      logger.warn(
        "AUTH_ENCRYPTION_KEY should be at least 32 characters for AES-256",
      );
    }
  }

  /**
   * Check if encryption is enabled
   */
  isEnabled(): boolean {
    return this.encryptionKey !== null && this.encryptionKey.length >= 32;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): string {
    if (!this.isEnabled()) {
      logger.warn("Encryption not enabled - storing data in plain text");
      return data;
    }

    try {
      const key = Buffer.from(this.encryptionKey!.slice(0, 32), "utf8");
      const iv = randomBytes(16);
      const cipher = createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(data, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Prepend IV to encrypted data
      return iv.toString("hex") + ":" + encrypted;
    } catch (error) {
      logger.error("Failed to encrypt data:", error);
      throw new Error("Encryption failed");
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    if (!this.isEnabled()) {
      logger.warn("Encryption not enabled - returning data as-is");
      return encryptedData;
    }

    try {
      const key = Buffer.from(this.encryptionKey!.slice(0, 32), "utf8");
      const parts = encryptedData.split(":");

      if (parts.length !== 2) {
        throw new Error("Invalid encrypted data format");
      }

      const iv = Buffer.from(parts[0], "hex");
      const encrypted = parts[1];

      const decipher = createDecipheriv(this.algorithm, key, iv);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      logger.error("Failed to decrypt data:", error);
      throw new Error("Decryption failed");
    }
  }

  /**
   * Generate a secure random encryption key
   */
  static generateKey(): string {
    return randomBytes(32).toString("hex");
  }
}
