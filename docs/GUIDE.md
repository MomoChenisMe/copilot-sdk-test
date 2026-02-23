# CodeForge User Guide

CodeForge is a self-hosted AI-powered development environment that combines a Copilot chat agent, a real terminal, scheduled tasks, and spec-driven development tools into a single web interface. It runs on your own Linux VPS and connects to GitHub Copilot models through the Copilot SDK.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Interface Overview](#interface-overview)
- [Copilot Agent](#copilot-agent)
- [Terminal](#terminal)
- [Conversation Management](#conversation-management)
- [Scheduled Tasks (Cron)](#scheduled-tasks-cron)
- [Artifacts](#artifacts)
- [OpenSpec (Spec-Driven Development)](#openspec-spec-driven-development)
- [Settings](#settings)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Push Notifications](#push-notifications)

---

## Getting Started

### Prerequisites

- **GitHub Copilot subscription**: CodeForge uses GitHub Copilot models via the Copilot SDK. An active Copilot subscription (Individual, Business, or Enterprise) is required.
- **Node.js v24+**: The backend server requires Node.js version 24 or later.
- **Linux VPS**: CodeForge is designed to run on a Linux server. It uses real PTY terminals (node-pty) and systemd for process management.

### Login

CodeForge uses password-based authentication. When you open the application, you are presented with a login page.

1. Enter your password in the password field.
2. Click the login button (or press Enter) to authenticate.
3. On success, a session cookie is set and you are taken to the main interface.

Security features:
- **Rate limiting**: After too many failed login attempts, further attempts are temporarily blocked with a rate-limit warning.
- **Account locking**: Repeated failures can lock the account entirely.
- **Password reset**: If you forget your password, click the "Forgot Password" link on the login page. You will need a reset token (generated server-side) and a new password of at least 8 characters.

---

## Interface Overview

The interface is divided into several areas:

### Top Bar

The top bar is a thin horizontal strip at the top of the screen containing:

- **Title**: Shows the current conversation or page title. Clicking it navigates to the home view.
- **Keyboard shortcuts button**: Opens the keyboard shortcuts reference panel (keyboard icon).
- **OpenSpec button**: Opens the OpenSpec side panel (book icon). Only visible when OpenSpec (SDD) is enabled in settings.
- **Settings button**: Opens the full-screen settings panel (gear icon).
- **Theme toggle**: Switches between light and dark modes (sun/moon icon).
- **Connection status badge**: Shows the WebSocket connection state (connected, connecting, disconnected).

On mobile, a hamburger menu button appears on the left side to open the sidebar drawer.

### Tab Bar

Directly below the top bar, the tab bar displays open conversation tabs:

- Each tab shows its title and a close button (visible on hover).
- A chevron dropdown on each tab opens the conversation popover for switching to a different conversation within that tab.
- A streaming indicator (pulsing dot) appears on tabs with active AI responses.
- A clock icon appears on tabs with cron jobs enabled.
- The **+ button** creates a new tab.
- The **History button** (clock icon) opens a global conversation history dropdown with search, pinned conversations, and recent conversations.
- Tabs can be **dragged to reorder** by clicking and dragging horizontally. Keyboard reordering is also supported with Ctrl+Shift+Arrow keys.
- A warning icon appears when you approach the tab limit (15 tabs).

### Chat Area

The main content area displays the conversation:

- **Messages**: User messages and assistant responses are shown in a scrollable list.
- **Streaming responses**: As the AI responds, text streams in incrementally with a typing effect.
- **Tool call results**: When the AI uses tools (file read, command execution, etc.), each tool call is displayed as an expandable record showing the tool name, input, and output.
- **Reasoning blocks**: For models that support extended thinking (such as Claude), reasoning/thinking blocks are displayed in a collapsible section above the response.

### Input Area

At the bottom of the chat area:

- **Message input**: A multi-line text area for composing messages. Press Enter to send; Shift+Enter for a new line. The textarea auto-expands as you type (up to a maximum height).
- **File attachments**: Click the paperclip icon (or use Alt+Shift+U) to attach files. Supported formats include images, PDF, text, Markdown, CSV, and JSON. You can also paste images from the clipboard or drag and drop files onto the input.
- **Slash commands (/)**: Type `/` at the beginning of a line or after whitespace to open the slash command menu. This shows available built-in commands, SDK commands, and skill-based commands. Use arrow keys to navigate and Enter/Tab to select.
- **@ file references**: Type `@` followed by a path to reference files from the working directory. An autocomplete menu appears showing files and directories. Use arrow keys to navigate, Right arrow to enter directories, Left arrow to go up, and Enter/Tab to select a file. Selected file paths are included as context when your message is sent.
- **Input history**: Press the Up arrow key when the cursor is on the first line to cycle through previous messages you have sent. Press Down arrow to go forward in history.
- **Stop button**: While the AI is streaming, the send button changes to a stop button (square icon) that aborts the current response.

### Sidebar Panels

Two side panels can open on the right side of the screen (they are mutually exclusive -- opening one closes the other):

- **Artifacts panel**: Displays generated artifacts such as code, HTML previews, Markdown documents, SVG images, and Mermaid diagrams.
- **OpenSpec panel**: Displays the spec-driven development dashboard with overview, changes, specs, and archived items.

On mobile, both panels open as full-screen overlays with a backdrop.

---

## Copilot Agent

### Sending Messages

Type your message in the input area and press Enter to send. The AI will process your message and stream a response. You can send follow-up messages to continue the conversation.

### Model Switching

Click the model selector button (shown below the input area with the current model name) to open a dropdown of all available GitHub Copilot models. Each model displays:

- **Model name**: The human-readable name of the model.
- **Premium multiplier**: A colored badge indicating the cost relative to the base rate:
  - Green (0x or less than 1x): Lower cost or free models.
  - Gray (1x): Standard cost.
  - Amber (2x-8x): Higher cost premium models.
  - Red (9x+): Highest cost models.

Your last selected model is remembered across sessions. Use Alt+M to quickly toggle the model selector.

### Tool Calling

The Copilot agent can use tools to interact with your system. During a response, tool calls appear as expandable records in the chat. Common tools include:

- **File read/write**: Reading and writing files on the server.
- **Command execution**: Running shell commands in the working directory.
- **Code search**: Searching through codebases using grep or other search tools.
- **Git operations**: Performing Git commands (status, diff, commit, etc.).
- **MCP tools**: Any tools exposed by connected Model Context Protocol servers.

Each tool record shows the tool name, a summary of its input, and the result once completed.

### Reasoning Blocks

When using models that support extended thinking (such as Claude with "thinking" enabled), the AI's internal reasoning is displayed in a collapsible block above the response text. Click to expand or collapse the reasoning content. This lets you see the model's step-by-step thought process.

### Plan and Act Mode

A toggle in the input area lets you switch between two modes:

- **Plan mode** (lightbulb icon): The AI creates a plan before taking action. It outlines what it intends to do and asks for confirmation before executing. Use this for complex or risky tasks where you want to review the approach first.
- **Act mode** (lightning icon): The AI executes actions directly without creating a plan first. This is the default and fastest mode for straightforward tasks.

Toggle between modes by clicking the Plan/Act buttons or pressing Shift+Tab.

### Web Search

When a Brave Search API key is configured (see Settings > API Keys), a web search toggle appears in the input area (magnifying glass icon). When enabled (highlighted in accent color), the AI can search the web to find up-to-date information as part of its response. This is a per-conversation toggle.

---

## Terminal

CodeForge includes a real PTY terminal powered by node-pty on the backend and xterm.js on the frontend.

### Accessing the Terminal

Each tab can switch between Copilot (AI chat) mode and Terminal mode. Use the Cmd/Ctrl+Shift+Tab shortcut to toggle between AI and Terminal mode for the current tab.

### Features

- **Real PTY**: This is a full pseudo-terminal, not a simulated one. Interactive programs like vim, htop, top, nano, and other TUI applications work correctly.
- **Working directory**: The terminal opens in the working directory associated with the current conversation. Use the CwdSelector component (available in copilot mode) to change the working directory.
- **Resizable**: The terminal automatically fits to the available space and reports resize events to the backend PTY.
- **Color support**: Full 256-color and true-color support with a dark theme optimized for readability.

---

## Conversation Management

### Creating Tabs

- Click the **+ button** in the tab bar to create a new empty tab.
- Use **Alt+T** to create a new tab via keyboard.
- Each new tab starts as a draft with no associated conversation. A conversation is created automatically when you send your first message.

### Switching Tabs

- Click a tab to make it active.
- Use **Alt+1** through **Alt+9** to switch to tabs by position.
- Use **Alt+Shift+[** and **Alt+Shift+]** to move to the previous or next tab.

### Tab Types

Each tab operates in one of three modes:

- **Copilot**: AI chat mode (default). Send messages, receive streaming responses, use tools.
- **Terminal**: Real PTY terminal mode. Interact with the server shell directly.
- **Cron**: When a conversation has a scheduled task configured, the tab can display cron-related information.

### Conversation History

Click the **History button** (clock icon) in the tab bar or use the chevron dropdown on any tab to open the conversation popover. Features include:

- **Search**: Type in the search field to filter conversations by title.
- **Pinned conversations**: Important conversations you have pinned appear in a "Pinned" section at the top.
- **Recent conversations**: All other conversations appear in the "Recent" section, sorted by last update.
- **New conversation**: Click the + button in the popover to create a new conversation.
- **Delete conversations**: Hover over a conversation to reveal the delete button (trash icon). Click it, then confirm deletion.

### Pinning Conversations

Pin important conversations so they always appear at the top of the conversation list. Pinned conversations are indicated in the conversation popover.

### Tab Drag-to-Reorder

Tabs can be reordered by dragging:

1. Click and hold on a tab.
2. Drag it horizontally past another tab's midpoint.
3. The tabs swap positions instantly as you drag.
4. Release to finalize the new order.

You can also reorder tabs with the keyboard using Ctrl+Shift+Left/Right arrow keys.

---

## Scheduled Tasks (Cron)

CodeForge supports scheduled (cron) tasks that automatically send a message to the AI on a recurring schedule.

### Opening the Cron Config Panel

Click the **clock icon** on a tab's conversation, or access it through the conversation settings to open the cron configuration panel.

### Configuration Options

- **Enable/Disable toggle**: Turn the scheduled task on or off.
- **Model selection**: Choose which AI model to use for cron job executions. Options include:
  - "Use conversation model" (default): Uses whatever model the conversation is set to.
  - Any specific model from the available list, with premium multiplier indicators.
- **Schedule type**: Choose between two scheduling methods:
  - **Cron Expression**: Standard cron syntax (e.g., `*/5 * * * *` for every 5 minutes, `0 9 * * 1-5` for weekday mornings at 9 AM).
  - **Interval**: A fixed interval in milliseconds (e.g., `300000` for every 5 minutes, `3600000` for every hour).
- **Prompt**: The message that is sent to the AI on each trigger. This is the instruction the AI will execute repeatedly.

### Saving

Click **Save** to apply your cron configuration. The cron job starts (or stops) immediately based on the enable/disable toggle. A clock icon appears on the tab when cron is enabled for that conversation.

---

## Artifacts

When the AI generates structured content (code files, HTML pages, diagrams, etc.), they appear as artifacts in a dedicated right-side panel.

### Viewing Artifacts

The artifacts panel opens automatically when new artifacts are detected, or you can toggle it manually. It appears on the right side of the screen.

### Supported Types

- **Markdown**: Rendered as formatted prose with headings, lists, code blocks, and other Markdown elements.
- **Code**: Displayed as syntax-highlighted source code in a monospace font.
- **HTML**: Rendered in a sandboxed iframe (`sandbox="allow-scripts"`) for safe preview of web pages and interactive content.
- **SVG**: Rendered inline as scalable vector graphics.
- **Mermaid diagrams**: Parsed and rendered as visual diagrams (flowcharts, sequence diagrams, etc.) using the Mermaid library.

### Multi-Artifact Tab Switching

When multiple artifacts exist in a conversation, they appear as tabs at the top of the artifacts panel. Click a tab to switch between artifacts. Each tab shows an icon indicating the artifact type and a truncated title.

### Copy and Download

At the bottom of the artifacts panel:

- **Copy**: Copies the raw artifact content to your clipboard.
- **Download**: Downloads the artifact as a file with an appropriate extension (.html, .svg, .mmd, .md, or .txt).

---

## OpenSpec (Spec-Driven Development)

OpenSpec is CodeForge's built-in spec-driven development (SDD) workflow system. It helps you manage software changes through structured specifications.

### Enabling SDD

1. Open **Settings** (gear icon or Alt+,).
2. Navigate to the **OpenSpec** tab (under the Prompts group).
3. Toggle **OpenSpec SDD** to enabled.
4. Optionally edit the `OPENSPEC_SDD.md` content in the textarea below the toggle. This file defines the SDD workflow rules that the AI follows.
5. Click **Save** to persist your changes.

When enabled, OpenSpec-related skills are automatically activated, and the book icon appears in the top bar for quick access to the OpenSpec panel.

### OpenSpec Panel

Open the panel by clicking the **book icon** in the top bar or pressing **Alt+O**. The panel has four navigation tabs:

#### Overview

A dashboard showing statistics:
- Number of active changes
- Number of spec files
- Number of archived changes
- The resolved openspec path (showing whether it's using the project's CWD or the default path)

Click on any stat to navigate to its corresponding tab.

#### Changes

Lists all active change proposals. Each change shows its name and a summary. Click a change to view its detail, which includes:

- **Tasks**: A checklist of tasks with checkboxes. Toggle checkboxes to mark tasks as complete or incomplete. Task status is persisted to the spec files.
- **Proposals**: The proposed changes for this feature or fix.
- **Design**: Design documents and architectural decisions.
- **Delta specs**: The specification diffs describing what changes from the current state.
- **Archive button**: Move the change to the archived section.
- **Delete button**: Permanently remove the change.

#### Specs

Lists all main specification files in the openspec directory. Click a spec to view its rendered Markdown content.

#### Archived

Lists previously archived changes. Click an archived item to view its details.

### Per-Tab State

The OpenSpec panel is aware of the active tab's working directory. When you switch tabs, the OpenSpec panel refreshes to show data relevant to that tab's project directory. A path indicator at the top shows the resolved openspec path and whether it is using the project CWD or the default location.

---

## Settings

Open settings via the **gear icon** in the top bar or by pressing **Alt+,**. Settings is a full-screen panel with a sidebar (desktop) or horizontal tabs (mobile) for navigation.

### General

- **Copilot SDK version**: Displays the current SDK version installed on the server. Features include:
  - **Check for Updates**: Queries for the latest available SDK version.
  - **Update SDK**: When an update is available, installs the latest version.
  - **Analyze Changes**: After an update, sends the changelog to the AI for analysis and optimization suggestions.
- **Language toggle**: Switch the interface language (e.g., English / Traditional Chinese).
- **Notifications**: Configure push notifications (see [Push Notifications](#push-notifications)).
- **Logout**: End your session and return to the login page.

### System Prompt

Customize the AI's system-level instructions:

- Edit the system prompt in the textarea. This prompt is prepended to every conversation.
- Click **Save** to apply changes.
- Click **Reset to Default** to restore the original system prompt (with confirmation).

### Profile

Provide user profile information that gives the AI context about you:

- Edit the profile text in the textarea. This can include your name, role, preferences, coding style, and any other context you want the AI to know.
- Click **Save** to apply.

### OpenSpec

Configure spec-driven development:

- **SDD toggle**: Enable or disable the OpenSpec SDD workflow.
- **OPENSPEC_SDD.md editor**: When enabled, a textarea appears where you can edit the SDD workflow definition. This Markdown document defines the rules and processes the AI follows for spec-driven development.
- Click **Save** to persist changes.

### Memory

Configure the Auto Memory system, which automatically extracts and remembers facts from your conversations:

- **Auto Memory editor**: A textarea showing all remembered facts. You can manually edit, add, or remove facts.
- **Auto Extract toggle**: When enabled, the system automatically extracts memorable facts from conversations.
- **Total facts count**: Shows how many facts are currently stored.

**LLM Intelligence** subsection provides three advanced features, each with its own enable toggle and model selector:

- **LLM Quality Gate**: Uses an LLM to evaluate whether extracted facts are worth remembering, filtering out noise.
- **LLM Smart Extraction**: Uses an LLM for more intelligent fact extraction from conversations.
- **LLM Memory Compaction**: Uses an LLM to merge and deduplicate facts, keeping memory concise.

Each feature lets you select which model to use from the available models list.

- **Compact Now**: Manually trigger memory compaction to merge duplicate or related facts.

### Skills

Skills are reusable instruction sets that extend the AI's capabilities. The skills tab shows two sections:

**System Skills** (read-only):
- Built-in skills provided by the system. They have a "System" badge.
- Skills prefixed with `openspec-` have an additional "OpenSpec" badge.
- You can enable or disable each skill with a toggle switch.
- Click a skill name to expand and view its content (read-only for system skills).

**User Skills** (editable):
- Custom skills you have created or installed.
- Enable/disable with toggle switches.
- Click to expand, edit the description and content, then save.
- Delete user skills with the X button (with confirmation dialog).

**Installing Skills**:
- **ZIP upload**: Drag and drop a .zip file onto the upload area, or click to browse and select a file.
- **URL install**: Paste a URL to a skill package and click "Install".
- **AI-assisted creation**: Click "Create with AI" to have the AI help you write a new skill. This closes settings and sends a skill creation command to the chat.

### API Keys

Configure external API keys:

- **Brave Search API Key**: Enter your Brave Search API key to enable web search functionality. Get a key at search.brave.com.
  - The current key is shown in masked form (first 4 characters + asterisks).
  - Enter a new key and click Save to replace, or click Clear to remove.

### MCP (Model Context Protocol)

Configure MCP servers that provide additional tools to the AI:

- **Add Server**: Click to show the form for adding a new MCP server. Fields include:
  - **Name**: A unique identifier for the server.
  - **Transport**: Choose between `stdio` (local process) or `http` (remote endpoint).
  - For stdio: specify the **Command** and **Args** (comma-separated).
  - For http: specify the **URL**.

- **Server list**: Shows all configured MCP servers with:
  - Transport type badge (stdio/http).
  - Connection status (green dot for connected, gray for disconnected).
  - **Restart** button to reconnect the server.
  - **Delete** button to remove the server.
  - Click the server name to expand and view the list of tools it provides, including each tool's name and description.

---

## Keyboard Shortcuts

Press **?** (question mark) outside of a text input to open the keyboard shortcuts panel. The following shortcuts are available:

| Shortcut | Action |
|---|---|
| Alt+T | New tab |
| Alt+W | Close current tab |
| Alt+1 through Alt+9 | Switch to tab by position |
| Alt+Shift+[ | Previous tab |
| Alt+Shift+] | Next tab |
| Cmd/Ctrl+Shift+Tab | Toggle between AI and Terminal mode |
| Alt+, | Open settings |
| Alt+K | Clear current conversation |
| Alt+Shift+D | Toggle light/dark theme |
| Alt+Shift+U | Trigger file upload |
| Alt+M | Toggle model selector |
| Shift+Tab | Toggle Plan/Act mode |
| Alt+O | Toggle OpenSpec panel |
| ? | Show keyboard shortcuts panel |

Note: On macOS, Alt is the Option key. On Windows/Linux, Alt is used directly. The Cmd/Ctrl shortcut uses Cmd on macOS and Ctrl on Windows/Linux.

---

## Push Notifications

CodeForge supports browser push notifications to alert you when background tasks complete.

### Enabling Notifications

1. Open **Settings** (gear icon or Alt+,).
2. Go to **General**.
3. In the **Notifications** section, toggle **Push Notifications** on.
4. Your browser will request permission to show notifications. You must grant this permission for notifications to work.
5. If permission was previously denied, a message will indicate that notifications are blocked and you need to enable them in your browser's site settings.

### Notification Types

Once enabled, you can individually toggle which notification types to receive:

- **Cron job completion**: Notifies you when a scheduled (cron) task finishes executing.
- **AI reply completion**: Notifies you when an AI response completes in a background tab (useful when you switch away while waiting for a long response).

### Test Notification

A **Send test notification** button is available to verify that notifications are working correctly. Click it to receive a test push notification.

---

*This guide covers all major features of CodeForge. For technical details about deployment, backend configuration, and API endpoints, refer to the project's README and source code.*
