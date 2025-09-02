
import React, { useState, useCallback, useEffect } from 'react';
import MindMapCanvas from './components/MindMapCanvas.tsx';
import Toolbar from './components/Toolbar.tsx';
import SidePanel from './components/SidePanel.tsx';
import GroupSidePanel from './components/GroupSidePanel.tsx';
import MapsModal from './components/MapsModal.tsx';
import { useMindMap } from './hooks/useMindMap.ts';
// FIX: Use the local User type definition to match the legacy Firebase SDK.
import type { User } from './types.ts';
import { auth } from './firebase/config.ts';
import { saveMapToFirestore, loadMapFromFirestore } from './services/mindMapService.ts';

const App: React.FC = () => {
  const { state, dispatch, canUndo, canRedo } = useMindMap();
  const { nodes, selectedNodeIds, rootId } = state;
  const [viewport, setViewport] = useState({ scale: 1, tx: 0, ty: 0 });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMapsModalOpen, setIsMapsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

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

  const handleLogin = () => {
    const provider = new (window as any).firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => console.error(error));
  };

  const handleLogout = () => {
    auth.signOut();
  };
  
 const handleSaveMap = async () => {
    if (!currentUser) {
        alert("You must be logged in to save a map.");
        return;
    }

    if (!state.id) {
        const newName = prompt("Enter a name for your mind map:", state.name);
        if (newName && newName.trim() !== "") {
            const stateToSave = {
                ...state,
                name: newName,
                nodes: {
                    ...state.nodes,
                    [state.rootId]: {
                        ...state.nodes[state.rootId],
                        content: newName,
                    },
                },
            };
            
            try {
                const savedId = await saveMapToFirestore(stateToSave, currentUser.uid, newName);
                dispatch({ type: 'LOAD_MAP', payload: { ...stateToSave, id: savedId } });
                alert(`Map "${newName}" saved successfully!`);
            } catch (error) {
                console.error("Error saving new map:", error);
                alert("Failed to save new map. Please try again.");
            }
        }
    } else {
        try {
            await saveMapToFirestore(state, currentUser.uid, state.name);
            alert(`Map "${state.name}" saved successfully!`);
        } catch (error) {
            console.error("Error updating map:", error);
            alert("Failed to save map. Please try again.");
        }
    }
 };

 const handleNewMap = useCallback(() => {
    if (confirm("Are you sure you want to create a new map? Any unsaved changes will be lost.")) {
        dispatch({ type: 'NEW_MAP' });
    }
 }, [dispatch]);

  const handleLoadMap = async (mapId: string) => {
    try {
        const loadedMapState = await loadMapFromFirestore(mapId);
        if (loadedMapState) {
            dispatch({ type: 'LOAD_MAP', payload: loadedMapState });
        }
        setIsMapsModalOpen(false);
    } catch (error) {
        alert("Failed to load map.");
    }
  };

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
          user={currentUser}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSave={handleSaveMap}
          onNewMap={handleNewMap}
          onOpenMaps={() => setIsMapsModalOpen(true)}
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
        {currentUser && isMapsModalOpen && (
            <MapsModal
                isOpen={isMapsModalOpen}
                onClose={() => setIsMapsModalOpen(false)}
                userId={currentUser.uid}
                onLoadMap={handleLoadMap}
            />
        )}
      </main>
    </div>
  );
};

export default App;
