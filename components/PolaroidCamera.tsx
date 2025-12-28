
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CAMERA_WIDTH, CAMERA_HEIGHT, isMobile } from '../constants';
import { PhotoSize, PhotoFilter } from '../types';

interface PolaroidCameraProps {
  onCapture: (url: string, size: PhotoSize) => void;
  onFilterChange: (filter: PhotoFilter) => void;
}

const PolaroidCamera: React.FC<PolaroidCameraProps> = ({ onCapture, onFilterChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEjecting, setIsEjecting] = useState(false);
  const [ejectingPhoto, setEjectingPhoto] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<PhotoSize>('sm');
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilter>('original');

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: CAMERA_WIDTH, height: CAMERA_HEIGHT }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }
    startCamera();
  }, []);

  const handleFilterSelect = (filter: PhotoFilter) => {
    setSelectedFilter(filter);
    onFilterChange(filter);
  };

  const getFilterString = (filter: PhotoFilter) => {
    switch (filter) {
      case 'bw': return 'grayscale(100%) contrast(1.1)';
      case 'film': return 'sepia(40%) contrast(1.1) brightness(1.05) saturate(1.2)';
      default: return 'none';
    }
  };

  const snap = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || isEjecting) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CAMERA_WIDTH, CAMERA_HEIGHT);
    ctx.translate(CAMERA_WIDTH, 0);
    ctx.scale(-1, 1);
    ctx.filter = getFilterString(selectedFilter);
    ctx.drawImage(videoRef.current, 0, 0, CAMERA_WIDTH, CAMERA_HEIGHT);
    const photoUrl = canvasRef.current.toDataURL('image/jpeg');
    
    setEjectingPhoto(photoUrl);
    setIsEjecting(true);

    setTimeout(() => {
      onCapture(photoUrl, selectedSize);
      setIsEjecting(false);
      setEjectingPhoto(null);
    }, 2200);
  }, [onCapture, isEjecting, selectedSize, selectedFilter]);

  const mobile = isMobile();
  // Synced with App.tsx reduced sizeMap
  const ejectWidths = mobile 
    ? { sm: 'w-[150px]', md: 'w-[200px]', lg: 'w-[250px]' }
    : { sm: 'w-[240px]', md: 'w-[320px]', lg: 'w-[400px]' };

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={CAMERA_WIDTH} height={CAMERA_HEIGHT} className="hidden" />

      <div className={`absolute top-0 left-1/2 -translate-x-1/2 ${ejectWidths[selectedSize]} overflow-visible pointer-events-none z-0`}>
        {ejectingPhoto && (
           <div className={`eject-photo bg-white p-2 pb-8 shadow-2xl rounded-sm`}>
              <div className="w-full aspect-square bg-gray-100 overflow-hidden">
                <img src={ejectingPhoto} className="w-full h-full object-cover blur-sm opacity-50" alt="Ejecting" />
              </div>
           </div>
        )}
      </div>

      <div className="relative z-10 w-72 bg-zinc-800 rounded-xl p-4 shadow-2xl border-b-8 border-zinc-900 ring-1 ring-white/10">
        <div className="h-2 w-full bg-zinc-950 rounded-full mb-3 shadow-inner border border-zinc-700" />
        
        <div className="relative bg-zinc-900 rounded-lg p-2 border border-zinc-700 aspect-[4/3] overflow-hidden group">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover transition-all duration-500"
            style={{ filter: getFilterString(selectedFilter), transform: 'scaleX(-1)' }}
          />
          <div className="absolute inset-0 pointer-events-none border-4 border-zinc-800/50" />
          <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-white/5 to-transparent rotate-45 pointer-events-none" />
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 bg-zinc-900/50 p-1 rounded-full border border-zinc-700">
          {(['sm', 'md', 'lg'] as PhotoSize[]).map((size) => (
            <button
              key={size}
              onClick={() => setSelectedSize(size)}
              className={`
                flex-1 py-1 text-[10px] font-bold rounded-full transition-all uppercase
                ${selectedSize === size 
                  ? 'bg-zinc-600 text-white shadow-inner' 
                  : 'text-zinc-500 hover:text-zinc-300'}
              `}
            >
              {size}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-end mt-4">
          <div className="flex flex-col gap-2">
             <div className="flex gap-1.5 items-center">
                <button 
                  onClick={() => handleFilterSelect('original')}
                  className={`h-2.5 w-6 rounded-full transition-all ${selectedFilter === 'original' ? 'bg-red-500 ring-2 ring-white scale-110 shadow-lg' : 'bg-red-900 opacity-50'}`}
                />
                <button 
                  onClick={() => handleFilterSelect('film')}
                  className={`h-2.5 w-6 rounded-full transition-all ${selectedFilter === 'film' ? 'bg-yellow-500 ring-2 ring-white scale-110 shadow-lg' : 'bg-yellow-900 opacity-50'}`}
                />
                <button 
                  onClick={() => handleFilterSelect('bw')}
                  className={`h-2.5 w-6 rounded-full transition-all ${selectedFilter === 'bw' ? 'bg-blue-500 ring-2 ring-white scale-110 shadow-lg' : 'bg-blue-900 opacity-50'}`}
                />
             </div>
             <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest mt-1">EMOTION ENGINE</span>
          </div>
          
          <button 
            onClick={snap}
            disabled={isEjecting}
            className={`
              w-14 h-14 rounded-full border-4 border-zinc-700 bg-zinc-600 active:bg-red-500 
              transition-all duration-75 shadow-lg active:scale-95 active:shadow-inner
              flex items-center justify-center
              ${isEjecting ? 'opacity-50 grayscale' : 'hover:bg-zinc-500'}
            `}
          >
            <div className="w-6 h-6 rounded-full bg-red-600 shadow-inner" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PolaroidCamera;
