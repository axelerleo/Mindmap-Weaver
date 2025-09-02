import React, { useState, useEffect } from 'react';
import type { MindMapNode, NodeStyle, NodeShape } from '../types';
import type { Dispatch } from 'react';
import type { Action } from '../hooks/useMindMap';

interface SidePanelProps {
  node: MindMapNode;
  dispatch: Dispatch<Action>;
  onClose: () => void;
}

const SidePanel: React.FC<SidePanelProps> = ({ node, dispatch, onClose }) => {
  const [style, setStyle] = useState(node.style);
  const [details, setDetails] = useState({ note: node.note, link: node.link });

  useEffect(() => {
    setStyle(node.style);
    setDetails({ note: node.note, link: node.link });
  }, [node]);

  const handleStyleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newStyle = { ...style, [name]: value };
    setStyle(newStyle);
    dispatch({ type: 'UPDATE_NODE_STYLE', payload: { nodeId: node.id, style: { [name]: value } } });
  };
  
  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(e.target.value);
    setStyle(s => ({ ...s, backgroundOpacity: newOpacity }));
    dispatch({ type: 'UPDATE_NODE_STYLE', payload: { nodeId: node.id, style: { backgroundOpacity: newOpacity } } });
  };

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleDetailsBlur = () => {
    dispatch({ type: 'UPDATE_NODE_DETAILS', payload: { nodeId: node.id, ...details } });
  };
  
  const handleShapeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const shape = e.target.value as NodeShape;
    dispatch({ type: 'UPDATE_NODE_SHAPE', payload: { nodeId: node.id, shape } });
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-lg z-10 p-4 transform transition-transform translate-x-0 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">Edit Node</h2>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-grow overflow-y-auto pr-2">
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Style</h3>
          <div className="flex items-center justify-between">
            <label htmlFor="shape" className="text-sm font-medium text-gray-600">Shape</label>
            <select
              id="shape"
              name="shape"
              value={node.shape || 'rounded-rectangle'}
              onChange={handleShapeChange}
              className="w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-sm text-gray-900"
            >
              <option value="rounded-rectangle">Rounded Rectangle</option>
              <option value="rectangle">Rectangle</option>
              <option value="oval">Oval</option>
            </select>
          </div>
          <ColorInput label="Background" name="backgroundColor" value={style.backgroundColor} onChange={handleStyleChange} />
          <div className="flex items-center justify-between">
            <label htmlFor="backgroundOpacity" className="text-sm font-medium text-gray-600">Background Opacity</label>
            <input
              type="range"
              id="backgroundOpacity"
              name="backgroundOpacity"
              min="0"
              max="1"
              step="0.05"
              value={style.backgroundOpacity ?? 1}
              onChange={handleOpacityChange}
              className="w-32"
            />
          </div>
          <ColorInput label="Border" name="borderColor" value={style.borderColor} onChange={handleStyleChange} />
          <ColorInput label="Text" name="textColor" value={style.textColor} onChange={handleStyleChange} />
          <ColorInput label="Line" name="lineColor" value={style.lineColor} onChange={handleStyleChange} />
        </div>
        <hr className="my-6" />
        <div className="space-y-4">
            <h3 className="font-semibold text-gray-700">Details</h3>
            <div>
                <label htmlFor="link" className="block text-sm font-medium text-gray-600 mb-1">Hyperlink</label>
                <input type="url" id="link" name="link" value={details.link} onChange={handleDetailsChange} onBlur={handleDetailsBlur} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="https://example.com" />
            </div>
            <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-600 mb-1">Note</label>
                <textarea id="note" name="note" value={details.note} onChange={handleDetailsChange} onBlur={handleDetailsBlur} rows={5} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" placeholder="Add a note..."></textarea>
            </div>
        </div>
      </div>
    </div>
  );
};


const ColorInput: React.FC<{ label: string; name: keyof Omit<NodeStyle, 'backgroundOpacity'>; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, name, value, onChange }) => (
    <div className="flex items-center justify-between">
        <label htmlFor={name} className="text-sm font-medium text-gray-600">{label}</label>
        <div className="relative">
            <input type="color" id={name} name={name} value={value} onChange={onChange} className="w-8 h-8 p-0 border-none cursor-pointer" style={{backgroundColor: value}} />
        </div>
    </div>
);


export default SidePanel;
