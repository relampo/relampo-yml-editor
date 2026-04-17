import { EditableList } from '../../EditableList';
import type { NodeDetailProps } from '../types';

export function VariablesDetails({ node, onNodeUpdate }: NodeDetailProps) {
  const data = node.data || {};
  const items = Array.isArray(data.variables)
    ? data.variables.reduce((acc: any, curr: any) => ({ ...acc, [curr.name]: curr.value }), {})
    : data;

  const handleUpdate = (updatedItems: Record<string, string>) => {
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
