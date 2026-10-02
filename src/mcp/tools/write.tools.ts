import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GithubService } from '../../github/github.service';
import { PolicyGateway } from '../../policy/policy.gateway';
import {
  CreateIssueSchema,
  CreateBranchSchema,
  CreatePullRequestSchema,
  MergePullRequestSchema,
  DeleteBranchSchema,
  CreateRepositorySchema,
} from '../schemas/tool-inputs';
import { sanitizeErrorMessage } from '../../common/error.sanitizer';

export function registerWriteTools(
  server: McpServer,
  githubService: GithubService,
  policyGateway: PolicyGateway,
) {
  /**
   * 1. Create Issue (Write)
   */
  server.tool(
    'github.create_issue',
    'Create a new issue on a GitHub repository (controlled by Policy Gateway)',
    CreateIssueSchema.shape,
    async ({ owner, repo, title, body, labels, assignees }) => {
      try {
        const policyResult = await policyGateway.executeWithPolicy(
          'github.create_issue',
          { owner, repo, title, body, labels, assignees },
          () => githubService.createIssue(owner, repo, { title, body, labels, assignees }),
        );

        if (!policyResult.allowed) {
          return {
            content: [{ type: 'text', text: policyResult.message || 'Action denied by policy.' }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(policyResult.data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error creating issue: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 2. Create Branch (Write)
   */
  server.tool(
    'github.create_branch',
    'Create a new Git branch in a repository (controlled by Policy Gateway)',
    CreateBranchSchema.shape,
    async ({ owner, repo, branch, fromBranch }) => {
      try {
        const policyResult = await policyGateway.executeWithPolicy(
          'github.create_branch',
          { owner, repo, branch, fromBranch },
          () => githubService.createBranch(owner, repo, { branch, fromBranch }),
        );

        if (!policyResult.allowed) {
          return {
            content: [{ type: 'text', text: policyResult.message || 'Action denied by policy.' }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(policyResult.data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error creating branch: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 3. Create Pull Request (Write)
   */
  server.tool(
    'github.create_pull_request',
    'Create a new pull request in a repository (controlled by Policy Gateway)',
    CreatePullRequestSchema.shape,
    async ({ owner, repo, title, head, base, body, draft }) => {
      try {
        const policyResult = await policyGateway.executeWithPolicy(
          'github.create_pull_request',
          { owner, repo, title, head, base, body, draft },
          () => githubService.createPullRequest(owner, repo, { title, head, base, body, draft }),
        );

        if (!policyResult.allowed) {
          return {
            content: [{ type: 'text', text: policyResult.message || 'Action denied by policy.' }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(policyResult.data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error creating pull request: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 4. Merge Pull Request (High-Risk)
   */
  server.tool(
    'github.merge_pull_request',
    'Merge an existing pull request (High-Risk action, governed by Policy Gateway)',
    MergePullRequestSchema.shape,
    async ({ owner, repo, pullNumber, commitTitle, mergeMethod }) => {
      try {
        const policyResult = await policyGateway.executeWithPolicy(
          'github.merge_pull_request',
          { owner, repo, pullNumber, commitTitle, mergeMethod },
          () => githubService.mergePullRequest(owner, repo, pullNumber, { commitTitle, mergeMethod }),
        );

        if (!policyResult.allowed) {
          return {
            content: [{ type: 'text', text: policyResult.message || 'Action denied by policy.' }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(policyResult.data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error merging pull request: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 5. Delete Branch (High-Risk)
   */
  server.tool(
    'github.delete_branch',
    'Delete a branch from a repository (High-Risk action, default DENY by Policy Gateway)',
    DeleteBranchSchema.shape,
    async ({ owner, repo, branch }) => {
      try {
        const policyResult = await policyGateway.executeWithPolicy(
          'github.delete_branch',
          { owner, repo, branch },
          () => githubService.deleteBranch(owner, repo, branch),
        );

        if (!policyResult.allowed) {
          return {
            content: [{ type: 'text', text: policyResult.message || 'Action denied by policy.' }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(policyResult.data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error deleting branch: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  /**
   * 6. Create Repository (Write / Policy-Governed)
   */
  server.tool(
    'github.create_repository',
    'Create a new GitHub repository for the authenticated user (controlled by Policy Gateway)',
    CreateRepositorySchema.shape,
    async ({ name, description, private: isPrivate, autoInit }) => {
      try {
        const policyResult = await policyGateway.executeWithPolicy(
          'github.create_repository',
          { name, description, private: isPrivate, autoInit },
          () => githubService.createRepository({ name, description, private: isPrivate, autoInit }),
        );

        if (!policyResult.allowed) {
          return {
            content: [{ type: 'text', text: policyResult.message || 'Action denied by policy.' }],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(policyResult.data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error creating repository: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}

