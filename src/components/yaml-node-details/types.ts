import type { YAMLNode } from '../../types/yaml';
import type { NodeUpdateHandler } from '../../types/shared';

export interface NodeDetailProps {
  node: YAMLNode;
  onNodeUpdate?: NodeUpdateHandler;
}

export interface NamedNodeDetailProps extends NodeDetailProps {
  nodeName?: string;
  setNodeName?: (name: string) => void;
}
