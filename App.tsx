import React, { useState, useCallback, useMemo } from 'react';
import Button from './components/Button';
import ImageUploader from './components/ImageUploader';
import Panel from './components/Panel';
import ResultGrid from './components/ResultGrid';
import ImageModal from './components/ImageModal';
import { analyzeStyleImage, generateImageVariation } from './services/geminiService';
import type { ImageFile } from './types';

const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<ImageFile | null>(null);
  const [styleImage, setStyleImage] = useState<ImageFile | null>(null);
  const [prompts, setPrompts] = useState({ outfit: '', background: '' });
  const [aspectRatio, setAspectRatio] = useState('1:1');

  const generateDefaultVariationPrompts = useCallback(() => [
      'chính diện, biểu cảm chuyên nghiệp, nhìn thẳng ống kính',
      'chính diện, mỉm cười nhẹ nhàng, thân thiện',
      'chính diện, biểu cảm tự tin, hơi ngẩng cao đầu',
      'góc nghiêng 3/4 từ bên trái, ánh mắt nhìn xa xăm',
      'góc nghiêng 3/4 từ bên phải, mỉm cười duyên dáng',
      'chụp từ góc thấp hướng lên, biểu cảm quyền lực',
      'chụp từ góc cao hướng xuống, biểu cảm suy tư',
      'hồ sơ bên (profile view) từ trái, đường nét sắc sảo',
      'góc nghiêng nhẹ, nhìn qua vai, biểu cảm bí ẩn',
  ], []);

  const [variationPrompts, setVariationPrompts] = useState<string[]>(generateDefaultVariationPrompts());

  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPrompts((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleVariationPromptChange = (index: number, value: string) => {
    const newPrompts = [...variationPrompts];
    newPrompts[index] = value;
    setVariationPrompts(newPrompts);
  };

  const handleAnalyzeStyle = useCallback(async () => {
    if (!styleImage) {
      setError('Vui lòng tải lên ảnh cảm hứng trước.');
      return;
    }
    setIsLoadingAnalysis(true);
    setError(null);
    try {
      const result = await analyzeStyleImage(styleImage);
      setPrompts(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định.');
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [styleImage]);

  const preprocessImageForAspectRatio = (image: HTMLImageElement, targetAspectRatio: string): Promise<ImageFile> => {
    return new Promise((resolve) => {
      const [w, h] = targetAspectRatio.split(':').map(Number);
      const targetRatio = w / h;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imageRatio = image.naturalWidth / image.naturalHeight;
      
      let newWidth, newHeight;
      if (imageRatio > targetRatio) {
        newWidth = image.naturalWidth;
        newHeight = image.naturalWidth / targetRatio;
      } else {
        newWidth = image.naturalHeight * targetRatio;
        newHeight = image.naturalHeight;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;
      
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, newWidth, newHeight);

      const x = (newWidth - image.naturalWidth) / 2;
      const y = (newHeight - image.naturalHeight) / 2;

      ctx.drawImage(image, x, y, image.naturalWidth, image.naturalHeight);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = (e.target?.result as string).split(',')[1];
          const file = new File([blob], "preprocessed_image.jpeg", { type: 'image/jpeg' });
          resolve({
            file,
            previewUrl: URL.createObjectURL(file),
            base64,
            mimeType: 'image/jpeg',
          });
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!sourceImage) {
      setError('Vui lòng tải ảnh gốc.');
      return;
    }
     if (!prompts.outfit || !prompts.background) {
      setError('Vui lòng phân tích ảnh hoặc điền mô tả trang phục và bối cảnh.');
      return;
    }

    setIsLoadingGeneration(true);
    setError(null);
    setGeneratedImages([]);

    const img = new Image();
    img.src = sourceImage.previewUrl;
    img.onload = async () => {
        try {
            const preprocessedImage = await preprocessImageForAspectRatio(img, aspectRatio);
            
            for (let i = 0; i < variationPrompts.length; i++) {
                const anglePrompt = variationPrompts[i];
                if (!anglePrompt) {
                  setError(`Vui lòng điền mô tả cho Biến thể ${i + 1}.`);
                  setIsLoadingGeneration(false);
                  return;
                }
                const imageBase64 = await generateImageVariation(preprocessedImage, prompts, aspectRatio, anglePrompt);
                setGeneratedImages(prev => [...prev, imageBase64]);
            }
        } catch (e) {
            setError(e instanceof Error ? `Lỗi tạo biến thể ảnh:\n${e.message}` : 'Lỗi không xác định.');
        } finally {
            setIsLoadingGeneration(false);
        }
    };
    img.onerror = () => {
        setError("Không thể tải ảnh gốc để xử lý.");
        setIsLoadingGeneration(false);
    }
  }, [sourceImage, prompts, aspectRatio, variationPrompts]);

  const handleImageClick = (imageBase64: string, isSource: boolean = false) => {
    const mimeType = isSource && sourceImage ? sourceImage.mimeType : 'image/png';
    setSelectedImage(`data:${mimeType};base64,${imageBase64}`);
  };

  return (
    <div className="bg-[#0d1117] min-h-screen text-gray-200 font-sans p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">Lê Hoàng Dũng - Nghiện Prompt</h1>
          <a href="https://www.facebook.com/groups/nghienpromptviet" target="_blank" rel="noopener noreferrer" className="text-lg text-blue-400 hover:text-blue-300 transition-colors">
            https://www.facebook.com/groups/nghienpromptviet
          </a>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Inputs */}
          <div className="flex flex-col gap-8">
            <Panel step={1} title="Tải ảnh gốc (Người cần giữ lại)">
              <ImageUploader onFileSelect={setSourceImage} imageFile={sourceImage} title="Nhấp hoặc kéo thả ảnh gốc vào đây" />
            </Panel>

            <Panel step={2} title="(Tùy chọn) Lấy cảm hứng từ ảnh mẫu">
               <ImageUploader onFileSelect={setStyleImage} imageFile={styleImage} title="Nhấp hoặc kéo thả ảnh cảm hứng (trang phục, bối cảnh)" />
            </Panel>

            <Panel step={3} title="Phân tích & Tinh chỉnh Chi tiết">
                <Button onClick={handleAnalyzeStyle} isLoading={isLoadingAnalysis} disabled={!styleImage || isLoadingAnalysis || isLoadingGeneration} className="w-full mb-4">
                  Phân tích để tạo mô tả
                </Button>
                <div className="flex flex-col gap-4">
                    <textarea name="outfit" value={prompts.outfit} onChange={handlePromptChange} placeholder="Mô tả trang phục sẽ xuất hiện ở đây sau khi phân tích..." rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"/>
                    <textarea name="background" value={prompts.background} onChange={handlePromptChange} placeholder="Mô tả bối cảnh sẽ xuất hiện ở đây sau khi phân tích..." rows={4} className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"/>
                </div>
                 <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tỉ lệ khung hình</label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {['1:1', '3:4', '16:9', '9:16'].map(ratio => (
                            <label key={ratio} className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="aspectRatio" value={ratio} checked={aspectRatio === ratio} onChange={(e) => setAspectRatio(e.target.value)} className="form-radio h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"/>
                                <span>{ratio}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="mt-6">
                   <label className="block text-sm font-medium text-gray-300 mb-2">Tinh chỉnh chi tiết cho 9 biến thể</label>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {variationPrompts.map((prompt, index) => (
                        <div key={index}>
                           <label htmlFor={`prompt-${index}`} className="text-xs text-gray-400 mb-1">Biến thể {index+1}</label>
                           <input 
                              type="text"
                              id={`prompt-${index}`}
                              value={prompt}
                              onChange={(e) => handleVariationPromptChange(index, e.target.value)}
                              placeholder={`Góc chụp, biểu cảm...`}
                              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                           />
                        </div>
                      ))}
                   </div>
                </div>
            </Panel>
            
            <Button onClick={handleGenerate} isLoading={isLoadingGeneration} disabled={!sourceImage || isLoadingGeneration || isLoadingAnalysis} variant="primary" className="w-full text-lg py-3">
              {isLoadingGeneration ? 'Đang tạo...' : 'Tạo 9 biến thể'}
            </Button>
          </div>
          
          <Panel step={4} title="Kết quả">
             <div className="min-h-[400px] flex flex-col">
                {error && <div className="text-red-400 bg-red-900/30 p-3 rounded-md mb-4 whitespace-pre-wrap" role="alert">{error}</div>}
                <div className="flex-grow">
                    <ResultGrid sourceImage={sourceImage} generatedImages={generatedImages} onImageClick={handleImageClick} />
                </div>
            </div>
          </Panel>
        </main>
      </div>
      
      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  );
};

export default App;
