
import React, { useState } from 'react';
import { AutoLayoutIcon, UndoIcon, RedoIcon, FilePlusIcon } from './Icons.tsx';
// FIX: Use the local User type definition to match the legacy Firebase SDK.
import type { User } from '../types.ts';

interface ToolbarProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onSave: () => void;
  onNewMap: () => void;
  onOpenMaps: () => void;
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

const Toolbar: React.FC<ToolbarProps> = ({ user, onLogin, onLogout, onSave, onNewMap, onOpenMaps, onZoom, onAutoLayout, onUndo, onRedo, canUndo, canRedo }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  
  return (
    <div className="flex items-center space-x-2">
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
          <div className="w-px h-5 bg-gray-300"></div>
          <ToolbarButton onClick={onNewMap} title="New Map">
            <FilePlusIcon />
          </ToolbarButton>
          <div className="w-px h-5 bg-gray-300"></div>
          <ToolbarButton onClick={onSave} title="Save Map" disabled={!user}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          </ToolbarButton>
          <ToolbarButton onClick={onOpenMaps} title="My Maps" disabled={!user}>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </ToolbarButton>
      </div>
      <div className="relative">
          {user ? (
              <>
                  <button onClick={() => setShowDropdown(!showDropdown)} className="w-10 h-10 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                      <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`} alt="User avatar" className="w-full h-full object-cover" />
                  </button>
                  {showDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-30">
                          <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); setShowDropdown(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</a>
                      </div>
                  )}
              </>
          ) : (
              <button onClick={onLogin} className="px-4 py-2 text-sm font-semibold bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Login
              </button>
          )}
      </div>
    </div>
  );
};

export default Toolbar;
