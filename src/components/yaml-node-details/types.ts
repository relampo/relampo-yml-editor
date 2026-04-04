import type { YAMLNode } from '../../types/yaml';

export type NodeUpdateHandler = (nodeId: string, updatedData: any) => void;

export interface NodeDetailProps {
  node: YAMLNode;
  onNodeUpdate?: NodeUpdateHandler;
}

export interface NamedNodeDetailProps extends NodeDetailProps {
  nodeName?: string;
  setNodeName?: (name: string) => void;
}
