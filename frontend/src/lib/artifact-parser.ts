export interface ParsedArtifact {
  id: string;
  type: 'markdown' | 'code' | 'html' | 'svg' | 'mermaid';
  title: string;
  content: string;
  language?: string;
}

/**
 * Generate a stable, content-based ID so the same artifact always gets the same ID
 * even across re-renders / remounts.
 */
function stableId(type: string, title: string, content: string): string {
  // Use a simple hash of type+title+content prefix for stability
  const key = `${type}|${title}|${content.slice(0, 200)}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return `artifact-${(hash >>> 0).toString(36)}`;
}

function extractAttr(header: string, name: string): string | undefined {
  // Match name="value" or name='value'
  const re = new RegExp(`${name}=["']([^"']+)["']`);
  const match = header.match(re);
  return match?.[1];
}

// Map standard code block languages to artifact types
const ARTIFACT_LANGUAGE_MAP: Record<string, ParsedArtifact['type']> = {
  html: 'html',
  svg: 'svg',
  mermaid: 'mermaid',
  markdown: 'markdown',
  md: 'markdown',
};

// Map file extensions to artifact types
const FILE_EXT_MAP: Record<string, ParsedArtifact['type']> = {
  '.html': 'html',
  '.htm': 'html',
  '.svg': 'svg',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mermaid': 'mermaid',
  '.mmd': 'mermaid',
};

// Minimum content length to treat a standard code block as an artifact
const MIN_ARTIFACT_LENGTH = 50;

export function parseArtifacts(content: string): ParsedArtifact[] {
  const artifacts: ParsedArtifact[] = [];
  const consumedRanges: Array<[number, number]> = [];

  // 1. Match explicit ```artifact blocks (original format)
  const explicitRegex = /(`{3,})artifact\s+([^\n]+)\n([\s\S]*?)\n\1/g;
  let match: RegExpExecArray | null;

  while ((match = explicitRegex.exec(content)) !== null) {
    const header = match[2];
    const body = match[3];

    const type = extractAttr(header, 'type') as ParsedArtifact['type'] | undefined;
    const title = extractAttr(header, 'title') ?? 'Untitled';
    const language = extractAttr(header, 'language');

    if (!type) continue;

    consumedRanges.push([match.index, match.index + match[0].length]);
    artifacts.push({
      id: stableId(type, title, body),
      type,
      title,
      content: body,
      ...(language && { language }),
    });
  }

  // 2. Match standard code blocks with artifact-worthy languages (html, svg, mermaid, markdown, md)
  const standardRegex = /(`{3,})(html|svg|mermaid|markdown|md)\s*\n([\s\S]*?)\n\1/g;

  while ((match = standardRegex.exec(content)) !== null) {
    const start = match.index;
    const end = start + match[0].length;

    // Skip if this range overlaps with an already-consumed explicit artifact
    if (consumedRanges.some(([s, e]) => start >= s && start < e)) continue;

    const lang = match[2].toLowerCase();
    const body = match[3];

    // Only treat as artifact if content is substantial
    if (body.trim().length < MIN_ARTIFACT_LENGTH) continue;

    const type = ARTIFACT_LANGUAGE_MAP[lang];
    if (!type) continue;

    // Generate a title from the first meaningful line
    const firstLine = body.trim().split('\n')[0].slice(0, 40).trim();
    const title = lang.charAt(0).toUpperCase() + lang.slice(1) + (firstLine ? `: ${firstLine}` : '');

    artifacts.push({
      id: stableId(type, title, body),
      type,
      title,
      content: body,
      language: lang,
    });
  }

  return artifacts;
}

/**
 * Extract artifacts from tool records (e.g., when the SDK's `create` tool writes a file).
 * Looks at successful tool records with file content in their arguments.
 */
export function parseToolArtifacts(
  toolRecords: Array<{ toolName: string; arguments?: unknown; status: string }>,
): ParsedArtifact[] {
  const artifacts: ParsedArtifact[] = [];

  for (const record of toolRecords) {
    // Only process successful file-creation tools
    if (record.status !== 'success') continue;
    if (record.toolName !== 'create' && record.toolName !== 'write' && record.toolName !== 'write_file') continue;

    const args = record.arguments as Record<string, unknown> | undefined;
    if (!args) continue;

    // Extract file path and content from various argument formats
    const filePath = (args.path ?? args.file_path ?? args.filePath) as string | undefined;
    const fileText = (args.file_text ?? args.content ?? args.fileText) as string | undefined;

    if (!filePath || !fileText || fileText.trim().length < MIN_ARTIFACT_LENGTH) continue;

    // Determine artifact type from file extension
    const ext = filePath.includes('.') ? '.' + filePath.split('.').pop()!.toLowerCase() : '';
    const type = FILE_EXT_MAP[ext];
    if (!type) continue;

    // Generate title from filename
    const fileName = filePath.split('/').pop() ?? filePath;
    artifacts.push({
      id: stableId(type, fileName, fileText),
      type,
      title: fileName,
      content: fileText,
      language: ext.slice(1),
    });
  }

  return artifacts;
}
