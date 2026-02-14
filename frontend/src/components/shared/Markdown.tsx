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
      <code className="bg-bg-tertiary text-accent px-1.5 py-0.5 rounded-md text-[13px] font-mono" {...props}>
        {children}
      </code>
    );
  }

  // Fix language extraction: className may be "hljs language-python"
  const lang = className?.split(/\s+/).find(c => c.startsWith('language-'))?.replace('language-', '') || '';

  return (
    <div className="rounded-xl overflow-hidden border border-border my-4">
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
      <pre className="bg-code-bg p-4 overflow-x-auto">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
}

const components: Components = {
  code: CodeBlock as Components['code'],
  pre: ({ children }) => <div className="group">{children}</div>,
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
