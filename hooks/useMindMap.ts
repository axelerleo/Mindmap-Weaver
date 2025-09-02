
import { useReducer, useEffect } from 'react';
import type { MindMapState, MindMapData, MindMapNode, NodeStyle, Point, NodeShape, Connection } from '../types.ts';
import { autoLayout } from '../utils/layout.ts';

// FIX: Export Action type to be used across components.
export type Action =
  | { type: 'LOAD_MAP'; payload: MindMapState }
  | { type: 'NEW_MAP' }
  | { type: 'SET_MAP_ID', payload: { id: string } }
  | { type: 'ADD_NODE'; payload: { parentId: string; content?: string; branch?: 'left' | 'right' } }
  | { type: 'DELETE_NODE'; payload: { nodeId: string } }
  | { type: 'DELETE_NODES'; payload: { nodeIds: string[] } }
  | { type: 'UPDATE_NODE_CONTENT'; payload: { nodeId: string; content: string } }
  | { type: 'UPDATE_NODE_POSITION'; payload: { nodeId: string; position: Point } }
  | { type: 'UPDATE_NODE_STYLE'; payload: { nodeId: string; style: Partial<NodeStyle> } }
  | { type: 'UPDATE_MULTIPLE_NODES_STYLE'; payload: { nodeIds: string[]; style: Partial<NodeStyle> } }
  | { type: 'UPDATE_NODE_DETAILS'; payload: { nodeId: string; note?: string; link?: string } }
  | { type: 'TOGGLE_COLLAPSE'; payload: { nodeId: string } }
  | { type: 'TOGGLE_ROOT_BRANCH_COLLAPSE'; payload: { branch: 'left' | 'right' } }
  | { type: 'SET_SELECTED_NODES'; payload: { nodeIds: string[] } }
  | { type: 'UPDATE_NODE_SHAPE'; payload: { nodeId: string; shape: NodeShape } }
  | { type: 'UPDATE_MULTIPLE_NODES_SHAPE'; payload: { nodeIds: string[]; shape: NodeShape } }
  | { type: 'AUTO_LAYOUT' }
  | { type: 'ADD_CONNECTION'; payload: { from: string; to: string } }
  | { type: 'DELETE_CONNECTION'; payload: { connectionId: string } }
  | { type: 'SET_SELECTED_CONNECTION'; payload: { connectionId: string | null } }
  | { type: 'UNDO' }
  | { type: 'REDO' };

interface HistoryState {
    past: MindMapState[];
    present: MindMapState;
    future: MindMapState[];
}


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

const createNewMap = (): MindMapState => {
    const rootNode = createNewNode(null, 'Central Idea');
    rootNode.position = { x: 0, y: 0 };
    rootNode.isLeftCollapsed = false;
    rootNode.isRightCollapsed = false;

    return {
      id: null,
      name: rootNode.content,
      nodes: { [rootNode.id]: rootNode },
      connections: [],
      rootId: rootNode.id,
      selectedNodeIds: [],
      selectedConnectionId: null,
    };
};

const getInitialState = (): HistoryState => {
  const presentState = createNewMap();

  return {
    past: [],
    present: presentState,
    future: [],
  };
};

const isNodeInMainTree = (nodeId: string, state: MindMapState): boolean => {
    let currentId: string | null = nodeId;
    // Safety break to prevent infinite loops on corrupted data
    let safetyCounter = Object.keys(state.nodes).length; 
    while (currentId && safetyCounter > 0) {
        if (currentId === state.rootId) {
            return true; // We've reached the main root
        }
        const currentNode = state.nodes[currentId];
        // If node is missing or is a root of another tree, it's not in the main tree
        if (!currentNode || currentNode.parentId === null) {
            return false; 
        }
        currentId = currentNode.parentId;
        safetyCounter--;
    }
    return false;
};

const mindMapReducer = (state: MindMapState, action: Action): MindMapState => {
  switch (action.type) {
    case 'NEW_MAP':
        return createNewMap();

    case 'LOAD_MAP':
      return action.payload;
    
    case 'SET_MAP_ID':
        return { ...state, id: action.payload.id };
      
    case 'ADD_NODE': {
      const { parentId } = action.payload;
      const parentNode = state.nodes[parentId];
      if (!parentNode) return state;

      const newNode = createNewNode(parentId, action.payload.content);
      
      let branch: 'left' | 'right' | undefined;
      // If parent is an orphan node (new root), determine branch by position.
      if (parentNode.parentId === null && parentId !== state.rootId) {
        const childCount = Object.values(state.nodes).filter(n => n.parentId === parentId).length;
        branch = childCount % 2 === 0 ? 'right' : 'left';
      } else {
        const isRootParent = parentNode.id === state.rootId;
        branch = isRootParent ? action.payload.branch : parentNode.branch;
      }
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
        newY = parentNode.position.y;
      }

      newNode.position = {
        x: parentNode.position.x + (LEVEL_WIDTH * direction),
        y: newY,
      };
      
      const newConnection: Connection = {
        id: `conn_${newNode.id}`,
        from: parentId,
        to: newNode.id,
      };
      
      return {
        ...state,
        nodes: {
          ...state.nodes,
          [newNode.id]: newNode,
        },
        connections: [...state.connections, newConnection],
        selectedNodeIds: [newNode.id],
        selectedConnectionId: null,
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
        
        const newConnections = state.connections.filter(
          conn => !nodesToDelete.has(conn.from) && !nodesToDelete.has(conn.to)
        );
  
        return {
          ...state,
          nodes: newNodes,
          connections: newConnections,
          selectedNodeIds: state.selectedNodeIds.filter(id => id !== nodeId),
        };
      }
  
    case 'DELETE_NODES': {
      const { nodeIds } = action.payload;
      const nodesToDelete = new Set<string>();
      const queue = [...nodeIds.filter(id => id !== state.rootId)];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (nodesToDelete.has(currentId)) continue;
        nodesToDelete.add(currentId);
        Object.values(state.nodes).forEach(node => {
          if (node.parentId === currentId) {
            queue.push(node.id);
          }
        });
      }
      
      if (nodesToDelete.size === 0) return state;

      const newNodes = { ...state.nodes };
      nodesToDelete.forEach(id => delete newNodes[id]);
      
      const newConnections = state.connections.filter(
        conn => !nodesToDelete.has(conn.from) && !nodesToDelete.has(conn.to)
      );
      
      return {
        ...state,
        nodes: newNodes,
        connections: newConnections,
        selectedNodeIds: [],
        selectedConnectionId: null,
      };
    }

    case 'UPDATE_NODE_POSITION': {
        const { nodeId, position } = action.payload;
        const node = state.nodes[nodeId];
        if (!node) return state;

        // Prevent adding to history if position hasn't changed (e.g., on a simple click)
        if (node.position.x === position.x && node.position.y === position.y) {
            return state;
        }

        const updatedNode: MindMapNode = { ...node, position: position };
        return { ...state, nodes: { ...state.nodes, [nodeId]: updatedNode } };
    }
    
    case 'UPDATE_NODE_CONTENT': {
      const { nodeId, content } = action.payload;
      const node = state.nodes[nodeId];
      if (!node) return state;

      const updatedNode: MindMapNode = { ...node, content: content };
      const newNodes = { ...state.nodes, [nodeId]: updatedNode };

      if (nodeId === state.rootId) {
        return { ...state, nodes: newNodes, name: content };
      }
      return { ...state, nodes: newNodes };
    }

    case 'UPDATE_NODE_STYLE':
    case 'UPDATE_NODE_DETAILS':
    case 'TOGGLE_COLLAPSE':
    case 'UPDATE_NODE_SHAPE': {
      const { nodeId } = action.payload;
      const node = state.nodes[nodeId];
      if (!node) return state;
      
      let updatedNode: MindMapNode;
      if(action.type === 'UPDATE_NODE_STYLE') updatedNode = { ...node, style: { ...node.style, ...action.payload.style } };
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

    case 'SET_SELECTED_NODES':
      return { ...state, selectedNodeIds: action.payload.nodeIds, selectedConnectionId: null };
      
    case 'AUTO_LAYOUT': {
      const updatedNodes = autoLayout(state.nodes, state.rootId);
      return {
        ...state,
        nodes: updatedNodes,
      };
    }

    case 'ADD_CONNECTION': {
        const { from: originalFrom, to: originalTo } = action.payload;
    
        if (originalFrom === originalTo) return state;
    
        const fromIsInMainTree = isNodeInMainTree(originalFrom, state);
        const toIsInMainTree = isNodeInMainTree(originalTo, state);
        
        let from = originalFrom;
        let to = originalTo;
        
        // Logic: if connecting an orphan node to a node in the main tree,
        // the main tree node MUST be the parent. We reverse the connection if needed.
        if (!fromIsInMainTree && toIsInMainTree) {
            from = originalTo;
            to = originalFrom;
        }

        const fromNode = state.nodes[from];
        const toNode = state.nodes[to];
        if (!toNode || !fromNode) return state;
    
        // Extra safeguard: The root node can never become a child of another node.
        if (to === state.rootId) {
            return state;
        }

        // Prevent circular dependencies: the new parent (`from`) cannot be a
        // descendant of the new child (`to`). We check by traversing up from `from`
        // and seeing if we encounter `to`.
        let currentAncestorId: string | null = from;
        while (currentAncestorId) {
            if (currentAncestorId === to) {
                // This would create a loop, so we abort the action.
                return state;
            }
            const currentNode = state.nodes[currentAncestorId];
            currentAncestorId = currentNode ? currentNode.parentId : null;
        }

        let newBranch: 'left' | 'right' | undefined;
        if (fromNode.id === state.rootId) {
            newBranch = toNode.position.x < fromNode.position.x ? 'left' : 'right';
        } else {
            newBranch = fromNode.branch;
        }

        const newNodes = { ...state.nodes };

        // Update the node being moved first
        newNodes[to] = { ...newNodes[to], parentId: from, branch: newBranch };
        
        // Traverse descendants and update their branch property
        const updateBranchRecursively = (nodeId: string, branch: 'left' | 'right' | undefined) => {
            const children = Object.values(newNodes).filter(n => n.parentId === nodeId);
            for (const child of children) {
                newNodes[child.id] = { ...newNodes[child.id], branch: branch };
                updateBranchRecursively(child.id, branch);
            }
        };
        updateBranchRecursively(to, newBranch);

        const newConnection: Connection = {
            id: `conn_${from}_${to}_${Date.now()}`,
            from,
            to,
        };

        const oldParentId = state.nodes[to]?.parentId;
        const connectionsWithoutOld = oldParentId
            ? state.connections.filter(c => !(c.to === to && c.from === oldParentId))
            : state.connections;

        return {
            ...state,
            nodes: newNodes,
            connections: [...connectionsWithoutOld, newConnection],
        };
    }

    case 'DELETE_CONNECTION': {
        const { connectionId } = action.payload;
        const connectionToDelete = state.connections.find(c => c.id === connectionId);
        if (!connectionToDelete) return state;

        const newConnections = state.connections.filter(c => c.id !== connectionId);
        const targetNode = state.nodes[connectionToDelete.to];
        
        const updatedNode = { ...targetNode, parentId: null, branch: undefined };

        return {
            ...state,
            nodes: { ...state.nodes, [connectionToDelete.to]: updatedNode },
            connections: newConnections,
            selectedConnectionId: null,
        };
    }

    case 'SET_SELECTED_CONNECTION':
      return { ...state, selectedConnectionId: action.payload.connectionId, selectedNodeIds: [] };
      
    case 'UPDATE_MULTIPLE_NODES_STYLE': {
        const { nodeIds, style } = action.payload;
        const newNodes = { ...state.nodes };
        nodeIds.forEach(nodeId => {
            if (newNodes[nodeId]) {
                newNodes[nodeId] = {
                    ...newNodes[nodeId],
                    style: { ...newNodes[nodeId].style, ...style }
                };
            }
        });
        return { ...state, nodes: newNodes };
    }
    
    case 'UPDATE_MULTIPLE_NODES_SHAPE': {
        const { nodeIds, shape } = action.payload;
        const newNodes = { ...state.nodes };
        nodeIds.forEach(nodeId => {
            if (newNodes[nodeId]) {
                newNodes[nodeId] = { ...newNodes[nodeId], shape };
            }
        });
        return { ...state, nodes: newNodes };
    }

    default:
      return state;
  }
};

const undoable = (reducer: typeof mindMapReducer) => {
    const initialState = getInitialState();

    return (state: HistoryState = initialState, action: Action): HistoryState => {
        const { past, present, future } = state;

        // Actions that shouldn't affect the undo history
        const nonUndoableActions = ['SET_SELECTED_NODES', 'SET_SELECTED_CONNECTION', 'SET_MAP_ID'];
        if (nonUndoableActions.includes(action.type)) {
            return {
                ...state,
                present: reducer(present, action)
            };
        }

        switch (action.type) {
            case 'UNDO': {
                if (past.length === 0) return state;
                const previous = past[past.length - 1];
                const newPast = past.slice(0, past.length - 1);
                return {
                    past: newPast,
                    present: previous,
                    future: [present, ...future],
                };
            }
            case 'REDO': {
                if (future.length === 0) return state;
                const next = future[0];
                const newFuture = future.slice(1);
                return {
                    past: [...past, present],
                    present: next,
                    future: newFuture,
                };
            }
            case 'LOAD_MAP':
            case 'NEW_MAP': { // Loading a map should clear history
                return {
                    past: [],
                    present: reducer(present, action),
                    future: [],
                }
            }
            default: {
                const newPresent = reducer(present, action);
                // If the state hasn't changed, don't update history
                if (newPresent === present) {
                    return state;
                }
                return {
                    past: [...past, present],
                    present: newPresent,
                    future: [], // Clear future on new action
                };
            }
        }
    };
};

const finalReducer = undoable(mindMapReducer);

export const useMindMap = () => {
  const [historyState, dispatch] = useReducer(finalReducer, getInitialState());

  return { 
    state: historyState.present, 
    dispatch,
    canUndo: historyState.past.length > 0,
    canRedo: historyState.future.length > 0,
  };
};
