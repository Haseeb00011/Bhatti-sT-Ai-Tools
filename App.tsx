import React, { useState } from 'react';
import { AppSection } from './types';
import PdfTools from './components/PdfTools';
import PassportMaker from './components/PassportMaker';
import ResumeBuilder from './components/ResumeBuilder';
import DocumentScanner from './components/DocumentScanner';
import { LayoutGrid, Image as ImageIcon, FileText, Zap, ScanLine } from 'lucide-react';

const App: React.FC = () => {
  const [section, setSection] = useState<AppSection>(AppSection.PDF_TOOLS);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black overflow-x-hidden flex flex-col">
      {/* Dynamic Background Elements */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-400 fill-yellow-400" size={28} />
            <h1 className="text-2xl font-bold tracking-wider brand-font hidden sm:block">
              BHATTI'S<span className="text-cyan-400"> AI TOOLS</span>
            </h1>
          </div>

          <div className="flex gap-2 bg-white/5 p-1 rounded-full border border-white/10 overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setSection(AppSection.PDF_TOOLS)}
              className={`px-4 md:px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                section === AppSection.PDF_TOOLS 
                  ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.5)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid size={18} /> <span className="hidden sm:inline">PDF Tools</span>
            </button>
            <button 
              onClick={() => setSection(AppSection.IMAGE_MODIFIER)}
              className={`px-4 md:px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                section === AppSection.IMAGE_MODIFIER 
                  ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.5)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon size={18} /> <span className="hidden sm:inline">Identity Lab</span>
            </button>
            <button 
              onClick={() => setSection(AppSection.RESUME_BUILDER)}
              className={`px-4 md:px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                section === AppSection.RESUME_BUILDER 
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.5)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText size={18} /> <span className="hidden sm:inline">CV Forge</span>
            </button>
            <button 
              onClick={() => setSection(AppSection.DOCUMENT_SCANNER)}
              className={`px-4 md:px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                section === AppSection.DOCUMENT_SCANNER 
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ScanLine size={18} /> <span className="hidden sm:inline">DocuScan AI</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 pt-32 pb-20 px-4 flex-1">
        {section === AppSection.PDF_TOOLS && <PdfTools />}
        {section === AppSection.IMAGE_MODIFIER && <PassportMaker />}
        {section === AppSection.RESUME_BUILDER && <ResumeBuilder />}
        {section === AppSection.DOCUMENT_SCANNER && <DocumentScanner />}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/80 py-8 text-center text-gray-500 text-sm">
        <p>&copy; 2024 Bhatti's AI Tool.</p>
      </footer>
    </div>
  );
};

export default App;