import React, { useState, useRef } from 'react';
import { Upload, ScanLine, Download, CheckCircle, Loader2, X, FileImage, Trash2 } from 'lucide-react';
import { scanAndEnhanceDocument } from '../services/gemini';

interface ProcessedFile {
    id: string;
    originalName: string;
    processedData: string | null;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    fileObj: File;
}

const DocumentScanner: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList) => {
      const newFiles = Array.from(fileList).map(file => ({
        id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        originalName: file.name,
        fileObj: file,
        processedData: null,
        status: 'pending' as const
      }));
      setFiles(prev => [...prev, ...newFiles]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
      setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processAll = async () => {
    setIsProcessing(true);
    // Use a snapshot of the files array to iterate through
    const queue = [...files];

    for (const item of queue) {
        if (item.status === 'completed') continue;

        // Update status to processing safely
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'processing' } : f));

        try {
            // Convert to base64
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(item.fileObj);
            });

            const processedImage = await scanAndEnhanceDocument(base64);
            
            // Update with result
            setFiles(prev => prev.map(f => f.id === item.id ? { ...f, processedData: processedImage, status: 'completed' } : f));
        } catch (error) {
            console.error(error);
            setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'failed' } : f));
        }
    }
    setIsProcessing(false);
  };

  const downloadZip = async () => {
    const completedFiles = files.filter(f => f.status === 'completed' && f.processedData);
    if (completedFiles.length === 0) return;

    if (!window.JSZip || !window.saveAs) {
        alert("Libraries not loaded. Please refresh.");
        return;
    }

    const zip = new window.JSZip();
    
    completedFiles.forEach((f) => {
        const data = f.processedData!.split(',')[1]; // Remove data:image/xxx;base64,
        zip.file(`scanned_${f.originalName}`, data, { base64: true });
    });

    const content = await zip.generateAsync({ type: "blob" });
    window.saveAs(content, "scanned_documents.zip");
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
      if (e.dataTransfer.files && !isProcessing) {
          processFiles(e.dataTransfer.files);
      }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-float">
      <div className="text-center mb-10">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-purple-400 neon-text brand-font">AI DOC SCANNER</h2>
        <p className="text-gray-400">Intelligent Cropping, Perspective Correction & Enhancement.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Area */}
        <div className="lg:col-span-1">
            <div 
                className={`glass-panel p-8 rounded-2xl border-2 border-dashed transition-colors h-full flex flex-col items-center justify-center text-center cursor-pointer relative ${isDragging ? 'border-purple-400 bg-purple-900/20' : 'border-gray-600 hover:border-purple-500'}`}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                <div className="w-20 h-20 bg-purple-900/30 rounded-full flex items-center justify-center mb-6">
                    <Upload size={40} className="text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Upload Documents</h3>
                <p className="text-gray-400 text-sm mb-6">
                    {isDragging ? "Drop files here!" : "Drag & Drop or Click to Select multiple images"}
                </p>
                <button 
                    disabled={isProcessing}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                >
                    Select Files
                </button>
                <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                />
            </div>
        </div>

        {/* List & Process Area */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ScanLine className="text-purple-400"/> Processing Queue ({files.length})
                </h3>
                <div className="flex gap-3">
                    <button 
                        onClick={processAll} 
                        disabled={isProcessing || files.length === 0}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2 rounded-lg font-bold disabled:opacity-50 transition-all shadow-lg"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={18}/> : <ScanLine size={18}/>}
                        {isProcessing ? 'Processing...' : 'Auto-Scan All'}
                    </button>
                    <button 
                        onClick={downloadZip}
                        disabled={files.filter(f => f.status === 'completed').length === 0}
                        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg font-bold disabled:opacity-50 transition-all"
                    >
                        <Download size={18}/> Download ZIP
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                {files.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <FileImage size={48} className="mb-4 opacity-50" />
                        <p>No documents added yet.</p>
                    </div>
                )}

                {files.map((file) => (
                    <div key={file.id} className="bg-black/40 rounded-xl p-4 flex flex-col sm:flex-row gap-4 border border-gray-700 hover:border-purple-500/50 transition-all">
                        {/* Status Icon */}
                        <div className="flex items-center justify-between sm:hidden mb-2">
                            <span className="text-sm text-gray-400 truncate w-3/4">{file.originalName}</span>
                            <button 
                                onClick={() => removeFile(file.id)} 
                                disabled={isProcessing}
                                className="text-gray-500 hover:text-red-400 disabled:opacity-30"
                            >
                                <X size={16}/>
                            </button>
                        </div>

                        <div className="w-full sm:w-24 h-32 sm:h-24 bg-gray-800 rounded-lg flex-shrink-0 overflow-hidden relative border border-gray-600">
                             {file.processedData ? (
                                 <img src={file.processedData} className="w-full h-full object-contain bg-white" />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center">
                                     <FileImage className="text-gray-600" />
                                 </div>
                             )}
                             {/* Status Overlay */}
                             <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                 {file.status === 'completed' && <CheckCircle className="text-green-400 bg-black/50 rounded-full" size={24}/>}
                                 {file.status === 'failed' && <X className="text-red-400 bg-black/50 rounded-full" size={24}/>}
                                 {file.status === 'processing' && <Loader2 className="text-purple-400 animate-spin" size={24}/>}
                             </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                            <div className="hidden sm:flex justify-between items-start">
                                <h4 className="font-medium text-gray-200 truncate max-w-[200px]">{file.originalName}</h4>
                                <button 
                                    onClick={() => removeFile(file.id)} 
                                    disabled={isProcessing}
                                    className="text-gray-500 hover:text-red-400 p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                            <div className="mt-2 text-sm">
                                {file.status === 'pending' && <span className="text-gray-500">Waiting to scan...</span>}
                                {file.status === 'processing' && <span className="text-purple-400">Cropping & Enhancing...</span>}
                                {file.status === 'completed' && <span className="text-green-400">Scan Complete</span>}
                                {file.status === 'failed' && <span className="text-red-400">Processing Failed</span>}
                            </div>
                            {file.status === 'processing' && (
                                <div className="w-full bg-gray-700 h-1.5 mt-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 animate-pulse w-full"></div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentScanner;