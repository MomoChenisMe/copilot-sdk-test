import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolRecord } from '../../../src/components/copilot/ToolRecord';
import type { ToolRecord as ToolRecordType } from '../../../src/store/index';

const makeRecord = (overrides: Partial<ToolRecordType> = {}): ToolRecordType => ({
  toolCallId: 'tc-1',
  toolName: 'read_file',
  status: 'running',
  ...overrides,
});

describe('ToolRecord', () => {
  it('renders tool name in monospace', () => {
    render(<ToolRecord record={makeRecord()} />);
    const nameEl = screen.getByText('read_file');
    expect(nameEl.className).toContain('font-mono');
  });

  it('shows spinner when status is running', () => {
    const { container } = render(<ToolRecord record={makeRecord({ status: 'running' })} />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('shows green checkmark when status is success', () => {
    render(<ToolRecord record={makeRecord({ status: 'success' })} />);
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('shows red cross when status is error', () => {
    render(<ToolRecord record={makeRecord({ status: 'error', error: 'File not found' })} />);
    expect(screen.getByText('✗')).toBeTruthy();
  });

  it('is collapsed by default', () => {
    render(<ToolRecord record={makeRecord({ arguments: { path: '/test' } })} />);
    expect(screen.queryByText('Arguments')).toBeNull();
  });

  it('expands to show arguments and result when clicked', () => {
    render(
      <ToolRecord
        record={makeRecord({
          status: 'success',
          arguments: { path: '/test.ts' },
          result: 'file contents here',
        })}
      />
    );
    // Click to expand
    fireEvent.click(screen.getByText('read_file'));
    expect(screen.getByText('Arguments')).toBeTruthy();
    expect(screen.getByText('Result')).toBeTruthy();
  });

  it('shows error in expanded view', () => {
    render(
      <ToolRecord
        record={makeRecord({
          status: 'error',
          error: 'Permission denied',
        })}
      />
    );
    fireEvent.click(screen.getByText('read_file'));
    expect(screen.getByText('Error')).toBeTruthy();
    expect(screen.getByText('Permission denied')).toBeTruthy();
  });

  it('has subtle background (tool-card-bg)', () => {
    const { container } = render(<ToolRecord record={makeRecord()} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-tool-card-bg');
  });

  it('renders multiple tool records independently', () => {
    const { container } = render(
      <div>
        <ToolRecord record={makeRecord({ toolCallId: 'tc-1', toolName: 'read_file' })} />
        <ToolRecord record={makeRecord({ toolCallId: 'tc-2', toolName: 'write_file', status: 'success' })} />
        <ToolRecord record={makeRecord({ toolCallId: 'tc-3', toolName: 'exec_cmd', status: 'error' })} />
      </div>
    );
    expect(screen.getByText('read_file')).toBeTruthy();
    expect(screen.getByText('write_file')).toBeTruthy();
    expect(screen.getByText('exec_cmd')).toBeTruthy();
  });
});
