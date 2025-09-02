
import React, { useState, useEffect } from 'react';
import type { UserMap } from '../types.ts';
import { loadUserMapsFromFirestore } from '../services/mindMapService.ts';

interface MapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onLoadMap: (mapId: string) => void;
}

const MapsModal: React.FC<MapsModalProps> = ({ isOpen, onClose, userId, onLoadMap }) => {
  const [maps, setMaps] = useState<UserMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true);
      loadUserMapsFromFirestore(userId)
        .then(userMaps => {
          setMaps(userMaps);
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Failed to load maps:", error);
          setIsLoading(false);
        });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">My Maps</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-gray-500">Loading maps...</p>
          ) : maps.length > 0 ? (
            <ul className="space-y-2">
              {maps.map(map => (
                <li key={map.id}>
                  <button
                    onClick={() => onLoadMap(map.id)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <p className="font-semibold text-gray-900">{map.name}</p>
                    <p className="text-sm text-gray-500">
                      Last updated: {map.updatedAt.toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500">You haven't saved any maps yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapsModal;