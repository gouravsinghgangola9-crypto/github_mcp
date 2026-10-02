export interface GitHubRepositorySummary {
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  language: string | null;
  stars: number;
  forks: number;
  openIssuesCount: number;
  updatedAt: string | null;
  pushedAt: string | null;
}

export interface GitHubRepositoryDetails extends GitHubRepositorySummary {
  size: number;
  topics: string[];
  license: string | null;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  archived: boolean;
  languages?: Record<string, number>;
  defaultBranchSha?: string;
}
