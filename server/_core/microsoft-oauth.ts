// Microsoft Azure AD OAuth implementation
import { ConfidentialClientApplication, type AuthorizationUrlRequest, type AuthorizationCodeRequest } from '@azure/msal-node';
import axios from 'axios';

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID!;

// Dynamic redirect URI - will be set per request based on the origin
// Using development URL as default for now
let REDIRECT_URI = 'https://3000-iz2im7tr4j8m828oeo95c-5b794449.us1.manus.computer/api/auth/callback';

if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !MICROSOFT_TENANT_ID) {
  throw new Error('Missing Microsoft OAuth configuration. Please set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID');
}

const msalConfig = {
  auth: {
    clientId: MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}`,
    clientSecret: MICROSOFT_CLIENT_SECRET,
  },
};

const pca = new ConfidentialClientApplication(msalConfig);

export async function getAuthorizationUrl(state: string, origin?: string): Promise<string> {
  const redirectUri = origin ? `${origin}/api/auth/callback` : REDIRECT_URI;
  
  const authCodeUrlParameters: AuthorizationUrlRequest = {
    scopes: ['user.read', 'openid', 'profile', 'email'],
    redirectUri,
    state,
  };

  return await pca.getAuthCodeUrl(authCodeUrlParameters);
}

export async function getTokenFromCode(code: string, origin?: string): Promise<{ accessToken: string }> {
  const redirectUri = origin ? `${origin}/api/auth/callback` : REDIRECT_URI;
  
  const tokenRequest: AuthorizationCodeRequest = {
    code,
    scopes: ['user.read'],
    redirectUri,
  };

  const response = await pca.acquireTokenByCode(tokenRequest);
  
  if (!response || !response.accessToken) {
    throw new Error('Failed to acquire token');
  }

  return { accessToken: response.accessToken };
}

export async function getUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  name: string;
  avatar?: string;
}> {
  const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const user = response.data;

  return {
    id: user.id,
    email: user.mail || user.userPrincipalName,
    name: user.displayName,
    avatar: undefined, // Microsoft Graph photo requires separate API call
  };
}
