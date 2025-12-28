
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PARTICLE_COUNT } from '../constants';
import { GestureState, PhotoFilter } from '../types';

interface ParticleCanvasProps {
  capturedPhotoUrl: string | null;
  capturedPhotoWidth: number | null;
  currentFilter: PhotoFilter;
  onHandUpdate: (pos: { x: number, y: number } | null) => void;
}

const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ capturedPhotoUrl, capturedPhotoWidth, currentFilter, onHandUpdate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const handTracker = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const capturedPhotoUrlRef = useRef<string | null>(capturedPhotoUrl);
  const currentFilterRef = useRef<PhotoFilter>(currentFilter);
  
  const homePositionsRef = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const velocitiesRef = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const targetColorsRef = useRef(new Float32Array(PARTICLE_COUNT * 3));
  const gestureRef = useRef<GestureState>(GestureState.NONE);
  const isInitialized = useRef(false);
  const prevHandPos3D = useRef(new THREE.Vector3(0, 0, 0));
  const handVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const lastUrlRef = useRef<string | null>(null);
  const frameIdRef = useRef<number>(0);

  const SAFE_Z = -5000;

  useEffect(() => {
    capturedPhotoUrlRef.current = capturedPhotoUrl;
    currentFilterRef.current = currentFilter;
  }, [capturedPhotoUrl, currentFilter]);

  const getFilterString = (filter: PhotoFilter) => {
    switch (filter) {
      case 'bw': return 'grayscale(100%) contrast(1.2) brightness(0.8)';
      case 'film': return 'sepia(30%) contrast(1.1) brightness(0.85) saturate(1.1)';
      default: return 'brightness(0.85) contrast(1.1) saturate(1.0)';
    }
  };

  const getThemeColors = (filter: PhotoFilter) => {
    switch (filter) {
      case 'bw': return { r: 0.10, g: 0.10, b: 0.12 };
      case 'film': return { r: 0.16, g: 0.10, b: 0.06 };
      default: return { r: 0.04, g: 0.04, b: 0.12 };
    }
  };

  const sampleLiveVideo = () => {
    if (!videoRef.current || videoRef.current.readyState < 2 || capturedPhotoUrlRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    
    const cols = 40;
    const rows = 30;
    canvas.width = cols;
    canvas.height = rows;

    ctx.filter = getFilterString(currentFilterRef.current);
    ctx.drawImage(video, 0, 0, cols, rows);
    const pixels = ctx.getImageData(0, 0, cols, rows).data;
    const theme = getThemeColors(currentFilterRef.current);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      if (!capturedPhotoUrlRef.current) {
        const pxIdx = (i % (cols * rows)) * 4;
        const r = pixels[pxIdx] / 255;
        const g = pixels[pxIdx + 1] / 255;
        const b = pixels[pxIdx + 2] / 255;

        // Dampen contribution to prevent additive bloom overexposure
        targetColorsRef.current[idx] = r * 0.35 + theme.r * 0.4;
        targetColorsRef.current[idx + 1] = g * 0.35 + theme.g * 0.4;
        targetColorsRef.current[idx + 2] = b * 0.35 + theme.b * 0.4;
      }
    }
  };

  useEffect(() => {
    const theme = getThemeColors(currentFilter);
    const screenAspect = window.innerWidth / window.innerHeight;
    const camZ = screenAspect < 1 ? 1200 : 1700;
    const visibleHeight = 2 * Math.tan((70 * Math.PI / 180) / 2) * camZ;
    const yShift = visibleHeight * 0.12; 

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      if (!capturedPhotoUrl) {
        homePositionsRef.current[idx] = (Math.random() - 0.5) * 2200;
        homePositionsRef.current[idx+1] = (Math.random() - 0.5) * 2200 + yShift;
        homePositionsRef.current[idx+2] = (Math.random() - 0.5) * 500 - 400;
        
        targetColorsRef.current[idx] = theme.r;
        targetColorsRef.current[idx+1] = theme.g;
        targetColorsRef.current[idx+2] = theme.b;
      }
    }
    isInitialized.current = true;
  }, [currentFilter, capturedPhotoUrl]);

  const processImage = async (url: string | null, pWidth: number | null, filter: PhotoFilter) => {
    if (!url) return;
    try {
      const img = new Image();
      if (!url.startsWith('data:')) img.crossOrigin = "Anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
      if (!ctx) return;

      const aspect = img.width / img.height;
      const rows = Math.floor(Math.sqrt(PARTICLE_COUNT / aspect));
      const cols = Math.floor(rows * aspect);
      const actualCount = Math.min(rows * cols, PARTICLE_COUNT);

      canvas.width = cols;
      canvas.height = rows;
      
      // Removed excessive brightness boost to fix overexposure
      ctx.filter = 'brightness(0.9) contrast(1.1) saturate(1.1)';
      ctx.drawImage(img, 0, 0, cols, rows);
      
      const pixels = ctx.getImageData(0, 0, cols, rows).data;
      const screenAspect = window.innerWidth / window.innerHeight;

      const camZ = screenAspect < 1 ? 1200 : 1700;
      const visibleHeight = 2 * Math.tan((70 * Math.PI / 180) / 2) * camZ;
      const visibleWidth = visibleHeight * screenAspect;

      const verticalShift = visibleHeight * 0.14; 

      // Increase the width and height of the grid "a little bit" (1.2x)
      const currentPhotoWidth = pWidth || (window.innerWidth * (screenAspect < 1 ? 0.85 : 0.55));
      const targetWidth = (currentPhotoWidth / window.innerWidth) * visibleWidth * 1.2; 
      const spacing = targetWidth / cols;
      
      const isNewCapture = lastUrlRef.current && lastUrlRef.current !== url;
      lastUrlRef.current = url;
      const theme = getThemeColors(filter);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        if (i < actualCount) {
          const x = i % cols;
          const y = Math.floor(i / cols);
          const pxIdx = (y * cols + x) * 4;

          homePositionsRef.current[idx] = (x - cols / 2) * spacing;
          homePositionsRef.current[idx + 1] = -(y - rows / 2) * spacing + verticalShift; 
          homePositionsRef.current[idx + 2] = (Math.random() - 0.5) * 30.0;

          const r = pixels[pxIdx] / 255;
          const g = pixels[pxIdx + 1] / 255;
          const b = pixels[pxIdx + 2] / 255;

          // Multiply by 0.8 to compensate for AdditiveBlending hotspots (reduces exposure)
          targetColorsRef.current[idx] = r * 0.8; 
          targetColorsRef.current[idx + 1] = g * 0.8;
          targetColorsRef.current[idx + 2] = b * 0.8;
          
          if (isNewCapture) {
            const dx = homePositionsRef.current[idx];
            const dy = homePositionsRef.current[idx + 1] - verticalShift;
            const dist = Math.hypot(dx, dy) || 1;
            const force = (55 + Math.random() * 75) * (1 / (dist * 0.002 + 1));
            velocitiesRef.current[idx] = (dx / dist) * force;
            velocitiesRef.current[idx + 1] = (dy / dist) * force;
            velocitiesRef.current[idx + 2] = (Math.random() - 0.5) * 150;
          }
        } else {
          homePositionsRef.current[idx] = (Math.random() - 0.5) * 3500;
          homePositionsRef.current[idx + 1] = (Math.random() - 0.5) * 3500 + verticalShift;
          homePositionsRef.current[idx + 2] = SAFE_Z; 
          targetColorsRef.current[idx] = theme.r * 0.1;
          targetColorsRef.current[idx + 1] = theme.g * 0.1;
          targetColorsRef.current[idx + 2] = theme.b * 0.1;
        }
      }
    } catch (err) {
      console.error("Particle Process Error:", err);
    }
  };

  useEffect(() => {
    processImage(capturedPhotoUrl, capturedPhotoWidth, currentFilter);
  }, [capturedPhotoUrl, capturedPhotoWidth, currentFilter]);

  useEffect(() => {
    if (!containerRef.current) return;

    const screenAspect = window.innerWidth / window.innerHeight;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(70, screenAspect, 1, 15000);
    camera.position.z = screenAspect < 1 ? 1200 : 1700;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const initialTheme = getThemeColors(currentFilterRef.current);
    
    const visibleHeight = 2 * Math.tan((70 * Math.PI / 180) / 2) * camera.position.z;
    const yShift = visibleHeight * 0.14;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2200 + yShift;
      positions[i * 3 + 2] = SAFE_Z;
      colors[i * 3] = initialTheme.r;
      colors[i * 3 + 1] = initialTheme.g;
      colors[i * 3 + 2] = initialTheme.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometryRef.current = geometry;

    const material = new THREE.PointsMaterial({
      size: screenAspect < 1 ? 5.2 : 7.2, 
      vertexColors: true,
      transparent: true,
      opacity: 0.42, // Lowered opacity to reduce overexposure bloom
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const initHandTracking = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
        handTracker.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        const video = document.createElement('video');
        video.autoplay = true; 
        video.playsInline = true;
        videoRef.current = video;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => animate());
      } catch (err) {
        animate(); 
      }
    };

    initHandTracking();

    const handPos3D = new THREE.Vector3();
    const dirToHand = new THREE.Vector3();
    let frameCounter = 0;

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      frameCounter++;
      if (frameCounter % 15 === 0 && !capturedPhotoUrlRef.current) {
        sampleLiveVideo();
      }

      let hasHand = false;
      if (handTracker.current && videoRef.current && videoRef.current.readyState >= 2) {
        const results = handTracker.current.detectForVideo(videoRef.current, performance.now());
        if (results.landmarks?.length > 0) {
          const landmarks = results.landmarks[0];
          const mirroredX = 1 - landmarks[8].x;
          const handY = landmarks[8].y;

          const distToFist = Math.hypot(landmarks[8].x - landmarks[0].x, landmarks[8].y - landmarks[0].y);
          gestureRef.current = distToFist < 0.16 ? GestureState.CLOSED : GestureState.OPEN;
          
          const reachMultiplier = camera.position.z * 1.5;
          handPos3D.set((mirroredX - 0.5) * reachMultiplier * (window.innerWidth/window.innerHeight), -(handY - 0.5) * reachMultiplier, 100);
          
          handVelocity.current.subVectors(handPos3D, prevHandPos3D.current).multiplyScalar(0.5);
          prevHandPos3D.current.copy(handPos3D);
          
          onHandUpdate({ x: mirroredX, y: handY });
          hasHand = true;
        } else {
          onHandUpdate(null);
          gestureRef.current = GestureState.NONE;
          handVelocity.current.set(0, 0, 0);
        }
      }

      if (!isInitialized.current) return;

      const pos = geometry.attributes.position.array as Float32Array;
      const colsAttr = geometry.attributes.color.array as Float32Array;
      const friction = gestureRef.current === GestureState.CLOSED ? 0.93 : 0.97;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        const hx = homePositionsRef.current[idx];
        const hy = homePositionsRef.current[idx + 1];
        const hz = homePositionsRef.current[idx + 2];

        velocitiesRef.current[idx] += (hx - pos[idx]) * 0.0035;
        velocitiesRef.current[idx+1] += (hy - pos[idx+1]) * 0.0035;
        velocitiesRef.current[idx+2] += (hz - pos[idx+2]) * 0.0035;

        if (hasHand) {
          dirToHand.set(handPos3D.x - pos[idx], handPos3D.y - pos[idx+1], handPos3D.z - pos[idx+2]);
          const d = dirToHand.length();
          const range = window.innerWidth / window.innerHeight < 1 ? 800 : 1300;

          if (d < range) {
            const influence = (1 - d / range);
            if (gestureRef.current === GestureState.CLOSED) {
               dirToHand.normalize();
               velocitiesRef.current[idx] += dirToHand.x * influence * 8.0;
               velocitiesRef.current[idx+1] += dirToHand.y * influence * 8.0;
            } else {
               velocitiesRef.current[idx] += handVelocity.current.x * influence * 1.0;
               velocitiesRef.current[idx+1] += handVelocity.current.y * influence * 1.0;
            }
          }
        }

        pos[idx] += velocitiesRef.current[idx] + (Math.random() - 0.5) * 0.2;
        pos[idx+1] += velocitiesRef.current[idx+1] + (Math.random() - 0.5) * 0.2;
        pos[idx+2] += velocitiesRef.current[idx+2];

        velocitiesRef.current[idx] *= friction;
        velocitiesRef.current[idx+1] *= friction;
        velocitiesRef.current[idx+2] *= friction;

        colsAttr[idx] += (targetColorsRef.current[idx] - colsAttr[idx]) * 0.12;
        colsAttr[idx+1] += (targetColorsRef.current[idx+1] - colsAttr[idx+1]) * 0.12;
        colsAttr[idx+2] += (targetColorsRef.current[idx+2] - colsAttr[idx+2]) * 0.12;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      renderer.render(scene, camera);
    };

    const handleResize = () => {
      const newAspect = window.innerWidth / window.innerHeight;
      camera.aspect = newAspect;
      camera.position.z = newAspect < 1 ? 1200 : 1700;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      processImage(capturedPhotoUrl, capturedPhotoWidth, currentFilterRef.current);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameIdRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      videoRef.current?.srcObject && (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };
  }, []); 

  return <div ref={containerRef} className="w-full h-full" />;
};

export default ParticleCanvas;
