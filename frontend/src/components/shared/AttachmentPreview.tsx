import { X, FileText } from 'lucide-react';

export interface AttachedFile {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
}

interface AttachmentPreviewProps {
  files: AttachedFile[];
  onRemove: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(type: string): boolean {
  return type.startsWith('image/');
}

export function AttachmentPreview({ files, onRemove }: AttachmentPreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-1">
      {files.map((file) => (
        <div
          key={file.id}
          className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary border border-border min-w-0 shrink-0 max-w-[200px]"
        >
          {isImage(file.type) && file.previewUrl ? (
            <img
              src={file.previewUrl}
              alt={file.name}
              className="w-8 h-8 rounded object-cover shrink-0"
            />
          ) : (
            <FileText size={20} className="text-text-muted shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-text-primary truncate">{file.name}</p>
            <p className="text-xs text-text-muted">{formatSize(file.size)}</p>
          </div>
          <button
            data-testid={`attachment-remove-${file.id}`}
            onClick={() => onRemove(file.id)}
            className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-bg-elevated border border-border hover:bg-error hover:text-white hover:border-error transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
