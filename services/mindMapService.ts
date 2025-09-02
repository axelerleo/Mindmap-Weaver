
import type { MindMapState, UserMap } from '../types.ts';
import { db } from '../firebase/config.ts';

export const saveMapToFirestore = async (state: MindMapState, userId: string, name: string): Promise<string> => {
  try {
    const mapDataToSave = { ...state };
    // Don't save the temporary ID in the document body
    delete mapDataToSave.id;

    if (state.id) {
      // Update existing map
      const mapRef = db.collection('mindmaps').doc(state.id);
      await mapRef.update({
        mapData: JSON.stringify(mapDataToSave),
        name: name, // also update name on subsequent saves
        updatedAt: new Date(),
      });
      return state.id;
    } else {
      // Create new map
      const newMapRef = await db.collection('mindmaps').add({
        userId,
        name,
        mapData: JSON.stringify(mapDataToSave),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return newMapRef.id;
    }
  } catch (error) {
    console.error("Error saving map to Firestore:", error);
    throw error;
  }
};

export const loadUserMapsFromFirestore = async (userId: string): Promise<UserMap[]> => {
    try {
        // Query without ordering to avoid needing a composite index
        const snapshot = await db.collection('mindmaps')
            .where('userId', '==', userId)
            .get();
        
        const maps = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            updatedAt: doc.data().updatedAt.toDate(),
        }));

        // Sort on the client-side
        maps.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        return maps;
    } catch (error) {
        console.error("Error loading user maps:", error);
        return [];
    }
};

export const loadMapFromFirestore = async (mapId: string): Promise<MindMapState | null> => {
    try {
        const doc = await db.collection('mindmaps').doc(mapId).get();
        if (!doc.exists) {
            console.error("No such map found!");
            return null;
        }
        const mapData = JSON.parse(doc.data()!.mapData);
        const name = doc.data()!.name;
        return { ...mapData, id: doc.id, name }; // Add the doc ID and name to the state
    } catch (error) {
        console.error("Error loading map:", error);
        return null;
    }
};