import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { MindMapNode } from '../types';
import { PlusIcon, TrashIcon, NoteIcon, LinkIcon, ExpandIcon, CollapseIcon } from './Icons';
import type { Dispatch } from 'react';
// FIX: Import the specific Action type from useMindMap to resolve type conflicts.
import type { Action } from '../hooks/useMindMap';

interface NodeProps {
  node: MindMapNode;
  isSelected: boolean;
  dispatch: Dispatch<Action>;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
  childCount: number;
  leftChildrenCount: number;
  rightChildrenCount: number;
}

const hexToRgba = (hex: string, alpha: number): string => {
  hex = hex.replace(/^#/, '');

  let bigint;
  if (hex.length === 3) {
    bigint = parseInt(hex.split('').map(c => c + c).join(''), 16);
  } else if (hex.length === 6) {
    bigint = parseInt(hex, 16);
  } else {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};


const Node: React.FC<NodeProps> = ({ node, isSelected, dispatch, onDragStart, childCount, leftChildrenCount, rightChildrenCount }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const isRoot = node.parentId === null;

  useEffect(() => {
    if (contentRef.current && isEditing) {
      contentRef.current.focus();
      document.execCommand('selectAll', false, undefined);
    }
  }, [isEditing]);

  const handleContentBlur = () => {
    setIsEditing(false);
    const content = contentRef.current?.innerText || '';
    if (content !== node.content) {
      dispatch({ type: 'UPDATE_NODE_CONTENT', payload: { nodeId: node.id, content } });
    }
  };
  
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SET_SELECTED_NODE', payload: { nodeId: node.id } });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const buttonClass = "flex items-center justify-center w-6 h-6 rounded-full bg-white shadow hover:bg-gray-200 transition-colors";

  const shapeClasses = {
    'rounded-rectangle': 'rounded-lg',
    'rectangle': 'rounded-none',
    'oval': 'rounded-full',
  };

  const paddingClass = 'px-4 py-2';
  const selectedClass = isSelected ? 'shadow-2xl ring-2 ring-blue-500 ring-offset-2' : 'shadow-md';

  const backgroundColorWithOpacity = hexToRgba(
    node.style.backgroundColor,
    node.style.backgroundOpacity ?? 1
  );

  return (
    <div
      className={`absolute select-none cursor-pointer transition-all duration-200 ${selectedClass} ${shapeClasses[node.shape || 'rounded-rectangle']}`}
      style={{
        transform: `translate(${node.position.x}px, ${node.position.y}px)`,
      }}
      onMouseDown={(e) => {
        if (!isEditing) onDragStart(e, node.id);
        handleSelect(e);
      }}
      onClick={handleSelect}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className={`relative ${paddingClass} ${shapeClasses[node.shape || 'rounded-rectangle']}`}
        style={{
          width: `${node.dimensions.width}px`,
          minHeight: `${node.dimensions.height}px`,
          backgroundColor: backgroundColorWithOpacity,
          color: node.style.textColor,
          border: `2px solid ${node.style.borderColor}`,
        }}
      >
        <div
          ref={contentRef}
          contentEditable={isEditing}
          suppressContentEditableWarning={true}
          onBlur={handleContentBlur}
          className="outline-none"
          style={{ minHeight: '1.5em' }}
        >
          {node.content}
        </div>
        
        {isSelected && (
          <>
            {isRoot ? (
              <>
                <div className="absolute top-1/2 -left-3 transform -translate-y-1/2 z-10">
                  <button 
                    className={buttonClass} 
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'ADD_NODE', payload: { parentId: node.id, branch: 'left' }})}} 
                    title="Add Left Node">
                      <PlusIcon />
                  </button>
                </div>
                <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <button 
                    className={buttonClass} 
                    onClick={(e) => { e.stopPropagation(); dispatch({ type: 'ADD_NODE', payload: { parentId: node.id, branch: 'right' }})}} 
                    title="Add Right Node">
                      <PlusIcon />
                  </button>
                </div>
              </>
            ) : (
              <div className="absolute -top-3 -right-3 flex flex-col space-y-1">
                <button className={buttonClass} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'ADD_NODE', payload: { parentId: node.id }})}} title="Add Child Node"><PlusIcon /></button>
                {node.parentId && <button className={buttonClass} onClick={(e) => { e.stopPropagation(); dispatch({ type: 'DELETE_NODE', payload: { nodeId: node.id }})}} title="Delete Node"><TrashIcon /></button>}
              </div>
            )}
          </>
        )}
        
        <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center">
            {isRoot ? (
                <>
                    {/* Left branch controls */}
                    <div className="flex items-center space-x-1">
                        {node.isLeftCollapsed && leftChildrenCount > 0 && (
                             <div 
                                className="flex items-center justify-center w-5 h-5 bg-gray-400 text-white text-xs font-bold rounded-full"
                                title={`${leftChildrenCount} hidden nodes`}
                            >
                                {leftChildrenCount}
                            </div>
                        )}
                        {leftChildrenCount > 0 && (
                            <button 
                                className={buttonClass} 
                                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_ROOT_BRANCH_COLLAPSE', payload: { branch: 'left' }}); }}
                                title={node.isLeftCollapsed ? 'Expand Left' : 'Collapse Left'}
                            >
                                {node.isLeftCollapsed ? <CollapseIcon /> : <ExpandIcon />}
                            </button>
                        )}
                    </div>
                    {/* Right branch controls */}
                    <div className="flex items-center space-x-1">
                        {node.note && (
                            <button className={`${buttonClass} bg-yellow-100`} onMouseEnter={() => setShowNote(true)} onMouseLeave={() => setShowNote(false)} title="View Note">
                            <NoteIcon />
                            </button>
                        )}
                        {node.link && (
                            <a href={node.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`${buttonClass} bg-blue-100`} title="Open Link">
                            <LinkIcon />
                            </a>
                        )}
                        {rightChildrenCount > 0 && (
                            <button 
                                className={buttonClass} 
                                onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_ROOT_BRANCH_COLLAPSE', payload: { branch: 'right' }}); }}
                                title={node.isRightCollapsed ? 'Expand Right' : 'Collapse Right'}
                            >
                                {node.isRightCollapsed ? <CollapseIcon /> : <ExpandIcon />}
                            </button>
                        )}
                        {node.isRightCollapsed && rightChildrenCount > 0 && (
                            <div 
                                className="flex items-center justify-center w-5 h-5 bg-gray-400 text-white text-xs font-bold rounded-full"
                                title={`${rightChildrenCount} hidden nodes`}
                            >
                                {rightChildrenCount}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                 <>
                    {/* Badge on the left */}
                    <div>
                    {node.isCollapsed && childCount > 0 && (
                        <div 
                        className="flex items-center justify-center w-5 h-5 bg-gray-400 text-white text-xs font-bold rounded-full"
                        title={`${childCount} hidden nodes`}
                        >
                        {childCount}
                        </div>
                    )}
                    </div>

                    {/* Icons on the right */}
                    <div className="flex items-center space-x-1">
                    {node.note && (
                        <button className={`${buttonClass} bg-yellow-100`} onMouseEnter={() => setShowNote(true)} onMouseLeave={() => setShowNote(false)} title="View Note">
                        <NoteIcon />
                        </button>
                    )}
                    {node.link && (
                        <a href={node.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`${buttonClass} bg-blue-100`} title="Open Link">
                        <LinkIcon />
                        </a>
                    )}
                    {childCount > 0 && (
                        <button 
                        className={buttonClass} 
                        onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_COLLAPSE', payload: { nodeId: node.id }}); }}
                        title={node.isCollapsed ? 'Expand' : 'Collapse'}
                        >
                        {node.isCollapsed ? <CollapseIcon /> : <ExpandIcon />}
                        </button>
                    )}
                    </div>
                </>
            )}
        </div>

      </div>
      
      {showNote && node.note && (
        <div className="absolute z-20 mt-2 w-64 p-3 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg text-sm text-gray-800" style={{top: '100%'}}>
            {node.note}
        </div>
      )}
    </div>
  );
};

export const MemoizedNode = React.memo(Node);