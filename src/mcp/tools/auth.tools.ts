import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AuthService } from '../../auth/auth.service';
import { GithubService } from '../../github/github.service';
import {
  AuthStatusSchema,
  DeviceLoginSchema,
  PollTokenSchema,
  LogoutSchema,
} from '../schemas/tool-inputs';
import { sanitizeErrorMessage } from '../../common/error.sanitizer';

export function registerAuthTools(
  server: McpServer,
  authService: AuthService,
  githubService: GithubService,
) {
  /**
   * 1. Check current Authentication Status
   */
  server.tool(
    'github.auth_status',
    'Check current GitHub authentication status (whether using OAuth, PAT, or unauthenticated, and token user)',
    AuthStatusSchema.shape,
    async () => {
      try {
        let profileSummary: { login?: string; name?: string } | undefined;
        if (githubService.hasToken()) {
          try {
            const p = await githubService.getProfile();
            profileSummary = { login: p.username, name: p.name || undefined };
          } catch {
            // Token might be invalid
          }
        }

        const status = authService.getAuthStatus(profileSummary);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error checking auth status: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 2. Initiate GitHub OAuth Device Flow
   */
  server.tool(
    'github.auth_device_login',
    'Initiate GitHub OAuth Device Flow to log in without copy-pasting personal access tokens. Returns verification URL and user code.',
    DeviceLoginSchema.shape,
    async ({ clientId, scopes }) => {
      try {
        const res = await authService.initiateDeviceFlow(clientId, scopes);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: `To complete login:
1. Open URL: ${res.verification_uri}
2. Enter User Code: ${res.user_code}
3. Authorize in your browser.
4. Then invoke 'github.auth_poll_token' with deviceCode: '${res.device_code}' and clientId: '${clientId || process.env.GITHUB_CLIENT_ID || 'your_client_id'}'.`,
                  userCode: res.user_code,
                  verificationUri: res.verification_uri,
                  deviceCode: res.device_code,
                  expiresInSeconds: res.expires_in,
                  intervalSeconds: res.interval,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error initiating device login: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 3. Poll Device Flow Token
   */
  server.tool(
    'github.auth_poll_token',
    'Complete the GitHub OAuth Device Flow by polling for the access token after entering the user code in browser.',
    PollTokenSchema.shape,
    async ({ clientId, deviceCode }) => {
      try {
        const result = await authService.pollDeviceToken(clientId, deviceCode);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error polling token: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 4. Clear OAuth Session (Logout)
   */
  server.tool(
    'github.auth_logout',
    'Log out from the current OAuth session (clears .session.json). Falls back to GITHUB_PERSONAL_ACCESS_TOKEN if configured.',
    LogoutSchema.shape,
    async () => {
      try {
        const success = authService.clearOAuthSession();
        const hasPat = authService.hasPatFallback();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success,
                  message: success
                    ? 'Logged out from OAuth session.'
                    : 'Failed to clear session file.',
                  fallbackToPat: hasPat,
                  currentAuthType: authService.getAuthType(),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error logging out: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
