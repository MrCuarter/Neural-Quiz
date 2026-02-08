
import React from 'react';
import { GiphyAttribution } from '../ui/GiphyAttribution';

interface QuestionImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt?: string;
    className?: string;
}

export const QuestionImage: React.FC<QuestionImageProps> = ({ src, alt, className, ...props }) => {
    const isGiphy = src?.includes('giphy.com') || src?.includes('media.giphy.com');

    return (
        <div className={`relative overflow-hidden inline-block ${className}`}>
            <img 
                src={src} 
                alt={alt || "Question Media"} 
                className="w-full h-full object-cover" 
                crossOrigin="anonymous"
                {...props} 
            />
            {isGiphy && <GiphyAttribution />}
        </div>
    );
};
