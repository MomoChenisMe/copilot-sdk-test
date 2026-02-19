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
    const pill = screen.getByTestId('cwd-selector');
    expect(pill).toBeTruthy();
    // Full path text is split between parent and last spans
    expect(pill.textContent).toContain('projects');
  });

  it('shows full path in title attribute for long paths', () => {
    render(<CwdSelector {...defaultProps} currentCwd="/very/long/path/to/my/awesome/project/directory" />);
    const pill = screen.getByTestId('cwd-selector');
    expect(pill.getAttribute('title')).toBe('/very/long/path/to/my/awesome/project/directory');
    // Last segment is always visible
    expect(screen.getByTestId('cwd-path-last').textContent).toBe('directory');
  });

  it('hides parent path on mobile via hidden md:inline', () => {
    render(<CwdSelector {...defaultProps} currentCwd="/home/user/projects" />);
    const parent = screen.getByTestId('cwd-path-parent');
    expect(parent.className).toContain('hidden');
    expect(parent.className).toContain('md:inline');
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

  // --- Mobile path truncation ---

  it('renders last directory name always visible and parent path hidden on mobile', () => {
    render(<CwdSelector {...defaultProps} currentCwd="/home/user/projects" />);
    // The last segment "projects" should always be visible
    const lastSegment = screen.getByTestId('cwd-path-last');
    expect(lastSegment.textContent).toBe('projects');
    // The parent path prefix should be hidden on mobile via hidden md:inline
    const parentPath = screen.getByTestId('cwd-path-parent');
    expect(parentPath.className).toContain('hidden');
    expect(parentPath.className).toContain('md:inline');
  });

  it('shows only root name when path is a single segment', () => {
    render(<CwdSelector {...defaultProps} currentCwd="/" />);
    const lastSegment = screen.getByTestId('cwd-path-last');
    expect(lastSegment.textContent).toBe('/');
  });
});
