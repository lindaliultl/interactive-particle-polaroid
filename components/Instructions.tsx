
import React, { useState } from 'react';

const Instructions: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className={`
        fixed top-6 left-6 z-[100] transition-all duration-500 ease-out
        ${isExpanded ? 'w-64 opacity-100' : 'w-24 opacity-40 hover:opacity-80'}
      `}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Collapsed Label */}
      {!isExpanded && (
        <div className="flex items-center gap-2 cursor-help py-2 px-3 bg-zinc-900/40 backdrop-blur-md border border-white/10 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-300">Guide</span>
        </div>
      )}

      {/* Expanded Sheet */}
      <div className={`
        overflow-hidden bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl
        transition-all duration-500 origin-top-left
        ${isExpanded ? 'p-4 scale-100 translate-y-0 opacity-100' : 'p-0 scale-90 -translate-y-4 opacity-0 pointer-events-none'}
      `}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[10px] font-black tracking-[0.3em] uppercase text-zinc-100">Manual</h2>
          <div className="h-[1px] flex-1 ml-3 bg-white/10" />
        </div>

        <div className="space-y-4">
          <section>
            <h3 className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Vision Gestures</h3>
            <div className="space-y-1.5 text-[10px] text-zinc-300">
              <div className="flex justify-between border-b border-white/5 pb-0.5">
                <span>✋ Open Palm</span>
                <span className="text-zinc-500 italic">Living</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-0.5">
                <span>✊ Closed</span>
                <span className="text-zinc-500 italic">Swarm</span>
              </div>
              <p className="mt-1 text-[8px] text-zinc-500 italic">Pull back to re-materialize</p>
            </div>
          </section>

          <section>
            <h3 className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Tactile</h3>
            <div className="space-y-1 text-[10px] text-zinc-300">
              <p>Drag photos to reposition</p>
              <p>Drag <span className="text-blue-400">bottom corner</span> to transform</p>
            </div>
          </section>

          <section>
            <h3 className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Optics</h3>
            <div className="space-y-1 text-[10px] text-zinc-300">
              <div className="flex gap-2">
                <span className="text-red-500">■</span>
                <span>Original</span>
              </div>
              <div className="flex gap-2">
                <span className="text-yellow-500">■</span>
                <span>Vintage</span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-500">■</span>
                <span>Noir</span>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 pt-3 border-t border-white/5 text-center">
          <span className="text-[7px] text-zinc-600 tracking-tighter uppercase">v2.5 Interaction System</span>
        </div>
      </div>
    </div>
  );
};

export default Instructions;
