
import React, { useState, useRef } from 'react';
import { PhotoData } from '../types';

interface PhotoWallProps {
  photos: PhotoData[];
  onUpdate: (id: string, updates: Partial<PhotoData>) => void;
}

const PhotoWall: React.FC<PhotoWallProps> = ({ photos, onUpdate }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activePointers = useRef<Map<number, { x: number, y: number }>>(new Map());
  
  const gestureStart = useRef({
    distance: 0,
    angle: 0,
    scale: 1,
    rotation: 0,
    width: 0,
    height: 0,
    photoX: 0,
    photoY: 0,
    mouseStartX: 0,
    mouseStartY: 0,
    mode: 'none' as 'move' | 'transform'
  });

  const onPointerDown = (e: React.PointerEvent, photo: PhotoData, mode: 'move' | 'transform') => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setActiveId(photo.id);
    
    // Bring to front
    onUpdate(photo.id, {}); 

    const pts = Array.from(activePointers.current.values()) as { x: number; y: number }[];
    
    if (pts.length === 1) {
      gestureStart.current = {
        ...gestureStart.current,
        mode: mode,
        mouseStartX: e.clientX,
        mouseStartY: e.clientY,
        photoX: photo.x,
        photoY: photo.y,
        width: photo.width,
        height: photo.height,
        rotation: photo.rotation,
        distance: 0,
        angle: Math.atan2(e.clientY - (photo.y + (photo.height + 40)/2), e.clientX - (photo.x + photo.width/2))
      };
      
      if (mode === 'transform') {
        const dx = e.clientX - (photo.x + photo.width / 2);
        const dy = e.clientY - (photo.y + (photo.height + 40) / 2);
        gestureStart.current.distance = Math.hypot(dx, dy);
      }
    } else if (pts.length === 2) {
      const p1 = pts[0];
      const p2 = pts[1];
      gestureStart.current = {
        ...gestureStart.current,
        mode: 'transform',
        distance: Math.hypot(p2.x - p1.x, p2.y - p1.y),
        angle: Math.atan2(p2.y - p1.y, p2.x - p1.x),
        width: photo.width,
        height: photo.height,
        rotation: photo.rotation
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activeId || !activePointers.current.has(e.pointerId)) return;
    
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const photo = photos.find(p => p.id === activeId);
    if (!photo) return;

    const pts = Array.from(activePointers.current.values()) as { x: number; y: number }[];

    if (pts.length === 1) {
      if (gestureStart.current.mode === 'move') {
        const dx = e.clientX - gestureStart.current.mouseStartX;
        const dy = e.clientY - gestureStart.current.mouseStartY;
        onUpdate(activeId, {
          x: gestureStart.current.photoX + dx,
          y: gestureStart.current.photoY + dy
        });
      } else {
        const centerX = photo.x + photo.width / 2;
        const centerY = photo.y + (photo.height + 40) / 2;
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const currentDistance = Math.hypot(dx, dy);
        const currentAngle = Math.atan2(dy, dx);
        
        const angleDiff = (currentAngle - gestureStart.current.angle) * (180 / Math.PI);
        const scaleRatio = currentDistance / gestureStart.current.distance;
        
        onUpdate(activeId, {
          width: Math.max(120, gestureStart.current.width * scaleRatio),
          height: Math.max(120, gestureStart.current.height * scaleRatio),
          rotation: gestureStart.current.rotation + angleDiff
        });
      }
    } else if (pts.length === 2) {
      const p1 = pts[0];
      const p2 = pts[1];
      const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const currentAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      
      const scaleRatio = currentDist / gestureStart.current.distance;
      const angleDiff = (currentAngle - gestureStart.current.angle) * (180 / Math.PI);

      onUpdate(activeId, {
        width: Math.max(120, gestureStart.current.width * scaleRatio),
        height: Math.max(120, gestureStart.current.height * scaleRatio),
        rotation: gestureStart.current.rotation + angleDiff
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size === 0) {
      setActiveId(null);
    }
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none touch-none overflow-hidden">
      {photos.map((photo) => {
        const isActive = activeId === photo.id;
        return (
          <div
            key={photo.id}
            className={`
              absolute bg-white shadow-2xl pointer-events-auto select-none p-2 pb-8 rounded-sm
              ${isActive ? 'ring-2 ring-blue-500/30' : ''}
            `}
            style={{
              left: photo.x,
              top: photo.y,
              width: photo.width,
              height: photo.height + 40, // 8px padding-top + 32px padding-bottom
              transform: `rotate(${photo.rotation}deg)`,
              zIndex: photo.zIndex || 20,
              transition: isActive ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              touchAction: 'none'
            }}
            onPointerDown={(e) => onPointerDown(e, photo, 'move')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="w-full h-full relative bg-zinc-100 overflow-hidden rounded-[1px]">
              <img 
                src={photo.url} 
                className="w-full h-full object-cover developing pointer-events-none"
                alt="Captured Moment"
                draggable={false}
              />
              <div className="absolute inset-0 shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] pointer-events-none" />
            </div>

            <div
              className="absolute bottom-0 right-0 w-12 h-12 flex items-end justify-end p-2 cursor-crosshair z-30 opacity-40 hover:opacity-100 transition-opacity"
              onPointerDown={(e) => onPointerDown(e, photo, 'transform')}
            >
              <div className="w-2 h-2 rounded-full bg-zinc-300 border border-zinc-400" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PhotoWall;
