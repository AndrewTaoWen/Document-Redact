import React, { forwardRef, useEffect, useRef } from 'react';
import { DocumentViewerProps } from '../types';

const DocumentViewer = forwardRef<HTMLCanvasElement, DocumentViewerProps>(({
  rectangles,
  currentRect,
  selectedRectangle,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onRectangleClick,
  onFindNearestBox
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Combine refs
  React.useImperativeHandle(ref, () => canvasRef.current!);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 600;

    // Draw sample document background
    drawDocumentBackground(ctx, canvas.width, canvas.height);
    
    // Draw all rectangles
    rectangles.forEach(rect => {
      drawRectangle(ctx, rect, rect.id === selectedRectangle);
    });

    // Draw current rectangle being drawn
    if (currentRect) {
      drawRectangle(ctx, currentRect, false, true);
    }

  }, [rectangles, currentRect, selectedRectangle]);

  const drawDocumentBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Draw a sample document background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Add some sample text lines to simulate a document
    ctx.fillStyle = '#333333';
    ctx.font = '14px Arial';
    
    const lines = [
      'Sample Document',
      'This is a sample document for redaction testing.',
      'You can draw rectangles over sensitive information.',
      '',
      'Name: John Doe',
      'Address: 123 Main Street',
      'Phone: (555) 123-4567',
      'Email: john.doe@example.com',
      '',
      'Account Number: 1234567890',
      'SSN: 123-45-6789',
      'Credit Card: 4532-1234-5678-9012',
      '',
      'Additional sensitive information can be redacted here.',
      'The tool allows you to draw rectangles and manage them.',
      'You can also find the nearest box to any point.',
    ];

    lines.forEach((line, index) => {
      ctx.fillText(line, 20, 30 + index * 20);
    });

    // Add border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
  };

  const drawRectangle = (
    ctx: CanvasRenderingContext2D, 
    rect: { x: number; y: number; width: number; height: number; color?: string; opacity?: number },
    isSelected: boolean = false,
    isDrawing: boolean = false
  ) => {
    const color = rect.color || '#ff0000';
    const opacity = rect.opacity || 0.3;

    // Draw redaction rectangle
    ctx.fillStyle = `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

    // Draw border
    ctx.strokeStyle = isSelected ? '#0066ff' : color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

    // Draw corner handles if selected
    if (isSelected) {
      const handleSize = 6;
      ctx.fillStyle = '#0066ff';
      
      // Corner handles
      ctx.fillRect(rect.x - handleSize/2, rect.y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(rect.x + rect.width - handleSize/2, rect.y - handleSize/2, handleSize, handleSize);
      ctx.fillRect(rect.x - handleSize/2, rect.y + rect.height - handleSize/2, handleSize, handleSize);
      ctx.fillRect(rect.x + rect.width - handleSize/2, rect.y + rect.height - handleSize/2, handleSize, handleSize);
    }

    // Draw "REDACTED" text if rectangle is large enough
    if (rect.width > 60 && rect.height > 20) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'REDACTED', 
        rect.x + rect.width / 2, 
        rect.y + rect.height / 2
      );
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on any rectangle
    for (const rectangle of rectangles) {
      if (x >= rectangle.x && x <= rectangle.x + rectangle.width &&
          y >= rectangle.y && y <= rectangle.y + rectangle.height) {
        onRectangleClick(rectangle.id);
        return;
      }
    }

    // If not clicking on a rectangle, find nearest box
    const nearestBox = onFindNearestBox(x, y);
    if (nearestBox) {
      onRectangleClick(nearestBox.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Document Viewer</h2>
        <p className="text-sm text-gray-600">
          Click and drag to draw redaction rectangles. Click on rectangles to select them.
        </p>
      </div>
      
      <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onClick={handleCanvasClick}
        />
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>• Click and drag to create redaction rectangles</p>
        <p>• Click on rectangles to select them</p>
        <p>• Use the options panel to manage rectangles</p>
      </div>
    </div>
  );
});

DocumentViewer.displayName = 'DocumentViewer';

export default DocumentViewer;
