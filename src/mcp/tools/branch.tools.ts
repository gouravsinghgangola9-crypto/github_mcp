import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GithubService } from '../../github/github.service';
import { ListBranchesSchema } from '../schemas/tool-inputs';
import { sanitizeErrorMessage } from '../../common/error.sanitizer';

export function registerBranchTools(server: McpServer, githubService: GithubService) {
  server.tool(
    'github.list_branches',
    'List branches in a repository, with protection status and latest commit SHA',
    ListBranchesSchema.shape,
    async ({ owner, repo, protected: isProtected, perPage, page }) => {
      try {
        const branches = await githubService.listBranches(owner, repo, {
          protected: isProtected,
          perPage,
          page,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(branches, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error listing branches: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
