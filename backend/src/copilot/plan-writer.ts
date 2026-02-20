import fs from 'node:fs';
import path from 'node:path';

export function writePlanFile(cwd: string, content: string, topic: string): string {
  const timestamp = new Date().toISOString().slice(0, 10); // 2026-02-19
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'plan';
  const dir = path.join(cwd, '.codeforge', 'plans');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${timestamp}-${slug}.md`);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export function extractTopicFromContent(content: string): string {
  // Try to extract first heading or first line as topic
  const headingMatch = content.match(/^#\s+(.+)/m);
  if (headingMatch) return headingMatch[1].trim();
  const firstLine = content.split('\n')[0]?.trim();
  return firstLine?.slice(0, 50) || 'plan';
}
