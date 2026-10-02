# GitHub MCP Server — Setup & Run Guide (Phase 1 & Phase 2)

A secure, modular **Model Context Protocol (MCP)** server built with **NestJS**, **TypeScript**, **SWC**, and **Octokit**. It integrates **Dual Authentication (PAT + GitHub OAuth Device Flow)** and an enterprise **Policy Gateway** to control, approve, block, and audit all GitHub operations requested by AI assistants (Antigravity IDE, Claude Desktop, Cursor, ChatGPT).

---

## 📋 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Prerequisites](#-prerequisites)
3. [Dual Authentication (PAT + OAuth)](#-dual-authentication-pat--oauth)
4. [Policy Gateway & Governance](#-policy-gateway--governance)
5. [Building the Server](#-building-the-server)
6. [Testing the Server](#-testing-the-server)
7. [Connecting to AI Clients](#-connecting-to-ai-clients)
8. [Complete MCP Tools Reference](#-complete-mcp-tools-reference)
9. [Resource Optimization & Performance](#-resource-optimization--performance)

---

## 🏗️ Architecture Overview

```text
               ┌────────────────────────┐
               │       AI Client        │
               │ Antigravity / Cursor   │
               └───────────┬────────────┘
                           │ MCP JSON-RPC
                           ▼
               ┌────────────────────────┐
               │   GitHub MCP Server    │
               └───────────┬────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │        POLICY GATEWAY        │
            │                              │
            │  1. Dual Auth (PAT & OAuth)  │
            │  2. Policy Engine (ALLOW /   │
            │     APPROVAL / DENY)         │
            │  3. Approval Workflow Queue  │
            │  4. Persistent Audit Logger  │
            └──────────────┬───────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                  ALLOW       APPROVAL / DENY
                    │             │
                    ▼             ▼
               GitHub API     User Approval / Blocked
```

---

## ⚡ Prerequisites

- **Node.js**: v18.0.0 or later (`node -v`)
- **npm**: v9.0.0 or later (`npm -v`)
- **Authentication**:
  - **Option 1 (PAT):** A GitHub Personal Access Token (`repo`, `read:user` permissions) in `.env`.
  - **Option 2 (OAuth):** No manual token needed! Run `github.auth_device_login` to authenticate via browser.

---

## 🔑 Dual Authentication (PAT + OAuth)

The server supports a seamless dual-authentication strategy:

| Mode | Configuration | Best For |
| :--- | :--- | :--- |
| **Personal Access Token (PAT)** | Set `GITHUB_PERSONAL_ACCESS_TOKEN` in `.env` | Local IDEs, CI/CD, headless environments |
| **GitHub OAuth Device Flow** | No token setup needed; authenticate via browser | Zero-friction user onboarding, no copy-pasting |

### How OAuth Device Flow Works:
1. Call tool `github.auth_device_login` (or run device flow).
2. It outputs a verification URL: `https://github.com/login/device` and an 8-character user code (e.g. `WDWN-ABCD`).
3. Open the link and click **Authorize**.
4. Call `github.auth_poll_token` with the `deviceCode` — your OAuth access token is stored securely in `.session.json`.
5. Call `github.auth_status` anytime to view your active login type and user profile.
6. Call `github.auth_logout` to disconnect OAuth (it automatically falls back to your `.env` PAT).

---

## 🛡️ Policy Gateway & Governance

Every operation requested by the AI passes through the **Policy Gateway** before execution.

Decisions are governed by `policy.config.json`:

```json
{
  "version": "1.0",
  "defaultCategories": {
    "READ": "ALLOW",
    "WRITE": "APPROVAL_REQUIRED",
    "HIGH_RISK": "DENY"
  },
  "operations": {
    "github.get_profile": "ALLOW",
    "github.list_repositories": "ALLOW",
    "github.create_issue": "ALLOW",
    "github.create_branch": "APPROVAL_REQUIRED",
    "github.create_pull_request": "APPROVAL_REQUIRED",
    "github.merge_pull_request": "APPROVAL_REQUIRED",
    "github.delete_branch": "DENY",
    "github.delete_repository": "DENY"
  },
  "repositories": {
    "my-org/production-app": {
      "github.create_branch": "DENY"
    }
  }
}
```

### The Approval Flow for Sensitive Actions:
1. When an AI requests a sensitive action (e.g. `github.create_branch`), the Gateway intercepts it and creates a `PendingApproval` record with an ID (e.g. `appr_f41a8b92`).
2. The AI returns the approval prompt with the ID to you.
3. You review the action and approve it using:
   - Tool: `policy.approve_action` with `{ "approvalId": "appr_f41a8b92" }`.
4. The action executes on GitHub, and a full audit trail entry is logged in `audit.log`.

---

## 🔨 Building the Server

The project uses the ultra-fast Rust-based **SWC** compiler:

```bash
npm run build
```

> **Build Speed:** Compiles in **~150–200 milliseconds** with near-zero RAM usage.

---

## 🧪 Testing the Server

### Option A: Interactive Browser UI (MCP Inspector)
```bash
npx @modelcontextprotocol/inspector node dist/main.js
```
1. Open the inspector URL in your browser.
2. Toggle the switch to **Connected**.
3. View and run any tool from the **Tools** tab.

### Option B: CLI Stdio Test
```bash
node dist/main.js
```

---

## 🤖 Connecting to AI Clients

### 1. Antigravity IDE

#### Workspace Plugin (Automatic)
The project includes a pre-configured plugin at:
- `.agents/plugins/github-mcp/mcp_config.json`

Antigravity automatically discovers and activates all tools in this workspace.

#### Global Configuration
Add to `~/.gemini/config/mcp_config.json`:
```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": [
        "/home/gourav/Documents/gourav-projects/mcpforjiju/github_mcp/dist/main.js"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
      }
    }
  }
}
```

---

## 🛠️ Complete MCP Tools Reference

### 1. Read & Intelligence Tools (Phase 1)
| Tool Name | Description |
| :--- | :--- |
| `github.get_profile` | User stats, bio, repo counts, followers |
| `github.list_repositories` | Repositories with visibility and sorting |
| `github.get_repository` | Deep dive into repo metadata, stars, topics |
| `github.list_commits` | Commits by branch, author, date range |
| `github.get_commit` | Commit diff, stats, file additions/deletions |
| `github.list_branches` | Branches and protection rules |
| `github.list_issues` | Issues filtered by state, label, author |
| `github.get_issue` | Issue description, comments, assignees |
| `github.list_pull_requests` | PRs with draft status and branch heads |
| `github.get_pull_request` | PR mergeability, diff counts, reviews |
| `github.get_recent_activity`| User events audit (pushes, PRs, comments) |

### 2. Authentication Tools (Phase 2)
| Tool Name | Description |
| :--- | :--- |
| `github.auth_status` | View current auth method (OAuth vs PAT), active user, scopes |
| `github.auth_device_login`| Start GitHub OAuth Device Flow (returns user code & URL) |
| `github.auth_poll_token` | Exchange device code for OAuth access token |
| `github.auth_logout` | Clear OAuth session (falls back to PAT) |

### 3. Policy & Approval Tools (Phase 2)
| Tool Name | Description |
| :--- | :--- |
| `policy.get_rules` | View active security rules and categories |
| `policy.list_pending_approvals` | List all actions awaiting user approval |
| `policy.approve_action` | Approve and execute a pending action by `approvalId` |
| `policy.reject_action` | Reject and cancel a pending action |
| `policy.get_audit_log` | Retrieve audit trail of evaluated decisions |

### 4. Governed Write & High-Risk Tools (Phase 2)
| Tool Name | Default Policy | Description |
| :--- | :--- | :--- |
| `github.create_issue` | `ALLOW` | Create a new issue with labels/assignees |
| `github.create_branch` | `APPROVAL_REQUIRED` | Create a new Git branch from base branch |
| `github.create_pull_request` | `APPROVAL_REQUIRED` | Create a new PR |
| `github.merge_pull_request` | `APPROVAL_REQUIRED` | Merge a PR (merge/squash/rebase) |
| `github.delete_branch` | `DENY` | Delete a Git branch (High-Risk) |

---

## ⚡ Resource Optimization & Performance

- **SWC Builder:** Avoids TypeScript heap memory exhaustion on `@octokit/rest`'s 4.4MB type graph.
- **Runtime Footprint:** Uses only **~90 MB RAM** and **0% idle CPU** on dual-core laptops.
- **Persistent Audit Logging:** Uses efficient append-only JSON Lines (`audit.log`) without database overhead.
