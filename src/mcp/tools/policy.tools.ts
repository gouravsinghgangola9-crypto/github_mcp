import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PolicyGateway } from '../../policy/policy.gateway';
import { GithubService } from '../../github/github.service';
import {
  GetPolicyRulesSchema,
  ListPendingApprovalsSchema,
  ApproveActionSchema,
  RejectActionSchema,
  GetAuditLogSchema,
} from '../schemas/tool-inputs';
import { sanitizeErrorMessage } from '../../common/error.sanitizer';

export function registerPolicyTools(
  server: McpServer,
  policyGateway: PolicyGateway,
  githubService: GithubService,
) {
  const policyEngine = policyGateway.getPolicyEngine();
  const auditLogger = policyGateway.getAuditLogger();

  /**
   * 1. Get Active Policy Rules
   */
  server.tool(
    'policy.get_rules',
    'View the active security policy rules and default action categories (ALLOW, APPROVAL_REQUIRED, DENY)',
    GetPolicyRulesSchema.shape,
    async () => {
      try {
        const config = policyEngine.getPolicyConfig();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(config, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error getting policy rules: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 2. List Pending Approvals
   */
  server.tool(
    'policy.list_pending_approvals',
    'List all operations currently waiting for user approval before they can execute',
    ListPendingApprovalsSchema.shape,
    async () => {
      try {
        const pending = policyEngine.listPendingApprovals();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: pending.length,
                  pendingApprovals: pending,
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
              text: `Error listing approvals: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 3. Approve and Execute a Pending Action
   */
  server.tool(
    'policy.approve_action',
    'Approve a sensitive pending operation using its approvalId to execute it on GitHub',
    ApproveActionSchema.shape,
    async ({ approvalId }) => {
      try {
        const pending = policyEngine.approve(approvalId);

        // Execute the approved action
        let executionResult: any;
        const { tool, parameters } = pending;

        switch (tool) {
          case 'github.create_branch':
            executionResult = await githubService.createBranch(
              parameters.owner,
              parameters.repo,
              { branch: parameters.branch, fromBranch: parameters.fromBranch },
            );
            break;

          case 'github.create_pull_request':
            executionResult = await githubService.createPullRequest(
              parameters.owner,
              parameters.repo,
              {
                title: parameters.title,
                head: parameters.head,
                base: parameters.base,
                body: parameters.body,
                draft: parameters.draft,
              },
            );
            break;

          case 'github.merge_pull_request':
            executionResult = await githubService.mergePullRequest(
              parameters.owner,
              parameters.repo,
              parameters.pullNumber,
              { commitTitle: parameters.commitTitle, mergeMethod: parameters.mergeMethod },
            );
            break;

          case 'github.delete_branch':
            executionResult = await githubService.deleteBranch(
              parameters.owner,
              parameters.repo,
              parameters.branch,
            );
            break;

          case 'github.create_repository':
            executionResult = await githubService.createRepository({
              name: parameters.name,
              description: parameters.description,
              private: parameters.private,
              autoInit: parameters.autoInit,
            });
            break;

          default:
            throw new Error(`Unsupported tool for execution approval: ${tool}`);
        }

        auditLogger.record({
          id: `appr_exec_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: 'user-approval',
          authType: 'APPROVED',
          tool,
          repository: pending.repository,
          parameters,
          decision: 'ALLOW',
          status: 'EXECUTED',
          executionResult,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: `Action ${approvalId} successfully approved and executed!`,
                  tool,
                  result: executionResult,
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
              text: `Error approving action: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 4. Reject a Pending Action
   */
  server.tool(
    'policy.reject_action',
    'Reject and cancel a sensitive pending operation using its approvalId',
    RejectActionSchema.shape,
    async ({ approvalId, reason }) => {
      try {
        const rejected = policyEngine.reject(approvalId, reason);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  message: `Action ${approvalId} was successfully rejected and cancelled.`,
                  rejected,
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
              text: `Error rejecting action: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 5. Get Audit Log History
   */
  server.tool(
    'policy.get_audit_log',
    'Retrieve the audit trail of evaluated operations, decisions (ALLOW/DENY/APPROVAL), and executions',
    GetAuditLogSchema.shape,
    async ({ limit }) => {
      try {
        const logs = auditLogger.getRecentLogs(limit || 20);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: logs.length,
                  auditTrail: logs,
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
              text: `Error getting audit log: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
