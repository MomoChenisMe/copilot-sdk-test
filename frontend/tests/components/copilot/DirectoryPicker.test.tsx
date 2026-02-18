import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DirectoryPicker } from '../../../src/components/copilot/DirectoryPicker';

// Mock the API
vi.mock('../../../src/lib/api', () => ({
  directoryApi: {
    list: vi.fn(),
  },
}));

import { directoryApi } from '../../../src/lib/api';
const mockList = vi.mocked(directoryApi.list);

describe('DirectoryPicker', () => {
  const defaultProps = {
    currentPath: '/home/user/projects',
    onSelect: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      currentPath: '/home/user/projects',
      parentPath: '/home/user',
      directories: [
        { name: 'alpha', path: '/home/user/projects/alpha' },
        { name: 'beta', path: '/home/user/projects/beta' },
        { name: 'gamma', path: '/home/user/projects/gamma' },
      ],
    });
  });

  it('should render and load directories on mount', async () => {
    render(<DirectoryPicker {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
      expect(screen.getByText('beta')).toBeInTheDocument();
      expect(screen.getByText('gamma')).toBeInTheDocument();
    });

    expect(mockList).toHaveBeenCalledWith('/home/user/projects');
  });

  it('should display current path in header', async () => {
    render(<DirectoryPicker {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('/home/user/projects')).toBeInTheDocument();
    });
  });

  it('should filter directories by search input', async () => {
    render(<DirectoryPicker {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'al' } });

    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.queryByText('beta')).not.toBeInTheDocument();
    expect(screen.queryByText('gamma')).not.toBeInTheDocument();
  });

  it('should navigate to parent directory when ".." is clicked', async () => {
    render(<DirectoryPicker {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    // Click parent button
    const parentBtn = screen.getByTestId('directory-parent');
    fireEvent.click(parentBtn);

    expect(mockList).toHaveBeenCalledWith('/home/user');
  });

  it('should navigate into a directory on single click', async () => {
    mockList
      .mockResolvedValueOnce({
        currentPath: '/home/user/projects',
        parentPath: '/home/user',
        directories: [
          { name: 'alpha', path: '/home/user/projects/alpha' },
        ],
      })
      .mockResolvedValueOnce({
        currentPath: '/home/user/projects/alpha',
        parentPath: '/home/user/projects',
        directories: [
          { name: 'nested', path: '/home/user/projects/alpha/nested' },
        ],
      });

    render(<DirectoryPicker {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    // Single click navigates into the directory
    fireEvent.click(screen.getByText('alpha'));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith('/home/user/projects/alpha');
    });
  });

  it('should call onSelect with current path when "Use Current" is clicked', async () => {
    render(<DirectoryPicker {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    // Click "Use Current" to select the current browsePath
    const useCurrentBtn = screen.getByTestId('directory-use-current');
    fireEvent.click(useCurrentBtn);

    expect(defaultProps.onSelect).toHaveBeenCalledWith('/home/user/projects');
  });

  it('should close on Escape key', async () => {
    render(<DirectoryPicker {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should handle keyboard navigation with arrow keys', async () => {
    mockList
      .mockResolvedValueOnce({
        currentPath: '/home/user/projects',
        parentPath: '/home/user',
        directories: [
          { name: 'alpha', path: '/home/user/projects/alpha' },
          { name: 'beta', path: '/home/user/projects/beta' },
          { name: 'gamma', path: '/home/user/projects/gamma' },
        ],
      })
      .mockResolvedValueOnce({
        currentPath: '/home/user/projects/beta',
        parentPath: '/home/user/projects',
        directories: [],
      });

    render(<DirectoryPicker {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);

    // ArrowDown to highlight first item (alpha)
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    // ArrowDown to highlight second item (beta)
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });

    // Enter navigates into the highlighted directory
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith('/home/user/projects/beta');
    });
  });

  it('should show empty state when no directories found', async () => {
    mockList.mockResolvedValue({
      currentPath: '/home/user/empty',
      parentPath: '/home/user',
      directories: [],
    });

    render(<DirectoryPicker {...defaultProps} currentPath="/home/user/empty" />);

    await waitFor(() => {
      expect(screen.getByText(/no directories/i)).toBeInTheDocument();
    });
  });

  it('should allow selecting current directory', async () => {
    render(<DirectoryPicker {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    // Click the "use current" button without selecting any child
    const useCurrentBtn = screen.getByTestId('directory-use-current');
    fireEvent.click(useCurrentBtn);

    expect(defaultProps.onSelect).toHaveBeenCalledWith('/home/user/projects');
  });
});
