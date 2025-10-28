export interface Rectangle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  opacity?: number;
}

export interface DocumentViewerProps {
  rectangles: Rectangle[];
  currentRect: Rectangle | null;
  selectedRectangle: string | null;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onRectangleClick: (id: string) => void;
  onFindNearestBox: (x: number, y: number) => Rectangle | null;
}

export interface OptionsPanelProps {
  rectangles: Rectangle[];
  selectedRectangle: string | null;
  onRectangleSelect: (id: string | null) => void;
  onRectangleUpdate: (id: string, updates: Partial<Rectangle>) => void;
  onRectangleDelete: (id: string) => void;
  onAddRectangle: (rect: Rectangle) => string;
  onFindNearestBox: (x: number, y: number) => Rectangle | null;
}
