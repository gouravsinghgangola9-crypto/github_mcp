import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GithubService } from '../../github/github.service';
import { ListIssuesSchema, GetIssueSchema } from '../schemas/tool-inputs';
import { sanitizeErrorMessage } from '../../common/error.sanitizer';

export function registerIssueTools(server: McpServer, githubService: GithubService) {
  server.tool(
    'github.list_issues',
    'List issues in a repository (excluding pull requests). Can filter by state (open, closed, all), labels, and creator.',
    ListIssuesSchema.shape,
    async ({ owner, repo, state, labels, creator, perPage, page }) => {
      try {
        const issues = await githubService.listIssues(owner, repo, {
          state,
          labels,
          creator,
          perPage,
          page,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issues, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error listing issues: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'github.get_issue',
    'Get full details of a specific issue by number (title, body, author, assignees, labels, comments count)',
    GetIssueSchema.shape,
    async ({ owner, repo, issueNumber }) => {
      try {
        const issue = await githubService.getIssue(owner, repo, issueNumber);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error getting issue: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
