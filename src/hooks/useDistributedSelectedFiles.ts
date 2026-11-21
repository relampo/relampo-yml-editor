import { useEffect, useState } from 'react';

/** Read bytes, not name/size/lastModified: replacing a CSV can preserve all three. */
export function useDistributedSelectedFiles(files: File[]) {
  const [read, setRead] = useState<{ files: File[]; contents: Map<string, string>; error?: string }>();
  useEffect(() => {
    if (!files.length) return;
    let live = true;
    const readers: FileReader[] = [];
    const limit =
      files.length > 63
        ? 'Select at most 63 additional files.'
        : files.reduce((total, file) => total + file.size, 0) > 64 * 1024 * 1024
          ? 'Selected files must total less than 64 MiB.'
          : '';
    void (
      limit
        ? Promise.reject(Error(limit))
        : Promise.all(
            files.map(
              file =>
                new Promise<[string, string]>((resolve, reject) => {
                  if (file.size > 64 * 1024 * 1024) return reject(Error('Each file must be smaller than 64 MiB.'));
                  const reader = new FileReader();
                  readers.push(reader);
                  reader.onload = () => resolve([file.name, String(reader.result).split(',')[1] || '']);
                  reader.onerror = () => reject(Error('Could not read the selected file.'));
                  reader.readAsDataURL(file);
                }),
            ),
          )
    ).then(
      entries => {
        if (live) setRead({ files, contents: new Map(entries) });
      },
      cause => {
        if (live) setRead({ files, contents: new Map(), error: String(cause.message || cause) });
      },
    );
    return () => {
      live = false;
      readers.forEach(reader => reader.abort());
    };
  }, [files]);
  return {
    ready: files.length === 0 || read?.files === files,
    contents: files.length && read?.files === files ? read.contents : new Map<string, string>(),
    error: files.length && read?.files === files ? read.error : undefined,
  };
}
