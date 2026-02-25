export function extractTopicFromContent(content: string): string {
  // Try to extract first heading or first line as topic
  const headingMatch = content.match(/^#\s+(.+)/m);
  if (headingMatch) return headingMatch[1].trim();
  const firstLine = content.split('\n')[0]?.trim();
  return firstLine?.slice(0, 50) || 'plan';
}
