export interface UploadedFileRef {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

export async function uploadFiles(files: File[]): Promise<UploadedFileRef[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(body.error || `Upload failed with status ${res.status}`);
  }

  const body = await res.json();
  return body.files;
}
