export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  author: string;
  draft: boolean;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  targetBranch: string;
  sourceBranch: string;
  body?: string | null;
}

export interface GitHubPullRequestDetail extends GitHubPullRequest {
  merged: boolean;
  mergeable: boolean | null;
  commentsCount: number;
  reviewCommentsCount: number;
  commitsCount: number;
  additions: number;
  deletions: number;
  changedFiles: number;
}
