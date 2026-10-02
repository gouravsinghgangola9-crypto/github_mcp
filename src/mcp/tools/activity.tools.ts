import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { GithubService } from '../../github/github.service';
import { GetRecentActivitySchema } from '../schemas/tool-inputs';
import { sanitizeErrorMessage } from '../../common/error.sanitizer';

export function registerActivityTools(server: McpServer, githubService: GithubService) {
  server.tool(
    'github.get_recent_activity',
    'Get recent GitHub events and activity for the user (pushes, pull requests, issues, releases)',
    GetRecentActivitySchema.shape,
    async ({ username, perPage }) => {
      try {
        const activity = await githubService.getRecentActivity(username, perPage);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(activity, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error getting recent activity: ${sanitizeErrorMessage(error)}`,
            },
          ],
        };
      }
    },
  );
}
