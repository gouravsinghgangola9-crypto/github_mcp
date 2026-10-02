import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GithubService } from '../../github/github.service';
import { ListRepositoriesSchema, GetRepositorySchema } from '../schemas/tool-inputs';
import { sanitizeErrorMessage } from '../../common/error.sanitizer';

export function registerRepositoryTools(server: McpServer, githubService: GithubService) {
  server.tool(
    'github.list_repositories',
    'List repositories for the authenticated user or specified user/organization. Supports filtering by visibility, sorting, and pagination.',
    ListRepositoriesSchema.shape,
    async (args) => {
      try {
        const repos = await githubService.listRepositories(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(repos, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error listing repositories: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );

  server.tool(
    'github.get_repository',
    'Get detailed information about a specific repository (metadata, languages, stars, default branch, topics, etc.)',
    GetRepositorySchema.shape,
    async ({ owner, repo }) => {
      try {
        const details = await githubService.getRepository(owner, repo);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(details, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error getting repository details: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
