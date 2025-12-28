
export type PhotoSize = 'sm' | 'md' | 'lg';
export type PhotoFilter = 'original' | 'bw' | 'film';

export interface PhotoData {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  timestamp: number;
  size: PhotoSize;
  zIndex?: number;
}

export enum GestureState {
  NONE = 'NONE',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export interface ParticleConfig {
  count: number;
  images: string[];
}
