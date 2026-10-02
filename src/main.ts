import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StderrLogger } from './common/stderr-logger';
import { McpService } from './mcp/mcp.service';

async function bootstrap() {
  // Use StderrLogger so stdout is strictly preserved for JSON-RPC MCP messages
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: new StderrLogger(),
  });

  const mcpService = app.get(McpService);
  await mcpService.startStdio();

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  process.stderr.write(`Fatal error during startup: ${err?.message || err}\n`);
  process.exit(1);
});
