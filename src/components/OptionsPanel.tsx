import React, { useState } from 'react';
import { OptionsPanelProps, Rectangle } from '../types';

const OptionsPanel: React.FC<OptionsPanelProps> = ({
  rectangles,
  selectedRectangle,
  onRectangleSelect,
  onRectangleUpdate,
  onRectangleDelete,
  onAddRectangle,
  onFindNearestBox
}) => {
  const [presetRects] = useState<Rectangle[]>([
    { id: 'preset1', x: 0, y: 0, width: 100, height: 30, color: '#ff0000', opacity: 0.3 },
    { id: 'preset2', x: 0, y: 0, width: 150, height: 25, color: '#0000ff', opacity: 0.4 },
    { id: 'preset3', x: 0, y: 0, width: 200, height: 20, color: '#00ff00', opacity: 0.5 },
  ]);

  const selectedRect = rectangles.find(rect => rect.id === selectedRectangle);

  const handleDragStart = (e: React.DragEvent, presetRect: Rectangle) => {
    e.dataTransfer.setData('application/json', JSON.stringify(presetRect));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const addPresetRectangle = (presetRect: Rectangle) => {
    const newRect: Rectangle = {
      ...presetRect,
      x: 50,
      y: 50,
      id: ''
    };
    onAddRectangle(newRect);
  };

  const updateSelectedRect = (field: keyof Rectangle, value: any) => {
    if (selectedRectangle) {
      onRectangleUpdate(selectedRectangle, { [field]: value });
    }
  };

  const deleteSelectedRect = () => {
    if (selectedRectangle) {
      onRectangleDelete(selectedRectangle);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Redaction Options</h2>
        <p className="text-sm text-gray-600">Manage redaction rectangles</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Preset Rectangles */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-3">Preset Rectangles</h3>
          <p className="text-sm text-gray-600 mb-3">Drag these to the document or click to add:</p>
          
          <div className="space-y-2">
            {presetRects.map((presetRect, index) => (
              <div
                key={presetRect.id}
                draggable
                onDragStart={(e) => handleDragStart(e, presetRect)}
                onClick={() => addPresetRectangle(presetRect)}
                className="flex items-center justify-between p-2 border border-gray-300 rounded cursor-move hover:bg-gray-50"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 border border-gray-400"
                    style={{ backgroundColor: `${presetRect.color}${Math.floor((presetRect.opacity || 0.3) * 255).toString(16).padStart(2, '0')}` }}
                  />
                  <span className="text-sm text-gray-700">
                    {presetRect.width}×{presetRect.height}
                  </span>
                </div>
                <span className="text-xs text-gray-500">Drag or Click</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rectangle List */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-md font-medium text-gray-900 mb-3">
            Redaction Rectangles ({rectangles.length})
          </h3>
          
          {rectangles.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No rectangles created yet</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {rectangles.map((rect) => (
                <div
                  key={rect.id}
                  onClick={() => onRectangleSelect(rect.id)}
                  className={`p-2 border rounded cursor-pointer transition-colors ${
                    selectedRectangle === rect.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 border border-gray-400"
                        style={{ backgroundColor: `${rect.color || '#ff0000'}${Math.floor((rect.opacity || 0.3) * 255).toString(16).padStart(2, '0')}` }}
                      />
                      <span className="text-sm text-gray-700">
                        {Math.round(rect.x)},{Math.round(rect.y)} - {Math.round(rect.width)}×{Math.round(rect.height)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRectangleDelete(rect.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Rectangle Properties */}
        {selectedRect && (
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-3">Selected Rectangle</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">X</label>
                    <input
                      type="number"
                      value={Math.round(selectedRect.x)}
                      onChange={(e) => updateSelectedRect('x', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Y</label>
                    <input
                      type="number"
                      value={Math.round(selectedRect.y)}
                      onChange={(e) => updateSelectedRect('y', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Width</label>
                    <input
                      type="number"
                      value={Math.round(selectedRect.width)}
                      onChange={(e) => updateSelectedRect('width', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Height</label>
                    <input
                      type="number"
                      value={Math.round(selectedRect.height)}
                      onChange={(e) => updateSelectedRect('height', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={selectedRect.color || '#ff0000'}
                  onChange={(e) => updateSelectedRect('color', e.target.value)}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opacity: {Math.round((selectedRect.opacity || 0.3) * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedRect.opacity || 0.3}
                  onChange={(e) => updateSelectedRect('opacity', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                onClick={deleteSelectedRect}
                className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Delete Rectangle
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-4">
          <h3 className="text-md font-medium text-gray-900 mb-3">Quick Actions</h3>
          
          <div className="space-y-2">
            <button
              onClick={() => {
                const rect: Rectangle = {
                  x: 50,
                  y: 50,
                  width: 100,
                  height: 30,
                  color: '#ff0000',
                  opacity: 0.3,
                  id: ''
                };
                onAddRectangle(rect);
              }}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Add Rectangle
            </button>
            
            <button
              onClick={() => {
                rectangles.forEach(rect => onRectangleDelete(rect.id));
              }}
              className="w-full px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsPanel;
