import { DetailSection } from '../../ui/details/DetailSection';
import { CompactInput } from '../../ui/details/CompactInput';
import { Label } from '../../ui/label';

interface RequestAssertionsProps {
    assert: any; // AssertConfig
    onUpdate: (field: string, value: any) => void;
}

const EMPTY_ASSERT = {};

export function RequestAssertions({ assert = EMPTY_ASSERT, onUpdate }: RequestAssertionsProps) {
    // Helper to update specific assertion field
    const handleChange = (field: string, value: any) => {
        // If value is empty/null, maybe delete the key? 
        // For now, update state.
        const newAssert = { ...assert, [field]: value };
        // Clean up empty strings if needed or handle in parent
        onUpdate('assert', newAssert);
    };

    return (
        <DetailSection title="Assertions" defaultOpen={false}>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>Status Code</Label>
                        <CompactInput
                            value={assert.status || ''}
                            onChange={(e) => handleChange('status', parseInt(e.target.value) || undefined)}
                            placeholder="200"
                        />
                    </div>
                    <div>
                        <Label>Status In (csv)</Label>
                        <CompactInput
                            value={assert.status_in?.join(',') || ''}
                            onChange={(e) => handleChange('status_in', e.target.value.split(',').map((s: string) => parseInt(s.trim())).filter((n: number) => !isNaN(n)))}
                            placeholder="200, 201"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label>Response Time &lt; (ms)</Label>
                        <CompactInput
                            value={assert.response_time_ms_max || ''}
                            onChange={(e) => handleChange('response_time_ms_max', parseInt(e.target.value))}
                        />
                    </div>
                    <div>
                        <Label>Response Time &gt; (ms)</Label>
                        <CompactInput
                            value={assert.response_time_ms_min || ''}
                            onChange={(e) => handleChange('response_time_ms_min', parseInt(e.target.value))}
                        />
                    </div>
                </div>

                <div>
                    <Label>Body Contains</Label>
                    <CompactInput
                        value={assert.body_contains || ''}
                        onChange={(e) => handleChange('body_contains', e.target.value)}
                    />
                </div>
                <div>
                    <Label>Body Not Contains</Label>
                    <CompactInput
                        value={assert.body_not_contains || ''}
                        onChange={(e) => handleChange('body_not_contains', e.target.value)}
                    />
                </div>

                {/* JSON Path assertions could be more complex, maybe a list? 
                    For now, simplified single fields or map? 
                    Model has `json_path?: Record<string, string>;`
                */}
            </div>
        </DetailSection>
    );
}
