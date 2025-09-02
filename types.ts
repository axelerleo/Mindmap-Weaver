export interface Point {
  x: number;
  y: number;
}

export interface NodeStyle {
  backgroundColor: string;
  borderColor: string;
  lineColor: string;
  textColor: string;
  backgroundOpacity: number;
}

export type NodeShape = 'rounded-rectangle' | 'rectangle' | 'oval';

export interface MindMapNode {
  id: string;
  parentId: string | null;
  content: string;
  position: Point;
  style: NodeStyle;
  note: string;
  link: string;
  isCollapsed: boolean;
  dimensions: { width: number; height: number };
  branch?: 'left' | 'right';
  shape: NodeShape;
  isLeftCollapsed?: boolean;
  isRightCollapsed?: boolean;
}

export interface MindMapData {
  [id: string]: MindMapNode;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface MindMapState {
  nodes: MindMapData;
  connections: Connection[];
  rootId: string;
  selectedNodeIds: string[];
  selectedConnectionId: string | null;
}
