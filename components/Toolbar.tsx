import React from 'react';
import { AutoLayoutIcon } from './Icons';

interface ToolbarProps {
  onZoom: (direction: 'in' | 'out') => void;
  onAutoLayout: () => void;
}

const ToolbarButton: React.FC<React.PropsWithChildren<{ onClick: () => void; title: string }>> = ({ onClick, title, children }) => (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-md hover:bg-gray-200 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {children}
    </button>
);

const Toolbar: React.FC<ToolbarProps> = ({ onZoom, onAutoLayout }) => {
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
    </div>
  );
};

export default Toolbar;
