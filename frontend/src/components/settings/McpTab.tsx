import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { mcpApi } from '../../lib/api';
import type { McpServer, McpToolInfo } from '../../lib/api';

export function McpTab() {
  const { t } = useTranslation();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [tools, setTools] = useState<McpToolInfo[]>([]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTransport, setFormTransport] = useState<'stdio' | 'http'>('stdio');
  const [formCommand, setFormCommand] = useState('');
  const [formArgs, setFormArgs] = useState('');
  const [formUrl, setFormUrl] = useState('');

  const fetchServers = useCallback(async () => {
    try {
      const res = await mcpApi.listServers();
      setServers(res.servers);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleAddServer = useCallback(async () => {
    if (!formName.trim()) return;

    try {
      if (formTransport === 'stdio') {
        const args = formArgs.trim()
          ? formArgs.split(',').map((a) => a.trim())
          : [];
        await mcpApi.addServer({
          name: formName.trim(),
          transport: 'stdio',
          command: formCommand.trim(),
          args,
        });
      } else {
        await mcpApi.addServer({
          name: formName.trim(),
          transport: 'http',
          url: formUrl.trim(),
        });
      }

      // Reset form
      setFormName('');
      setFormTransport('stdio');
      setFormCommand('');
      setFormArgs('');
      setFormUrl('');
      setShowForm(false);

      // Refresh list
      await fetchServers();
    } catch {
      // ignore
    }
  }, [formName, formTransport, formCommand, formArgs, formUrl, fetchServers]);

  const handleDelete = useCallback(async (name: string) => {
    try {
      await mcpApi.removeServer(name);
      await fetchServers();
    } catch {
      // ignore
    }
  }, [fetchServers]);

  const handleRestart = useCallback(async (name: string) => {
    try {
      await mcpApi.restartServer(name);
      await fetchServers();
    } catch {
      // ignore
    }
  }, [fetchServers]);

  const handleExpand = useCallback(async (name: string) => {
    if (expandedServer === name) {
      setExpandedServer(null);
      return;
    }
    setExpandedServer(name);
    try {
      const res = await mcpApi.listTools();
      setTools(res.tools);
    } catch {
      setTools([]);
    }
  }, [expandedServer]);

  if (loading) {
    return <div className="text-text-secondary text-sm">{t('settings.loading')}</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-secondary uppercase">
          {t('mcp.title')}
        </h3>
        <button
          data-testid="mcp-add-server-button"
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
        >
          {t('mcp.addServer')}
        </button>
      </div>

      {/* Add server form */}
      {showForm && (
        <div className="border border-border rounded-lg p-3 flex flex-col gap-2">
          <label className="text-xs font-medium text-text-secondary">{t('mcp.name')}</label>
          <input
            data-testid="mcp-form-name"
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
          />

          <label className="text-xs font-medium text-text-secondary">{t('mcp.transport')}</label>
          <select
            data-testid="mcp-form-transport"
            value={formTransport}
            onChange={(e) => setFormTransport(e.target.value as 'stdio' | 'http')}
            className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
          >
            <option value="stdio">stdio</option>
            <option value="http">http</option>
          </select>

          {formTransport === 'stdio' && (
            <>
              <label className="text-xs font-medium text-text-secondary">{t('mcp.command')}</label>
              <input
                data-testid="mcp-form-command"
                type="text"
                value={formCommand}
                onChange={(e) => setFormCommand(e.target.value)}
                className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
              />

              <label className="text-xs font-medium text-text-secondary">{t('mcp.args')}</label>
              <input
                data-testid="mcp-form-args"
                type="text"
                value={formArgs}
                onChange={(e) => setFormArgs(e.target.value)}
                placeholder={t('mcp.argsPlaceholder')}
                className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
              />
            </>
          )}

          {formTransport === 'http' && (
            <>
              <label className="text-xs font-medium text-text-secondary">{t('mcp.url')}</label>
              <input
                data-testid="mcp-form-url"
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="w-full p-2 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary"
              />
            </>
          )}

          <button
            data-testid="mcp-form-submit"
            onClick={handleAddServer}
            className="self-start px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90"
          >
            {t('mcp.add')}
          </button>
        </div>
      )}

      {/* Empty state */}
      {servers.length === 0 && (
        <div className="text-sm text-text-secondary text-center py-8">
          {t('mcp.noServers')}
        </div>
      )}

      {/* Server list */}
      {servers.map((server) => (
        <div
          key={server.name}
          className="border border-border rounded-lg overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Expand toggle */}
            <button
              data-testid={`server-expand-${server.name}`}
              onClick={() => handleExpand(server.name)}
              className="flex-1 text-left text-sm text-text-primary hover:text-accent"
            >
              {server.name}
            </button>

            {/* Transport badge */}
            <span
              data-testid={`server-transport-${server.name}`}
              className="px-1.5 py-0.5 text-[10px] font-medium bg-accent/10 text-accent rounded"
            >
              {server.transport}
            </span>

            {/* Status dot */}
            <span
              data-testid={`server-status-${server.name}`}
              className={`flex items-center gap-1 text-xs ${
                server.connected ? 'text-emerald-500' : 'text-text-secondary'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  server.connected ? 'bg-emerald-500' : 'bg-text-secondary'
                }`}
              />
              {server.connected ? t('mcp.connected') : t('mcp.disconnected')}
            </span>

            {/* Restart button */}
            <button
              data-testid={`server-restart-${server.name}`}
              onClick={() => handleRestart(server.name)}
              className="px-2 py-1 text-xs text-text-secondary hover:text-accent hover:bg-bg-tertiary rounded"
            >
              {t('mcp.restart')}
            </button>

            {/* Delete button */}
            <button
              data-testid={`server-delete-${server.name}`}
              onClick={() => handleDelete(server.name)}
              className="px-2 py-1 text-xs text-text-secondary hover:text-error hover:bg-bg-tertiary rounded"
            >
              {t('mcp.delete')}
            </button>
          </div>

          {/* Expanded tools section */}
          {expandedServer === server.name && (
            <div className="px-3 pb-3 border-t border-border-subtle">
              <h4 className="text-xs font-medium text-text-secondary mt-2 mb-1">
                {t('mcp.tools')}
              </h4>
              <div className="flex flex-col gap-1">
                {tools
                  .filter((tool) => tool.serverName === server.name)
                  .map((tool) => (
                    <div
                      key={tool.name}
                      className="flex flex-col px-2 py-1 rounded bg-bg-secondary"
                    >
                      <span className="text-xs font-mono text-text-primary">
                        {tool.name}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {tool.description}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
