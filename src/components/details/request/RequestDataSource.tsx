import React from 'react';
import { DetailSection } from '../../ui/details/DetailSection';
import { CompactInput } from '../../ui/details/CompactInput';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';

interface RequestDataSourceProps {
    dataSource: any; // DataSource
    onUpdate: (field: string, value: any) => void;
}

export function RequestDataSource({ dataSource, onUpdate }: RequestDataSourceProps) {
    const enabled = !!dataSource;
    const data = dataSource || {};

    const handleEnable = (checked: boolean) => {
        if (checked) {
            onUpdate('data_source', { type: 'csv', file: '', strategy: 'sequential' });
        } else {
            onUpdate('data_source', undefined);
        }
    };

    const handleChange = (field: string, value: any) => {
        onUpdate('data_source', { ...data, [field]: value });
    };

    return (
        <DetailSection title="Data Source" defaultOpen={false}>
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label>Enabled</Label>
                    <Switch
                        checked={enabled}
                        onCheckedChange={handleEnable}
                    />
                </div>

                {enabled && (
                    <div className="space-y-3 pt-2">
                        <div>
                            <Label>File Path</Label>
                            <CompactInput
                                value={data.file || ''}
                                onChange={(e) => handleChange('file', e.target.value)}
                                placeholder="/path/to/data.csv"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label>Type</Label>
                                <select
                                    value={data.type || 'csv'}
                                    onChange={(e) => handleChange('type', e.target.value)}
                                    className="w-full h-7 text-xs bg-white/5 border border-white/10 rounded px-2 text-zinc-300"
                                >
                                    <option value="csv">CSV</option>
                                    <option value="json">JSON</option>
                                </select>
                            </div>
                            <div>
                                <Label>Strategy</Label>
                                <select
                                    value={data.strategy || 'sequential'}
                                    onChange={(e) => handleChange('strategy', e.target.value)}
                                    className="w-full h-7 text-xs bg-white/5 border border-white/10 rounded px-2 text-zinc-300"
                                >
                                    <option value="sequential">Sequential</option>
                                    <option value="random">Random</option>
                                    <option value="unique">Unique</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DetailSection>
    );
}
