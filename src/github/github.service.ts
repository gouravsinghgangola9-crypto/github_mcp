import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { AuthService } from '../auth/auth.service';
import { GitHubProfile } from './interfaces/profile.interface';
import { GitHubRepositorySummary, GitHubRepositoryDetails } from './interfaces/repository.interface';
import { GitHubCommit, GitHubCommitDetail } from './interfaces/commit.interface';
import { GitHubBranch } from './interfaces/branch.interface';
import { GitHubIssue } from './interfaces/issue.interface';
import { GitHubPullRequest, GitHubPullRequestDetail } from './interfaces/pull-request.interface';
import { GitHubActivityEvent } from './interfaces/activity.interface';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private octokit: Octokit;
  private currentToken: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    this.getOctokit();
  }

  private getOctokit(): Octokit {
    const token = this.authService.getActiveToken() || this.configService.get<string>('githubToken') || '';

    if (!this.octokit || this.currentToken !== token) {
      this.currentToken = token;
      if (!token) {
        this.logger.warn(
          'No GitHub token found. Set GITHUB_PERSONAL_ACCESS_TOKEN or login with OAuth.',
        );
      }
      this.octokit = new Octokit({
        auth: token || undefined,
        userAgent: 'github-mcp-server/2.0.0',
      });
    }

    return this.octokit;
  }

  /**
   * Check if token is present
   */
  public hasToken(): boolean {
    const token = this.authService.getActiveToken() || this.configService.get<string>('githubToken');
    return Boolean(token && token.trim().length > 0);
  }

  /**
   * 1. Get authenticated user profile (or specific username if provided)
   */
  async getProfile(username?: string): Promise<GitHubProfile> {
    const { data } = username
      ? await this.octokit.rest.users.getByUsername({ username })
      : await this.octokit.rest.users.getAuthenticated();

    return {
      username: data.login,
      name: data.name ?? null,
      bio: data.bio ?? null,
      company: data.company ?? null,
      blog: data.blog ?? null,
      location: data.location ?? null,
      email: data.email ?? null,
      publicRepos: data.public_repos,
      publicGists: data.public_gists,
      followers: data.followers,
      following: data.following,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      avatarUrl: data.avatar_url,
      htmlUrl: data.html_url,
    };
  }

  /**
   * 2. List repositories for authenticated user or organization/user
   */
  async listRepositories(options: {
    username?: string;
    visibility?: 'all' | 'public' | 'private';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    perPage?: number;
    page?: number;
  }): Promise<GitHubRepositorySummary[]> {
    const per_page = Math.min(options.perPage || 30, 100);
    const page = options.page || 1;

    let repos: any[];
    if (options.username) {
      const response = await this.octokit.rest.repos.listForUser({
        username: options.username,
        sort: options.sort || 'updated',
        direction: options.direction || 'desc',
        per_page,
        page,
      });
      repos = response.data;
    } else {
      const response = await this.octokit.rest.repos.listForAuthenticatedUser({
        visibility: options.visibility || 'all',
        sort: options.sort || 'updated',
        direction: options.direction || 'desc',
        per_page,
        page,
      });
      repos = response.data;
    }

    return repos.map((repo) => ({
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      description: repo.description ?? null,
      private: repo.private,
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch,
      language: repo.language ?? null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
    }));
  }

  /**
   * 3. Get repository details
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepositoryDetails> {
    const [repoRes, langRes] = await Promise.all([
      this.octokit.rest.repos.get({ owner, repo }),
      this.octokit.rest.repos.listLanguages({ owner, repo }).catch(() => ({ data: {} })),
    ]);

    const data = repoRes.data;

    return {
      name: data.name,
      fullName: data.full_name,
      owner: data.owner.login,
      description: data.description ?? null,
      private: data.private,
      htmlUrl: data.html_url,
      defaultBranch: data.default_branch,
      language: data.language ?? null,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssuesCount: data.open_issues_count,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
      size: data.size,
      topics: data.topics || [],
      license: data.license?.name ?? null,
      hasIssues: data.has_issues,
      hasProjects: data.has_projects,
      hasWiki: data.has_wiki,
      archived: data.archived,
      languages: langRes.data as Record<string, number>,
    };
  }

  /**
   * 4. List commits in a repository
   */
  async listCommits(
    owner: string,
    repo: string,
    options?: {
      sha?: string;
      author?: string;
      since?: string;
      until?: string;
      perPage?: number;
      page?: number;
    },
  ): Promise<GitHubCommit[]> {
    const per_page = Math.min(options?.perPage || 20, 100);
    const { data } = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: options?.sha,
      author: options?.author,
      since: options?.since,
      until: options?.until,
      per_page,
      page: options?.page || 1,
    });

    return data.map((item) => ({
      sha: item.sha,
      shortSha: item.sha.substring(0, 7),
      message: item.commit.message,
      author: {
        name: item.commit.author?.name || 'Unknown',
        email: item.commit.author?.email || '',
        date: item.commit.author?.date || '',
        username: item.author?.login,
      },
      htmlUrl: item.html_url,
    }));
  }

  /**
   * 5. Get a specific commit with file changes and stats
   */
  async getCommit(owner: string, repo: string, ref: string): Promise<GitHubCommitDetail> {
    const { data } = await this.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref,
    });

    return {
      sha: data.sha,
      shortSha: data.sha.substring(0, 7),
      message: data.commit.message,
      author: {
        name: data.commit.author?.name || 'Unknown',
        email: data.commit.author?.email || '',
        date: data.commit.author?.date || '',
        username: data.author?.login,
      },
      htmlUrl: data.html_url,
      stats: data.stats
        ? {
            total: data.stats.total || 0,
            additions: data.stats.additions || 0,
            deletions: data.stats.deletions || 0,
          }
        : undefined,
      files: data.files?.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      })),
    };
  }

  /**
   * 6. List branches in a repository
   */
  async listBranches(
    owner: string,
    repo: string,
    options?: { protected?: boolean; perPage?: number; page?: number },
  ): Promise<GitHubBranch[]> {
    const per_page = Math.min(options?.perPage || 30, 100);
    const { data } = await this.octokit.rest.repos.listBranches({
      owner,
      repo,
      protected: options?.protected,
      per_page,
      page: options?.page || 1,
    });

    return data.map((b) => ({
      name: b.name,
      commitSha: b.commit.sha,
      protected: b.protected,
    }));
  }

  /**
   * 7. List issues in a repository (excluding pull requests)
   */
  async listIssues(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all';
      labels?: string;
      creator?: string;
      perPage?: number;
      page?: number;
    },
  ): Promise<GitHubIssue[]> {
    const per_page = Math.min(options?.perPage || 30, 100);
    const { data } = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: options?.state || 'open',
      labels: options?.labels,
      creator: options?.creator,
      per_page,
      page: options?.page || 1,
    });

    // In GitHub's API, pull requests are also returned in listForRepo unless filtered out
    return data
      .filter((item) => !item.pull_request)
      .map((item) => ({
        number: item.number,
        title: item.title,
        state: item.state,
        author: item.user?.login || 'Unknown',
        assignees: item.assignees?.map((a) => a.login) || [],
        labels: (item.labels || []).map((l: any) => (typeof l === 'string' ? l : l.name || '')),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        commentsCount: item.comments,
        htmlUrl: item.html_url,
        body: item.body,
      }));
  }

  /**
   * 8. Get issue details
   */
  async getIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue> {
    const { data } = await this.octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    return {
      number: data.number,
      title: data.title,
      state: data.state,
      author: data.user?.login || 'Unknown',
      assignees: data.assignees?.map((a) => a.login) || [],
      labels: (data.labels || []).map((l: any) => (typeof l === 'string' ? l : l.name || '')),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      commentsCount: data.comments,
      htmlUrl: data.html_url,
      body: data.body,
    };
  }

  /**
   * 9. List pull requests in a repository
   */
  async listPullRequests(
    owner: string,
    repo: string,
    options?: {
      state?: 'open' | 'closed' | 'all';
      head?: string;
      base?: string;
      perPage?: number;
      page?: number;
    },
  ): Promise<GitHubPullRequest[]> {
    const per_page = Math.min(options?.perPage || 30, 100);
    const { data } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state: options?.state || 'open',
      head: options?.head,
      base: options?.base,
      per_page,
      page: options?.page || 1,
    });

    return data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user?.login || 'Unknown',
      draft: pr.draft || false,
      htmlUrl: pr.html_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      targetBranch: pr.base.ref,
      sourceBranch: pr.head.ref,
      body: pr.body,
    }));
  }

  /**
   * 10. Get pull request details
   */
  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<GitHubPullRequestDetail> {
    const { data } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });

    return {
      number: data.number,
      title: data.title,
      state: data.state,
      author: data.user?.login || 'Unknown',
      draft: data.draft || false,
      htmlUrl: data.html_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      targetBranch: data.base.ref,
      sourceBranch: data.head.ref,
      body: data.body,
      merged: data.merged,
      mergeable: data.mergeable,
      commentsCount: data.comments,
      reviewCommentsCount: data.review_comments,
      commitsCount: data.commits,
      additions: data.additions,
      deletions: data.deletions,
      changedFiles: data.changed_files,
    };
  }

  /**
   * 11. Get recent user activity (public/authenticated events)
   */
  async getRecentActivity(username?: string, perPage?: number): Promise<GitHubActivityEvent[]> {
    const per_page = Math.min(perPage || 20, 100);

    let events: any[];
    if (username) {
      const response = await this.octokit.rest.activity.listPublicEventsForUser({
        username,
        per_page,
      });
      events = response.data;
    } else {
      const profile = await this.getProfile();
      const response = await this.octokit.rest.activity.listEventsForAuthenticatedUser({
        username: profile.username,
        per_page,
      });
      events = response.data;
    }

    return events.map((event) => {
      let payloadSummary = event.type;
      if (event.type === 'PushEvent') {
        const count = event.payload?.commits?.length || 0;
        payloadSummary = `Pushed ${count} commit(s) to ${event.payload?.ref || 'repo'}`;
      } else if (event.type === 'PullRequestEvent') {
        payloadSummary = `${event.payload?.action || 'Interacted with'} PR #${event.payload?.pull_request?.number}`;
      } else if (event.type === 'IssuesEvent') {
        payloadSummary = `${event.payload?.action || 'Interacted with'} Issue #${event.payload?.issue?.number}`;
      } else if (event.type === 'CreateEvent') {
        payloadSummary = `Created ${event.payload?.ref_type || 'resource'} ${event.payload?.ref || ''}`;
      }

      return {
        id: event.id,
        type: event.type || 'Event',
        actor: event.actor.login,
        repo: event.repo.name,
        createdAt: event.created_at || '',
        payloadSummary,
      };
    });
  }

  /**
   * 12. Phase 2: Create an Issue (Write)
   */
  async createIssue(
    owner: string,
    repo: string,
    data: { title: string; body?: string; labels?: string[]; assignees?: string[] },
  ): Promise<GitHubIssue> {
    const res = await this.getOctokit().rest.issues.create({
      owner,
      repo,
      title: data.title,
      body: data.body,
      labels: data.labels,
      assignees: data.assignees,
    });

    const item = res.data;
    return {
      number: item.number,
      title: item.title,
      state: item.state,
      author: item.user?.login || 'Unknown',
      assignees: item.assignees?.map((a: any) => a.login) || [],
      labels: (item.labels || []).map((l: any) => (typeof l === 'string' ? l : l.name || '')),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      commentsCount: item.comments,
      htmlUrl: item.html_url,
      body: item.body,
    };
  }

  /**
   * 13. Phase 2: Create a Branch (Write)
   */
  async createBranch(
    owner: string,
    repo: string,
    data: { branch: string; fromBranch?: string },
  ): Promise<{ name: string; commitSha: string; ref: string }> {
    const octokit = this.getOctokit();
    const baseBranch = data.fromBranch || (await this.getRepository(owner, repo)).defaultBranch;

    // Get the SHA of the base branch
    const refData = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });

    const sha = refData.data.object.sha;

    // Create the new branch reference
    const createdRef = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${data.branch}`,
      sha,
    });

    return {
      name: data.branch,
      commitSha: createdRef.data.object.sha,
      ref: createdRef.data.ref,
    };
  }

  /**
   * 14. Phase 2: Create a Pull Request (Write)
   */
  async createPullRequest(
    owner: string,
    repo: string,
    data: { title: string; head: string; base: string; body?: string; draft?: boolean },
  ): Promise<GitHubPullRequest> {
    const res = await this.getOctokit().rest.pulls.create({
      owner,
      repo,
      title: data.title,
      head: data.head,
      base: data.base,
      body: data.body,
      draft: data.draft,
    });

    const pr = res.data;
    return {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user?.login || 'Unknown',
      draft: pr.draft || false,
      htmlUrl: pr.html_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      targetBranch: pr.base.ref,
      sourceBranch: pr.head.ref,
      body: pr.body,
    };
  }

  /**
   * 15. Phase 2: Merge a Pull Request (High-Risk)
   */
  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    data?: { commitTitle?: string; mergeMethod?: 'merge' | 'squash' | 'rebase' },
  ): Promise<{ sha: string; merged: boolean; message: string }> {
    const res = await this.getOctokit().rest.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      commit_title: data?.commitTitle,
      merge_method: data?.mergeMethod || 'merge',
    });

    return {
      sha: res.data.sha,
      merged: res.data.merged,
      message: res.data.message,
    };
  }

  /**
   * 16. Phase 2: Delete a Branch (High-Risk)
   */
  async deleteBranch(owner: string, repo: string, branch: string): Promise<{ deleted: boolean; branch: string }> {
    await this.getOctokit().rest.git.deleteRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });

    return {
      deleted: true,
      branch,
    };
  }

  /**
   * 17. Phase 2: Create a Repository (Write / Policy-Governed)
   */
  async createRepository(data: {
    name: string;
    description?: string;
    private?: boolean;
    autoInit?: boolean;
  }): Promise<GitHubRepositorySummary> {
    const res = await this.getOctokit().rest.repos.createForAuthenticatedUser({
      name: data.name,
      description: data.description,
      private: data.private ?? false,
      auto_init: data.autoInit ?? true,
    });

    const repo = res.data;
    return {
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      description: repo.description ?? null,
      private: repo.private,
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch || 'main',
      language: repo.language ?? null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
    };
  }
}
