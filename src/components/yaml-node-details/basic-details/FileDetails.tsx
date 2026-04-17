import { FileField } from '../SharedFields';
import type { NodeDetailProps } from '../types';

export function FileDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const pathValue = String(data.path || '').trim();
  const mimeValue = String(data.mime || data.mime_type || '').trim();
  const commonMimeTypes = [
    'application/pdf',
    'application/json',
    'application/xml',
    'application/zip',
    'text/plain',
    'text/csv',
    'text/html',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'audio/mpeg',
  ];

  const handleChange = (field: string, value: any) => {
    if (!onNodeUpdate) {
      return;
    }
    const raw = String(value ?? '');

    if (field === 'path') {
      const nextData: Record<string, any> = { ...data, path: raw };
      if (!String(nextData.field || '').trim() && raw.trim()) {
        nextData.field = 'file';
      }
      onNodeUpdate(node.id, nextData);
      return;
    }

    if (field === 'mime' || field === 'mime_type') {
      const { mime_type: _, ...rest } = data;
      onNodeUpdate(node.id, { ...rest, mime: raw });
      return;
    }

    onNodeUpdate(node.id, { ...data, [field]: raw });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="min-w-0">
          <FileField
            label="File Path"
            value={data.path || ''}
            field="path"
            onChange={handleChange}
            noMargin
          />
        </div>

        <div className="min-w-0">
          <label
            htmlFor="file-detail-mime"
            className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2"
          >
            MIME Type
          </label>
          <select
            id="file-detail-mime"
            value={mimeValue}
            onChange={event => handleChange('mime', event.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded text-sm text-zinc-300 font-mono h-[38px] outline-none"
          >
            <option
              value=""
              className="bg-[#1a1a1a]"
            >
              application/octet-stream
            </option>
            {commonMimeTypes.map(mime => (
              <option
                key={mime}
                value={mime}
                className="bg-[#1a1a1a]"
              >
                {mime}
              </option>
            ))}
            {mimeValue && !commonMimeTypes.includes(mimeValue) && (
              <option
                value={mimeValue}
                className="bg-[#1a1a1a]"
              >
                {mimeValue}
              </option>
            )}
          </select>
          <div className="mt-1 text-xs text-zinc-500">Common: application/pdf, image/jpeg, text/csv</div>
        </div>
      </div>

      {!pathValue && (
        <div className="mb-4 p-3 bg-red-400/8 border border-red-400/25 rounded text-xs text-red-300">
          Required: path
        </div>
      )}

      <div className="p-3 bg-amber-400/5 border border-amber-400/20 rounded text-xs text-zinc-400">
        📎 This file will be uploaded as multipart/form-data
      </div>
    </>
  );
}
