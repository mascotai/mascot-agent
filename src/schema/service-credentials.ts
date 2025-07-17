import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enum for supported service types
export const serviceTypeEnum = pgEnum("service_type", [
  "twitter",
  "discord",
  "telegram",
  "github",
  "google",
  "facebook",
  "linkedin",
  "instagram",
  "tiktok",
  "youtube",
  "other",
]);

// Enum for credential status
export const credentialStatusEnum = pgEnum("credential_status", [
  "active",
  "inactive",
  "expired",
  "revoked",
  "pending",
]);

export const serviceCredentialsTable = pgTable(
  "plugin_service_credentials",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    agentId: uuid("agent_id").notNull(),
    serviceName: serviceTypeEnum("service_name").notNull(),
    status: credentialStatusEnum("status").notNull().default("pending"),
    credentials: jsonb("credentials")
      .notNull()
      .default(sql`'{}'::jsonb`),
    isActive: boolean("is_active").default(true).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    // Indexes for performance
    index("plugin_service_credentials_agent_id_idx").on(table.agentId),
    index("plugin_service_credentials_service_name_idx").on(table.serviceName),
    index("plugin_service_credentials_status_idx").on(table.status),
    index("plugin_service_credentials_is_active_idx").on(table.isActive),
    index("plugin_service_credentials_created_at_idx").on(table.createdAt),
    // Unique constraint for one active credential per agent/service
    unique("plugin_service_credentials_agent_service_unique").on(
      table.agentId,
      table.serviceName,
    ),
  ],
);
