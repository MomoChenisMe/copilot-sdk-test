import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Copy, Check, FileText, Code, Globe, Image, Download } from 'lucide-react';
import { Markdown } from '../shared/Markdown';
import type { ParsedArtifact } from '../../lib/artifact-parser';

interface ArtifactsPanelProps {
  artifacts: ParsedArtifact[];
  activeArtifactId: string | null;
  onSelectArtifact: (id: string) => void;
  onClose: () => void;
}

function getArtifactIcon(type: ParsedArtifact['type']) {
  switch (type) {
    case 'markdown': return <FileText size={14} />;
    case 'code': return <Code size={14} />;
    case 'html': return <Globe size={14} />;
    case 'svg': return <Image size={14} />;
    case 'mermaid': return <Image size={14} />;
  }
}

export function ArtifactsPanel({ artifacts, activeArtifactId, onSelectArtifact, onClose }: ArtifactsPanelProps) {
  const { t } = useTranslation();
  const active = artifacts.find((a) => a.id === activeArtifactId) ?? artifacts[0];

  const handleCopy = useCallback(() => {
    if (active) {
      navigator.clipboard.writeText(active.content).catch(() => {});
    }
  }, [active]);

  const handleDownload = useCallback(() => {
    if (!active) return;
    const extMap: Record<string, string> = {
      html: '.html', svg: '.svg', mermaid: '.mmd', markdown: '.md', code: '.txt',
    };
    const ext = extMap[active.type] || '.txt';
    const fileName = active.title.includes('.') ? active.title : `artifact${ext}`;
    const blob = new Blob([active.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [active]);

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        data-testid="artifacts-panel"
        className="
          fixed inset-0 z-50
          md:relative md:inset-auto md:z-auto
          md:w-[480px] md:min-w-[380px] md:shrink-0
          h-full
          bg-bg-primary
          md:border-l md:border-border
          flex flex-col
        "
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-semibold text-text-primary flex-1">
            {t('artifacts.title', 'Artifacts')}
          </span>
          <button
            data-testid="artifacts-close"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors"
            title={t('common.close', 'Close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs — horizontal scrolling */}
        {artifacts.length > 1 && (
          <div className="flex gap-1 px-4 py-2 border-b border-border overflow-x-auto shrink-0 scrollbar-hide">
            {artifacts.map((a) => (
              <button
                key={a.id}
                data-testid={`artifact-tab-${a.id}`}
                onClick={() => onSelectArtifact(a.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors border ${
                  a.id === (activeArtifactId ?? artifacts[0]?.id)
                    ? 'border-accent text-accent bg-accent/5'
                    : 'border-transparent text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {getArtifactIcon(a.type)}
                <span className="truncate max-w-[120px]">{a.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content — scrollable */}
        <div data-testid="artifact-content" className="flex-1 overflow-auto min-h-0">
          {active && (
            <div className="p-4 sm:p-5">
              <ArtifactRenderer artifact={active} />
            </div>
          )}
        </div>

        {/* Footer — always visible */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border shrink-0 bg-bg-primary">
          <button
            data-testid="artifact-copy"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <Copy size={12} />
            {t('artifacts.copy', 'Copy')}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-bg-tertiary rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <Download size={12} />
            {t('artifacts.download', 'Download')}
          </button>
          {active && (
            <span className="text-xs text-text-tertiary ml-auto">
              {active.type}{active.language ? ` (${active.language})` : ''}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function ArtifactRenderer({ artifact }: { artifact: ParsedArtifact }) {
  switch (artifact.type) {
    case 'markdown':
      return (
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <Markdown content={artifact.content} />
        </article>
      );
    case 'code':
      return (
        <pre className="text-sm font-mono bg-bg-secondary rounded-lg p-4 overflow-auto">
          <code>{artifact.content}</code>
        </pre>
      );
    case 'html':
      return (
        <iframe
          data-testid="artifact-iframe"
          sandbox="allow-scripts"
          srcDoc={artifact.content}
          className="w-full rounded-lg bg-white border border-border"
          style={{ minHeight: '400px', height: '60vh' }}
          title={artifact.title}
        />
      );
    case 'svg':
      return (
        <div
          className="flex items-center justify-center p-4 bg-white rounded-lg border border-border"
          dangerouslySetInnerHTML={{ __html: artifact.content }}
        />
      );
    case 'mermaid':
      return <MermaidRenderer content={artifact.content} />;
  }
}

function MermaidRenderer({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvgHtml(null);
    setError(null);

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, theme: 'dark' });
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, content);
        if (!cancelled) setSvgHtml(svg);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to render mermaid diagram');
      }
    })();

    return () => { cancelled = true; };
  }, [content]);

  if (error) {
    return (
      <div>
        <div className="text-xs text-error mb-2">Mermaid render error: {error}</div>
        <pre className="text-sm font-mono bg-bg-secondary rounded-lg p-4 overflow-auto">
          <code>{content}</code>
        </pre>
      </div>
    );
  }

  if (!svgHtml) {
    return (
      <div data-testid="mermaid-loading" className="flex items-center justify-center p-8 bg-bg-secondary rounded-lg">
        <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="mermaid-rendered"
      className="flex items-center justify-center p-4 bg-white rounded-lg border border-border overflow-auto"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
