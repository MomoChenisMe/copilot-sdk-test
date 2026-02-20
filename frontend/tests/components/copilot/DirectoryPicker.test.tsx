import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DirectoryPicker } from '../../../src/components/copilot/DirectoryPicker';

// Mock the API
vi.mock('../../../src/lib/api', () => ({
  directoryApi: {
    list: vi.fn(),
  },
}));

vi.mock('../../../src/lib/github-api', () => ({
  githubApi: {
    status: vi.fn(),
    listRepos: vi.fn(),
    cloneRepo: vi.fn(),
  },
}));

import { directoryApi } from '../../../src/lib/api';
import { githubApi } from '../../../src/lib/github-api';
const mockList = vi.mocked(directoryApi.list);
const mockGhStatus = vi.mocked(githubApi.status);
const mockGhListRepos = vi.mocked(githubApi.listRepos);
const mockGhCloneRepo = vi.mocked(githubApi.cloneRepo);

describe('DirectoryPicker', () => {
  const defaultProps = {
    currentPath: '/home/user/projects',
    onSelect: vi.fn(),
    onClose: vi.fn(),
    onFallback: vi.fn(),
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

  // --- Local tab tests ---

  it('should render tabs and default to local tab', async () => {
    render(<DirectoryPicker {...defaultProps} />);

    expect(screen.getByTestId('tab-local')).toBeInTheDocument();
    expect(screen.getByTestId('tab-github')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('alpha')).toBeInTheDocument();
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

    const searchInput = screen.getByPlaceholderText(/search directories/i);
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

    const searchInput = screen.getByPlaceholderText(/search directories/i);

    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
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

    const useCurrentBtn = screen.getByTestId('directory-use-current');
    fireEvent.click(useCurrentBtn);

    expect(defaultProps.onSelect).toHaveBeenCalledWith('/home/user/projects');
  });

  // --- Error handling / fallback tests ---

  it('should fallback to home directory when initial path does not exist', async () => {
    mockList
      .mockRejectedValueOnce(new Error('Path does not exist'))
      .mockResolvedValueOnce({
        currentPath: '/Users/me',
        parentPath: '/Users',
        directories: [
          { name: 'Documents', path: '/Users/me/Documents' },
        ],
      });

    render(<DirectoryPicker {...defaultProps} currentPath="/nonexistent/path" />);

    await waitFor(() => {
      expect(screen.getByText('Documents')).toBeInTheDocument();
      expect(screen.getByText('/Users/me')).toBeInTheDocument();
    });

    // First call with invalid path, second call with no path (fallback)
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(mockList).toHaveBeenNthCalledWith(1, '/nonexistent/path');
    expect(mockList).toHaveBeenNthCalledWith(2);

    // onFallback should be called to sync CWD (without closing the picker)
    expect(defaultProps.onFallback).toHaveBeenCalledWith('/Users/me');
    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  it('should show translated error when both primary and fallback fail', async () => {
    mockList
      .mockRejectedValueOnce(new Error('Path does not exist'))
      .mockRejectedValueOnce(new Error('Path does not exist'));

    render(<DirectoryPicker {...defaultProps} currentPath="/nonexistent/path" />);

    await waitFor(() => {
      expect(screen.getByText('Path does not exist')).toBeInTheDocument();
    });
  });

  // --- GitHub tab tests ---

  describe('GitHub tab', () => {
    const setupGithubTab = async () => {
      mockGhStatus.mockResolvedValue({ available: true });
      mockGhListRepos.mockResolvedValue({
        repos: [
          { name: 'repo1', nameWithOwner: 'user/repo1', description: 'A cool project', isPrivate: false, url: 'https://github.com/user/repo1' },
          { name: 'repo2', nameWithOwner: 'user/repo2', description: null, isPrivate: true, url: 'https://github.com/user/repo2' },
        ],
      });

      render(<DirectoryPicker {...defaultProps} />);
      fireEvent.click(screen.getByTestId('tab-github'));

      await waitFor(() => {
        expect(screen.getByText('user/repo1')).toBeInTheDocument();
      });
    };

    it('should switch to GitHub tab and load repos', async () => {
      await setupGithubTab();
      expect(screen.getByText('user/repo1')).toBeInTheDocument();
      expect(screen.getByText('user/repo2')).toBeInTheDocument();
      expect(mockGhStatus).toHaveBeenCalled();
      expect(mockGhListRepos).toHaveBeenCalled();
    });

    it('should show private badge for private repos', async () => {
      await setupGithubTab();
      expect(screen.getByText(/private/i)).toBeInTheDocument();
    });

    it('should filter repos by search', async () => {
      mockGhStatus.mockResolvedValue({ available: true });
      mockGhListRepos.mockResolvedValue({
        repos: [
          { name: 'frontend', nameWithOwner: 'user/frontend', description: null, isPrivate: false, url: '' },
          { name: 'backend', nameWithOwner: 'user/backend', description: null, isPrivate: false, url: '' },
        ],
      });

      render(<DirectoryPicker {...defaultProps} />);
      fireEvent.click(screen.getByTestId('tab-github'));

      await waitFor(() => {
        expect(screen.getByText('user/frontend')).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId('github-search');
      fireEvent.change(searchInput, { target: { value: 'front' } });

      expect(screen.getByText('user/frontend')).toBeInTheDocument();
      expect(screen.queryByText('user/backend')).not.toBeInTheDocument();
    });

    it('should show confirmation panel with editable path when clicking a repo', async () => {
      await setupGithubTab();

      fireEvent.click(screen.getByTestId('github-repo-repo1'));

      // Should show the confirm view with editable clone path defaulting to currentPath/repo
      const pathInput = screen.getByTestId('github-clone-path') as HTMLInputElement;
      expect(pathInput.value).toBe('/home/user/projects/repo1');
      expect(screen.getByTestId('github-clone-btn')).toBeInTheDocument();
      expect(screen.getByTestId('github-back')).toBeInTheDocument();
    });

    it('should show repo description in confirmation panel', async () => {
      await setupGithubTab();

      fireEvent.click(screen.getByTestId('github-repo-repo1'));

      expect(screen.getByText('A cool project')).toBeInTheDocument();
    });

    it('should go back to repo list when back is clicked', async () => {
      await setupGithubTab();

      fireEvent.click(screen.getByTestId('github-repo-repo1'));
      expect(screen.getByTestId('github-clone-path')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('github-back'));

      // Should be back to repo list
      expect(screen.getByText('user/repo1')).toBeInTheDocument();
      expect(screen.getByTestId('github-search')).toBeInTheDocument();
    });

    it('should clone repo with default path and call onSelect', async () => {
      await setupGithubTab();
      mockGhCloneRepo.mockResolvedValue({ path: '/home/user/projects/repo1', alreadyExists: false });

      fireEvent.click(screen.getByTestId('github-repo-repo1'));
      fireEvent.click(screen.getByTestId('github-clone-btn'));

      await waitFor(() => {
        expect(mockGhCloneRepo).toHaveBeenCalledWith('user/repo1', '/home/user/projects/repo1');
        expect(defaultProps.onSelect).toHaveBeenCalledWith('/home/user/projects/repo1');
      });
    });

    it('should allow editing clone path before cloning', async () => {
      await setupGithubTab();
      mockGhCloneRepo.mockResolvedValue({ path: '/tmp/my-repo', alreadyExists: false });

      fireEvent.click(screen.getByTestId('github-repo-repo1'));

      const pathInput = screen.getByTestId('github-clone-path') as HTMLInputElement;
      fireEvent.change(pathInput, { target: { value: '/tmp/my-repo' } });

      fireEvent.click(screen.getByTestId('github-clone-btn'));

      await waitFor(() => {
        expect(mockGhCloneRepo).toHaveBeenCalledWith('user/repo1', '/tmp/my-repo');
        expect(defaultProps.onSelect).toHaveBeenCalledWith('/tmp/my-repo');
      });
    });

    it('should show error in confirmation panel when clone fails', async () => {
      await setupGithubTab();
      mockGhCloneRepo.mockRejectedValue(new Error('Network error'));

      fireEvent.click(screen.getByTestId('github-repo-repo1'));
      fireEvent.click(screen.getByTestId('github-clone-btn'));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Should still be on confirm panel, not back to list
      expect(screen.getByTestId('github-clone-btn')).toBeInTheDocument();
    });

    it('should show gh not available message when gh CLI is missing', async () => {
      mockGhStatus.mockResolvedValue({ available: false });

      render(<DirectoryPicker {...defaultProps} />);
      fireEvent.click(screen.getByTestId('tab-github'));

      await waitFor(() => {
        expect(screen.getByTestId('gh-not-available')).toBeInTheDocument();
      });
    });

    it('should show no repos message when repo list is empty', async () => {
      mockGhStatus.mockResolvedValue({ available: true });
      mockGhListRepos.mockResolvedValue({ repos: [] });

      render(<DirectoryPicker {...defaultProps} />);
      fireEvent.click(screen.getByTestId('tab-github'));

      await waitFor(() => {
        expect(screen.getByText(/no repositories/i)).toBeInTheDocument();
      });
    });
  });
});
