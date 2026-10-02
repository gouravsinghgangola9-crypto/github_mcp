import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GithubService } from '../../github/github.service';
import { ListCommitsSchema, GetCommitSchema } from '../schemas/tool-inputs';
import { sanitizeErrorMessage } from '../../common/error.sanitizer';

export function registerCommitTools(server: McpServer, githubService: GithubService) {
  server.tool(
    'github.list_commits',
    'List commits in a repository with optional filters for branch/SHA, author, and date range',
    ListCommitsSchema.shape,
    async ({ owner, repo, sha, author, since, until, perPage, page }) => {
      try {
        const commits = await githubService.listCommits(owner, repo, {
          sha,
          author,
          since,
          until,
          perPage,
          page,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(commits, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error listing commits: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'github.get_commit',
    'Get detailed commit information including message, author, stats (additions/deletions), and changed files',
    GetCommitSchema.shape,
    async ({ owner, repo, ref }) => {
      try {
        const commit = await githubService.getCommit(owner, repo, ref);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(commit, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error getting commit: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
