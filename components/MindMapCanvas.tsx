import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import type { MindMapState, Point } from '../types';
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
  const [isPanning, setIsPanning] = useState(false);
  const panOffset = useRef({ x: 0, y: 0 });

  const dragInfo = useRef<{
    nodeId: string;
    offsetX: number;
    offsetY: number;
    currentPosition: Point;
  } | null>(null);

  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lineRefs = useRef<Map<string, SVGPathElement>>(new Map());

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `body.dragging-node { user-select: none; }`;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport(v => ({ ...v, scale: v.scale * zoomFactor }));
  }, [setViewport]);
  
  const handleNodeDragStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = state.nodes[nodeId];
    if (!node) return;
    
    document.body.classList.add('dragging-node');

    dragInfo.current = {
      nodeId,
      offsetX: e.clientX / viewport.scale - node.position.x,
      offsetY: e.clientY / viewport.scale - node.position.y,
      currentPosition: { ...node.position },
    };
  }, [state.nodes, viewport.scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.metaKey || e.ctrlKey))) { 
        e.preventDefault();
        setIsPanning(true);
        panOffset.current = { x: e.clientX - viewport.tx, y: e.clientY - viewport.ty };
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
  
  const updateConnectingLines = useCallback((nodeId: string, newPosition: Point) => {
    const node = state.nodes[nodeId];
    if (!node) return;

    const offsetX = 10000;
    const offsetY = 10000;

    // Update line from parent to this dragged node
    if (node.parentId) {
      const parentNode = state.nodes[node.parentId];
      const lineEl = lineRefs.current.get(`line-${nodeId}`);
      if (parentNode && lineEl) {
        const fromY = parentNode.position.y + parentNode.dimensions.height / 2 + offsetY;
        const toY = newPosition.y + node.dimensions.height / 2 + offsetY;
        let fromX, toX;
        if (newPosition.x > parentNode.position.x) {
            fromX = parentNode.position.x + parentNode.dimensions.width + offsetX;
            toX = newPosition.x + offsetX;
        } else {
            fromX = parentNode.position.x + offsetX;
            toX = newPosition.x + node.dimensions.width + offsetX;
        }
        const pathData = `M ${fromX} ${fromY} C ${fromX + (toX - fromX) / 2} ${fromY}, ${toX - (toX - fromX) / 2} ${toY}, ${toX} ${toY}`;
        lineEl.setAttribute('d', pathData);
      }
    }

    // Update lines from this dragged node to its children
    const children = Object.values(state.nodes).filter(n => n.parentId === nodeId && visibleNodes.some(vn => vn.id === n.id));
    for (const child of children) {
      const lineEl = lineRefs.current.get(`line-${child.id}`);
      if (lineEl) {
        const fromY = newPosition.y + node.dimensions.height / 2 + offsetY;
        const toY = child.position.y + child.dimensions.height / 2 + offsetY;
        let fromX, toX;
        if (child.position.x > newPosition.x) {
            fromX = newPosition.x + node.dimensions.width + offsetX;
            toX = child.position.x + offsetX;
        } else {
            fromX = newPosition.x + offsetX;
            toX = child.position.x + child.dimensions.width + offsetX;
        }
        const pathData = `M ${fromX} ${fromY} C ${fromX + (toX - fromX) / 2} ${fromY}, ${toX - (toX - fromX) / 2} ${toY}, ${toX} ${toY}`;
        lineEl.setAttribute('d', pathData);
      }
    }
  }, [state.nodes, visibleNodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setViewport(v => ({ ...v, tx: e.clientX - panOffset.current.x, ty: e.clientY - panOffset.current.y}));
      return;
    }

    if (dragInfo.current) {
      const { nodeId, offsetX, offsetY } = dragInfo.current;
      const newX = e.clientX / viewport.scale - offsetX;
      const newY = e.clientY / viewport.scale - offsetY;
      
      dragInfo.current.currentPosition = { x: newX, y: newY };
      
      const nodeEl = nodeRefs.current.get(nodeId);
      if (nodeEl) {
        nodeEl.style.transform = `translate(${newX}px, ${newY}px)`;
      }
      updateConnectingLines(nodeId, { x: newX, y: newY });
    }
  }, [isPanning, viewport.scale, setViewport, updateConnectingLines]);

  const handleMouseUp = useCallback(() => {
    if (dragInfo.current) {
      document.body.classList.remove('dragging-node');
      const { nodeId, currentPosition } = dragInfo.current;
      dispatch({ type: 'UPDATE_NODE_POSITION', payload: { nodeId: nodeId, position: currentPosition } });
      dragInfo.current = null;
    }
    if (isPanning) {
      setIsPanning(false);
    }
  }, [dispatch, isPanning]);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full overflow-hidden bg-gray-200"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning || dragInfo.current ? 'grabbing' : 'grab' }}
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

                const offsetX = 10000;
                const offsetY = 10000;
                
                const fromY = parentNode.position.y + parentNode.dimensions.height / 2 + offsetY;
                const toY = node.position.y + node.dimensions.height / 2 + offsetY;
                
                let fromX, toX;
                
                // Child is to the right of the parent
                if (node.position.x > parentNode.position.x) {
                    fromX = parentNode.position.x + parentNode.dimensions.width + offsetX;
                    toX = node.position.x + offsetX;
                } else { // Child is to the left of the parent
                    fromX = parentNode.position.x + offsetX;
                    toX = node.position.x + node.dimensions.width + offsetX;
                }
            
                const pathData = `M ${fromX} ${fromY} C ${fromX + (toX - fromX) / 2} ${fromY}, ${toX - (toX - fromX) / 2} ${toY}, ${toX} ${toY}`;

                return (
                    <path
                        key={`line-${node.id}`}
                        ref={el => {
                            if (el) lineRefs.current.set(`line-${node.id}`, el);
                            else lineRefs.current.delete(`line-${node.id}`);
                        }}
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
          
          return (
            <MemoizedNode
              key={node.id}
              ref={el => {
                  if (el) nodeRefs.current.set(node.id, el);
                  else nodeRefs.current.delete(node.id);
              }}
              node={node}
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