import { useReducer, useEffect } from 'react';
import type { MindMapState, MindMapData, MindMapNode, NodeStyle, Point, NodeShape } from '../types';
import { saveMap, loadMap } from '../services/mindMapService';
import { autoLayout } from '../utils/layout';

// FIX: Export Action type to be used across components.
export type Action =
  | { type: 'LOAD_MAP'; payload: MindMapState }
  | { type: 'ADD_NODE'; payload: { parentId: string; content?: string; branch?: 'left' | 'right' } }
  | { type: 'DELETE_NODE'; payload: { nodeId: string } }
  | { type: 'UPDATE_NODE_CONTENT'; payload: { nodeId: string; content: string } }
  | { type: 'UPDATE_NODE_POSITION'; payload: { nodeId: string; position: Point } }
  | { type: 'UPDATE_NODE_STYLE'; payload: { nodeId: string; style: Partial<NodeStyle> } }
  | { type: 'UPDATE_NODE_DETAILS'; payload: { nodeId: string; note?: string; link?: string } }
  | { type: 'TOGGLE_COLLAPSE'; payload: { nodeId: string } }
  | { type: 'TOGGLE_ROOT_BRANCH_COLLAPSE'; payload: { branch: 'left' | 'right' } }
  | { type: 'SET_SELECTED_NODE'; payload: { nodeId: string | null } }
  | { type: 'UPDATE_NODE_SHAPE'; payload: { nodeId: string; shape: NodeShape } }
  | { type: 'AUTO_LAYOUT' };

const defaultNodeStyle: NodeStyle = {
  backgroundColor: '#ffffff',
  borderColor: '#3b82f6',
  lineColor: '#6b7280',
  textColor: '#1f2937',
  backgroundOpacity: 1,
};

const createNewNode = (parentId: string | null, content = 'New Idea'): MindMapNode => ({
  id: `node_${Date.now()}_${Math.random()}`,
  parentId,
  content,
  position: { x: 0, y: 0 },
  style: { ...defaultNodeStyle },
  note: '',
  link: '',
  isCollapsed: false,
  dimensions: { width: 160, height: 60 },
  branch: undefined,
  shape: 'rounded-rectangle',
});

const getInitialState = (): MindMapState => {
  const savedState = loadMap() as MindMapState | (MindMapState & { connections?: any[] }) | null;
  if (savedState) {
    // Simple migration for older maps
    Object.values(savedState.nodes).forEach(node => {
        if (!node.shape) {
            node.shape = 'rounded-rectangle';
        }
        if (node.style && node.style.backgroundOpacity === undefined) {
            node.style.backgroundOpacity = 1;
        }
    });
    const rootNode = savedState.nodes[savedState.rootId];
    if (rootNode) {
        if (rootNode.isLeftCollapsed === undefined) rootNode.isLeftCollapsed = false;
        if (rootNode.isRightCollapsed === undefined) rootNode.isRightCollapsed = false;
    }
    // Remove connections array if it exists from old versions
    // FIX: Use `in` operator for type-safe property checking on a union type.
    if ('connections' in savedState && savedState.connections) {
        delete (savedState as any).connections;
    }
    return savedState as MindMapState;
  }

  const rootNode = createNewNode(null, 'Central Idea');
  rootNode.position = { x: 0, y: 200 };
  rootNode.isLeftCollapsed = false;
  rootNode.isRightCollapsed = false;
  
  const rightChild = createNewNode(rootNode.id, 'Sub-idea');
  rightChild.position = { x: 250, y: 150 };
  rightChild.branch = 'right';

  const leftChild = createNewNode(rootNode.id, 'Another Sub-idea');
  leftChild.position = { x: -250, y: 250 };
  leftChild.branch = 'left';

  return {
    nodes: {
      [rootNode.id]: rootNode,
      [rightChild.id]: rightChild,
      [leftChild.id]: leftChild,
    },
    rootId: rootNode.id,
    selectedNodeId: null,
  };
};

const mindMapReducer = (state: MindMapState, action: Action): MindMapState => {
  switch (action.type) {
    case 'LOAD_MAP':
      return action.payload;
      
    case 'ADD_NODE': {
      const { parentId } = action.payload;
      const parentNode = state.nodes[parentId];
      if (!parentNode) return state;

      const newNode = createNewNode(parentId, action.payload.content);
      const parentPos = parentNode.position;

      const isRootParent = parentNode.id === state.rootId;
      const branch = isRootParent ? action.payload.branch : parentNode.branch;
      newNode.branch = branch;

      // Inherit style from parent
      newNode.style = { ...parentNode.style };
      newNode.shape = parentNode.shape;
      
      const direction = branch === 'left' ? -1 : 1;
      const LEVEL_WIDTH = 250;
      const VERTICAL_SPACING = 30;
      
      // Find siblings to prevent overlap
      const siblings = Object.values(state.nodes).filter(
        n => n.parentId === parentId && n.branch === branch
      );

      let newY: number;
      if (siblings.length > 0) {
        // Find the bottom-most sibling
        const lastSibling = siblings.reduce((prev, current) =>
          prev.position.y > current.position.y ? prev : current
        );
        newY = lastSibling.position.y + lastSibling.dimensions.height + VERTICAL_SPACING;
      } else {
        // First child on this branch
        newY = parentPos.y;
      }

      newNode.position = {
        x: parentPos.x + (LEVEL_WIDTH * direction),
        y: newY,
      };
      
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [newNode.id]: newNode,
        },
        selectedNodeId: newNode.id,
      };
    }
    
    case 'DELETE_NODE': {
      const { nodeId } = action.payload;
      if (nodeId === state.rootId) return state; // Cannot delete root

      const nodesToDelete = new Set<string>([nodeId]);
      const queue = [nodeId];
      
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        Object.values(state.nodes).forEach(node => {
          if (node.parentId === currentId) {
            nodesToDelete.add(node.id);
            queue.push(node.id);
          }
        });
      }

      const newNodes = { ...state.nodes };
      nodesToDelete.forEach(id => delete newNodes[id]);

      return {
        ...state,
        nodes: newNodes,
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      };
    }

    case 'UPDATE_NODE_CONTENT':
    case 'UPDATE_NODE_POSITION':
    case 'UPDATE_NODE_STYLE':
    case 'UPDATE_NODE_DETAILS':
    case 'TOGGLE_COLLAPSE':
    case 'UPDATE_NODE_SHAPE': {
      const { nodeId } = action.payload;
      const node = state.nodes[nodeId];
      if (!node) return state;
      
      let updatedNode: MindMapNode;
      if(action.type === 'UPDATE_NODE_CONTENT') updatedNode = { ...node, content: action.payload.content };
      else if(action.type === 'UPDATE_NODE_POSITION') updatedNode = { ...node, position: action.payload.position };
      else if(action.type === 'UPDATE_NODE_STYLE') updatedNode = { ...node, style: { ...node.style, ...action.payload.style } };
      else if(action.type === 'UPDATE_NODE_DETAILS') updatedNode = { ...node, note: action.payload.note ?? node.note, link: action.payload.link ?? node.link };
      else if(action.type === 'TOGGLE_COLLAPSE') updatedNode = { ...node, isCollapsed: !node.isCollapsed };
      else if(action.type === 'UPDATE_NODE_SHAPE') updatedNode = { ...node, shape: action.payload.shape };
      else updatedNode = node;

      return { ...state, nodes: { ...state.nodes, [nodeId]: updatedNode } };
    }
      
    case 'TOGGLE_ROOT_BRANCH_COLLAPSE': {
        const rootNode = state.nodes[state.rootId];
        if (!rootNode) return state;
        
        const { branch } = action.payload;
        const updatedRootNode = { ...rootNode };
        if (branch === 'left') {
            updatedRootNode.isLeftCollapsed = !(updatedRootNode.isLeftCollapsed ?? false);
        } else {
            updatedRootNode.isRightCollapsed = !(updatedRootNode.isRightCollapsed ?? false);
        }

        return {
            ...state,
            nodes: {
                ...state.nodes,
                [state.rootId]: updatedRootNode,
            },
        };
    }

    case 'SET_SELECTED_NODE':
      return { ...state, selectedNodeId: action.payload.nodeId };
      
    case 'AUTO_LAYOUT': {
      const updatedNodes = autoLayout(state.nodes, state.rootId);
      return {
        ...state,
        nodes: updatedNodes,
      };
    }

    default:
      return state;
  }
};

export const useMindMap = () => {
  const [state, dispatch] = useReducer(mindMapReducer, getInitialState());

  useEffect(() => {
    saveMap(state);
  }, [state]);

  return { state, dispatch };
};
