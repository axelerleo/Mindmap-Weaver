import React from 'react';
import type { NodeStyle, NodeShape } from '../types.ts';
import type { Dispatch } from 'react';
import type { Action } from '../hooks/useMindMap.ts';

interface GroupSidePanelProps {
  nodeIds: string[];
  dispatch: Dispatch<Action>;
  onClose: () => void;
}

const GroupSidePanel: React.FC<GroupSidePanelProps> = ({ nodeIds, dispatch, onClose }) => {

  const handleStyleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch({ type: 'UPDATE_MULTIPLE_NODES_STYLE', payload: { nodeIds, style: { [name]: value } } });
  };
  
  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    dispatch({ type: 'UPDATE_MULTIPLE_NODES_STYLE', payload: { nodeIds, style: { backgroundOpacity: newOpacity } } });
  };
  
  const handleShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const shape = e.target.value as NodeShape;
    dispatch({ type: 'UPDATE_MULTIPLE_NODES_SHAPE', payload: { nodeIds, shape } });
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-lg z-10 p-4 transform transition-transform translate-x-0 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Group Edit ({nodeIds.length} nodes)</h2>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-grow overflow-y-auto pr-2">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Style</h3>
          <div className="flex items-center justify-between">
            <label htmlFor="group-shape" className="text-sm font-medium text-gray-600">Shape</label>
            <select
              id="group-shape"
              name="shape"
              onChange={handleShapeChange}
              defaultValue=""
              className="w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-sm text-gray-900"
            >
              <option value="" disabled>-- Select Shape --</option>
              <option value="rounded-rectangle">Rounded Rectangle</option>
              <option value="rectangle">Rectangle</option>
              <option value="oval">Oval</option>
            </select>
          </div>
          <ColorInput label="Background" name="backgroundColor" onChange={handleStyleChange} />
          <div className="flex items-center justify-between">
            <label htmlFor="group-backgroundOpacity" className="text-sm font-medium text-gray-600">Background Opacity</label>
            <input
              type="range"
              id="group-backgroundOpacity"
              name="backgroundOpacity"
              min="0"
              max="1"
              step="0.05"
              defaultValue="1"
              onChange={handleOpacityChange}
              className="w-32"
            />
          </div>
          <ColorInput label="Border" name="borderColor" onChange={handleStyleChange} />
          <ColorInput label="Text" name="textColor" onChange={handleStyleChange} />
          <ColorInput label="Line" name="lineColor" onChange={handleStyleChange} />
        </div>
      </div>
    </div>
  );
};


const ColorInput: React.FC<{ label: string; name: keyof Omit<NodeStyle, 'backgroundOpacity'>; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, name, onChange }) => (
    <div className="flex items-center justify-between">
        <label htmlFor={`group-${name}`} className="text-sm font-medium text-gray-600">{label}</label>
        <div className="relative">
            <input type="color" id={`group-${name}`} name={name} defaultValue="#ffffff" onChange={onChange} className="w-8 h-8 p-0 border-none cursor-pointer" />
        </div>
    </div>
);


export default GroupSidePanel;