export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  author: string;
  assignees: string[];
  labels: string[];
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  htmlUrl: string;
  body?: string | null;
}
