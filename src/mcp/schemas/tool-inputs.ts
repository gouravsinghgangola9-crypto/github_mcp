import { z } from 'zod';

export const GetProfileSchema = z.object({
  username: z
    .string()
    .optional()
    .describe('Optional GitHub username. If omitted, returns authenticated user profile.'),
});

export const ListRepositoriesSchema = z.object({
  username: z
    .string()
    .optional()
    .describe('Optional GitHub username or organization to list repositories for.'),
  visibility: z
    .enum(['all', 'public', 'private'])
    .optional()
    .describe('Filter by repository visibility (default: all)'),
  sort: z
    .enum(['created', 'updated', 'pushed', 'full_name'])
    .optional()
    .describe('Sort by attribute (default: updated)'),
  direction: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Sort direction (default: desc)'),
  perPage: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe('Number of repositories to return per page (max: 100, default: 30)'),
  page: z
    .number()
    .min(1)
    .optional()
    .describe('Page number of results (default: 1)'),
});

export const GetRepositorySchema = z.object({
  owner: z.string().describe('Repository owner (username or organization)'),
  repo: z.string().describe('Repository name'),
});

export const ListCommitsSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  sha: z.string().optional().describe('SHA or branch to start listing commits from'),
  author: z.string().optional().describe('GitHub login or email address by which to filter by commit author'),
  since: z.string().optional().describe('Only show commits after this date (ISO 8601 string)'),
  until: z.string().optional().describe('Only show commits before this date (ISO 8601 string)'),
  perPage: z.number().min(1).max(100).optional().describe('Number of commits per page (default: 20)'),
  page: z.number().min(1).optional().describe('Page number (default: 1)'),
});

export const GetCommitSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  ref: z.string().describe('Commit SHA reference to inspect'),
});

export const ListBranchesSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  protected: z.boolean().optional().describe('Filter protected branches only'),
  perPage: z.number().min(1).max(100).optional().describe('Number of branches per page (default: 30)'),
  page: z.number().min(1).optional().describe('Page number (default: 1)'),
});

export const ListIssuesSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).optional().describe('Filter by issue state (default: open)'),
  labels: z.string().optional().describe('Comma-separated list of label names'),
  creator: z.string().optional().describe('Filter issues created by this user login'),
  perPage: z.number().min(1).max(100).optional().describe('Number of issues per page (default: 30)'),
  page: z.number().min(1).optional().describe('Page number (default: 1)'),
});

export const GetIssueSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue number (e.g. 1, 42)'),
});

export const ListPullRequestsSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'closed', 'all']).optional().describe('Filter by PR state (default: open)'),
  head: z.string().optional().describe('Filter by head user/branch'),
  base: z.string().optional().describe('Filter by base branch (e.g. main)'),
  perPage: z.number().min(1).max(100).optional().describe('Number of PRs per page (default: 30)'),
  page: z.number().min(1).optional().describe('Page number (default: 1)'),
});

export const GetPullRequestSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
});

export const GetRecentActivitySchema = z.object({
  username: z
    .string()
    .optional()
    .describe('Optional username. If omitted, returns authenticated user activity.'),
  perPage: z.number().min(1).max(100).optional().describe('Number of events (default: 20)'),
});

// --- Phase 2: Auth Schemas ---

export const AuthStatusSchema = z.object({});

export const DeviceLoginSchema = z.object({
  clientId: z
    .string()
    .optional()
    .describe('GitHub OAuth App Client ID. If omitted, uses GITHUB_CLIENT_ID from environment.'),
  scopes: z
    .string()
    .optional()
    .describe('Comma-separated OAuth scopes requested (default: "read:user,repo")'),
});

export const PollTokenSchema = z.object({
  clientId: z.string().describe('GitHub OAuth App Client ID used in device login'),
  deviceCode: z.string().describe('Device code received from device login initiation'),
});

export const LogoutSchema = z.object({});

// --- Phase 2: Policy Schemas ---

export const GetPolicyRulesSchema = z.object({});

export const ListPendingApprovalsSchema = z.object({});

export const ApproveActionSchema = z.object({
  approvalId: z.string().describe('The approval ID (e.g. appr_abcd1234) to approve and execute'),
});

export const RejectActionSchema = z.object({
  approvalId: z.string().describe('The approval ID (e.g. appr_abcd1234) to reject'),
  reason: z.string().optional().describe('Optional explanation for why the action was rejected'),
});

export const GetAuditLogSchema = z.object({
  limit: z.number().min(1).max(100).optional().describe('Number of recent audit records to retrieve (default: 20)'),
});

// --- Phase 2: Write & High-Risk Schemas ---

export const CreateIssueSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  title: z.string().describe('Title of the issue'),
  body: z.string().optional().describe('Markdown body content of the issue'),
  labels: z.array(z.string()).optional().describe('List of label names to apply'),
  assignees: z.array(z.string()).optional().describe('List of GitHub usernames to assign'),
});

export const CreateBranchSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  branch: z.string().describe('Name of the new branch to create'),
  fromBranch: z
    .string()
    .optional()
    .describe('Source branch to branch off from (defaults to the repository default branch)'),
});

export const CreatePullRequestSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  title: z.string().describe('Title of the pull request'),
  head: z.string().describe('The name of the branch where your changes are implemented'),
  base: z.string().describe('The name of the branch you want the changes pulled into'),
  body: z.string().optional().describe('The contents of the pull request'),
  draft: z.boolean().optional().describe('Whether to create the pull request as a draft (default: false)'),
});

export const MergePullRequestSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number to merge'),
  commitTitle: z.string().optional().describe('Optional title for the commit message'),
  mergeMethod: z
    .enum(['merge', 'squash', 'rebase'])
    .optional()
    .describe('Merge method to use (default: merge)'),
});

export const DeleteBranchSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  branch: z.string().describe('Name of the branch to delete'),
});

export const CreateRepositorySchema = z.object({
  name: z.string().describe('Name of the new repository to create'),
  description: z.string().optional().describe('Optional description of the repository'),
  private: z.boolean().optional().describe('Whether the repository should be private (default: false)'),
  autoInit: z.boolean().optional().describe('Whether to initialize with an empty README (default: true)'),
});

