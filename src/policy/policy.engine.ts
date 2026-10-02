import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import {
  OperationCategory,
  PendingApproval,
  PolicyConfig,
  PolicyDecision,
  PolicyEvaluationResult,
} from './policy.types';

@Injectable()
export class PolicyEngine {
  private readonly logger = new Logger(PolicyEngine.name);
  private readonly configPath: string;
  private config: PolicyConfig;
  private pendingApprovals: Map<string, PendingApproval> = new Map();

  constructor() {
    this.configPath = path.resolve(process.cwd(), 'policy.config.json');
    this.loadPolicyConfig();
  }

  private loadPolicyConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(raw);
        this.logger.log('Policy configuration loaded successfully.');
        return;
      }
    } catch (error) {
      this.logger.warn(`Failed to read policy.config.json: ${(error as Error).message}`);
    }

    // Default Fallback Policy
    this.config = {
      version: '1.0',
      defaultCategories: {
        READ: 'ALLOW',
        WRITE: 'APPROVAL_REQUIRED',
        HIGH_RISK: 'DENY',
      },
      operations: {
        'github.get_profile': 'ALLOW',
        'github.list_repositories': 'ALLOW',
        'github.get_repository': 'ALLOW',
        'github.list_commits': 'ALLOW',
        'github.get_commit': 'ALLOW',
        'github.list_branches': 'ALLOW',
        'github.list_issues': 'ALLOW',
        'github.get_issue': 'ALLOW',
        'github.list_pull_requests': 'ALLOW',
        'github.get_pull_request': 'ALLOW',
        'github.get_recent_activity': 'ALLOW',
        'github.auth_status': 'ALLOW',
        'github.auth_device_login': 'ALLOW',
        'github.auth_poll_token': 'ALLOW',
        'github.auth_logout': 'ALLOW',
        'policy.get_rules': 'ALLOW',
        'policy.list_pending_approvals': 'ALLOW',
        'policy.get_audit_log': 'ALLOW',
        'github.create_issue': 'ALLOW',
        'github.create_branch': 'APPROVAL_REQUIRED',
        'github.create_pull_request': 'APPROVAL_REQUIRED',
        'github.merge_pull_request': 'APPROVAL_REQUIRED',
        'github.delete_branch': 'DENY',
        'github.delete_repository': 'DENY',
        'github.delete_file': 'DENY',
      },
      repositories: {},
    };
  }

  /**
   * Determine the operation category based on tool name prefix
   */
  public getOperationCategory(toolName: string): OperationCategory {
    const name = toolName.toLowerCase();
    if (
      name.includes('delete') ||
      name.includes('merge') ||
      name.includes('force_push') ||
      name.includes('destroy')
    ) {
      return 'HIGH_RISK';
    }
    if (
      name.includes('create') ||
      name.includes('update') ||
      name.includes('edit') ||
      name.includes('patch')
    ) {
      return 'WRITE';
    }
    return 'READ';
  }

  /**
   * Evaluates if a tool invocation is allowed, denied, or needs user approval
   */
  public evaluate(toolName: string, parameters: Record<string, any> = {}): PolicyEvaluationResult {
    const category = this.getOperationCategory(toolName);
    const repoIdentifier = parameters.owner && parameters.repo
      ? `${parameters.owner}/${parameters.repo}`
      : undefined;

    let decision: PolicyDecision | undefined;
    let reason = '';

    // 1. Check Repository-specific override
    if (repoIdentifier && this.config.repositories?.[repoIdentifier]?.[toolName]) {
      decision = this.config.repositories[repoIdentifier][toolName];
      reason = `Repository-specific policy rule for ${repoIdentifier}`;
    }

    // 2. Check Global Operation rule
    if (!decision && this.config.operations[toolName]) {
      decision = this.config.operations[toolName];
      reason = `Configured policy rule for ${toolName}`;
    }

    // 3. Fallback to Category Default
    if (!decision) {
      decision = this.config.defaultCategories[category] || 'APPROVAL_REQUIRED';
      reason = `Default policy for ${category} category`;
    }

    // If APPROVAL_REQUIRED, generate a pending approval item
    let approvalId: string | undefined;
    if (decision === 'APPROVAL_REQUIRED') {
      approvalId = this.createPendingApproval(toolName, parameters, repoIdentifier, reason);
    }

    return {
      decision,
      category,
      reason,
      requiresApproval: decision === 'APPROVAL_REQUIRED',
      isDenied: decision === 'DENY',
      isAllowed: decision === 'ALLOW',
      approvalId,
    };
  }

  private createPendingApproval(
    tool: string,
    parameters: Record<string, any>,
    repository?: string,
    reason?: string,
  ): string {
    this.cleanExpiredApprovals();

    const approvalId = `appr_${randomBytes(4).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins TTL

    const pending: PendingApproval = {
      approvalId,
      tool,
      parameters,
      repository,
      requestedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      reason: reason || 'Operation requires explicit user approval',
      status: 'PENDING',
    };

    this.pendingApprovals.set(approvalId, pending);
    return approvalId;
  }

  public getPendingApproval(approvalId: string): PendingApproval | undefined {
    this.cleanExpiredApprovals();
    return this.pendingApprovals.get(approvalId);
  }

  public listPendingApprovals(): PendingApproval[] {
    this.cleanExpiredApprovals();
    return Array.from(this.pendingApprovals.values()).filter((p) => p.status === 'PENDING');
  }

  public approve(approvalId: string): PendingApproval {
    const item = this.getPendingApproval(approvalId);
    if (!item) {
      throw new Error(`Approval request ${approvalId} not found or expired.`);
    }
    if (item.status !== 'PENDING') {
      throw new Error(`Approval request ${approvalId} is already ${item.status.toLowerCase()}.`);
    }
    item.status = 'APPROVED';
    return item;
  }

  public reject(approvalId: string, reason?: string): PendingApproval {
    const item = this.getPendingApproval(approvalId);
    if (!item) {
      throw new Error(`Approval request ${approvalId} not found or expired.`);
    }
    item.status = 'REJECTED';
    if (reason) {
      item.reason = `${item.reason} | Rejected: ${reason}`;
    }
    return item;
  }

  public getPolicyConfig(): PolicyConfig {
    return this.config;
  }

  private cleanExpiredApprovals(): void {
    const now = Date.now();
    for (const [id, item] of this.pendingApprovals.entries()) {
      if (new Date(item.expiresAt).getTime() < now) {
        this.pendingApprovals.delete(id);
      }
    }
  }
}
