
import React, { useState, useCallback, useRef } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import PolaroidCamera from './components/PolaroidCamera';
import PhotoWall from './components/PhotoWall';
import Instructions from './components/Instructions';
import { PhotoData, PhotoSize, PhotoFilter } from './types';
import { isMobile } from './constants';

const App: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [activeFilter, setActiveFilter] = useState<PhotoFilter>('original');
  const [handPos, setHandPos] = useState<{ x: number, y: number } | null>(null);
  const nextZIndex = useRef(100);

  const handleCapture = useCallback((photoUrl: string, size: PhotoSize) => {
    const mobile = isMobile();
    // Reduced size map to make photos "a little bit smaller"
    const sizeMap = mobile 
      ? { sm: 150, md: 200, lg: 250 } 
      : { sm: 240, md: 320, lg: 400 };
    
    const baseWidth = sizeMap[size];
    const z = nextZIndex.current++;

    const newPhoto: PhotoData = {
      id: Math.random().toString(36).substr(2, 9),
      url: photoUrl,
      x: window.innerWidth / 2 - baseWidth / 2,
      y: window.innerHeight * 0.35 - baseWidth / 2, 
      width: baseWidth,
      height: baseWidth,
      rotation: Math.random() * 6 - 3,
      timestamp: Date.now(),
      size: size,
      zIndex: z
    };
    setPhotos(prev => [newPhoto, ...prev]);
  }, []);

  const updatePhoto = useCallback((id: string, updates: Partial<PhotoData>) => {
    setPhotos(prev => prev.map(p => {
      if (p.id === id) {
        const newZ = updates.zIndex === undefined ? nextZIndex.current++ : updates.zIndex;
        return { ...p, ...updates, zIndex: newZ };
      }
      return p;
    }));
  }, []);

  const currentPhoto = photos[0];
  const bgUrl = currentPhoto ? currentPhoto.url : null;
  const bgWidth = currentPhoto ? currentPhoto.width : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white selection:bg-zinc-700 touch-none">
      {/* BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0">
        <ParticleCanvas 
          capturedPhotoUrl={bgUrl} 
          capturedPhotoWidth={bgWidth}
          currentFilter={activeFilter}
          onHandUpdate={setHandPos} 
        />
      </div>

      {/* INTERACTION LAYER */}
      <PhotoWall photos={photos} onUpdate={updatePhoto} />

      {/* UI LAYER: The Camera Dock */}
      <div className="
        fixed z-[200] transition-all duration-700 ease-out
        bottom-[20px] left-1/2 -translate-x-1/2 scale-[0.8] origin-bottom
        md:left-12 md:translate-x-0 md:bottom-[-20px] md:hover:bottom-0 md:scale-100
      ">
        <PolaroidCamera 
          onCapture={handleCapture} 
          onFilterChange={setActiveFilter}
        />
      </div>

      <Instructions />
      
      {/* Hand Interaction Marker */}
      {handPos && (
        <div 
          className="fixed w-12 h-12 rounded-full border-2 border-yellow-400/60 pointer-events-none z-[300] -translate-x-1/2 -translate-y-1/2 shadow-[0_0_30px_rgba(250,204,21,0.4)]"
          style={{ left: `${handPos.x * 100}%`, top: `${handPos.y * 100}%` }}
        >
          <div className="absolute inset-0 bg-yellow-400/10 rounded-full animate-ping" />
        </div>
      )}
    </div>
  );
};

export default App;
