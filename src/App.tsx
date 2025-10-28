import React, { useState, useRef, useCallback, useEffect } from 'react';

interface Box {
  id: string;
  x: number; // normalized coordinates (0-1)
  y: number;
  width: number;
  height: number;
  label: string;
  sensitivity: 'Low' | 'Med' | 'High';
  createdAt: string;
}

type Mode = 'draw' | 'find';

function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<Box | null>(null);
  const [nearestBox, setNearestBox] = useState<Box | null>(null);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [pendingBox, setPendingBox] = useState<Box | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; box: Box } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load boxes from localStorage on mount
  useEffect(() => {
    const savedBoxes = localStorage.getItem('redactionBoxes');
    if (savedBoxes) {
      try {
        setBoxes(JSON.parse(savedBoxes));
      } catch (error) {
        console.error('Failed to load saved boxes:', error);
      }
    }
  }, []);

  // Save boxes to localStorage whenever boxes change
  useEffect(() => {
    localStorage.setItem('redactionBoxes', JSON.stringify(boxes));
  }, [boxes]);

  // Load and draw the image on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loadImage = (src: string) => {
      const img = new Image();
      img.onload = () => {
        // Get container dimensions
        const container = canvas.parentElement;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;
        
        // Calculate scale to fit image in container
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
        
        // Set canvas size to fit container
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // Draw the image scaled to fit
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Draw all boxes
        boxes.forEach(box => {
          drawBox(ctx, box, box.id === selectedBox, canvas.width, canvas.height);
        });
        
        // Draw current box being drawn
        if (currentBox) {
          drawBox(ctx, currentBox, false, canvas.width, canvas.height, true);
        }
      };
      
      img.src = src;
      imageRef.current = img;
    };

    if (uploadedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        loadImage(e.target?.result as string);
      };
      reader.readAsDataURL(uploadedFile);
    } else {
      // Default image
      loadImage('/fw9_(3).webp');
    }
  }, [boxes, selectedBox, currentBox, uploadedFile, zoomLevel]);

  const drawBox = (
    ctx: CanvasRenderingContext2D, 
    box: Box, 
    isSelected: boolean = false,
    canvasWidth: number,
    canvasHeight: number,
    isDrawing: boolean = false
  ) => {
    // Convert normalized coordinates to canvas coordinates
    const x = box.x * canvasWidth;
    const y = box.y * canvasHeight;
    const width = box.width * canvasWidth;
    const height = box.height * canvasHeight;

    // Choose color based on sensitivity
    const colors = {
      Low: '#10b981', // green
      Med: '#f59e0b', // yellow
      High: '#ef4444' // red
    };
    const color = colors[box.sensitivity];
    const opacity = isDrawing ? 0.2 : 0.3;

    // Draw redaction rectangle
    ctx.fillStyle = `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeStyle = isSelected ? '#0066ff' : color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(x, y, width, height);

    // Draw corner handles if selected
    if (isSelected) {
      const handleSize = 12; // Increased from 8 to 12
      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3; // Increased from 2 to 3
      
      // Corner handles
      const handles = [
        { x: x - handleSize/2, y: y - handleSize/2 }, // nw
        { x: x + width - handleSize/2, y: y - handleSize/2 }, // ne
        { x: x - handleSize/2, y: y + height - handleSize/2 }, // sw
        { x: x + width - handleSize/2, y: y + height - handleSize/2 } // se
      ];
      
      handles.forEach(handle => {
        // Draw handle with shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
        ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      });
    }

    // Draw label if box is large enough
    if (width > 60 && height > 20) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(box.label, x + width / 2, y + height / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  };

  const addBox = useCallback((box: Box) => {
    setBoxes(prev => [...prev, box]);
    setSelectedBox(box.id);
  }, []);

  const updateBox = useCallback((id: string, updates: Partial<Box>) => {
    setBoxes(prev => prev.map(box => 
      box.id === id ? { ...box, ...updates } : box
    ));
  }, []);

  const deleteBox = useCallback((id: string) => {
    setBoxes(prev => prev.filter(box => box.id !== id));
    if (selectedBox === id) {
      setSelectedBox(null);
    }
  }, [selectedBox]);

  const findNearestBox = useCallback((x: number, y: number): { box: Box | null; distance: number } => {
    let nearest: Box | null = null;
    let minDistance = Infinity;

    boxes.forEach(box => {
      // Check if point is inside the box
      if (x >= box.x && x <= box.x + box.width && 
          y >= box.y && y <= box.y + box.height) {
        minDistance = 0;
        nearest = box;
        return;
      }

      // Calculate distance to the nearest edge of the box
      const left = box.x;
      const right = box.x + box.width;
      const top = box.y;
      const bottom = box.y + box.height;

      // Distance to each edge
      const distToLeft = Math.abs(x - left);
      const distToRight = Math.abs(x - right);
      const distToTop = Math.abs(y - top);
      const distToBottom = Math.abs(y - bottom);

      // Check if point is horizontally within box bounds
      const withinHorizontalBounds = x >= left && x <= right;
      const withinVerticalBounds = y >= top && y <= bottom;

      let distance: number;

      if (withinHorizontalBounds) {
        // Point is horizontally within box, distance is to nearest vertical edge
        distance = Math.min(distToTop, distToBottom);
      } else if (withinVerticalBounds) {
        // Point is vertically within box, distance is to nearest horizontal edge
        distance = Math.min(distToLeft, distToRight);
      } else {
        // Point is outside both bounds, distance is to nearest corner
        const distToTopLeft = Math.sqrt((x - left) ** 2 + (y - top) ** 2);
        const distToTopRight = Math.sqrt((x - right) ** 2 + (y - top) ** 2);
        const distToBottomLeft = Math.sqrt((x - left) ** 2 + (y - bottom) ** 2);
        const distToBottomRight = Math.sqrt((x - right) ** 2 + (y - bottom) ** 2);
        
        distance = Math.min(distToTopLeft, distToTopRight, distToBottomLeft, distToBottomRight);
      }
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = box;
      }
    });

    return { box: nearest, distance: minDistance };
  }, [boxes]);

  const getResizeHandle = useCallback((x: number, y: number, box: Box, canvasWidth: number, canvasHeight: number): string | null => {
    const handleSize = 12; // Match the handle size in drawBox
    const tolerance = handleSize / 2;
    
    // Convert normalized coordinates to canvas coordinates
    const boxX = box.x * canvasWidth;
    const boxY = box.y * canvasHeight;
    const boxWidth = box.width * canvasWidth;
    const boxHeight = box.height * canvasHeight;
    
    // Convert click coordinates to canvas coordinates
    const clickX = x * canvasWidth;
    const clickY = y * canvasHeight;
    
    // Check each corner handle
    const handles = {
      'nw': { x: boxX - tolerance, y: boxY - tolerance },
      'ne': { x: boxX + boxWidth - tolerance, y: boxY - tolerance },
      'sw': { x: boxX - tolerance, y: boxY + boxHeight - tolerance },
      'se': { x: boxX + boxWidth - tolerance, y: boxY + boxHeight - tolerance }
    };
    
    for (const [handle, pos] of Object.entries(handles)) {
      if (clickX >= pos.x && clickX <= pos.x + handleSize &&
          clickY >= pos.y && clickY <= pos.y + handleSize) {
        return handle;
      }
    }
    
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the scaling factor
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Convert mouse coordinates to canvas coordinates
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    
    // Convert to normalized coordinates
    const x = canvasX / canvas.width;
    const y = canvasY / canvas.height;

    // Check if we're clicking on a resize handle
    if (selectedBox) {
      const selectedBoxData = boxes.find(box => box.id === selectedBox);
      if (selectedBoxData) {
        const handle = getResizeHandle(x, y, selectedBoxData, canvas.width, canvas.height);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setResizeStart({ x, y, box: selectedBoxData });
          return;
        }
      }
    }

    // If not resizing and in draw mode, start drawing
    if (mode === 'draw') {
      setIsDrawing(true);
      setDragStart({ x, y });
      setCurrentBox({
        id: '',
        x,
        y,
        width: 0,
        height: 0,
        label: '',
        sensitivity: 'Med',
        createdAt: new Date().toISOString()
      });
    }
  }, [mode, selectedBox, boxes, getResizeHandle]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the scaling factor
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Convert mouse coordinates to canvas coordinates
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    
    // Convert to normalized coordinates
    const x = canvasX / canvas.width;
    const y = canvasY / canvas.height;
    
    // Update mouse coordinates for display
    setMouseCoords({ x: Math.round(canvasX), y: Math.round(canvasY) });

    // Check if hovering over resize handle for cursor feedback
    if (selectedBox && !isResizing && !isDrawing) {
      const selectedBoxData = boxes.find(box => box.id === selectedBox);
      if (selectedBoxData) {
        const handle = getResizeHandle(x, y, selectedBoxData, canvas.width, canvas.height);
        if (handle) {
          // Update cursor based on handle
          const cursor = handle === 'nw' || handle === 'se' ? 'nw-resize' : 'ne-resize';
          canvas.style.cursor = cursor;
        } else {
          canvas.style.cursor = mode === 'draw' ? 'crosshair' : 'pointer';
        }
      }
    }

    // Handle resizing
    if (isResizing && resizeStart && resizeHandle) {
      const deltaX = x - resizeStart.x;
      const deltaY = y - resizeStart.y;
      const originalBox = resizeStart.box;
      
      let newBox = { ...originalBox };
      
      // Apply resize based on handle
      switch (resizeHandle) {
        case 'nw': // Top-left
          newBox.x = Math.max(0, originalBox.x + deltaX);
          newBox.y = Math.max(0, originalBox.y + deltaY);
          newBox.width = Math.max(0.01, originalBox.width - deltaX);
          newBox.height = Math.max(0.01, originalBox.height - deltaY);
          break;
        case 'ne': // Top-right
          newBox.y = Math.max(0, originalBox.y + deltaY);
          newBox.width = Math.max(0.01, originalBox.width + deltaX);
          newBox.height = Math.max(0.01, originalBox.height - deltaY);
          break;
        case 'sw': // Bottom-left
          newBox.x = Math.max(0, originalBox.x + deltaX);
          newBox.width = Math.max(0.01, originalBox.width - deltaX);
          newBox.height = Math.max(0.01, originalBox.height + deltaY);
          break;
        case 'se': // Bottom-right
          newBox.width = Math.max(0.01, originalBox.width + deltaX);
          newBox.height = Math.max(0.01, originalBox.height + deltaY);
          break;
      }
      
      // Keep within bounds
      newBox.x = Math.max(0, Math.min(1 - newBox.width, newBox.x));
      newBox.y = Math.max(0, Math.min(1 - newBox.height, newBox.y));
      newBox.width = Math.min(1 - newBox.x, newBox.width);
      newBox.height = Math.min(1 - newBox.y, newBox.height);
      
      // Update the box
      updateBox(originalBox.id, newBox);
      
      // Redraw canvas
      const ctx = canvas.getContext('2d');
      if (ctx && imageRef.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageRef.current, 0, 0);
        
        boxes.forEach(box => {
          drawBox(ctx, box, box.id === selectedBox, canvas.width, canvas.height);
        });
      }
    } else if (mode === 'draw' && isDrawing && dragStart) {
      const newBox: Box = {
        id: '',
        x: Math.min(dragStart.x, x),
        y: Math.min(dragStart.y, y),
        width: Math.abs(x - dragStart.x),
        height: Math.abs(y - dragStart.y),
        label: '',
        sensitivity: 'Med',
        createdAt: new Date().toISOString()
      };

      setCurrentBox(newBox);
      
      // Redraw canvas
      const ctx = canvas.getContext('2d');
      if (ctx && imageRef.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageRef.current, 0, 0);
        
        boxes.forEach(box => {
          drawBox(ctx, box, box.id === selectedBox, canvas.width, canvas.height);
        });
        
        drawBox(ctx, newBox, false, canvas.width, canvas.height, true);
      }
    } else if (mode === 'find') {
      const { box, distance } = findNearestBox(x, y);
      setNearestBox(box);
      setNearestDistance(distance);
      
      // Redraw canvas with nearest box highlighted
      const ctx = canvas.getContext('2d');
      if (ctx && imageRef.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(imageRef.current, 0, 0);
        
        boxes.forEach(boxItem => {
          drawBox(ctx, boxItem, boxItem.id === nearestBox?.id, canvas.width, canvas.height);
        });
      }
    }
  }, [mode, isDrawing, dragStart, boxes, selectedBox, findNearestBox, nearestBox, isResizing, resizeStart, resizeHandle, updateBox]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Handle resize completion
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStart(null);
      return;
    }

    // Handle drawing completion
    if (mode !== 'draw' || !isDrawing || !currentBox) return;

    if (currentBox.width > 0.01 && currentBox.height > 0.01) {
      // Show label dialog
      setPendingBox(currentBox);
      setShowLabelDialog(true);
    }

    setIsDrawing(false);
    setDragStart(null);
    setCurrentBox(null);
  }, [mode, isDrawing, currentBox, isResizing]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'find' || isDrawing || isResizing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    
    // Calculate the scaling factor
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Convert mouse coordinates to canvas coordinates
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;
    
    // Convert to normalized coordinates
    const x = canvasX / canvas.width;
    const y = canvasY / canvas.height;

    // Check if clicking on a box to select it
    const clickedBox = boxes.find(box => {
      const boxX = box.x;
      const boxY = box.y;
      const boxWidth = box.width;
      const boxHeight = box.height;
      
      return x >= boxX && x <= boxX + boxWidth && y >= boxY && y <= boxY + boxHeight;
    });

    if (clickedBox) {
      setSelectedBox(clickedBox.id);
      setNearestBox(clickedBox);
      setNearestDistance(0);
    } else {
      const { box, distance } = findNearestBox(x, y);
      setNearestBox(box);
      setNearestDistance(distance);
      setSelectedBox(box?.id || null);
    }
  }, [mode, isDrawing, isResizing, boxes, findNearestBox]);

  const handleLabelSubmit = useCallback((label: string, sensitivity: 'Low' | 'Med' | 'High') => {
    if (!pendingBox) return;
    
    const newBox: Box = {
      ...pendingBox,
      id: `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: label.trim(),
      sensitivity
    };
    
    addBox(newBox);
    setShowLabelDialog(false);
    setPendingBox(null);
  }, [pendingBox, addBox]);

  const filteredBoxes = boxes.filter(box => 
    box.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRedactedArea = boxes.reduce((total, box) => 
    total + (box.width * box.height), 0
  );

  const exportBoxes = useCallback(() => {
    const exportData = {
      document: uploadedFile ? {
        name: uploadedFile.name,
        type: uploadedFile.type,
        size: uploadedFile.size,
        lastModified: uploadedFile.lastModified
      } : {
        name: 'fw9_(3).webp',
        type: 'image/webp',
        isDefault: true
      },
      boxes: boxes.map(box => ({
        id: box.id,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        label: box.label,
        sensitivity: box.sensitivity,
        createdAt: box.createdAt
      })),
      exportedAt: new Date().toISOString(),
      totalBoxes: boxes.length,
      totalRedactedArea: totalRedactedArea
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `redaction_boxes_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [boxes, totalRedactedArea, uploadedFile]);

  const importBoxes = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.boxes && Array.isArray(data.boxes)) {
          setBoxes(data.boxes);
          alert(`Imported ${data.boxes.length} boxes successfully!`);
        } else {
          alert('Invalid JSON format');
        }
      } catch (error) {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }, []);

  const resetBoxes = useCallback(() => {
    if (window.confirm('Are you sure you want to delete all boxes?')) {
      setBoxes([]);
      setSelectedBox(null);
      setNearestBox(null);
      setNearestDistance(null);
    }
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    if (fileType.startsWith('image/')) {
      setUploadedFile(file);
      // Clear existing boxes when uploading new document
      setBoxes([]);
      setSelectedBox(null);
      setNearestBox(null);
      setNearestDistance(null);
    } else if (fileType === 'application/pdf') {
      setUploadedFile(file);
      // Clear existing boxes when uploading new document
      setBoxes([]);
      setSelectedBox(null);
      setNearestBox(null);
      setNearestDistance(null);
      alert('PDF support is limited. For best results, please convert your PDF to an image format (PNG, JPG, WEBP) first.');
    } else {
      alert('Please upload an image file (PNG, JPG, WEBP, GIF) or PDF.');
    }
    
    event.target.value = ''; // Reset file input
  }, []);

  const clearUploadedFile = useCallback(() => {
    setUploadedFile(null);
    setBoxes([]);
    setSelectedBox(null);
    setNearestBox(null);
    setNearestDistance(null);
  }, []);

  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5)); // Max zoom 5x
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.1)); // Min zoom 0.1x
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      maxHeight: '100vh',
      backgroundColor: '#ffffff', 
      display: 'flex',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Document Viewer Panel */}
      <div style={{ width: '70%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          backgroundColor: '#ffffff',
          color: '#1e293b',
          padding: '2.5rem 3rem',
          borderBottom: '2px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: '700', 
            margin: 0,
            letterSpacing: '-0.025em',
            color: '#000000'
          }}>
            Document Redaction Tool
          </h1>
          
          {/* File Upload Section */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.5rem', 
            marginTop: '1.5rem', 
            paddingBottom: '1.5rem', 
            borderBottom: '2px solid #e2e8f0' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{
                padding: '1rem 2rem',
                backgroundColor: '#000000',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#333333';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#000000';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                Upload Document
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
              
              {uploadedFile && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '1rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '0.75rem',
                  border: '2px solid #e2e8f0'
                }}>
                  <span style={{ fontSize: '1rem', color: '#000000', fontWeight: '600' }}>
                    {uploadedFile.name}
                  </span>
                  <button
                    onClick={clearUploadedFile}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#000000',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#333333';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#000000';
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '2rem', 
            marginTop: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ 
              display: 'flex', 
              gap: '0.75rem',
              backgroundColor: '#f1f5f9',
              padding: '0.5rem',
              borderRadius: '1rem',
              border: '2px solid #e2e8f0'
            }}>
              <button
                onClick={() => setMode('draw')}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: mode === 'draw' ? '#000000' : 'transparent',
                  color: mode === 'draw' ? 'white' : '#000000',
                  border: 'none',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  boxShadow: mode === 'draw' ? '0 2px 4px rgba(0, 0, 0, 0.2)' : 'none'
                }}
              >
                Draw Box
              </button>
              <button
                onClick={() => setMode('find')}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: mode === 'find' ? '#000000' : 'transparent',
                  color: mode === 'find' ? 'white' : '#000000',
                  border: 'none',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  boxShadow: mode === 'find' ? '0 2px 4px rgba(0, 0, 0, 0.2)' : 'none'
                }}
              >
                Find Nearest
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              {/* Zoom Controls */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                backgroundColor: '#f1f5f9',
                padding: '0.5rem',
                borderRadius: '0.75rem',
                border: '2px solid #e2e8f0'
              }}>
                <button
                  onClick={zoomOut}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#000000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#333333';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                  }}
                >
                  -
                </button>
                <span style={{ 
                  fontSize: '0.875rem', 
                  color: '#000000', 
                  fontWeight: '600',
                  minWidth: '3rem',
                  textAlign: 'center'
                }}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: '#000000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#333333';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#000000';
                  }}
                >
                  +
                </button>
                <button
                  onClick={resetZoom}
                  style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#666666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#333333';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#666666';
                  }}
                >
                  Reset
                </button>
              </div>

              {mouseCoords && (
                <div style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '0.75rem',
                  border: '2px solid #e2e8f0'
                }}>
                  <span style={{ fontSize: '1rem', color: '#000000', fontWeight: '600' }}>
                    {mouseCoords.x}, {mouseCoords.y}
                  </span>
                </div>
              )}
              {mode === 'find' && nearestDistance !== null && (
                <div style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '0.75rem',
                  border: '2px solid #e2e8f0'
                }}>
                  <span style={{ fontSize: '1rem', color: '#000000', fontWeight: '600' }}>
                    {nearestDistance.toFixed(3)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div style={{ 
          flex: 1, 
          padding: '2rem',
          backgroundColor: '#ffffff'
        }}>
          <div style={{ 
            borderRadius: '1rem', 
            overflow: 'auto', 
            backgroundColor: 'white',
            height: '100%',
            position: 'relative',
            boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              right: '1rem',
              zIndex: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{
                padding: '0.5rem 1rem',
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                {mode === 'draw' ? 'Click and drag to draw redaction boxes' : 'Click to find nearest box'}
              </div>
              <div style={{
                padding: '0.5rem 1rem',
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(10px)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                {boxes.length} boxes • {(totalRedactedArea * 100).toFixed(1)}% redacted
              </div>
            </div>
            <canvas
              ref={canvasRef}
              style={{ 
                width: '100%', 
                height: '100%', 
                cursor: isResizing ? 
                  (resizeHandle === 'nw' || resizeHandle === 'se' ? 'nw-resize' : 
                   resizeHandle === 'ne' || resizeHandle === 'sw' ? 'ne-resize' : 'pointer') :
                  mode === 'draw' ? 'crosshair' : 'pointer',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transition: 'cursor 0.2s ease',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top left',
                display: 'block'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={handleCanvasClick}
            />
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div style={{ 
        width: '30%', 
        height: '100vh',
        maxHeight: '100vh',
        backgroundColor: '#ffffff',
        borderLeft: '2px solid #e2e8f0', 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ 
          padding: '2.5rem 2rem 2rem 2rem',
          backgroundColor: '#ffffff',
          color: '#1e293b',
          borderBottom: '2px solid #e2e8f0'
        }}>
          <h2 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '700', 
            margin: 0,
            letterSpacing: '-0.025em',
            color: '#000000'
          }}>
            Control Panel
          </h2>
          <p style={{ 
            fontSize: '1rem', 
            color: '#64748b', 
            margin: '0.75rem 0 0 0',
            fontWeight: '500'
          }}>
            {mode === 'draw' ? 'Click and drag to draw redaction boxes' : 'Click to find nearest box'}
          </p>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#000000', 
            margin: '0.5rem 0 0 0',
            fontWeight: '600',
            backgroundColor: '#f5f5f5',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid #e0e0e0'
          }}>
            Tip: Select a box to see resize handles at the corners
          </p>
        </div>

        <div 
          className="control-panel-scroll"
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '2rem',
            backgroundColor: '#ffffff',
            minHeight: 0
          }}
        >
          {/* Search */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search boxes by label..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1.25rem 1.5rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '1rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#000000';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                }}
              />
            </div>
          </div>

          {/* Boxes List */}
          <h3 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: '#000000', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            Boxes ({filteredBoxes.length})
          </h3>
          
          {filteredBoxes.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'white',
              borderRadius: '1rem',
              border: '2px dashed #e2e8f0',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>No boxes</div>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#64748b', 
                fontStyle: 'italic',
                fontWeight: '500'
              }}>
                {searchTerm ? 'No boxes match your search' : 'No boxes created yet'}
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem', 
              maxHeight: '600px', 
              overflowY: 'auto',
              paddingRight: '0.5rem'
            }}>
              {filteredBoxes.map((box) => (
                <div
                  key={box.id}
                  style={{
                    padding: '1rem',
                    border: selectedBox === box.id ? '2px solid #000000' : '2px solid #e2e8f0',
                    borderRadius: '0.75rem',
                    backgroundColor: selectedBox === box.id ? 'rgba(0, 0, 0, 0.05)' : 'white',
                    transition: 'all 0.2s ease',
                    boxShadow: selectedBox === box.id ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
                    transform: selectedBox === box.id ? 'translateY(-1px)' : 'translateY(0)'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    marginBottom: '0.75rem' 
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: '600', 
                        color: '#000000', 
                        marginBottom: '0.25rem',
                        lineHeight: '1.25'
                      }}>
                        {box.label}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{
                          padding: '0.125rem 0.375rem',
                          backgroundColor: '#f5f5f5',
                          color: '#000000',
                          borderRadius: '0.375rem',
                          fontWeight: '600',
                          fontSize: '0.625rem',
                          border: '1px solid #e0e0e0'
                        }}>
                          {box.sensitivity}
                        </span>
                        <span>{(box.width * 100).toFixed(1)}% × {(box.height * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteBox(box.id)}
                      style={{
                        padding: '0.375rem',
                        backgroundColor: '#000000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#333333';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#000000';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setSelectedBox(box.id)}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#000000',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
                      }}
                    >
                      Focus
                    </button>
                    <button
                      onClick={() => {
                        const newLabel = prompt('Enter new label:', box.label);
                        if (newLabel && newLabel.trim()) {
                          updateBox(box.id, { label: newLabel.trim() });
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#666666',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(102, 102, 102, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#333333';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#666666';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ 
            marginTop: '2.5rem', 
            paddingTop: '2rem', 
            borderTop: '2px solid #e2e8f0' 
          }}>
            <h3 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '700', 
              color: '#000000', 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              Actions
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                onClick={exportBoxes}
                disabled={boxes.length === 0}
                style={{
                  width: '100%',
                  minWidth: '200px',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: boxes.length === 0 ? '#cccccc' : '#000000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '1rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: boxes.length === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: boxes.length === 0 ? 'none' : '0 4px 6px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  boxSizing: 'border-box',
                  margin: '0',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  if (boxes.length > 0) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (boxes.length > 0) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
                  }
                }}
              >
                Export JSON
              </button>
              
              <label style={{
                width: '100%',
                minWidth: '200px',
                padding: '1.25rem 1.5rem',
                backgroundColor: '#000000',
                color: 'white',
                border: 'none',
                borderRadius: '1rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                boxSizing: 'border-box',
                margin: '0',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#333333';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#000000';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
              }}>
                Import JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={importBoxes}
                  style={{ display: 'none' }}
                />
              </label>
              
              <button
                onClick={resetBoxes}
                style={{
                  width: '100%',
                  minWidth: '200px',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#000000',
                  color: 'white',
                  border: 'none',
                  borderRadius: '1rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  boxSizing: 'border-box',
                  margin: '0',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#333333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#000000';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
                }}
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Label Dialog */}
      {showLabelDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '3rem',
            borderRadius: '1.5rem',
            minWidth: '500px',
            maxWidth: '600px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '2px solid #e2e8f0',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#000000', 
                margin: 0,
                letterSpacing: '-0.025em'
              }}>
                Add Redaction Box
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                margin: '0.5rem 0 0 0',
                fontWeight: '500'
              }}>
                Provide details for your redaction box
              </p>
            </div>
            <LabelDialog onSubmit={handleLabelSubmit} onCancel={() => setShowLabelDialog(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// Label Dialog Component
const LabelDialog: React.FC<{
  onSubmit: (label: string, sensitivity: 'Low' | 'Med' | 'High') => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [label, setLabel] = useState('');
  const [sensitivity, setSensitivity] = useState<'Low' | 'Med' | 'High'>('Med');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (label.trim()) {
      onSubmit(label.trim(), sensitivity);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600', 
          color: '#000000', 
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          Label (required, max 80 chars)
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, 80))}
          placeholder="Enter label for this redaction box..."
          style={{
            width: '100%',
            padding: '1rem',
            border: '2px solid #e2e8f0',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#000000';
            e.target.style.boxShadow = '0 0 0 3px rgba(0, 0, 0, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
          }}
          autoFocus
          required
        />
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#64748b', 
          marginTop: '0.5rem',
          fontWeight: '500',
          textAlign: 'right'
        }}>
          {label.length}/80 characters
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600', 
          color: '#000000', 
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          Sensitivity Level
        </label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {(['Low', 'Med', 'High'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setSensitivity(level)}
              style={{
                flex: 1,
                padding: '0.875rem 0.75rem',
                backgroundColor: sensitivity === level ? '#000000' : '#e2e8f0',
                color: sensitivity === level ? 'white' : '#000000',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: sensitivity === level ? '0 4px 6px rgba(0, 0, 0, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
                transform: sensitivity === level ? 'translateY(-1px)' : 'translateY(0)'
              }}
              onMouseEnter={(e) => {
                if (sensitivity !== level) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (sensitivity !== level) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                }
              }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '1rem',
            backgroundColor: '#e2e8f0',
            color: '#000000',
            border: 'none',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!label.trim()}
          style={{
            flex: 1,
            padding: '1rem',
            backgroundColor: label.trim() ? '#000000' : '#cccccc',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: label.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            boxShadow: label.trim() ? '0 4px 6px rgba(0, 0, 0, 0.2)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (label.trim()) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (label.trim()) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
            }
          }}
        >
          Add Box
        </button>
      </div>
    </form>
  );
};

export default App;
