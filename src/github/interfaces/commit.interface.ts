export interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
    username?: string;
  };
  htmlUrl: string;
}

export interface GitHubCommitDetail extends GitHubCommit {
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
}
