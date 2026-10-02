# GitHub MCP Server + Policy Gateway (Phase 1 & Phase 2)

A secure, modular **Model Context Protocol (MCP)** server built with **NestJS**, **TypeScript**, **SWC**, and **Octokit** featuring **Dual Authentication (PAT + GitHub OAuth Device Flow)** and an enterprise **Policy Gateway** to govern AI interactions with GitHub.

Based on the specification in [github-mcp-policy-gateway-prd.md](file:///home/gourav/Documents/gourav-projects/mcpforjiju/github_mcp/github-mcp-policy-gateway-prd.md).

> 📖 **Full Setup & Run Guide:** See [RUN_AND_SETUP.md](file:///home/gourav/Documents/gourav-projects/mcpforjiju/github_mcp/RUN_AND_SETUP.md) for step-by-step setup, Antigravity IDE integration, and tool reference.

---

## 🚀 Features (Phase 1)

- **Strict Read-Only & Intelligence Operations**: Exposes profile, repositories, commits, branches, issues, pull requests, and activity.
- **Enterprise NestJS Architecture**: Modular design separating config, GitHub API calls, and MCP tool handlers.
- **Token Security**: Tokens are kept securely on the server and are never leaked to the AI client or model context.
- **MCP Stdio Protocol Compliant**: Internal logs are routed to `stderr`, keeping `stdout` strictly clean for JSON-RPC messages.
- **Phase 2 Ready**: Prepared to seamlessly insert the Policy Gateway between MCP and GitHub.

---

## 🛠️ Registered MCP Tools

| Category | Tool Name | Description |
| :--- | :--- | :--- |
| **Profile** | `github.get_profile` | Get user profile stats (repos, followers, bio) |
| **Repositories** | `github.list_repositories` | List public/private repos with sorting & filters |
| **Repositories** | `github.get_repository` | Deep dive into repo metadata, languages, stars |
| **Commits** | `github.list_commits` | List commits by branch/SHA, author, date range |
| **Commits** | `github.get_commit` | Inspect commit diff, stats, and changed files |
| **Branches** | `github.list_branches` | List branches and protection rules |
| **Issues** | `github.list_issues` | Filter issues by state, label, or author |
| **Issues** | `github.get_issue` | View issue description, comments, assignees |
| **Pull Requests** | `github.list_pull_requests` | List PRs with status, head/base branches |
| **Pull Requests** | `github.get_pull_request` | Get detailed PR stats, mergeability, diff counts |
| **Activity** | `github.get_recent_activity` | Real-time audit of recent user events (pushes, PRs) |

---

## 📦 Setup & Configuration

### 1. Configure Environment
Create a `.env` file from the template:
```bash
cp .env.example .env
```

Add your GitHub Personal Access Token (PAT) inside `.env`:
```env
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here
```
*(Tip: A fine-grained PAT with read-only access to user & repositories is recommended for Phase 1).*

### 2. Build the Project
```bash
npm run build
```

### 3. Connect to MCP Clients

#### In Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": [
        "/home/gourav/Documents/gourav-projects/mcpforjiju/github_mcp/dist/main.js"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

#### In Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": [
        "/home/gourav/Documents/gourav-projects/mcpforjiju/github_mcp/dist/main.js"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

---

## 📂 Project Structure

```
src/
├── main.ts                   # Bootstraps NestJS & starts MCP stdio server
├── app.module.ts             # Root module
│
├── config/                   # Config & environment variables
│   ├── config.module.ts
│   └── configuration.ts
│
├── github/                   # Octokit REST API Client
│   ├── github.service.ts
│   ├── github.module.ts
│   └── interfaces/           # Normalized response models
│
├── mcp/                      # Model Context Protocol
│   ├── mcp.service.ts        # McpServer instantiation & registration
│   ├── mcp.module.ts
│   ├── schemas/              # Zod input schemas for tools
│   └── tools/                # Modular tool handlers
│       ├── profile.tools.ts
│       ├── repository.tools.ts
│       ├── commit.tools.ts
│       ├── branch.tools.ts
│       ├── issue.tools.ts
│       ├── pull-request.tools.ts
│       └── activity.tools.ts
│
└── common/                   # Shared utilities & security
    ├── error.sanitizer.ts    # Redacts tokens from error messages
    └── stderr-logger.ts      # Keeps stdout clean for JSON-RPC
```
