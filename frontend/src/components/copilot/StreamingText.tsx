import { Markdown } from '../shared/Markdown';

interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  if (!text) return null;

  return (
    <div className="text-text-primary text-sm leading-relaxed">
      {text && <Markdown content={text} />}
    </div>
  );
}
