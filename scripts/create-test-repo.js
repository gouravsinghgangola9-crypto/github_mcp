const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { GithubService } = require('../dist/github/github.service');
const { PolicyGateway } = require('../dist/policy/policy.gateway');
const { StderrLogger } = require('../dist/common/stderr-logger');

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: new StderrLogger(),
  });

  const githubService = app.get(GithubService);
  const policyGateway = app.get(PolicyGateway);

  console.log('Evaluating Policy Gateway for github.create_repository...');

  const result = await policyGateway.executeWithPolicy(
    'github.create_repository',
    {
      name: 'test-mcp',
      description: 'Test repository created via Policy-Controlled GitHub MCP Server',
      private: false,
      autoInit: true,
    },
    () =>
      githubService.createRepository({
        name: 'test-mcp',
        description: 'Test repository created via Policy-Controlled GitHub MCP Server',
        private: false,
        autoInit: true,
      }),
  );

  console.log('RESULT:', JSON.stringify(result, null, 2));
  await app.close();
}

run().catch((err) => {
  console.error('ERROR:', err);
  process.exit(1);
});
