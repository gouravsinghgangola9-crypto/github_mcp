import { Injectable, Logger } from '@nestjs/common';
import { PolicyEngine } from './policy.engine';
import { AuditLogger } from './audit.logger';
import { AuthService } from '../auth/auth.service';
import { AuditLogEntry } from './policy.types';
import { randomBytes } from 'crypto';

@Injectable()
export class PolicyGateway {
  private readonly logger = new Logger(PolicyGateway.name);

  constructor(
    private readonly policyEngine: PolicyEngine,
    private readonly auditLogger: AuditLogger,
    private readonly authService: AuthService,
  ) {}

  /**
   * Main Gateway Interceptor: Evaluates policy before invoking any GitHub operation.
   */
  public async executeWithPolicy<T>(
    toolName: string,
    parameters: Record<string, any>,
    executor: () => Promise<T>,
  ): Promise<{
    allowed: boolean;
    requiresApproval: boolean;
    data?: T;
    approvalId?: string;
    message?: string;
  }> {
    const evaluation = this.policyEngine.evaluate(toolName, parameters);
    const authType = this.authService.getAuthType();
    const repo = parameters.owner && parameters.repo ? `${parameters.owner}/${parameters.repo}` : undefined;

    // 1. Handle DENIED
    if (evaluation.isDenied) {
      const logEntry: AuditLogEntry = {
        id: `aud_${randomBytes(4).toString('hex')}`,
        timestamp: new Date().toISOString(),
        actor: 'user',
        authType,
        tool: toolName,
        repository: repo,
        parameters,
        decision: 'DENY',
        reason: evaluation.reason,
        status: 'BLOCKED',
      };
      this.auditLogger.record(logEntry);

      return {
        allowed: false,
        requiresApproval: false,
        message: `🚫 [POLICY GATEWAY DENIED] ${evaluation.reason}. Operation '${toolName}' is forbidden by security policy.`,
      };
    }

    // 2. Handle APPROVAL REQUIRED
    if (evaluation.requiresApproval) {
      const logEntry: AuditLogEntry = {
        id: `aud_${randomBytes(4).toString('hex')}`,
        timestamp: new Date().toISOString(),
        actor: 'user',
        authType,
        tool: toolName,
        repository: repo,
        parameters,
        decision: 'APPROVAL_REQUIRED',
        reason: evaluation.reason,
        status: 'PENDING_APPROVAL',
      };
      this.auditLogger.record(logEntry);

      return {
        allowed: false,
        requiresApproval: true,
        approvalId: evaluation.approvalId,
        message: `⚠️ [POLICY GATEWAY APPROVAL REQUIRED]
Operation '${toolName}' requires explicit user approval before execution.
Reason: ${evaluation.reason}
Approval ID: ${evaluation.approvalId}

To execute this action, ask the user for confirmation and then invoke 'policy.approve_action' with approvalId '${evaluation.approvalId}'.`,
      };
    }

    // 3. Handle ALLOWED
    try {
      const data = await executor();

      const logEntry: AuditLogEntry = {
        id: `aud_${randomBytes(4).toString('hex')}`,
        timestamp: new Date().toISOString(),
        actor: 'user',
        authType,
        tool: toolName,
        repository: repo,
        parameters,
        decision: 'ALLOW',
        reason: evaluation.reason,
        status: 'EXECUTED',
      };
      this.auditLogger.record(logEntry);

      return {
        allowed: true,
        requiresApproval: false,
        data,
      };
    } catch (error) {
      const logEntry: AuditLogEntry = {
        id: `aud_${randomBytes(4).toString('hex')}`,
        timestamp: new Date().toISOString(),
        actor: 'user',
        authType,
        tool: toolName,
        repository: repo,
        parameters,
        decision: 'ALLOW',
        reason: evaluation.reason,
        status: 'BLOCKED',
        error: (error as Error).message,
      };
      this.auditLogger.record(logEntry);
      throw error;
    }
  }

  public getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }

  public getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }
}
