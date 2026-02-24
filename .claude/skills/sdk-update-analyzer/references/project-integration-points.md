# Project Integration Points with @github/copilot-sdk

## Core SDK Usage

### Client Manager
- **File:** `backend/src/copilot/client-manager.ts`
- **Usage:** Creates and manages the `CopilotClient` singleton instance. Handles authentication, model selection, and client lifecycle (start/stop).
- **Sensitivity:** HIGH - Authentication flow changes would break all SDK interactions.

### Session Manager
- **File:** `backend/src/copilot/session-manager.ts`
- **Usage:** Creates and resumes `CopilotSession` instances for each conversation. Configures session tools, system prompts, and model parameters.
- **Sensitivity:** HIGH - Session creation API changes would affect all conversations.

### Stream Manager
- **File:** `backend/src/copilot/stream-manager.ts`
- **Usage:** Processes SDK event streams. Handles event types: `assistant.message`, `assistant.message.delta`, `session.idle`, `tool.start`, `tool.end`, `assistant.reasoning`, `user_input_request`. Accumulates content segments and manages plan mode artifacts.
- **Sensitivity:** CRITICAL - Event format changes in the SDK would silently break message handling.

### Event Relay
- **File:** `backend/src/copilot/event-relay.ts`
- **Usage:** Transforms SDK event format to WebSocket message format and relays to frontend clients. Maps SDK event names to `copilot:*` WS message types.
- **Sensitivity:** HIGH - Depends on SDK event naming conventions and payload structure.

### Permission Handler
- **File:** `backend/src/copilot/permission.ts`
- **Usage:** Handles SDK permission/confirmation requests for tool execution. Implements the confirmation protocol between SDK and user.
- **Sensitivity:** MEDIUM - Tool execution protocol changes would affect AI tool usage.

### SDK Version Detection
- **File:** `backend/src/copilot/sdk-update.ts`
- **Usage:** Reads installed SDK version from `node_modules/@github/copilot-sdk/package.json`. Uses `createRequire` resolution and candidate path fallbacks.
- **Sensitivity:** LOW - Only reads package.json metadata.

## SDK Types Used

- `CopilotClient` - Primary client class
- `CopilotSession` - Session interface for conversations
- SDK event types: message, delta, idle, tool_start, tool_end, reasoning, user_input_request

## High-Sensitivity Areas (Most Likely to Break)

1. **Event format changes** - The `stream-manager.ts` event handler switch statement processes raw SDK events. Any change to event names, payload structure, or sequencing would cause silent failures.
2. **Session creation API** - `session-manager.ts` passes configuration objects to the SDK. Schema changes in session config would cause TypeScript compilation errors or runtime failures.
3. **Authentication flow** - `client-manager.ts` authenticates via GitHub Copilot subscription. OAuth flow changes would prevent all SDK usage.
4. **Tool execution protocol** - `permission.ts` and `stream-manager.ts` tool handlers depend on the SDK's tool confirmation/execution protocol. Protocol changes would break AI tool usage.
