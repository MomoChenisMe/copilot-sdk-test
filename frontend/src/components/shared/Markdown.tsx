import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';
import { Copy, Check } from 'lucide-react';

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
      <code className="bg-bg-tertiary text-text-primary px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  const lang = className?.replace('language-', '') || '';

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between px-3 py-1.5 bg-code-block-bg rounded-t-lg border-b border-border/30">
        <span className="text-xs text-text-muted font-mono">{lang}</span>
        <button
          onClick={handleCopy}
          className="text-text-muted hover:text-text-primary transition-colors p-1"
          aria-label={t('markdown.copyCode')}
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="bg-code-block-bg p-3 rounded-b-lg overflow-x-auto">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

const components: Components = {
  code: CodeBlock as Components['code'],
  pre: ({ children }) => <>{children}</>,
};

export function Markdown({ content }: MarkdownProps) {
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
