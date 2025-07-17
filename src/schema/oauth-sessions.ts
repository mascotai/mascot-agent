import { pgTable, uuid, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceTypeEnum } from './service-credentials';

// Enum for OAuth session status
export const oauthSessionStatusEnum = pgEnum('oauth_session_status', [
  'pending',
  'authorized',
  'expired',
  'canceled',
  'failed'
]);

export const oauthSessionsTable = pgTable('plugin_oauth_sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  agentId: uuid('agent_id').notNull(),
  serviceName: serviceTypeEnum('service_name').notNull(),
  state: text('state').notNull(),
  status: oauthSessionStatusEnum('status').notNull().default('pending'),
  codeVerifier: text('code_verifier'),
  returnUrl: text('return_url'),
  authorizationCode: text('authorization_code'),
  errorMessage: text('error_message'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  // Indexes for performance
  index('plugin_oauth_sessions_agent_id_idx').on(table.agentId),
  index('plugin_oauth_sessions_service_name_idx').on(table.serviceName),
  index('plugin_oauth_sessions_state_idx').on(table.state),
  index('plugin_oauth_sessions_status_idx').on(table.status),
  index('plugin_oauth_sessions_expires_at_idx').on(table.expiresAt),
  index('plugin_oauth_sessions_created_at_idx').on(table.createdAt),
  // Composite index for common queries
  index('plugin_oauth_sessions_agent_service_idx').on(table.agentId, table.serviceName),
]);
