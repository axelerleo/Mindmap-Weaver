import React, { useState, useCallback, useEffect } from 'react';
import MindMapCanvas from './components/MindMapCanvas';
import Toolbar from './components/Toolbar';
import SidePanel from './components/SidePanel';
import { useMindMap } from './hooks/useMindMap';

const App: React.FC = () => {
  const { state, dispatch } = useMindMap();
  const { nodes, selectedNodeId, rootId } = state;
  const [viewport, setViewport] = useState({ scale: 1, tx: 0, ty: 0 });

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setViewport(v => ({
      ...v,
      scale: direction === 'in' ? v.scale * 1.2 : v.scale / 1.2,
    }));
  }, []);
  
  const handleAutoLayout = useCallback(() => {
    dispatch({ type: 'AUTO_LAYOUT' });
  }, [dispatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;

      const activeElement = document.activeElement;
      const isEditing = 
        activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable
        );

      if (isEditing) return;

      if (selectedNodeId && selectedNodeId !== rootId) {
        e.preventDefault();
        dispatch({ type: 'DELETE_NODE', payload: { nodeId: selectedNodeId } });
      } else if (state.selectedConnectionId) {
        e.preventDefault();
        dispatch({ type: 'DELETE_CONNECTION', payload: { connectionId: state.selectedConnectionId } });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeId, state.selectedConnectionId, rootId, dispatch]);

  return (
    <div className="w-screen h-screen bg-gray-100 font-sans flex flex-col overflow-hidden">
      <header className="flex-shrink-0 bg-white shadow-md z-20 p-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">AI Mind Map Weaver</h1>
        <Toolbar onZoom={handleZoom} onAutoLayout={handleAutoLayout} />
      </header>
      <main className="flex-grow relative">
        <MindMapCanvas
          state={state}
          dispatch={dispatch}
          viewport={viewport}
          setViewport={setViewport}
        />
        {selectedNode && (
          <SidePanel
            node={selectedNode}
            dispatch={dispatch}
            onClose={() => dispatch({ type: 'SET_SELECTED_NODE', payload: { nodeId: null } })}
          />
        )}
      </main>
    </div>
  );
};

export default App;