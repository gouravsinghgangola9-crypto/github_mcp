import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { AuthStatus, AuthType, DeviceCodeResponse, OAuthSession } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly sessionFilePath: string;
  private cachedSession: OAuthSession | null = null;

  constructor(private readonly configService: ConfigService) {
    this.sessionFilePath = path.resolve(process.cwd(), '.session.json');
    this.loadSession();
  }

  private loadSession(): void {
    try {
      if (fs.existsSync(this.sessionFilePath)) {
        const raw = fs.readFileSync(this.sessionFilePath, 'utf8');
        this.cachedSession = JSON.parse(raw);
        this.logger.log('Active GitHub OAuth session loaded.');
      }
    } catch (error) {
      this.logger.warn(`Failed to read OAuth session file: ${(error as Error).message}`);
      this.cachedSession = null;
    }
  }

  /**
   * Save OAuth session to disk securely
   */
  public saveOAuthSession(session: OAuthSession): void {
    try {
      this.cachedSession = session;
      fs.writeFileSync(this.sessionFilePath, JSON.stringify(session, null, 2), {
        encoding: 'utf8',
        mode: 0o600, // Read/write only by owner
      });
      this.logger.log('OAuth session saved successfully.');
    } catch (error) {
      this.logger.error(`Failed to save OAuth session: ${(error as Error).message}`);
    }
  }

  /**
   * Clear OAuth session (logout)
   */
  public clearOAuthSession(): boolean {
    try {
      this.cachedSession = null;
      if (fs.existsSync(this.sessionFilePath)) {
        fs.unlinkSync(this.sessionFilePath);
      }
      this.logger.log('OAuth session cleared.');
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete OAuth session: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Get active token (Priority: OAuth > PAT)
   */
  public getActiveToken(): string | null {
    if (this.cachedSession?.accessToken) {
      return this.cachedSession.accessToken;
    }
    const pat = this.getPatToken();
    return pat || null;
  }

  /**
   * Returns current auth type in use
   */
  public getAuthType(): AuthType {
    if (this.cachedSession?.accessToken) {
      return 'OAUTH';
    }
    if (this.getPatToken()) {
      return 'PAT';
    }
    return 'NONE';
  }

  public hasPatFallback(): boolean {
    return Boolean(this.getPatToken());
  }

  private getPatToken(): string {
    return (
      this.configService.get<string>('githubToken') ||
      process.env.GITHUB_PERSONAL_ACCESS_TOKEN ||
      process.env.GITHUB_TOKEN ||
      ''
    ).trim();
  }

  /**
   * Step 1 of GitHub OAuth Device Flow (RFC 8628)
   * Requests a device verification code from GitHub.
   */
  public async initiateDeviceFlow(
    clientId?: string,
    scopes: string = 'read:user,repo',
  ): Promise<DeviceCodeResponse> {
    const activeClientId =
      clientId ||
      this.configService.get<string>('githubClientId') ||
      process.env.GITHUB_CLIENT_ID;

    if (!activeClientId) {
      throw new Error(
        'GitHub OAuth Client ID is required. Please set GITHUB_CLIENT_ID in .env or pass clientId argument.',
      );
    }

    const response = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: activeClientId,
        scope: scopes,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub Device Flow failed (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as DeviceCodeResponse;
    return data;
  }

  /**
   * Step 2 of GitHub OAuth Device Flow
   * Polls GitHub to check if the user has authorized the device code.
   */
  public async pollDeviceToken(
    clientId: string,
    deviceCode: string,
  ): Promise<{
    status: 'success' | 'authorization_pending' | 'slow_down' | 'expired_token' | 'error';
    message: string;
    session?: OAuthSession;
  }> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    if (!response.ok) {
      return {
        status: 'error',
        message: `HTTP error ${response.status}: ${await response.text()}`,
      };
    }

    const data = await response.json();

    if (data.error) {
      switch (data.error) {
        case 'authorization_pending':
          return {
            status: 'authorization_pending',
            message: 'Waiting for user authorization in browser...',
          };
        case 'slow_down':
          return {
            status: 'slow_down',
            message: 'Polling too fast. Slowing down request frequency.',
          };
        case 'expired_token':
          return {
            status: 'expired_token',
            message: 'The device code has expired. Please initiate login again.',
          };
        case 'access_denied':
          return {
            status: 'error',
            message: 'Login was cancelled or access denied by user.',
          };
        default:
          return {
            status: 'error',
            message: data.error_description || data.error,
          };
      }
    }

    if (data.access_token) {
      const session: OAuthSession = {
        accessToken: data.access_token,
        tokenType: data.token_type || 'bearer',
        scope: data.scope,
        createdAt: new Date().toISOString(),
      };
      this.saveOAuthSession(session);
      return {
        status: 'success',
        message: 'Successfully authenticated via GitHub OAuth Device Flow!',
        session,
      };
    }

    return {
      status: 'error',
      message: 'Unknown OAuth response received from GitHub.',
    };
  }

  /**
   * Get formatted auth status report
   */
  public getAuthStatus(profile?: { login?: string; name?: string }): AuthStatus {
    const authType = this.getAuthType();
    const token = this.getActiveToken();

    return {
      authenticated: Boolean(token),
      authType,
      username: profile?.login,
      name: profile?.name,
      scopes: this.cachedSession?.scope ? this.cachedSession.scope.split(',') : undefined,
      tokenSource:
        authType === 'OAUTH'
          ? 'OAuth Session (.session.json)'
          : authType === 'PAT'
            ? 'Personal Access Token (.env)'
            : 'None',
      hasPatFallback: this.hasPatFallback(),
    };
  }
}
