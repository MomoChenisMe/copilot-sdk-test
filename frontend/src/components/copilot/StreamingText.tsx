import { Markdown } from '../shared/Markdown';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  if (!text && !isStreaming) return null;

  return (
    <div className="text-text-primary">
      {text && <Markdown content={text} />}
      {isStreaming && (
        <span className="inline-block text-accent animate-pulse">█</span>
      )}
    </div>
  );
}
