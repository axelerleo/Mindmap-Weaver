import React, { useState, useCallback, useEffect } from 'react';
import MindMapCanvas from './components/MindMapCanvas';
import Toolbar from './components/Toolbar';
import SidePanel from './components/SidePanel';
import GroupSidePanel from './components/GroupSidePanel';
import { useMindMap } from './hooks/useMindMap';

const App: React.FC = () => {
  const { state, dispatch, canUndo, canRedo } = useMindMap();
  const { nodes, selectedNodeIds, rootId } = state;
  const [viewport, setViewport] = useState({ scale: 1, tx: 0, ty: 0 });

  const selectedNode = selectedNodeIds.length === 1 ? nodes[selectedNodeIds[0]] : null;

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setViewport(v => ({
      ...v,
      scale: direction === 'in' ? v.scale * 1.2 : v.scale / 1.2,
    }));
  }, []);
  
  const handleAutoLayout = useCallback(() => {
    dispatch({ type: 'AUTO_LAYOUT' });
  }, [dispatch]);

  const handleUndo = useCallback(() => {
    if (canUndo) dispatch({ type: 'UNDO' });
  }, [canUndo, dispatch]);

  const handleRedo = useCallback(() => {
    if (canRedo) dispatch({ type: 'REDO' });
  }, [canRedo, dispatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isEditing = 
        activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable
        );

      if (isEditing) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.length > 0) {
          e.preventDefault();
          const idsToDelete = selectedNodeIds.filter(id => id !== rootId);
          if (idsToDelete.length > 0) {
            dispatch({ type: 'DELETE_NODES', payload: { nodeIds: idsToDelete } });
          }
        } else if (state.selectedConnectionId) {
          e.preventDefault();
          dispatch({ type: 'DELETE_CONNECTION', payload: { connectionId: state.selectedConnectionId } });
        }
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNodeIds, state.selectedConnectionId, rootId, dispatch, handleUndo, handleRedo]);

  return (
    <div className="w-screen h-screen bg-gray-100 font-sans flex flex-col overflow-hidden">
      <header className="flex-shrink-0 bg-white shadow-md z-20 p-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">AI Mind Map Weaver</h1>
        <Toolbar 
          onZoom={handleZoom} 
          onAutoLayout={handleAutoLayout}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
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
            onClose={() => dispatch({ type: 'SET_SELECTED_NODES', payload: { nodeIds: [] } })}
          />
        )}
        {selectedNodeIds.length > 1 && (
           <GroupSidePanel
             nodeIds={selectedNodeIds}
             dispatch={dispatch}
             onClose={() => dispatch({ type: 'SET_SELECTED_NODES', payload: { nodeIds: [] } })}
            />
        )}
      </main>
    </div>
  );
};

export default App;