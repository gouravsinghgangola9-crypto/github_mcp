export type PolicyDecision = 'ALLOW' | 'APPROVAL_REQUIRED' | 'DENY';

export type OperationCategory = 'READ' | 'WRITE' | 'HIGH_RISK';

export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  category: OperationCategory;
  reason: string;
  requiresApproval: boolean;
  isDenied: boolean;
  isAllowed: boolean;
  approvalId?: string;
}

export interface PendingApproval {
  approvalId: string;
  tool: string;
  parameters: Record<string, any>;
  repository?: string;
  requestedAt: string;
  expiresAt: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  authType: string;
  tool: string;
  repository?: string;
  parameters: Record<string, any>;
  decision: PolicyDecision;
  reason?: string;
  status: 'EXECUTED' | 'BLOCKED' | 'PENDING_APPROVAL';
  executionResult?: any;
  error?: string;
}

export interface PolicyConfig {
  version: string;
  defaultCategories: Record<OperationCategory, PolicyDecision>;
  operations: Record<string, PolicyDecision>;
  repositories?: Record<string, Record<string, PolicyDecision>>;
}
