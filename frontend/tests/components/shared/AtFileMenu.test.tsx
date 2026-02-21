import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AtFileMenu } from '../../../src/components/shared/AtFileMenu';

// Mock directoryApi
vi.mock('../../../src/lib/api', () => ({
  directoryApi: {
    list: vi.fn(),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback: string) => fallback }),
}));

import { directoryApi } from '../../../src/lib/api';
const mockList = vi.mocked(directoryApi.list);

const defaultProps = {
  cwd: '/project',
  filter: '',
  selectedIndex: 0,
  onSelectFile: vi.fn(),
  onClose: vi.fn(),
};

describe('AtFileMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      currentPath: '/project',
      parentPath: '/',
      directories: [
        { name: 'src', path: '/project/src' },
        { name: 'tests', path: '/project/tests' },
      ],
      files: [
        { name: 'index.ts', path: '/project/index.ts', size: 1024 },
        { name: 'readme.md', path: '/project/readme.md', size: 512 },
      ],
    });
  });

  it('should show loading indicator initially', () => {
    render(<AtFileMenu {...defaultProps} />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('should load and display directories and files', async () => {
    render(<AtFileMenu {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('src')).toBeTruthy();
    });
    expect(screen.getByText('tests')).toBeTruthy();
    expect(screen.getByText('index.ts')).toBeTruthy();
    expect(screen.getByText('readme.md')).toBeTruthy();
    expect(mockList).toHaveBeenCalledWith('/project', true, true);
  });

  it('should call directoryApi with includeFiles=true', async () => {
    render(<AtFileMenu {...defaultProps} />);
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith('/project', true, true);
    });
  });

  it('should navigate into a directory when clicked', async () => {
    mockList
      .mockResolvedValueOnce({
        currentPath: '/project',
        parentPath: '/',
        directories: [{ name: 'src', path: '/project/src' }],
        files: [],
      })
      .mockResolvedValueOnce({
        currentPath: '/project/src',
        parentPath: '/project',
        directories: [],
        files: [{ name: 'app.ts', path: '/project/src/app.ts', size: 200 }],
      });

    render(<AtFileMenu {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('src')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('src'));
    await waitFor(() => {
      expect(screen.getByText('app.ts')).toBeTruthy();
    });
    expect(mockList).toHaveBeenCalledWith('/project/src', true, true);
  });

  it('should show go-up button when not at cwd root', async () => {
    mockList
      .mockResolvedValueOnce({
        currentPath: '/project',
        parentPath: '/',
        directories: [{ name: 'src', path: '/project/src' }],
        files: [],
      })
      .mockResolvedValueOnce({
        currentPath: '/project/src',
        parentPath: '/project',
        directories: [],
        files: [{ name: 'app.ts', path: '/project/src/app.ts', size: 200 }],
      })
      .mockResolvedValueOnce({
        currentPath: '/project',
        parentPath: '/',
        directories: [{ name: 'src', path: '/project/src' }],
        files: [],
      });

    render(<AtFileMenu {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('src')).toBeTruthy();
    });

    // At root: no go-up button
    expect(screen.queryByTestId('at-file-go-up')).toBeNull();

    // Navigate into src
    fireEvent.click(screen.getByText('src'));
    await waitFor(() => {
      expect(screen.getByTestId('at-file-go-up')).toBeTruthy();
    });

    // Click go-up to return
    fireEvent.click(screen.getByTestId('at-file-go-up'));
    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(3);
    });
  });

  it('should call onSelectFile when a file is clicked', async () => {
    const onSelectFile = vi.fn();
    render(<AtFileMenu {...defaultProps} onSelectFile={onSelectFile} />);
    await waitFor(() => {
      expect(screen.getByText('index.ts')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('index.ts'));
    expect(onSelectFile).toHaveBeenCalledWith('/project/index.ts', 'index.ts');
  });

  it('should filter entries by name', async () => {
    render(<AtFileMenu {...defaultProps} filter="index" />);
    await waitFor(() => {
      expect(screen.getByText('index.ts')).toBeTruthy();
    });
    expect(screen.queryByText('readme.md')).toBeNull();
    expect(screen.queryByText('src')).toBeNull();
  });

  it('should show empty state when no entries match filter', async () => {
    render(<AtFileMenu {...defaultProps} filter="nonexistent" />);
    await waitFor(() => {
      expect(screen.getByText('No files found')).toBeTruthy();
    });
  });

  it('should show empty state for empty directory', async () => {
    mockList.mockResolvedValueOnce({
      currentPath: '/project/empty',
      parentPath: '/project',
      directories: [],
      files: [],
    });
    render(<AtFileMenu {...defaultProps} cwd="/project/empty" />);
    await waitFor(() => {
      expect(screen.getByText('No files found')).toBeTruthy();
    });
  });

  it('should display file size', async () => {
    render(<AtFileMenu {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('1.0 KB')).toBeTruthy();
    });
  });

  it('should highlight selected index with aria-selected', async () => {
    render(<AtFileMenu {...defaultProps} selectedIndex={1} />);
    await waitFor(() => {
      expect(screen.getByText('src')).toBeTruthy();
    });
    const options = screen.getAllByRole('option');
    expect(options[0].getAttribute('aria-selected')).toBe('false');
    expect(options[1].getAttribute('aria-selected')).toBe('true');
  });

  it('should generate relative display name for nested files', async () => {
    const onSelectFile = vi.fn();
    mockList
      .mockResolvedValueOnce({
        currentPath: '/project',
        parentPath: '/',
        directories: [{ name: 'src', path: '/project/src' }],
        files: [],
      })
      .mockResolvedValueOnce({
        currentPath: '/project/src',
        parentPath: '/project',
        directories: [],
        files: [{ name: 'app.ts', path: '/project/src/app.ts', size: 200 }],
      });

    render(<AtFileMenu {...defaultProps} onSelectFile={onSelectFile} />);
    await waitFor(() => {
      expect(screen.getByText('src')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('src'));
    await waitFor(() => {
      expect(screen.getByText('app.ts')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('app.ts'));
    expect(onSelectFile).toHaveBeenCalledWith('/project/src/app.ts', 'src/app.ts');
  });
});
