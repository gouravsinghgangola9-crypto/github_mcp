export type AuthType = 'PAT' | 'OAUTH' | 'NONE';

export interface AuthStatus {
  authenticated: boolean;
  authType: AuthType;
  username?: string;
  name?: string;
  scopes?: string[];
  tokenSource?: string;
  hasPatFallback: boolean;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface OAuthSession {
  accessToken: string;
  tokenType: string;
  scope?: string;
  createdAt: string;
  username?: string;
}

export interface AuthContext {
  token: string | null;
  authType: AuthType;
  username?: string;
}
