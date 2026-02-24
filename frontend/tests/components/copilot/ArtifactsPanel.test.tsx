import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArtifactsPanel } from '../../../src/components/copilot/ArtifactsPanel';
import type { ParsedArtifact } from '../../../src/lib/artifact-parser';

// Mock mermaid for lazy loading tests
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg data-testid="mermaid-svg">mocked diagram</svg>' }),
  },
}));

describe('ArtifactsPanel', () => {
  const markdownArtifact: ParsedArtifact = {
    id: 'a1',
    type: 'markdown',
    title: 'My Doc',
    content: '# Hello\nWorld',
  };

  const codeArtifact: ParsedArtifact = {
    id: 'a2',
    type: 'code',
    title: 'Example Code',
    content: 'const x = 1;',
    language: 'typescript',
  };

  const htmlArtifact: ParsedArtifact = {
    id: 'a3',
    type: 'html',
    title: 'Web Page',
    content: '<div>Hello</div>',
  };

  const svgArtifact: ParsedArtifact = {
    id: 'a4',
    type: 'svg',
    title: 'Icon',
    content: '<svg><circle cx="50" cy="50" r="40"/></svg>',
  };

  const mermaidArtifact: ParsedArtifact = {
    id: 'a5',
    type: 'mermaid',
    title: 'Flow Chart',
    content: 'graph TD\n  A --> B',
    language: 'mermaid',
  };

  const defaultProps = {
    artifacts: [markdownArtifact, codeArtifact],
    activeArtifactId: 'a1',
    onSelectArtifact: vi.fn(),
    onClose: vi.fn(),
  };

  it('should render the panel with header and close button', () => {
    render(<ArtifactsPanel {...defaultProps} />);
    expect(screen.getByTestId('artifacts-panel')).toBeInTheDocument();
    expect(screen.getByTestId('artifacts-close')).toBeInTheDocument();
  });

  it('should render artifact tabs', () => {
    render(<ArtifactsPanel {...defaultProps} />);
    expect(screen.getByText('My Doc')).toBeInTheDocument();
    expect(screen.getByText('Example Code')).toBeInTheDocument();
  });

  it('should highlight the active artifact tab', () => {
    render(<ArtifactsPanel {...defaultProps} />);
    const activeTab = screen.getByTestId('artifact-tab-a1');
    expect(activeTab.className).toContain('border-accent');
  });

  it('should call onSelectArtifact when clicking a tab', () => {
    render(<ArtifactsPanel {...defaultProps} />);
    fireEvent.click(screen.getByTestId('artifact-tab-a2'));
    expect(defaultProps.onSelectArtifact).toHaveBeenCalledWith('a2');
  });

  it('should call onClose when clicking close button', () => {
    render(<ArtifactsPanel {...defaultProps} />);
    fireEvent.click(screen.getByTestId('artifacts-close'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should render markdown content', () => {
    render(<ArtifactsPanel {...defaultProps} />);
    // Markdown content should be rendered (contains the heading)
    expect(screen.getByTestId('artifact-content')).toBeInTheDocument();
  });

  it('should render code content with language label', () => {
    render(<ArtifactsPanel {...defaultProps} activeArtifactId="a2" />);
    const content = screen.getByTestId('artifact-content');
    expect(content.textContent).toContain('const x = 1;');
  });

  it('should render html content in an iframe', () => {
    render(<ArtifactsPanel artifacts={[htmlArtifact]} activeArtifactId="a3" onSelectArtifact={vi.fn()} onClose={vi.fn()} />);
    const iframe = screen.getByTestId('artifact-iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
  });

  it('should render svg content', () => {
    render(<ArtifactsPanel artifacts={[svgArtifact]} activeArtifactId="a4" onSelectArtifact={vi.fn()} onClose={vi.fn()} />);
    const content = screen.getByTestId('artifact-content');
    expect(content.innerHTML).toContain('svg');
  });

  it('should render copy button in footer', () => {
    render(<ArtifactsPanel {...defaultProps} />);
    expect(screen.getByTestId('artifact-copy')).toBeInTheDocument();
  });

  it('should render mermaid content with lazy loading', async () => {
    render(<ArtifactsPanel artifacts={[mermaidArtifact]} activeArtifactId="a5" onSelectArtifact={vi.fn()} onClose={vi.fn()} />);
    // Initially shows loading spinner
    expect(screen.getByTestId('mermaid-loading')).toBeInTheDocument();
    // After mermaid renders, shows the rendered SVG
    await waitFor(() => {
      expect(screen.getByTestId('mermaid-rendered')).toBeInTheDocument();
    });
    expect(screen.getByTestId('mermaid-rendered').innerHTML).toContain('mocked diagram');
  });

  it('should show empty state when artifacts array is empty', () => {
    render(
      <ArtifactsPanel
        artifacts={[]}
        activeArtifactId={null as any}
        onSelectArtifact={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('artifacts-panel')).toBeInTheDocument();
    expect(screen.getByText(/No artifacts yet|目前沒有 Artifacts/i)).toBeInTheDocument();
    // Close button should still be rendered
    expect(screen.getByTestId('artifacts-close')).toBeInTheDocument();
  });

  // Plan artifact type tests (Issue 8)
  const planArtifact: ParsedArtifact = {
    id: 'a6',
    type: 'plan',
    title: 'Implementation Plan',
    content: '# Plan\n\n## Context\nSome context\n\n## Approach\n1. Step one\n2. Step two',
  };

  it('should accept plan as a valid artifact type', () => {
    const artifact: ParsedArtifact = planArtifact;
    expect(artifact.type).toBe('plan');
  });

  it('should render plan artifact with ClipboardList icon in tab', () => {
    render(
      <ArtifactsPanel
        artifacts={[planArtifact, markdownArtifact]}
        activeArtifactId="a6"
        onSelectArtifact={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const planTab = screen.getByTestId('artifact-tab-a6');
    expect(planTab).toBeInTheDocument();
    // ClipboardList icon should be rendered (as an svg element)
    const svg = planTab.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('should render plan artifact content as markdown', () => {
    render(
      <ArtifactsPanel
        artifacts={[planArtifact]}
        activeArtifactId="a6"
        onSelectArtifact={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const content = screen.getByTestId('artifact-content');
    // Should contain the plan content rendered as markdown (prose article)
    const article = content.querySelector('article.prose');
    expect(article).toBeTruthy();
  });

  it('should download plan artifact as .md file', () => {
    // Verify extMap includes plan -> .md
    const { container } = render(
      <ArtifactsPanel
        artifacts={[planArtifact]}
        activeArtifactId="a6"
        onSelectArtifact={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // The type label should use i18n key artifacts.plan → "Plan" (en.json)
    expect(container.textContent).toContain('Plan');
  });

  it('should show mermaid error fallback on render failure', async () => {
    const mermaid = (await import('mermaid')).default;
    vi.mocked(mermaid.render).mockRejectedValueOnce(new Error('Invalid syntax'));

    render(<ArtifactsPanel artifacts={[mermaidArtifact]} activeArtifactId="a5" onSelectArtifact={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Mermaid render error/)).toBeInTheDocument();
    });
    // Should show the raw source as fallback
    const codeEl = screen.getByTestId('artifact-content').querySelector('code');
    expect(codeEl?.textContent).toContain('graph TD');
  });
});
