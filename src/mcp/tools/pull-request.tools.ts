import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GithubService } from '../../github/github.service';
import { ListPullRequestsSchema, GetPullRequestSchema } from '../schemas/tool-inputs';
import { sanitizeErrorMessage } from '../../common/error.sanitizer';

export function registerPullRequestTools(server: McpServer, githubService: GithubService) {
  server.tool(
    'github.list_pull_requests',
    'List pull requests in a repository with state filtering (open, closed, all) and branch filters',
    ListPullRequestsSchema.shape,
    async ({ owner, repo, state, head, base, perPage, page }) => {
      try {
        const prs = await githubService.listPullRequests(owner, repo, {
          state,
          head,
          base,
          perPage,
          page,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(prs, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error listing pull requests: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'github.get_pull_request',
    'Get detailed information about a pull request (diff stats, branches, merge status, review comments)',
    GetPullRequestSchema.shape,
    async ({ owner, repo, pullNumber }) => {
      try {
        const pr = await githubService.getPullRequest(owner, repo, pullNumber);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(pr, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error getting pull request: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
