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
