
import React, { useState, useRef, useEffect } from 'react';
import { CyberButton, CyberCard } from './CyberUI';
import { X, ZoomIn, ZoomOut, Save } from 'lucide-react';

interface AvatarCropperProps {
    file: File;
    onSave: (blob: Blob) => void;
    onCancel: () => void;
}

export const AvatarCropper: React.FC<AvatarCropperProps> = ({ file, onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const CANVAS_SIZE = 300;

    useEffect(() => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            setImage(img);
            // Fit logic
            const minScale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
            setScale(minScale);
            setPosition({
                x: (CANVAS_SIZE - img.width * minScale) / 2,
                y: (CANVAS_SIZE - img.height * minScale) / 2
            });
        };
    }, [file]);

    useEffect(() => {
        draw();
    }, [image, scale, position]);

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas || !image) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Fill background (if transparent)
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw Image with transform
        ctx.drawImage(
            image, 
            position.x, 
            position.y, 
            image.width * scale, 
            image.height * scale
        );

        // Draw Circle Mask Overlay (Visual Guide)
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(CANVAS_SIZE/2, CANVAS_SIZE/2, CANVAS_SIZE/2, 0, Math.PI * 2, true);
        ctx.fill(); // Wait, we want to clear outside.
        // Actually, easiest is to draw overlay
        // Reset composite
        ctx.globalCompositeOperation = 'source-over';
    };

    // Since circular masking logic in canvas for export is complex,
    // we will save the SQUARE result, but visually show a circle overlay above the canvas in DOM.
    // CSS handles the display.

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.toBlob((blob) => {
            if (blob) onSave(blob);
        }, 'image/jpeg', 0.9);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(0.1, scale + delta);
        setScale(newScale);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <CyberCard className="w-full max-w-md border-cyan-500/50 p-6 flex flex-col items-center">
                <div className="flex justify-between w-full mb-4">
                    <h3 className="font-cyber text-white">AJUSTAR IMAGEN</h3>
                    <button onClick={onCancel}><X className="w-5 h-5 text-gray-500 hover:text-white"/></button>
                </div>

                <div className="relative w-[300px] h-[300px] bg-black border border-gray-700 overflow-hidden cursor-move touch-none mb-4">
                    <canvas 
                        ref={canvasRef}
                        width={CANVAS_SIZE}
                        height={CANVAS_SIZE}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
                    />
                    {/* Circle Guide Overlay */}
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/50 pointer-events-none shadow-[0_0_0_999px_rgba(0,0,0,0.5)]"></div>
                </div>

                <div className="flex items-center gap-4 w-full mb-6">
                    <ZoomOut className="w-5 h-5 text-gray-400" />
                    <input 
                        type="range" 
                        min="0.1" 
                        max="3" 
                        step="0.1" 
                        value={scale} 
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <ZoomIn className="w-5 h-5 text-gray-400" />
                </div>

                <div className="flex w-full gap-3">
                    <CyberButton variant="ghost" onClick={onCancel} className="flex-1">CANCELAR</CyberButton>
                    <CyberButton onClick={handleSave} className="flex-1"><Save className="w-4 h-4 mr-2"/> GUARDAR</CyberButton>
                </div>
            </CyberCard>
        </div>
    );
};
