import React from 'react';
import type { ImageFile } from '../types';

interface ResultGridProps {
    sourceImage: ImageFile | null;
    generatedImages: string[];
    onImageClick: (imageBase64: string, isSource?: boolean) => void;
}

const ResultGrid: React.FC<ResultGridProps> = ({ sourceImage, generatedImages, onImageClick }) => {
    const hasContent = sourceImage || generatedImages.length > 0;
    
    if (!hasContent) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Các ảnh được tạo sẽ xuất hiện ở đây.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {sourceImage && (
                 <button 
                    onClick={() => onImageClick(sourceImage.base64, true)} 
                    className="relative group w-full h-full rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#161b22]"
                    aria-label="Xem ảnh gốc"
                >
                    <img src={sourceImage.previewUrl} alt="Gốc" className="w-full h-full object-cover shadow-md transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute bottom-0 left-0 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-br-lg rounded-tl-lg">
                        Gốc
                    </div>
                </button>
            )}
            {generatedImages.map((imgBase64, index) => (
                 <button 
                    key={index}
                    onClick={() => onImageClick(imgBase64)}
                    className="relative group w-full h-full rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#161b22] animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                    aria-label={`Xem biến thể ${index + 1}`}
                >
                    <img src={`data:image/png;base64,${imgBase64}`} alt={`Biến thể ${index + 1}`} className="w-full h-full object-cover shadow-md transition-transform duration-300 group-hover:scale-105" />
                     <div className="absolute bottom-0 left-0 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-br-lg rounded-tl-lg">
                        Biến thể {index + 1}
                    </div>
                </button>
            ))}
        </div>
    );
};

export default ResultGrid;