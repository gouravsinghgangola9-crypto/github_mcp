export interface GitHubActivityEvent {
  id: string;
  type: string;
  actor: string;
  repo: string;
  createdAt: string;
  payloadSummary: string;
}
