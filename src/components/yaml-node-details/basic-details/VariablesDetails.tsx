import { EditableList } from '../../EditableList';
import type { StringMap } from '../../../types/shared';
import type { NodeDetailProps } from '../types';

export function VariablesDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const items: StringMap = Array.isArray(data.variables)
    ? data.variables.reduce((acc: StringMap, curr: { name: string; value: string }) => {
        acc[curr.name] = curr.value;
        return acc;
      }, {})
    : (data as StringMap);

  const handleUpdate = (updatedItems: StringMap) => {
    if (!onNodeUpdate) {
      return;
    }
    if (Array.isArray(data.variables)) {
      onNodeUpdate(node.id, {
        ...data,
        variables: Object.entries(updatedItems).map(([name, value]) => ({
          name,
          value,
        })),
      });
      return;
    }
    onNodeUpdate(node.id, updatedItems);
  };

  return (
    <EditableList
      title="Variables"
      items={items}
      onUpdate={handleUpdate}
      keyPlaceholder="variable_name"
      valuePlaceholder="value"
      keyLabel="Variable Name"
      valueLabel="Value"
      enableCheckboxes={false}
      enableBulkActions={false}
      variant="minimal"
    />
  );
}
