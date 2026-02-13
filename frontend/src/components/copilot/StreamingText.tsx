interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

export function StreamingText({ text, isStreaming }: StreamingTextProps) {
  return (
    <div className="whitespace-pre-wrap break-words text-text-primary">
      {text}
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse" />
      )}
    </div>
  );
}
