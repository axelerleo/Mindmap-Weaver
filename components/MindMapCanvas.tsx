import React, { useRef, useCallback, useState, useMemo } from 'react';
import type { MindMapState, MindMapNode, Point } from '../types';
import { MemoizedNode } from './Node';
import type { Dispatch } from 'react';
import type { Action } from '../hooks/useMindMap';

interface MindMapCanvasProps {
  state: MindMapState;
  dispatch: Dispatch<Action>;
  viewport: { scale: number; tx: number; ty: number };
  setViewport: React.Dispatch<React.SetStateAction<{ scale: number; tx: number; ty: number }>>;
}

const MindMapCanvas: React.FC<MindMapCanvasProps> = ({ state, dispatch, viewport, setViewport }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [draggedPosition, setDraggedPosition] = useState<{ x: number; y: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport(v => ({ ...v, scale: v.scale * zoomFactor }));
  }, [setViewport]);
  
  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    const node = state.nodes[nodeId];
    if (!node) return;
    setDraggingNodeId(nodeId);
    setDraggedPosition(node.position);
    dragOffset.current = {
      x: e.clientX / viewport.scale - node.position.x,
      y: e.clientY / viewport.scale - node.position.y,
    };
  }, [state.nodes, viewport.scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.metaKey || e.ctrlKey))) { 
        e.preventDefault();
        setIsPanning(true);
        dragOffset.current = { x: e.clientX - viewport.tx, y: e.clientY - viewport.ty };
    }
    if (!(e.target as HTMLElement).closest('.cursor-pointer')) {
        dispatch({ type: 'SET_SELECTED_NODE', payload: { nodeId: null } });
    }
  }, [viewport.tx, viewport.ty, dispatch]);

  const visibleNodes = useMemo(() => {
    const visibleNodeIds = new Set<string>();
    if(!state.rootId || !state.nodes[state.rootId]) return [];

    const queue = [state.rootId];
    visibleNodeIds.add(state.rootId);
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = state.nodes[currentId];
      if (!currentNode) continue;

      const isRoot = currentNode.id === state.rootId;

      const children = Object.values(state.nodes).filter(n => n.parentId === currentId);

      for (const child of children) {
          let shouldShow = false;
          if (isRoot) {
              if (child.branch === 'left' && !currentNode.isLeftCollapsed) {
                  shouldShow = true;
              } else if (child.branch === 'right' && !currentNode.isRightCollapsed) {
                  shouldShow = true;
              }
          } else if (!currentNode.isCollapsed) {
              shouldShow = true;
          }

          if (shouldShow) {
              visibleNodeIds.add(child.id);
              queue.push(child.id);
          }
      }
    }
    return Array.from(visibleNodeIds).map(id => state.nodes[id]).filter(Boolean);
  }, [state.nodes, state.rootId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = e.clientX / viewport.scale - dragOffset.current.x;
      const newY = e.clientY / viewport.scale - dragOffset.current.y;
      setDraggedPosition({ x: newX, y: newY });
    } else if(isPanning) {
        setViewport(v => ({ ...v, tx: e.clientX - dragOffset.current.x, ty: e.clientY - dragOffset.current.y}));
    }
  }, [draggingNodeId, isPanning, viewport, setViewport]);

  const handleMouseUp = useCallback(() => {
    if (draggingNodeId && draggedPosition) {
      dispatch({ type: 'UPDATE_NODE_POSITION', payload: { nodeId: draggingNodeId, position: draggedPosition } });
    }
    setDraggingNodeId(null);
    setDraggedPosition(null);
    setIsPanning(false);
  }, [draggingNodeId, draggedPosition, dispatch]);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full overflow-hidden bg-gray-200"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
    >
      <div
        className="transform-origin-top-left"
        style={{ transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.scale})` }}
      >
        <svg
          className="absolute pointer-events-none"
          style={{
            width: '20000px',
            height: '20000px',
            top: '-10000px',
            left: '-10000px',
          }}
        >
          <defs>
            <pattern id="pattern-circles" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" className="fill-gray-300"></circle>
            </pattern>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)"></rect>
          <g>
            {/* Hierarchical Connections */}
            {visibleNodes.map(node => {
                if (!node.parentId) return null;
                const parentNode = state.nodes[node.parentId];
                if (!parentNode || !visibleNodes.some(n => n.id === parentNode.id)) return null;

                const childToRender = node.id === draggingNodeId && draggedPosition ? { ...node, position: draggedPosition } : node;
                const parentToRender = parentNode.id === draggingNodeId && draggedPosition ? { ...parentNode, position: draggedPosition } : parentNode;

                const offsetX = 10000;
                const offsetY = 10000;
                
                const fromY = parentToRender.position.y + parentToRender.dimensions.height / 2 + offsetY;
                const toY = childToRender.position.y + childToRender.dimensions.height / 2 + offsetY;
                
                let fromX, toX;
                
                // Child is to the right of the parent
                if (childToRender.position.x > parentToRender.position.x) {
                    fromX = parentToRender.position.x + parentToRender.dimensions.width + offsetX;
                    toX = childToRender.position.x + offsetX;
                } else { // Child is to the left of the parent
                    fromX = parentToRender.position.x + offsetX;
                    toX = childToRender.position.x + childToRender.dimensions.width + offsetX;
                }
            
                const pathData = `M ${fromX} ${fromY} C ${fromX + (toX - fromX) / 2} ${fromY}, ${toX - (toX - fromX) / 2} ${toY}, ${toX} ${toY}`;

                return (
                    <path
                        key={`line-${node.id}`}
                        d={pathData}
                        stroke={node.style.lineColor}
                        strokeWidth="2"
                        fill="none"
                    />
                );
            })}
          </g>
        </svg>
        {visibleNodes.map(node => {
          const isRoot = node.id === state.rootId;
          const allChildren = Object.values(state.nodes).filter(n => n.parentId === node.id);
          
          const isDragging = node.id === draggingNodeId;
          const nodeToRender = isDragging && draggedPosition ? { ...node, position: draggedPosition } : node;

          return (
            <MemoizedNode
              key={node.id}
              node={nodeToRender}
              isSelected={state.selectedNodeId === node.id}
              dispatch={dispatch}
              onDragStart={handleNodeDragStart}
              childCount={isRoot ? 0 : allChildren.length}
              leftChildrenCount={isRoot ? allChildren.filter(c => c.branch === 'left').length : 0}
              rightChildrenCount={isRoot ? allChildren.filter(c => c.branch === 'right').length : 0}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MindMapCanvas;
