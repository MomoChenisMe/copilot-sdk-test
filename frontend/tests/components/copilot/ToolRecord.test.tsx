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

  it('shows Check icon when status is success', () => {
    const { container } = render(<ToolRecord record={makeRecord({ status: 'success' })} />);
    const checkIcon = container.querySelector('.lucide-check');
    expect(checkIcon).toBeTruthy();
  });

  it('shows X icon when status is error', () => {
    const { container } = render(<ToolRecord record={makeRecord({ status: 'error', error: 'File not found' })} />);
    const xIcon = container.querySelector('.lucide-x');
    expect(xIcon).toBeTruthy();
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

  it('has rounded-xl border card style', () => {
    const { container } = render(<ToolRecord record={makeRecord()} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-xl');
    expect(card.className).toContain('border-border');
  });

  it('renders multiple tool records independently', () => {
    render(
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
