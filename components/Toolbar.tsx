import React from 'react';
import { AutoLayoutIcon, UndoIcon, RedoIcon } from './Icons';

interface ToolbarProps {
  onZoom: (direction: 'in' | 'out') => void;
  onAutoLayout: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const ToolbarButton: React.FC<React.PropsWithChildren<{ onClick: () => void; title: string, disabled?: boolean }>> = ({ onClick, title, children, disabled = false }) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="p-2 rounded-md hover:bg-gray-200 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      {children}
    </button>
);

const Toolbar: React.FC<ToolbarProps> = ({ onZoom, onAutoLayout, onUndo, onRedo, canUndo, canRedo }) => {
  return (
    <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
        <ToolbarButton onClick={() => onZoom('in')} title="Zoom In">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
        </ToolbarButton>
        <ToolbarButton onClick={() => onZoom('out')} title="Zoom Out">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300"></div>
        <ToolbarButton onClick={onAutoLayout} title="Auto Layout">
            <AutoLayoutIcon />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300"></div>
        <ToolbarButton onClick={onUndo} title="Undo (Ctrl+Z)" disabled={!canUndo}>
            <UndoIcon />
        </ToolbarButton>
        <ToolbarButton onClick={onRedo} title="Redo (Ctrl+Y)" disabled={!canRedo}>
            <RedoIcon />
        </ToolbarButton>
    </div>
  );
};

export default Toolbar;