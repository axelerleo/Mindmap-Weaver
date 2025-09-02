
import type { MindMapData, MindMapNode } from '../types.ts';

const LEVEL_WIDTH = 250;
const NODE_VERTICAL_SPACING = 30;

interface TreeNode {
  id: string;
  children: TreeNode[];
  width: number;
  height: number;
}

const buildTree = (nodes: MindMapData, nodeId: string): TreeNode => {
  const node = nodes[nodeId];
  const treeNode: TreeNode = {
    id: nodeId,
    children: [],
    width: node.dimensions.width,
    height: node.dimensions.height,
  };

  const childrenIds = Object.values(nodes)
    .filter(n => n.parentId === nodeId)
    .map(n => n.id);
  
  for (const childId of childrenIds) {
    treeNode.children.push(buildTree(nodes, childId));
  }
  
  return treeNode;
};

const layoutBranch = (
    treeNode: TreeNode, 
    level: number, 
    yOffset: number, 
    positions: { [id: string]: { x: number; y: number } }, 
    direction: 'left' | 'right'
) => {
  let currentY = yOffset;
  
  const childrenLayouts = treeNode.children.map(child => {
      return layoutBranch(child, level + 1, 0, positions, direction);
  });

  const childrenHeight = childrenLayouts.reduce((acc, layout) => acc + layout.totalHeight, 0);

  const nodeHeightWithSpacing = treeNode.height + NODE_VERTICAL_SPACING;
  const totalHeight = Math.max(nodeHeightWithSpacing, childrenHeight);

  const directionMultiplier = direction === 'right' ? 1 : -1;
  const xPos = (level * LEVEL_WIDTH) * directionMultiplier;
  const finalXPos = direction === 'left' ? xPos - treeNode.width : xPos;

  positions[treeNode.id] = {
    x: finalXPos,
    y: yOffset + (totalHeight / 2) - (treeNode.height / 2),
  };

  let childY_Offset = yOffset + (totalHeight - childrenHeight) / 2;
  for (const child of treeNode.children) {
    const childLayout = layoutBranch(child, level + 1, childY_Offset, positions, direction);
    childY_Offset += childLayout.totalHeight;
  }

  return { totalHeight };
};

export const autoLayout = (nodes: MindMapData, rootId: string): MindMapData => {
  const rootNode = nodes[rootId];
  if (!rootNode) return nodes;

  const children = Object.values(nodes).filter(n => n.parentId === rootId);
  const leftChildren = children.filter(n => n.branch === 'left');
  const rightChildren = children.filter(n => n.branch === 'right');

  const leftTrees = leftChildren.map(child => buildTree(nodes, child.id));
  const rightTrees = rightChildren.map(child => buildTree(nodes, child.id));

  const finalPositions: { [id: string]: { x: number; y: number } } = {};

  const rightDummyPositions = {};
  const rightTotalHeight = rightTrees.reduce((acc, tree) => acc + layoutBranch(tree, 1, 0, rightDummyPositions, 'right').totalHeight, 0);
  
  const leftDummyPositions = {};
  const leftTotalHeight = leftTrees.reduce((acc, tree) => acc + layoutBranch(tree, 1, 0, leftDummyPositions, 'left').totalHeight, 0);

  const totalHeight = Math.max(leftTotalHeight, rightTotalHeight);

  const rootX = -(rootNode.dimensions.width / 2);
  const rootY = totalHeight / 2 - rootNode.dimensions.height / 2;
  finalPositions[rootId] = { x: rootX, y: rootY };

  let currentRightY = (totalHeight - rightTotalHeight) / 2;
  for (const tree of rightTrees) {
    const { totalHeight: branchHeight } = layoutBranch(tree, 1, currentRightY, finalPositions, 'right');
    currentRightY += branchHeight;
  }

  let currentLeftY = (totalHeight - leftTotalHeight) / 2;
  for (const tree of leftTrees) {
    const { totalHeight: branchHeight } = layoutBranch(tree, 1, currentLeftY, finalPositions, 'left');
    currentLeftY += branchHeight;
  }

  const updatedNodes = { ...nodes };
  for (const nodeId in finalPositions) {
    if (updatedNodes[nodeId]) {
      updatedNodes[nodeId].position = finalPositions[nodeId];
    }
  }

  return updatedNodes;
};