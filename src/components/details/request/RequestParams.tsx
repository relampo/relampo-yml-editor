import React, { useEffect, useState } from 'react';
import { KeyValList } from '../../ui/details/KeyValList';

interface RequestParamsProps {
    url: string;
    queryParams: Record<string, string>;
    onUpdateUrl: (url: string) => void;
    onUpdateParams: (params: Record<string, string>) => void;
}

export function RequestParams({ url, queryParams, onUpdateUrl, onUpdateParams }: RequestParamsProps) {
    const handleUpdate = (newParams: Record<string, string>) => {
        try {
            const urlObj = new URL(url, 'http://placeholder.com');
            // Clear existing
            const keys = Array.from(urlObj.searchParams.keys());
            keys.forEach(k => urlObj.searchParams.delete(k));

            // Add new
            Object.entries(newParams).forEach(([k, v]) => {
                if (k) urlObj.searchParams.append(k, v);
            });

            // Reconstruct URL
            let finalUrl = urlObj.pathname + urlObj.search;
            if (url.startsWith('http')) {
                finalUrl = urlObj.toString();
            } else {
                const search = urlObj.search;
                const base = url.split('?')[0];
                finalUrl = base + search;
            }
            onUpdateUrl(finalUrl);
            onUpdateParams(newParams);
        } catch {
            // Fallback
        }
    };

    return (
        <KeyValList
            items={queryParams}
            onUpdate={handleUpdate}
            keyPlaceholder="param"
            valuePlaceholder="value"
        />
    );
}
