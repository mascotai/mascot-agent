// Export individual tables and enums for direct imports and automatic migration
export {
  serviceCredentialsTable,
  serviceTypeEnum,
  credentialStatusEnum,
} from "./service-credentials";

// Export schema object for ElizaOS migration system
import { serviceCredentialsTable } from "./service-credentials";

export const schema = {
  serviceCredentialsTable,
};
