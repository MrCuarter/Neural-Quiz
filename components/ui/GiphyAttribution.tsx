
import React from 'react';

export const GiphyAttribution: React.FC = () => {
    return (
        <div className="absolute bottom-1 right-1 pointer-events-none z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
            <span className="text-[8px] font-black text-white font-mono uppercase tracking-widest leading-none">
                POWERED BY GIPHY
            </span>
        </div>
    );
};
