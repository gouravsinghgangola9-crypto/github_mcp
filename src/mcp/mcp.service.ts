import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GithubService } from '../github/github.service';
import { AuthService } from '../auth/auth.service';
import { PolicyGateway } from '../policy/policy.gateway';
import { registerProfileTools } from './tools/profile.tools';
import { registerRepositoryTools } from './tools/repository.tools';
import { registerCommitTools } from './tools/commit.tools';
import { registerBranchTools } from './tools/branch.tools';
import { registerIssueTools } from './tools/issue.tools';
import { registerPullRequestTools } from './tools/pull-request.tools';
import { registerActivityTools } from './tools/activity.tools';
import { registerAuthTools } from './tools/auth.tools';
import { registerPolicyTools } from './tools/policy.tools';
import { registerWriteTools } from './tools/write.tools';

@Injectable()
export class McpService implements OnModuleInit {
  private readonly logger = new Logger(McpService.name);
  private server: McpServer;

  constructor(
    private readonly githubService: GithubService,
    private readonly authService: AuthService,
    private readonly policyGateway: PolicyGateway,
  ) {
    this.server = new McpServer({
      name: 'github-mcp-server',
      version: '2.0.0',
    });
  }

  async onModuleInit() {
    this.registerAllTools();
  }

  private registerAllTools() {
    // Phase 1: Read & Intelligence
    registerProfileTools(this.server, this.githubService);
    registerRepositoryTools(this.server, this.githubService);
    registerCommitTools(this.server, this.githubService);
    registerBranchTools(this.server, this.githubService);
    registerIssueTools(this.server, this.githubService);
    registerPullRequestTools(this.server, this.githubService);
    registerActivityTools(this.server, this.githubService);

    // Phase 2: Auth, Policy Gateway & Governed Write Actions
    registerAuthTools(this.server, this.authService, this.githubService);
    registerPolicyTools(this.server, this.policyGateway, this.githubService);
    registerWriteTools(this.server, this.githubService, this.policyGateway);

    this.logger.log('All GitHub MCP Phase 1 & 2 tools registered successfully.');
  }

  /**
   * Connect to stdio transport for MCP client communication
   */
  async startStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.log('GitHub MCP Server running on stdio transport.');
  }
}
