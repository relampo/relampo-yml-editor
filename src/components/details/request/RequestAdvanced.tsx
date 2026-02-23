import React from 'react';
import { CompactInput } from '../../ui/details/CompactInput';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';

interface RequestAdvancedProps {
    retrieveResources: boolean;
    followRedirects: boolean; // Assuming this exists in model
    timeout: string;
    onUpdate: (field: string, value: any) => void;
}

export function RequestAdvanced({
    retrieveResources, followRedirects, timeout, onUpdate
}: RequestAdvancedProps) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor="req-resources" className="text-xs text-zinc-400 cursor-pointer">Retrieve Resources</Label>
                    <Switch
                        id="req-resources"
                        checked={retrieveResources}
                        onCheckedChange={(c) => onUpdate('retrieve_embedded_resources', c)}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <Label htmlFor="req-redirects" className="text-xs text-zinc-400 cursor-pointer">Follow Redirects</Label>
                    <Switch
                        id="req-redirects"
                        checked={followRedirects}
                        onCheckedChange={(c) => onUpdate('follow_redirects', c)} // Ensure field matches schema
                    />
                </div>
            </div>

            <div>
                <Label className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1 block">Timeout</Label>
                <CompactInput
                    value={timeout || ''}
                    onChange={(e) => onUpdate('timeout', e.target.value)}
                    placeholder="e.g. 5s, 1000ms"
                />
            </div>
        </div>
    );
}
