import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GithubService } from '../../github/github.service';
import { GetProfileSchema } from '../schemas/tool-inputs';
import { sanitizeErrorMessage } from '../../common/error.sanitizer';

export function registerProfileTools(server: McpServer, githubService: GithubService) {
  server.tool(
    'github.get_profile',
    'Retrieve GitHub profile information for the authenticated user or a specified username (bio, repo counts, follower counts, etc.)',
    GetProfileSchema.shape,
    async ({ username }) => {
      try {
        const profile = await githubService.getProfile(username);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(profile, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error retrieving profile: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
