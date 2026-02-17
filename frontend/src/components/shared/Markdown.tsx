import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import { Copy, Check } from 'lucide-react';
import { useLightbox } from './LightboxContext';

interface MarkdownProps {
  content: string;
}

function CodeBlock({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const isInline = !className;

  const handleCopy = useCallback(() => {
    const text = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [children]);

  if (isInline) {
    return (
      <code className="bg-bg-tertiary text-accent px-1.5 py-0.5 rounded-md text-[13px] font-mono" {...props}>
        {children}
      </code>
    );
  }

  // Fix language extraction: className may be "hljs language-python"
  const lang = className?.split(/\s+/).find(c => c.startsWith('language-'))?.replace('language-', '') || '';

  return (
    <div className="group rounded-xl overflow-hidden border border-border my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-code-header-bg">
        <span className="text-xs text-text-muted font-mono">{lang}</span>
        <button
          onClick={handleCopy}
          className="text-text-muted hover:text-text-primary transition-colors p-1 opacity-0 group-hover:opacity-100"
          aria-label={t('markdown.copyCode')}
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="bg-code-bg px-4 py-3 overflow-x-auto">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export function Markdown({ content }: MarkdownProps) {
  const { openLightbox } = useLightbox();

  const components: Components = useMemo(() => ({
    code: CodeBlock as Components['code'],
    pre: ({ children }) => <>{children}</>,
    h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3 text-text-primary">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-2 text-text-primary">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-text-primary">{children}</h3>,
    h4: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-1 text-text-primary">{children}</h4>,
    table: ({ children }) => <table className="border-collapse w-full my-4 text-sm">{children}</table>,
    th: ({ children }) => <th className="border border-border px-3 py-2 bg-bg-tertiary text-left font-semibold text-text-primary">{children}</th>,
    td: ({ children }) => <td className="border border-border px-3 py-2 text-text-secondary">{children}</td>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-accent pl-4 my-4 italic text-text-muted">{children}</blockquote>,
    ul: ({ children }) => <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>,
    hr: () => <hr className="border-border my-6" />,
    a: ({ href, children }) => <a href={href} className="text-accent underline hover:text-accent-hover" target="_blank" rel="noopener noreferrer">{children}</a>,
    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt || ''}
        className="max-w-full rounded-lg my-2 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => src && openLightbox([{ src, alt: alt || '' }], 0)}
      />
    ),
  }), [openLightbox]);

  return (
    <div className="prose prose-sm max-w-none text-text-primary prose-headings:text-text-primary prose-a:text-accent prose-strong:text-text-primary prose-code:text-text-primary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
