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

  const [connectionDragInfo, setConnectionDragInfo] = useState<{
    fromNodeId: string;
    startPoint: Point;
    endPoint: Point;
  } | null>(null);

  const [selectionRect, setSelectionRect] = useState<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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
  
  const handleConnectionStart = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = state.nodes[nodeId];
    if (!node) return;

    const canvasRect = canvasRef.current!.getBoundingClientRect();
    const startX = (e.clientX - canvasRect.left - viewport.tx) / viewport.scale;
    const startY = (e.clientY - canvasRect.top - viewport.ty) / viewport.scale;

    setConnectionDragInfo({
        fromNodeId: nodeId,
        startPoint: { x: startX, y: startY },
        endPoint: { x: startX, y: startY },
    });
}, [state.nodes, viewport]);


  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.metaKey || e.ctrlKey))) { 
        e.preventDefault();
        setIsPanning(true);
        panOffset.current = { x: e.clientX - viewport.tx, y: e.clientY - viewport.ty };
        return;
    }

    const target = e.target as HTMLElement;
    const isCanvasClick = !target.closest('.cursor-pointer, .connection-path');
    
    if (isCanvasClick && e.button === 0) {
        const canvasRect = canvasRef.current!.getBoundingClientRect();
        const startX = (e.clientX - canvasRect.left - viewport.tx) / viewport.scale;
        const startY = (e.clientY - canvasRect.top - viewport.ty) / viewport.scale;

        setSelectionRect({
            startX,
            startY,
            x: startX,
            y: startY,
            width: 0,
            height: 0,
        });

        dispatch({ type: 'SET_SELECTED_NODES', payload: { nodeIds: [] } });
        dispatch({ type: 'SET_SELECTED_CONNECTION', payload: { connectionId: null } });
    }
  }, [viewport.tx, viewport.ty, viewport.scale, dispatch]);

  const visibleNodes = useMemo(() => {
    const visibleNodeIds = new Set<string>();
    if (!state.nodes) return [];

    const allNodes = Object.values(state.nodes);
    const entryPoints = allNodes.filter(node => node.parentId === null);

    for (const entryPoint of entryPoints) {
        const queue: string[] = [entryPoint.id];
        visibleNodeIds.add(entryPoint.id);

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const currentNode = state.nodes[currentId];
            if (!currentNode) continue;

            const children = allNodes.filter(n => n.parentId === currentId);

            if (currentId === state.rootId) {
                // Special handling for the main root
                const leftChildren = children.filter(c => c.branch === 'left');
                const rightChildren = children.filter(c => c.branch === 'right');
                
                if (!currentNode.isLeftCollapsed) {
                    leftChildren.forEach(child => {
                        visibleNodeIds.add(child.id);
                        queue.push(child.id);
                    });
                }
                if (!currentNode.isRightCollapsed) {
                    rightChildren.forEach(child => {
                        visibleNodeIds.add(child.id);
                        queue.push(child.id);
                    });
                }
            } else if (!currentNode.isCollapsed) {
                // Standard handling for all other nodes
                children.forEach(child => {
                    visibleNodeIds.add(child.id);
                    queue.push(child.id);
                });
            }
        }
    }

    return Array.from(visibleNodeIds).map(id => state.nodes[id]).filter(Boolean);
}, [state.nodes, state.rootId]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (selectionRect) {
        const canvasRect = canvasRef.current!.getBoundingClientRect();
        const currentX = (e.clientX - canvasRect.left - viewport.tx) / viewport.scale;
        const currentY = (e.clientY - canvasRect.top - viewport.ty) / viewport.scale;

        const newX = Math.min(selectionRect.startX, currentX);
        const newY = Math.min(selectionRect.startY, currentY);
        const newWidth = Math.abs(currentX - selectionRect.startX);
        const newHeight = Math.abs(currentY - selectionRect.startY);

        setSelectionRect(r => r ? { ...r, x: newX, y: newY, width: newWidth, height: newHeight } : null);
        return;
    }
    if (connectionDragInfo) {
      const canvasRect = canvasRef.current!.getBoundingClientRect();
      const endX = (e.clientX - canvasRect.left - viewport.tx) / viewport.scale;
      const endY = (e.clientY - canvasRect.top - viewport.ty) / viewport.scale;
      setConnectionDragInfo(prev => prev ? { ...prev, endPoint: { x: endX, y: endY } } : null);
      return;
    }

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
    }
  }, [isPanning, viewport, setViewport, connectionDragInfo, selectionRect]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (selectionRect) {
        if (selectionRect.width > 5 || selectionRect.height > 5) {
            const selectedIds: string[] = [];
            visibleNodes.forEach(node => {
                const nodeRect = {
                    x: node.position.x,
                    y: node.position.y,
                    width: node.dimensions.width,
                    height: node.dimensions.height,
                };
                
                if (
                    selectionRect.x < nodeRect.x + nodeRect.width &&
                    selectionRect.x + selectionRect.width > nodeRect.x &&
                    selectionRect.y < nodeRect.y + nodeRect.height &&
                    selectionRect.y + selectionRect.height > nodeRect.y
                ) {
                    selectedIds.push(node.id);
                }
            });
            if (selectedIds.length > 0) {
                dispatch({ type: 'SET_SELECTED_NODES', payload: { nodeIds: selectedIds } });
            }
        }
        setSelectionRect(null);
    }

    if (connectionDragInfo) {
      const targetEl = e.target as HTMLElement;
      const connectPoint = targetEl.closest('[data-connect-point="true"]');
      if (connectPoint) {
          const toNodeId = connectPoint.getAttribute('data-node-id');
          if (toNodeId && toNodeId !== connectionDragInfo.fromNodeId) {
              dispatch({ type: 'ADD_CONNECTION', payload: { from: connectionDragInfo.fromNodeId, to: toNodeId } });
          }
      }
      setConnectionDragInfo(null);
      return;
    }
    
    if (dragInfo.current) {
      document.body.classList.remove('dragging-node');
      const { nodeId, currentPosition } = dragInfo.current;
      dispatch({ type: 'UPDATE_NODE_POSITION', payload: { nodeId: nodeId, position: currentPosition } });
      dragInfo.current = null;
    }
    if (isPanning) {
      setIsPanning(false);
    }
  }, [dispatch, isPanning, connectionDragInfo, selectionRect, visibleNodes]);

  const visibleConnections = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    return state.connections.filter(conn => visibleNodeIds.has(conn.from) && visibleNodeIds.has(conn.to));
  }, [state.connections, visibleNodes]);

  return (
    <div
      ref={canvasRef}
      className="w-full h-full overflow-hidden bg-gray-200"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isPanning || dragInfo.current || connectionDragInfo ? 'grabbing' : selectionRect ? 'crosshair' : 'grab' }}
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
            {/* Render Connections */}
            {visibleConnections.map(conn => {
                const fromNode = state.nodes[conn.from];
                const toNode = state.nodes[conn.to];

                if (!fromNode || !toNode) {
                    return null;
                }
                
                const offsetX = 10000;
                const offsetY = 10000;
                
                const fromY = fromNode.position.y + fromNode.dimensions.height / 2 + offsetY;
                const toY = toNode.position.y + toNode.dimensions.height / 2 + offsetY;
                
                let fromX, toX;
                
                if (toNode.position.x > fromNode.position.x) {
                    fromX = fromNode.position.x + fromNode.dimensions.width + offsetX;
                    toX = toNode.position.x + offsetX;
                } else {
                    fromX = fromNode.position.x + offsetX;
                    toX = toNode.position.x + toNode.dimensions.width + offsetX;
                }
            
                const pathData = `M ${fromX} ${fromY} C ${fromX + (toX - fromX) / 2} ${fromY}, ${toX - (toX - fromX) / 2} ${toY}, ${toX} ${toY}`;
                const isSelected = state.selectedConnectionId === conn.id;

                return (
                    <path
                        key={conn.id}
                        className="connection-path pointer-events-auto"
                        d={pathData}
                        stroke={isSelected ? '#3b82f6' : toNode.style.lineColor}
                        strokeWidth={isSelected ? 4 : 2}
                        fill="none"
                        style={{ cursor: 'pointer', transition: 'stroke 0.2s' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch({ type: 'SET_SELECTED_CONNECTION', payload: { connectionId: conn.id }});
                        }}
                    />
                );
            })}
            
            {/* Render temporary connection line */}
            {connectionDragInfo && (() => {
                const { startPoint, endPoint } = connectionDragInfo;
                const offsetX = 10000;
                const offsetY = 10000;
                const fromX = startPoint.x + offsetX;
                const fromY = startPoint.y + offsetY;
                const toX = endPoint.x + offsetX;
                const toY = endPoint.y + offsetY;
                const pathData = `M ${fromX} ${fromY} C ${fromX + (toX - fromX) / 2} ${fromY}, ${toX - (toX - fromX) / 2} ${toY}, ${toX} ${toY}`;
                return <path d={pathData} stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" fill="none" />;
            })()}
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
              isSelected={state.selectedNodeIds.includes(node.id)}
              dispatch={dispatch}
              onDragStart={handleNodeDragStart}
              onConnectionStart={handleConnectionStart}
              childCount={isRoot ? 0 : allChildren.length}
              leftChildrenCount={isRoot ? allChildren.filter(c => c.branch === 'left').length : 0}
              rightChildrenCount={isRoot ? allChildren.filter(c => c.branch === 'right').length : 0}
            />
          );
        })}
        {selectionRect && (
            <div
                className="absolute border-2 border-dashed border-blue-500 bg-blue-500 bg-opacity-20 pointer-events-none z-30"
                style={{
                    transform: `translate(${selectionRect.x}px, ${selectionRect.y}px)`,
                    width: `${selectionRect.width}px`,
                    height: `${selectionRect.height}px`,
                }}
            />
        )}
      </div>
    </div>
  );
};

export default MindMapCanvas;
