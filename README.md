[English](README.md) | [繁體中文](README.zh-TW.md)

# CodeForge

An AI-powered development tool designed for personal use on a Linux VPS, accessible entirely through a mobile browser. CodeForge combines a Copilot-driven coding agent with a full terminal emulator, providing a portable development environment that fits in your pocket.

Built on the GitHub Copilot subscription for authentication and model access. Single-user by design.

## Architecture

```
Mobile Browser (HTTPS/WSS)
  -> Nginx (SSL + Reverse Proxy)
    -> Node.js + Express + WebSocket
      |-- Copilot SDK -> GitHub API
      |-- node-pty (Terminal)
      +-- SQLite (Conversations)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 6, Tailwind CSS 4, Zustand 5, xterm.js 6 |
| Backend | Node.js, Express 5, ws, node-pty, better-sqlite3 |
| AI | @github/copilot-sdk |
| Deployment | systemd, Nginx, Let's Encrypt |

## Features

### Copilot Agent

The primary interface for AI-assisted development. Streams responses in real time with full tool-calling support:

- **File Operations** -- read, write, edit, and search files on the server
- **Shell Commands** -- execute arbitrary commands with output capture
- **Git Integration** -- stage, commit, diff, and manage repositories
- **Model Switching** -- change the underlying model per conversation
- **Reasoning Blocks** -- view the model's chain-of-thought when available
- **Unlimited Conversations** -- no artificial limits on conversation count or length

### Terminal

A real PTY-backed terminal running in the browser via node-pty and xterm.js. Supports interactive programs such as vim, htop, and ssh with proper escape sequence handling.

### Conversation Management

- **Multi-Tab Interface** -- work across multiple conversations simultaneously with three tab types: copilot, terminal, and cron
- **Persistent History** -- all conversations stored in SQLite with full-text search
- **Pinning** -- pin important conversations to the top of the list

### Artifacts Panel

Renders rich output from AI responses in a dedicated panel:

- **Code** -- syntax-highlighted code blocks with copy and download
- **Markdown** -- rendered markdown documents
- **HTML** -- sandboxed HTML preview in an iframe
- **SVG** -- inline SVG rendering
- **Mermaid** -- diagram rendering from Mermaid syntax

### OpenSpec SDD (Spec-Driven Development)

A structured workflow for managing software specifications:

- **Overview Dashboard** -- high-level view of all specifications
- **Change Management** -- track and review proposed changes
- **Task Tracking** -- break specs into actionable tasks

### Scheduled Tasks / Cron

Schedule recurring tasks directly within conversations:

- **Cron Expressions** -- standard cron syntax for precise scheduling
- **Interval Mode** -- simple repeat intervals as an alternative
- **Per-Conversation** -- each conversation can have its own schedule

### Auto Memory System

Automatically extracts and maintains a knowledge base from conversations:

- **Quality Gate** -- filters out low-value information before storage
- **Smart Extraction** -- LLM-powered identification of key facts and decisions
- **Compaction** -- periodically consolidates memories to avoid redundancy

### Skills System

Extend CodeForge with reusable skill modules:

- **Built-in Skills** -- pre-packaged capabilities included out of the box
- **User Skills** -- create custom skills for personal workflows
- **Installation** -- install from ZIP archives or URLs
- **AI-Assisted Creation** -- use the agent to help build new skills

### Push Notifications

PWA-based push notifications for:

- Cron job execution results
- AI reply completion on long-running tasks

### Plan and Act Mode

A two-phase approach where the agent first outlines a strategy, then executes it step by step. Useful for complex, multi-file changes.

### Web Search

Integrates with the Brave Search API to ground responses in current information. Toggled on or off per conversation.

### Internationalization

Supports two languages:

- English
- Traditional Chinese

### Theme

Dark and light modes with a Slate-Indigo design system built on Tailwind CSS.

### File Attachments and Image Lightbox

Attach files to conversations and view images in a full-screen lightbox.

### Keyboard Shortcuts

Configurable keyboard shortcuts for common actions across the interface.

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- A GitHub account with an active Copilot subscription
- Linux VPS (for production deployment)

### Install

```bash
git clone https://github.com/user/copilot-sdk-test.git
cd copilot-sdk-test
npm install
cd frontend && npm install && cd ..
```

### Configuration

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

Key variables:

- `GITHUB_TOKEN` -- GitHub personal access token with Copilot scope
- `BRAVE_API_KEY` -- Brave Search API key (optional, for web search)
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` -- VAPID keys for push notifications (optional)

### Development

Start both the backend and frontend in development mode:

```bash
# Backend
npm run dev

# Frontend (in a separate terminal)
cd frontend
npm run dev
```

The frontend dev server proxies API and WebSocket requests to the backend.

### Build

```bash
cd frontend
npm run build
```

The production build is output to `frontend/dist` and served by the backend in production mode.

### Test

```bash
npm test
cd frontend && npm test
```

## Deployment

### systemd

Create a service file at `/etc/systemd/system/codeforge.service`:

```ini
[Unit]
Description=CodeForge
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/codeforge
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable codeforge
sudo systemctl start codeforge
```

### Nginx

Configure Nginx as a reverse proxy with WebSocket support:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

### Let's Encrypt

Obtain and auto-renew SSL certificates:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot automatically configures a systemd timer for renewal.

## License

This project is for private use only. All rights reserved.
