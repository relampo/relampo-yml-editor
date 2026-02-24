import React from 'react';
import { DetailSection } from '../../ui/details/DetailSection';
import { CompactInput } from '../../ui/details/CompactInput';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';

interface RequestRetryProps {
    retry: any; // RetryConfig
    onUpdate: (field: string, value: any) => void;
}

export function RequestRetry({ retry, onUpdate }: RequestRetryProps) {
    const enabled = !!retry;
    const data = retry || {};

    const handleEnable = (checked: boolean) => {
        if (checked) {
            onUpdate('retry', { attempts: 3, backoff: 'fixed', delay: '1s' });
        } else {
            onUpdate('retry', undefined);
        }
    };

    const handleChange = (field: string, value: any) => {
        onUpdate('retry', { ...data, [field]: value });
    };

    return (
        <DetailSection title="Retry Policy" defaultOpen={false}>
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
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label>Attempts</Label>
                                <CompactInput
                                    type="number"
                                    value={data.attempts || 3}
                                    onChange={(e) => handleChange('attempts', parseInt(e.target.value))}
                                />
                            </div>
                            <div>
                                <Label>Backoff</Label>
                                <select
                                    value={data.backoff || 'fixed'}
                                    onChange={(e) => handleChange('backoff', e.target.value)}
                                    className="w-full h-7 text-xs bg-white/5 border border-white/10 rounded px-2 text-zinc-300"
                                >
                                    <option value="fixed">Fixed</option>
                                    <option value="linear">Linear</option>
                                    <option value="exponential">Exponential</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <Label>Delay / Initial</Label>
                            <CompactInput
                                value={data.initial_delay || data.delay || '1s'}
                                onChange={(e) => handleChange('initial_delay', e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </DetailSection>
    );
}
