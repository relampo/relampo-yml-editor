import React from 'react';
import { KeyValList } from '../../ui/details/KeyValList';
import { DetailSection } from '../../ui/details/DetailSection';

interface RequestExtractorsProps {
  extract: Record<string, string>;
  onUpdate: (extract: Record<string, string>) => void;
}

export function RequestExtractors({ extract, onUpdate }: RequestExtractorsProps) {
  return (
    <DetailSection
      title="Extractors"
      defaultOpen={false}
    >
      <div className="text-xs text-zinc-500 mb-2">Extract values from response into variables.</div>
      <KeyValList
        items={extract}
        onUpdate={onUpdate}
        keyPlaceholder="VAR_NAME"
        valuePlaceholder="JSONPath / Regex"
      />
    </DetailSection>
  );
}
