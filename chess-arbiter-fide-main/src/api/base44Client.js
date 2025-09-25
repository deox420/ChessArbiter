import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "68cc712e1ce433da6b73a440", 
  requiresAuth: true // Ensure authentication is required for all operations
});
