import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CwdSelector } from '../../../src/components/copilot/CwdSelector';

// Mock the API for DirectoryPicker
vi.mock('../../../src/lib/api', () => ({
  directoryApi: {
    list: vi.fn().mockResolvedValue({
      currentPath: '/home/user/projects',
      parentPath: '/home/user',
      directories: [
        { name: 'alpha', path: '/home/user/projects/alpha' },
        { name: 'beta', path: '/home/user/projects/beta' },
      ],
    }),
  },
}));

describe('CwdSelector', () => {
  const defaultProps = {
    currentCwd: '/home/user/projects',
    onCwdChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pill with FolderOpen icon and path text', () => {
    render(<CwdSelector {...defaultProps} />);
    expect(screen.getByText('/home/user/projects')).toBeTruthy();
    expect(screen.getByTestId('cwd-selector')).toBeTruthy();
  });

  it('truncates path longer than 25 characters', () => {
    render(<CwdSelector {...defaultProps} currentCwd="/very/long/path/to/my/awesome/project/directory" />);
    const pill = screen.getByTestId('cwd-selector');
    expect(pill.textContent).toContain('...');
    expect(pill.getAttribute('title')).toBe('/very/long/path/to/my/awesome/project/directory');
  });

  it('does not truncate path with 25 or fewer characters', () => {
    render(<CwdSelector {...defaultProps} currentCwd="/home/user/projects" />);
    const pill = screen.getByTestId('cwd-selector');
    expect(pill.textContent).not.toContain('...');
  });

  it('opens DirectoryPicker popover on click', async () => {
    render(<CwdSelector {...defaultProps} />);
    fireEvent.click(screen.getByTestId('cwd-selector'));

    await waitFor(() => {
      expect(screen.getByTestId('directory-picker')).toBeInTheDocument();
    });
  });

  it('closes DirectoryPicker after selection', async () => {
    const onCwdChange = vi.fn();
    render(<CwdSelector {...defaultProps} onCwdChange={onCwdChange} />);
    fireEvent.click(screen.getByTestId('cwd-selector'));

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    // Hover over alpha to highlight it (mouseEnter sets selectedIndex)
    fireEvent.mouseEnter(screen.getByTestId('directory-item-alpha'));
    // Click "Select" button to select the highlighted directory
    fireEvent.click(screen.getByTestId('directory-select'));

    expect(onCwdChange).toHaveBeenCalledWith('/home/user/projects/alpha');
    // Picker should close
    await waitFor(() => {
      expect(screen.queryByTestId('directory-picker')).not.toBeInTheDocument();
    });
  });

  it('closes DirectoryPicker when clicking outside', async () => {
    render(
      <div data-testid="outside">
        <CwdSelector {...defaultProps} />
      </div>,
    );
    fireEvent.click(screen.getByTestId('cwd-selector'));

    await waitFor(() => {
      expect(screen.getByTestId('directory-picker')).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByTestId('directory-picker')).not.toBeInTheDocument();
    });
  });

  it('uses pill styling', () => {
    render(<CwdSelector {...defaultProps} />);
    const pill = screen.getByTestId('cwd-selector');
    expect(pill.className).toContain('text-xs');
    expect(pill.className).toContain('rounded-lg');
  });

  // --- Mode toggle ---

  it('renders AI/Bash mode toggle buttons when mode and onModeChange are provided', () => {
    render(
      <CwdSelector
        {...defaultProps}
        mode="copilot"
        onModeChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('mode-toggle-copilot')).toBeTruthy();
    expect(screen.getByTestId('mode-toggle-terminal')).toBeTruthy();
  });

  it('highlights copilot button when mode is copilot', () => {
    render(
      <CwdSelector
        {...defaultProps}
        mode="copilot"
        onModeChange={vi.fn()}
      />,
    );
    const copilotBtn = screen.getByTestId('mode-toggle-copilot');
    expect(copilotBtn.className).toContain('bg-accent');
  });

  it('highlights terminal button when mode is terminal', () => {
    render(
      <CwdSelector
        {...defaultProps}
        mode="terminal"
        onModeChange={vi.fn()}
      />,
    );
    const terminalBtn = screen.getByTestId('mode-toggle-terminal');
    expect(terminalBtn.className).toContain('bg-accent');
  });

  it('calls onModeChange when clicking mode buttons', () => {
    const onModeChange = vi.fn();
    render(
      <CwdSelector
        {...defaultProps}
        mode="copilot"
        onModeChange={onModeChange}
      />,
    );
    fireEvent.click(screen.getByTestId('mode-toggle-terminal'));
    expect(onModeChange).toHaveBeenCalledWith('terminal');
  });

  it('does NOT render mode toggle when mode/onModeChange not provided', () => {
    render(<CwdSelector {...defaultProps} />);
    expect(screen.queryByTestId('mode-toggle-copilot')).toBeNull();
    expect(screen.queryByTestId('mode-toggle-terminal')).toBeNull();
  });
});
