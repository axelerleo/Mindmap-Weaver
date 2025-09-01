
import type { MindMapState } from '../types';

const STORAGE_KEY = 'mindMapState';

export const saveMap = (state: MindMapState): void => {
  try {
    const stateString = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, stateString);
  } catch (error) {
    console.error("Failed to save mind map state:", error);
  }
};

export const loadMap = (): MindMapState | null => {
  try {
    const stateString = localStorage.getItem(STORAGE_KEY);
    if (stateString === null) {
      return null;
    }
    return JSON.parse(stateString) as MindMapState;
  } catch (error) {
    console.error("Failed to load mind map state:", error);
    return null;
  }
};
