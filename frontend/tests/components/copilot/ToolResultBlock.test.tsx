import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolResultBlock } from '../../../src/components/copilot/ToolResultBlock';

describe('ToolResultBlock', () => {
  it('renders string result as code block', () => {
    render(<ToolResultBlock result="hello world" toolName="bash" />);
    const pre = screen.getByTestId('tool-result-block');
    expect(pre).toBeTruthy();
    expect(pre.textContent).toContain('hello world');
  });

  it('renders object result with content property', () => {
    render(
      <ToolResultBlock
        result={{ content: 'file contents here' }}
        toolName="bash"
      />
    );
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('file contents here');
  });

  it('renders object result with detailedContent property', () => {
    render(
      <ToolResultBlock
        result={{ detailedContent: 'detailed output' }}
        toolName="bash"
      />
    );
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('detailed output');
  });

  // CRITICAL FIX: detailedContent must take priority over content
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

  it('renders null result as empty', () => {
    const { container } = render(<ToolResultBlock result={null} toolName="bash" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders undefined result as empty', () => {
    const { container } = render(<ToolResultBlock result={undefined} toolName="bash" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders with pre element for code-like output', () => {
    render(<ToolResultBlock result="echo hi" toolName="bash" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.tagName.toLowerCase()).toBe('pre');
  });

  // CRITICAL FIX: max-h-96 per spec
  it('uses max-h-96 for overflow constraint', () => {
    render(<ToolResultBlock result="some output" toolName="bash" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.className).toContain('max-h-96');
  });

  // CRITICAL FIX: long output truncation with expand button
  it('truncates output over 500 lines and shows expand button', () => {
    const longText = Array.from({ length: 600 }, (_, i) => `line ${i + 1}`).join('\n');
    render(<ToolResultBlock result={longText} toolName="bash" />);
    const block = screen.getByTestId('tool-result-block');
    // Should show only first 200 lines
    expect(block.textContent).toContain('line 1');
    expect(block.textContent).toContain('line 200');
    expect(block.textContent).not.toContain('line 201');
    // Should show expand button
    const expandBtn = screen.getByTestId('tool-result-expand');
    expect(expandBtn).toBeTruthy();
  });

  it('shows full output after clicking expand button', () => {
    const longText = Array.from({ length: 600 }, (_, i) => `line ${i + 1}`).join('\n');
    render(<ToolResultBlock result={longText} toolName="bash" />);
    const expandBtn = screen.getByTestId('tool-result-expand');
    fireEvent.click(expandBtn);
    const block = screen.getByTestId('tool-result-block');
    expect(block.textContent).toContain('line 600');
  });

  it('does NOT show expand button for short output', () => {
    const shortText = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
    render(<ToolResultBlock result={shortText} toolName="bash" />);
    expect(screen.queryByTestId('tool-result-expand')).toBeNull();
  });

  // WARNING FIX: error status styling
  it('applies error styling when status is error', () => {
    render(<ToolResultBlock result="command failed" toolName="bash" status="error" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.className).toContain('text-error');
  });

  it('does NOT apply error styling when status is success', () => {
    render(<ToolResultBlock result="ok" toolName="bash" status="success" />);
    const block = screen.getByTestId('tool-result-block');
    expect(block.className).not.toContain('text-error');
  });
});
