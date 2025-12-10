import React, { useState } from 'react';
import { Camera, Sparkles, Upload, Download } from 'lucide-react';
import { enhancePassportPhoto } from '../services/gemini';

const PassportMaker: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setGeneratedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleProcess = async () => {
    if (!selectedImage) return;
    setLoading(true);
    try {
      const result = await enhancePassportPhoto(selectedImage);
      setGeneratedImage(result);
    } catch (error) {
      alert("Failed to process image. Ensure API Key is set and image is valid.");
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-pink-500 neon-pink-text brand-font">AI IDENTITY LAB</h2>
        <p className="text-gray-400">Upload a selfie. Get a professional passport photo with smart suit & white background.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Input Section */}
        <div className="glass-panel p-6 rounded-2xl border border-pink-900/30">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Camera className="text-pink-500" /> Original Photo
          </h3>
          
          <div 
            className={`relative aspect-[3/4] bg-black/40 rounded-xl overflow-hidden border-2 border-dashed transition-colors flex flex-col items-center justify-center ${isDragging ? 'border-pink-500 bg-pink-900/20' : 'border-gray-700 hover:border-pink-500'}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            {selectedImage ? (
              <img src={selectedImage} alt="Original" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6 pointer-events-none">
                <Upload size={48} className={`mx-auto mb-4 ${isDragging ? 'text-pink-400' : 'text-gray-500'}`} />
                <p className={`text-sm ${isDragging ? 'text-pink-300 font-bold' : 'text-gray-400'}`}>
                    {isDragging ? "Drop to Upload" : "Drag & Drop or Upload a casual photo"}
                </p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload}
              className="absolute inset-0 opacity-0 cursor-pointer" 
            />
          </div>

          <div className="mt-6">
            <button
              onClick={handleProcess}
              disabled={!selectedImage || loading}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl font-bold text-white hover:from-pink-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(236,72,153,0.4)] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Sparkles className="animate-spin" /> Enhancing Identity...
                </>
              ) : (
                <>
                  <Sparkles /> Transform & Generate
                </>
              )}
            </button>
            <p className="text-xs text-center mt-3 text-gray-500">AI will auto-detect face, change clothes to formal, and fix background.</p>
          </div>
        </div>

        {/* Output Section */}
        <div className="glass-panel p-6 rounded-2xl border border-pink-900/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} className="text-pink-500" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="text-pink-500" /> AI Result
          </h3>
          
          <div className="relative aspect-[3/4] bg-black/40 rounded-xl overflow-hidden border border-gray-700 flex items-center justify-center">
            {generatedImage ? (
              <img src={generatedImage} alt="Generated Passport" className="w-full h-full object-cover" />
            ) : (
              <div className="text-gray-600 text-center p-8">
                <p className="font-mono text-sm">WAITING FOR PROCESS...</p>
              </div>
            )}
          </div>

          {generatedImage && (
            <div className="mt-6">
              <a 
                href={generatedImage} 
                download="passport-photo.jpg"
                className="block w-full text-center py-4 border border-pink-500 text-pink-400 rounded-xl font-bold hover:bg-pink-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={20} /> Download HD
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PassportMaker;