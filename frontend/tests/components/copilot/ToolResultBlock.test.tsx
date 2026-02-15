import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolResultBlock } from '../../../src/components/copilot/ToolResultBlock';

describe('ToolResultBlock', () => {
  // === Content extraction ===

  it('renders string result', () => {
    render(<ToolResultBlock result="hello world" toolName="bash" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('hello world');
  });

  it('renders object result with content property', () => {
    render(
      <ToolResultBlock result={{ content: 'file contents here' }} toolName="bash" />
    );
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('file contents here');
  });

  it('renders object result with detailedContent property', () => {
    render(
      <ToolResultBlock result={{ detailedContent: 'detailed output' }} toolName="bash" />
    );
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('detailed output');
  });

  it('prioritizes detailedContent over content when both exist', () => {
    render(
      <ToolResultBlock
        result={{ content: 'short', detailedContent: 'detailed version' }}
        toolName="bash"
      />
    );
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('detailed version');
    expect(block.textContent).not.toContain('short');
  });

  it('renders fallback for non-string/non-object result', () => {
    render(<ToolResultBlock result={42} toolName="bash" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('42');
  });

  // === Null / undefined ===

  it('renders null result as empty', () => {
    const { container } = render(<ToolResultBlock result={null} toolName="bash" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders undefined result as empty', () => {
    const { container } = render(<ToolResultBlock result={undefined} toolName="bash" />);
    expect(container.firstChild).toBeNull();
  });

  // === Running status ===

  it('does NOT render when status is running', () => {
    const { container } = render(
      <ToolResultBlock result="partial" toolName="bash" status="running" />
    );
    expect(container.firstChild).toBeNull();
  });

  // === Truncation ===

  it('truncates output over 500 lines and shows expand button', () => {
    const longText = Array.from({ length: 600 }, (_, i) => `line ${i + 1}`).join('\n');
    render(<ToolResultBlock result={longText} toolName="bash" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('line 1');
    expect(block.textContent).toContain('line 200');
    expect(block.textContent).not.toContain('line 201');
    const expandBtn = screen.getByTestId('tool-result-expand');
    expect(expandBtn).toBeTruthy();
  });

  it('shows full output after clicking expand button', () => {
    const longText = Array.from({ length: 600 }, (_, i) => `line ${i + 1}`).join('\n');
    render(<ToolResultBlock result={longText} toolName="bash" />);
    fireEvent.click(screen.getByTestId('tool-result-expand'));
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('line 600');
  });

  it('does NOT show expand button for short output', () => {
    const shortText = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
    render(<ToolResultBlock result={shortText} toolName="bash" />);
    expect(screen.queryByTestId('tool-result-expand')).toBeNull();
  });

  it('shows collapse text after expanding', () => {
    const longText = Array.from({ length: 600 }, (_, i) => `line ${i + 1}`).join('\n');
    render(<ToolResultBlock result={longText} toolName="bash" status="success" />);
    fireEvent.click(screen.getByTestId('tool-result-expand'));
    const collapseBtn = screen.getByTestId('tool-result-expand');
    expect(collapseBtn.textContent).toMatch(/收合|collapse/i);
  });

  // === Error styling ===

  it('applies error border when status is error', () => {
    render(<ToolResultBlock result="command failed" toolName="bash" status="error" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.className).toContain('border-l-error');
  });

  it('renders error text with error color', () => {
    render(<ToolResultBlock result="Error: something went wrong" toolName="bash" status="error" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('Error: something went wrong');
    // Error text is rendered inside a pre with text-error
    const pre = block.querySelector('pre');
    expect(pre?.className).toContain('text-error');
  });

  // === Markdown rendering (success path) ===

  it('renders success result through Markdown component as a code block', () => {
    render(<ToolResultBlock result="echo hello" toolName="bash" status="success" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('echo hello');
    // Should contain a code element from Markdown rendering
    expect(block.querySelector('code')).toBeTruthy();
  });

  it('renders without status (defaults to success path)', () => {
    render(<ToolResultBlock result="output text" toolName="bash" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('output text');
    expect(block.querySelector('code')).toBeTruthy();
  });
});
