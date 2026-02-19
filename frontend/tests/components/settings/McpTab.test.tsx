import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../../src/lib/api', () => ({
  mcpApi: {
    listServers: vi.fn().mockResolvedValue({
      servers: [
        { name: 'filesystem', transport: 'stdio', connected: true },
        { name: 'web-search', transport: 'http', connected: false },
      ],
    }),
    addServer: vi.fn().mockResolvedValue({ ok: true }),
    removeServer: vi.fn().mockResolvedValue({ ok: true }),
    restartServer: vi.fn().mockResolvedValue({ ok: true }),
    listTools: vi.fn().mockResolvedValue({
      tools: [
        { name: 'read_file', description: 'Read a file from disk', serverName: 'filesystem' },
        { name: 'write_file', description: 'Write a file to disk', serverName: 'filesystem' },
        { name: 'search', description: 'Search the web', serverName: 'web-search' },
      ],
    }),
  },
}));

import { mcpApi } from '../../../src/lib/api';
import { McpTab } from '../../../src/components/settings/McpTab';

describe('McpTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mcpApi.listServers as ReturnType<typeof vi.fn>).mockResolvedValue({
      servers: [
        { name: 'filesystem', transport: 'stdio', connected: true },
        { name: 'web-search', transport: 'http', connected: false },
      ],
    });
    (mcpApi.listTools as ReturnType<typeof vi.fn>).mockResolvedValue({
      tools: [
        { name: 'read_file', description: 'Read a file from disk', serverName: 'filesystem' },
        { name: 'write_file', description: 'Write a file to disk', serverName: 'filesystem' },
        { name: 'search', description: 'Search the web', serverName: 'web-search' },
      ],
    });
  });

  // === Renders server list ===
  it('should render server list on mount', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByText('filesystem')).toBeTruthy();
      expect(screen.getByText('web-search')).toBeTruthy();
    });
    expect(mcpApi.listServers).toHaveBeenCalledOnce();
  });

  it('should display transport badge for each server', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('server-transport-filesystem')).toBeTruthy();
      expect(screen.getByTestId('server-transport-filesystem').textContent).toBe('stdio');
      expect(screen.getByTestId('server-transport-web-search')).toBeTruthy();
      expect(screen.getByTestId('server-transport-web-search').textContent).toBe('http');
    });
  });

  it('should display connection status for each server', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('server-status-filesystem')).toBeTruthy();
      expect(screen.getByTestId('server-status-filesystem').textContent).toBe('Connected');
      expect(screen.getByTestId('server-status-web-search')).toBeTruthy();
      expect(screen.getByTestId('server-status-web-search').textContent).toBe('Disconnected');
    });
  });

  it('should show empty state when no servers configured', async () => {
    (mcpApi.listServers as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ servers: [] });
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByText('No MCP servers configured')).toBeTruthy();
    });
  });

  // === Add server form ===
  it('should show add server form when button is clicked', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('mcp-add-server-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('mcp-add-server-button'));
    expect(screen.getByTestId('mcp-form-name')).toBeTruthy();
    expect(screen.getByTestId('mcp-form-transport')).toBeTruthy();
  });

  it('should show command and args fields when stdio transport is selected', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('mcp-add-server-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('mcp-add-server-button'));

    // Default transport is stdio
    expect(screen.getByTestId('mcp-form-command')).toBeTruthy();
    expect(screen.getByTestId('mcp-form-args')).toBeTruthy();
    expect(screen.queryByTestId('mcp-form-url')).toBeNull();
  });

  it('should show url field when http transport is selected', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('mcp-add-server-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('mcp-add-server-button'));

    fireEvent.change(screen.getByTestId('mcp-form-transport'), {
      target: { value: 'http' },
    });

    expect(screen.queryByTestId('mcp-form-command')).toBeNull();
    expect(screen.queryByTestId('mcp-form-args')).toBeNull();
    expect(screen.getByTestId('mcp-form-url')).toBeTruthy();
  });

  // === Add server submits to API ===
  it('should submit add server form to API with stdio transport', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('mcp-add-server-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('mcp-add-server-button'));

    fireEvent.change(screen.getByTestId('mcp-form-name'), {
      target: { value: 'new-server' },
    });
    fireEvent.change(screen.getByTestId('mcp-form-command'), {
      target: { value: 'npx' },
    });
    fireEvent.change(screen.getByTestId('mcp-form-args'), {
      target: { value: '-y,@modelcontextprotocol/server' },
    });

    fireEvent.click(screen.getByTestId('mcp-form-submit'));

    await waitFor(() => {
      expect(mcpApi.addServer).toHaveBeenCalledWith({
        name: 'new-server',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server'],
      });
    });
  });

  it('should submit add server form to API with http transport', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('mcp-add-server-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('mcp-add-server-button'));

    fireEvent.change(screen.getByTestId('mcp-form-name'), {
      target: { value: 'remote-server' },
    });
    fireEvent.change(screen.getByTestId('mcp-form-transport'), {
      target: { value: 'http' },
    });
    fireEvent.change(screen.getByTestId('mcp-form-url'), {
      target: { value: 'http://localhost:3001' },
    });

    fireEvent.click(screen.getByTestId('mcp-form-submit'));

    await waitFor(() => {
      expect(mcpApi.addServer).toHaveBeenCalledWith({
        name: 'remote-server',
        transport: 'http',
        url: 'http://localhost:3001',
      });
    });
  });

  it('should refresh server list after adding a server', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('mcp-add-server-button')).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId('mcp-add-server-button'));

    fireEvent.change(screen.getByTestId('mcp-form-name'), {
      target: { value: 'new-server' },
    });
    fireEvent.change(screen.getByTestId('mcp-form-command'), {
      target: { value: 'node' },
    });

    // Clear the call count from mount
    (mcpApi.listServers as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(screen.getByTestId('mcp-form-submit'));

    await waitFor(() => {
      expect(mcpApi.listServers).toHaveBeenCalled();
    });
  });

  // === Delete button calls remove API ===
  it('should call removeServer API when delete button is clicked', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('server-delete-filesystem')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('server-delete-filesystem'));

    await waitFor(() => {
      expect(mcpApi.removeServer).toHaveBeenCalledWith('filesystem');
    });
  });

  it('should refresh server list after deleting a server', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('server-delete-filesystem')).toBeTruthy();
    });

    (mcpApi.listServers as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(screen.getByTestId('server-delete-filesystem'));

    await waitFor(() => {
      expect(mcpApi.listServers).toHaveBeenCalled();
    });
  });

  // === Restart button calls restart API ===
  it('should call restartServer API when restart button is clicked', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('server-restart-filesystem')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('server-restart-filesystem'));

    await waitFor(() => {
      expect(mcpApi.restartServer).toHaveBeenCalledWith('filesystem');
    });
  });

  it('should refresh server list after restarting a server', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('server-restart-filesystem')).toBeTruthy();
    });

    (mcpApi.listServers as ReturnType<typeof vi.fn>).mockClear();

    fireEvent.click(screen.getByTestId('server-restart-filesystem'));

    await waitFor(() => {
      expect(mcpApi.listServers).toHaveBeenCalled();
    });
  });

  // === Expand shows tools ===
  it('should expand server card to show tools when clicked', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('server-expand-filesystem')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('server-expand-filesystem'));

    await waitFor(() => {
      expect(screen.getByText('read_file')).toBeTruthy();
      expect(screen.getByText('Read a file from disk')).toBeTruthy();
      expect(screen.getByText('write_file')).toBeTruthy();
      expect(screen.getByText('Write a file to disk')).toBeTruthy();
    });

    // Should NOT show tools from other servers
    expect(screen.queryByText('search')).toBeNull();
  });

  it('should collapse expanded server when clicked again', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('server-expand-filesystem')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('server-expand-filesystem'));
    await waitFor(() => {
      expect(screen.getByText('read_file')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('server-expand-filesystem'));
    expect(screen.queryByText('read_file')).toBeNull();
  });

  it('should call listTools API when expanding a server', async () => {
    render(<McpTab />);
    await waitFor(() => {
      expect(screen.getByTestId('server-expand-filesystem')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('server-expand-filesystem'));

    await waitFor(() => {
      expect(mcpApi.listTools).toHaveBeenCalled();
    });
  });
});
