import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { GithubModule } from '../github/github.module';
import { AuthModule } from '../auth/auth.module';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [GithubModule, AuthModule, PolicyModule],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
