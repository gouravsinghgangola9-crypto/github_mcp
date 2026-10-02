import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { GithubModule } from './github/github.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [AppConfigModule, GithubModule, McpModule],
})
export class AppModule {}
