import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttachmentPreview } from '../../../src/components/shared/AttachmentPreview';
import type { AttachedFile } from '../../../src/components/shared/AttachmentPreview';

function createFile(overrides: Partial<AttachedFile> = {}): AttachedFile {
  return {
    id: 'file-1',
    file: new File(['test'], 'test.txt', { type: 'text/plain' }),
    name: 'test.txt',
    type: 'text/plain',
    size: 4,
    ...overrides,
  };
}

describe('AttachmentPreview', () => {
  it('should render file name', () => {
    const file = createFile({ name: 'document.pdf' });
    render(<AttachmentPreview files={[file]} onRemove={() => {}} />);
    expect(screen.getByText('document.pdf')).toBeDefined();
  });

  it('should render image preview for image files', () => {
    const file = createFile({
      id: 'img-1',
      name: 'photo.png',
      type: 'image/png',
      previewUrl: 'blob:http://localhost/fake-preview',
    });
    render(<AttachmentPreview files={[file]} onRemove={() => {}} />);
    const img = screen.getByAltText('photo.png');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('blob:http://localhost/fake-preview');
  });

  it('should render file icon for non-image files', () => {
    const file = createFile({ type: 'application/pdf', name: 'doc.pdf' });
    render(<AttachmentPreview files={[file]} onRemove={() => {}} />);
    // Should have a file icon element (not an img tag)
    expect(screen.queryByAltText('doc.pdf')).toBeNull();
    expect(screen.getByText('doc.pdf')).toBeDefined();
  });

  it('should call onRemove with file id when X button is clicked', () => {
    const onRemove = vi.fn();
    const file = createFile({ id: 'remove-me' });
    render(<AttachmentPreview files={[file]} onRemove={onRemove} />);

    const removeButton = screen.getByTestId('attachment-remove-remove-me');
    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledWith('remove-me');
  });

  it('should render multiple files', () => {
    const files = [
      createFile({ id: '1', name: 'a.txt' }),
      createFile({ id: '2', name: 'b.txt' }),
      createFile({ id: '3', name: 'c.txt' }),
    ];
    render(<AttachmentPreview files={files} onRemove={() => {}} />);
    expect(screen.getByText('a.txt')).toBeDefined();
    expect(screen.getByText('b.txt')).toBeDefined();
    expect(screen.getByText('c.txt')).toBeDefined();
  });

  it('should display file size', () => {
    const file = createFile({ size: 1024 * 5 }); // 5KB
    render(<AttachmentPreview files={[file]} onRemove={() => {}} />);
    expect(screen.getByText('5.0 KB')).toBeDefined();
  });

  it('should render nothing when files array is empty', () => {
    const { container } = render(<AttachmentPreview files={[]} onRemove={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
