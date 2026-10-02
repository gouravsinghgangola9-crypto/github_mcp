export interface AppConfig {
  githubToken: string;
}

export default (): AppConfig => ({
  githubToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GITHUB_TOKEN || '',
});
