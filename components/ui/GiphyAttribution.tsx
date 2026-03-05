import React from 'react';

export const GiphyAttribution: React.FC = () => {
  return (
    <div className="absolute bottom-2 left-2 z-10 pointer-events-none select-none">
      {/* Background for better contrast */}
      <div className="bg-black/40 backdrop-blur-[1px] rounded p-1">
        <img 
          src="https://assets.mistercuarter.es/elements/logogiphy3.gif" 
          alt="Powered by GIPHY" 
          className="w-32 md:w-40 h-auto object-contain"
        />
      </div>
    </div>
  );
};
