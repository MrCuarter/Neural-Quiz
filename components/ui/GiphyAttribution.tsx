import React from 'react';

export const GiphyAttribution: React.FC = () => {
  return (
    <div className="absolute bottom-2 left-2 z-10 pointer-events-none select-none">
      {/* Background for better contrast */}
      <div className="bg-black/30 backdrop-blur-[1px] rounded px-1.5 py-0.5">
        <img 
          src="https://assets.mistercuarter.es/elements/PoweredBy_200_Horizontal_Light-Backgrounds_With_Logo.gif" 
          alt="Powered by GIPHY" 
          className="h-[20px] md:h-[25px] w-auto object-contain"
        />
      </div>
    </div>
  );
};
