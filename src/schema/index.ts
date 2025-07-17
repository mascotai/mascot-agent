import { 
  serviceCredentialsTable, 
  serviceTypeEnum, 
  credentialStatusEnum 
} from './service-credentials';
import { 
  oauthSessionsTable, 
  oauthSessionStatusEnum 
} from './oauth-sessions';

// Export the schema as an object
export const twitterAuthSchema = {
  serviceCredentialsTable,
  serviceTypeEnum,
  credentialStatusEnum,
  oauthSessionsTable,
  oauthSessionStatusEnum,
};

// Also export individual tables and enums for direct imports
export { 
  serviceCredentialsTable, 
  serviceTypeEnum, 
  credentialStatusEnum 
} from './service-credentials';
export { 
  oauthSessionsTable, 
  oauthSessionStatusEnum 
} from './oauth-sessions';
