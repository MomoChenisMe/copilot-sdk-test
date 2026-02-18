import { describe, it, expect } from 'vitest';
import { parseArtifacts, parseToolArtifacts, type ParsedArtifact } from '../../src/lib/artifact-parser';

describe('artifact-parser', () => {
  it('should parse a markdown artifact', () => {
    const content = '```artifact type="markdown" title="My Doc"\n# Hello\nSome content\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('markdown');
    expect(artifacts[0].title).toBe('My Doc');
    expect(artifacts[0].content).toBe('# Hello\nSome content');
  });

  it('should parse a code artifact with language', () => {
    const content = '```artifact type="code" title="Example" language="typescript"\nconst x = 1;\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('code');
    expect(artifacts[0].title).toBe('Example');
    expect(artifacts[0].language).toBe('typescript');
    expect(artifacts[0].content).toBe('const x = 1;');
  });

  it('should parse an html artifact', () => {
    const content = '```artifact type="html" title="My Page"\n<div>Hello</div>\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('html');
    expect(artifacts[0].content).toBe('<div>Hello</div>');
  });

  it('should parse an svg artifact', () => {
    const content = '```artifact type="svg" title="Icon"\n<svg><circle cx="50" cy="50" r="40"/></svg>\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('svg');
  });

  it('should parse a mermaid artifact', () => {
    const content = '```artifact type="mermaid" title="Flow"\ngraph TD\n  A --> B\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('mermaid');
    expect(artifacts[0].content).toBe('graph TD\n  A --> B');
  });

  it('should parse multiple artifacts from one message', () => {
    const content = [
      'Some text before',
      '```artifact type="markdown" title="Doc1"',
      '# First',
      '```',
      'Middle text',
      '```artifact type="code" title="Code1" language="python"',
      'print("hello")',
      '```',
      'End text',
    ].join('\n');
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0].title).toBe('Doc1');
    expect(artifacts[1].title).toBe('Code1');
    expect(artifacts[1].language).toBe('python');
  });

  it('should return empty array when no artifacts found', () => {
    const content = 'Just a plain message with no artifacts.\n```js\nconsole.log("hi")\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(0);
  });

  it('should generate unique ids for each artifact', () => {
    const content = '```artifact type="markdown" title="A"\nfoo\n```\n```artifact type="markdown" title="B"\nbar\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0].id).toBeDefined();
    expect(artifacts[1].id).toBeDefined();
    expect(artifacts[0].id).not.toBe(artifacts[1].id);
  });

  it('should handle artifact with single quotes in attributes', () => {
    const content = "```artifact type='code' title='Test' language='js'\nalert(1)\n```";
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('code');
    expect(artifacts[0].title).toBe('Test');
  });

  it('should handle content with backticks inside artifact', () => {
    const content = '````artifact type="code" title="Nested"\nconst a = `hello`;\n````';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].content).toBe('const a = `hello`;');
  });

  // Standard code block detection tests
  it('should detect standard html code blocks as artifacts', () => {
    const htmlContent = '<html>\n<head><title>Test Page</title></head>\n<body><h1>Hello World</h1></body>\n</html>';
    const content = '```html\n' + htmlContent + '\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('html');
    expect(artifacts[0].content).toBe(htmlContent);
    expect(artifacts[0].language).toBe('html');
  });

  it('should detect standard svg code blocks as artifacts', () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="40" fill="red"/>\n</svg>';
    const content = '```svg\n' + svgContent + '\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('svg');
    expect(artifacts[0].language).toBe('svg');
  });

  it('should detect standard mermaid code blocks as artifacts', () => {
    const mermaidContent = 'graph TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[End Success]\n  B -->|No| D[End Failure]';
    const content = '```mermaid\n' + mermaidContent + '\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('mermaid');
    expect(artifacts[0].language).toBe('mermaid');
  });

  it('should NOT detect short standard code blocks as artifacts', () => {
    const content = '```html\n<div>Hi</div>\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(0); // Too short (< 50 chars)
  });

  it('should NOT detect non-artifact languages as artifacts', () => {
    const longJs = 'const x = 1;\n'.repeat(10);
    const content = '```javascript\n' + longJs + '\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(0); // javascript is not an artifact language
  });

  it('should prioritize explicit artifact format over standard code block', () => {
    const content = '```artifact type="html" title="My Page"\n<div>Explicit artifact content here for testing purposes</div>\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].title).toBe('My Page');
    // Should use the explicit title, not auto-generated
  });

  it('should detect standard markdown code blocks as artifacts', () => {
    const mdContent = '# Pascal Triangle\n\nThe Pascal Triangle is a triangular array of binomial coefficients.\n\n## Properties\n\n- Each number is the sum of the two numbers above it.';
    const content = '```markdown\n' + mdContent + '\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('markdown');
    expect(artifacts[0].language).toBe('markdown');
  });

  it('should detect ```md code blocks as markdown artifacts', () => {
    const mdContent = '# Hello World\n\nThis is a markdown document with enough content to be detected.';
    const content = '```md\n' + mdContent + '\n```';
    const artifacts = parseArtifacts(content);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('markdown');
    expect(artifacts[0].language).toBe('md');
  });
});

describe('parseToolArtifacts', () => {
  it('should extract artifact from successful create tool with .md file', () => {
    const records = [
      {
        toolName: 'create',
        arguments: { path: '/home/user/notes.md', file_text: '# My Notes\n\nThis is a longer document with enough content to be detected as an artifact.' },
        status: 'success',
      },
    ];
    const artifacts = parseToolArtifacts(records);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('markdown');
    expect(artifacts[0].title).toBe('notes.md');
    expect(artifacts[0].content).toContain('# My Notes');
  });

  it('should extract artifact from create tool with .html file', () => {
    const records = [
      {
        toolName: 'create',
        arguments: { path: '/home/user/page.html', file_text: '<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>' },
        status: 'success',
      },
    ];
    const artifacts = parseToolArtifacts(records);
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('html');
    expect(artifacts[0].title).toBe('page.html');
  });

  it('should NOT extract artifact from failed create tool', () => {
    const records = [
      {
        toolName: 'create',
        arguments: { path: '/root/test.md', file_text: '# Content that is long enough to be an artifact but the tool failed.' },
        status: 'error',
      },
    ];
    const artifacts = parseToolArtifacts(records);
    expect(artifacts).toHaveLength(0);
  });

  it('should NOT extract artifact from non-create tools', () => {
    const records = [
      {
        toolName: 'bash',
        arguments: { command: 'echo hello' },
        status: 'success',
      },
    ];
    const artifacts = parseToolArtifacts(records);
    expect(artifacts).toHaveLength(0);
  });

  it('should NOT extract artifact from unsupported file extensions', () => {
    const records = [
      {
        toolName: 'create',
        arguments: { path: '/home/user/script.py', file_text: '# This is a python script with enough content to pass the length check' },
        status: 'success',
      },
    ];
    const artifacts = parseToolArtifacts(records);
    expect(artifacts).toHaveLength(0);
  });

  it('should NOT extract artifact from short file content', () => {
    const records = [
      {
        toolName: 'create',
        arguments: { path: '/home/user/short.md', file_text: '# Short' },
        status: 'success',
      },
    ];
    const artifacts = parseToolArtifacts(records);
    expect(artifacts).toHaveLength(0);
  });
});
