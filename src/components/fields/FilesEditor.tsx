import { useState } from 'react';
import { Plus, Trash2, FileUp } from 'lucide-react';
import { Input } from '../ui/input';
import type { FileUpload } from '../../types/yaml';

interface FilesEditorProps {
    files: FileUpload[];
    onChange: (files: FileUpload[]) => void;
}

export function FilesEditor({ files = [], onChange }: FilesEditorProps) {
    const [localFiles, setLocalFiles] = useState<FileUpload[]>(files);

    const handleAdd = () => {
        const newFile: FileUpload = {
            field: '',
            path: '',
            mime: ''
        };
        const updated = [...localFiles, newFile];
        setLocalFiles(updated);
        onChange(updated);
    };

    const handleRemove = (index: number) => {
        const updated = localFiles.filter((_, i) => i !== index);
        setLocalFiles(updated);
        onChange(updated);
    };

    const handleFieldChange = (index: number, field: keyof FileUpload, value: string) => {
        const updated = [...localFiles];
        updated[index] = { ...updated[index], [field]: value };
        setLocalFiles(updated);
        onChange(updated);
    };

    const commonMimeTypes = [
        'application/pdf',
        'application/json',
        'application/xml',
        'application/zip',
        'text/plain',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'audio/mpeg'
    ];

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Files to Upload
                </label>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 rounded transition-colors"
                >
                    <Plus size={14} />
                    Add File
                </button>
            </div>

            {/* Files List */}
            {localFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-zinc-700 rounded-lg">
                    <FileUp size={32} className="text-zinc-600 mb-2" />
                    <p className="text-sm text-zinc-500">No files added</p>
                    <p className="text-xs text-zinc-600 mt-1">Click "Add File" to upload files</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {localFiles.map((file, index) => (
                        <div
                            key={index}
                            className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-2.5"
                        >
                            {/* Field Name */}
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">
                                    Form Field Name
                                </label>
                                <Input
                                    value={file.field}
                                    onChange={(e) => handleFieldChange(index, 'field', e.target.value)}
                                    placeholder="e.g., avatar, document, file"
                                    className="w-full text-sm font-mono"
                                />
                            </div>

                            {/* File Path */}
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">
                                    File Path
                                </label>
                                <Input
                                    value={file.path}
                                    onChange={(e) => handleFieldChange(index, 'path', e.target.value)}
                                    placeholder="e.g., ./uploads/photo.jpg"
                                    className="w-full text-sm font-mono"
                                />
                                <div className="mt-1 text-xs text-zinc-600">
                                    Relative or absolute path to the file
                                </div>
                            </div>

                            {/* MIME Type */}
                            <div>
                                <label className="text-xs text-zinc-500 mb-1 block">
                                    MIME Type <span className="text-zinc-600">(optional)</span>
                                </label>
                                <Input
                                    value={file.mime || ''}
                                    onChange={(e) => handleFieldChange(index, 'mime', e.target.value)}
                                    placeholder="e.g., image/jpeg, application/pdf"
                                    list={`mime-types-${index}`}
                                    className="w-full text-sm font-mono"
                                />
                                <datalist id={`mime-types-${index}`}>
                                    {commonMimeTypes.map(mime => (
                                        <option key={mime} value={mime} />
                                    ))}
                                </datalist>
                                <div className="mt-1 text-xs text-zinc-600">
                                    Auto-detected if not specified
                                </div>
                            </div>

                            {/* Remove Button */}
                            <button
                                onClick={() => handleRemove(index)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-400 bg-red-400/10 hover:bg-red-400/20 rounded transition-colors w-full justify-center"
                            >
                                <Trash2 size={14} />
                                Remove File
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Box */}
            {localFiles.length > 0 && (
                <div className="p-3 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-zinc-400">
                    <div className="flex gap-2">
                        <FileUp size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                            Files will be uploaded as <code className="text-blue-400">multipart/form-data</code>.
                            You can combine files with form fields in the Body tab.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
