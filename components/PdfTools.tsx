import React, { useState, useRef, useEffect } from 'react';
import { Layers, Scissors, Minimize2, Image as ImageIcon, FileOutput, Edit3, Save, X, Plus, FileText, FileCode, Type, MousePointer2, Eraser, Palette, Upload } from 'lucide-react';
import { convertPageToDocxStructure, DocxElement } from '../services/gemini';

const tools = [
  { id: 'merge', name: 'Merge PDF', icon: Layers, desc: 'Combine multiple PDFs into one.', multiple: true },
  { id: 'split', name: 'Split PDF', icon: Scissors, desc: 'Split PDF pages into a ZIP file.', multiple: false },
  { id: 'compress', name: 'Compress PDF', icon: Minimize2, desc: 'Optimize PDF size by quality reduction.', multiple: false },
  { id: 'pdf-to-jpg', name: 'PDF to JPG', icon: ImageIcon, desc: 'Convert all pages to images (ZIP).', multiple: false },
  { id: 'jpg-to-pdf', name: 'JPG to PDF', icon: FileOutput, desc: 'Convert images to a single PDF.', multiple: true, accept: 'image/*' },
  { id: 'editor', name: 'PDF Editor', icon: Edit3, desc: 'Edit Text, Add Images & Sign.', multiple: false },
  { id: 'pdf-to-word', name: 'PDF to MS Word', icon: FileText, desc: 'AI-Enhanced conversion to editable DOCX.', multiple: false, accept: '.pdf' },
  { id: 'word-to-pdf', name: 'MS Word to PDF', icon: FileCode, desc: 'Convert DOCX files to PDF format.', multiple: false, accept: '.docx' },
];

interface Annotation {
    id: string;
    type: 'text' | 'image';
    x: number;
    y: number;
    content?: string;
    fontSize?: number;
    color?: string;
    src?: string;
    width?: number;
    height?: number;
    file?: File;
    blob?: Blob;
}

const PdfTools: React.FC = () => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Editor State
  const [editorPageImage, setEditorPageImage] = useState<string | null>(null);
  const [editorPageWidth, setEditorPageWidth] = useState(0);
  const [editorPageHeight, setEditorPageHeight] = useState(0);

  const handleFiles = (fileList: FileList | null) => {
      if (fileList && fileList.length > 0) {
        setFiles(fileList);
        setMessage(`Selected ${fileList.length} file(s)`);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
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
    handleFiles(e.dataTransfer.files);
  };

  const resetState = () => {
    setActiveTool(null);
    setFiles(null);
    setMessage('');
    setProcessing(false);
    setEditorPageImage(null);
    setIsDragging(false);
  };

  const getPdfLib = () => window.PDFLib;
  const getJSZip = () => window.JSZip;
  const getSaveAs = () => window.saveAs;
  const getPdfJs = () => window.pdfjsLib;
  const getDocxGenerator = () => window.docxGenerator; 
  const getDocxRenderer = () => window.docx;

  // --- Tool Implementations ---

  const handleMerge = async () => {
    if (!files || files.length < 2) { setMessage("Select at least 2 PDFs."); setProcessing(false); return; }
    const { PDFDocument } = getPdfLib();
    const mergedPdf = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      const arrayBuffer = await files[i].arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page: any) => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    getSaveAs()(blob, 'bhattis_merged.pdf');
    setMessage("Merged Successfully!");
  };

  const handleSplit = async () => {
    if (!files || !files[0]) return;
    const { PDFDocument } = getPdfLib();
    const JSZip = getJSZip();
    const zip = new JSZip();

    const arrayBuffer = await files[0].arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPageCount();

    for (let i = 0; i < pageCount; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();
      zip.file(`page_${i + 1}.pdf`, pdfBytes);
    }

    const content = await zip.generateAsync({ type: "blob" });
    getSaveAs()(content, "bhattis_split_pages.zip");
    setMessage("Split Complete! Downloading ZIP.");
  };

  const handleCompress = async () => {
     if (!files || !files[0]) return;
     setProcessing(true);
     setMessage("Initializing compression (Rasterizing pages)...");
     
     try {
         const pdfjs = getPdfJs();
         const arrayBuffer = await files[0].arrayBuffer();
         const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
         const totalPages = pdf.numPages;
         
         if (!window.jspdf) throw new Error("jsPDF library not loaded");
         const { jsPDF } = window.jspdf;
         const doc = new jsPDF({ orientation: 'p', unit: 'mm' });
         doc.deletePage(1); 

         for (let i = 1; i <= totalPages; i++) {
             setMessage(`Compressing page ${i} of ${totalPages}...`);
             
             const page = await pdf.getPage(i);
             const viewport = page.getViewport({ scale: 1.5 });
             
             const canvas = document.createElement('canvas');
             const context = canvas.getContext('2d');
             canvas.height = viewport.height;
             canvas.width = viewport.width;

             await page.render({ canvasContext: context, viewport: viewport }).promise;
             
             const imgData = canvas.toDataURL('image/jpeg', 0.5); 
             
             const widthMm = viewport.width * 0.264583;
             const heightMm = viewport.height * 0.264583;
             
             doc.addPage([widthMm, heightMm]);
             doc.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
         }

         doc.save(`compressed_bhatti_${files[0].name}`);
         setMessage("Compressed PDF Downloaded!");
     } catch (e: any) {
         console.error(e);
         setMessage("Compression Failed. " + (e.message || ''));
     }
  };

  const handlePdfToJpg = async () => {
    if (!files || !files[0]) return;
    const JSZip = getJSZip();
    const zip = new JSZip();
    const pdfjs = getPdfJs();

    const arrayBuffer = await files[0].arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const data = imgData.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
        zip.file(`page_${i}.jpg`, data, { base64: true });
    }

    const content = await zip.generateAsync({ type: "blob" });
    getSaveAs()(content, "converted_images.zip");
    setMessage("Conversion Complete! Downloading ZIP.");
  };

  const handleJpgToPdf = async () => {
    if (!files || files.length === 0) return;
    const { PDFDocument } = getPdfLib();
    const pdfDoc = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setMessage(`Processing image ${i + 1} of ${files.length}...`);
        
        const arrayBuffer = await file.arrayBuffer();
        let image;

        try {
            const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
            if (isPng) {
                 image = await pdfDoc.embedPng(arrayBuffer);
            } else {
                 image = await pdfDoc.embedJpg(arrayBuffer);
            }
        } catch (e) {
            console.warn(`Direct embed failed. Using Canvas fallback.`, e);
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const img = new Image();
            img.src = dataUrl;
            await new Promise((resolve) => { img.onload = () => resolve(true); });
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context unavailable");
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const cleanDataUrl = canvas.toDataURL('image/jpeg', 0.90);
            image = await pdfDoc.embedJpg(cleanDataUrl.split(',')[1]);
        }

        if (image) {
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    getSaveAs()(blob, "bhattis_images_combined.pdf");
    setMessage("PDF Created Successfully!");
  };

  const handlePdfToWord = async () => {
      if (!files || !files[0]) return;
      const pdfjs = getPdfJs();
      const docx = getDocxGenerator(); 
      
      try {
          setMessage("Initializing AI OCR Engine...");
          const arrayBuffer = await files[0].arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          const docChildren: any[] = [];
          
          for (let i = 1; i <= pdf.numPages; i++) {
              setMessage(`Scanning Page ${i} / ${pdf.numPages} with Gemini Vision...`);
              
              const page = await pdf.getPage(i);
              const viewport = page.getViewport({ scale: 2.0 }); 
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext('2d');
              await page.render({ canvasContext: ctx, viewport }).promise;
              const imgData = canvas.toDataURL('image/jpeg', 0.8);

              const extractedElements: DocxElement[] = await convertPageToDocxStructure(imgData);
              
              if (extractedElements.length === 0) {
                   const image = await fetch(imgData).then(r => r.blob());
                   docChildren.push(new docx.Paragraph({
                       children: [new docx.ImageRun({
                           data: await image.arrayBuffer(),
                           transformation: { width: 550, height: (550 / canvas.width) * canvas.height }
                       })]
                   }));
                   continue;
              }

              extractedElements.forEach((el) => {
                  if (el.type === 'table' && el.rows) {
                      const tableRows = el.rows.map(row => 
                          new docx.TableRow({
                              children: row.map(cellText => 
                                  new docx.TableCell({
                                      children: [new docx.Paragraph(cellText)],
                                      borders: {
                                          top: { style: docx.BorderStyle.SINGLE, size: 1, color: "888888" },
                                          bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: "888888" },
                                          left: { style: docx.BorderStyle.SINGLE, size: 1, color: "888888" },
                                          right: { style: docx.BorderStyle.SINGLE, size: 1, color: "888888" },
                                      }
                                  })
                              )
                          })
                      );
                      
                      docChildren.push(new docx.Table({
                          rows: tableRows,
                          width: { size: 100, type: docx.WidthType.PERCENTAGE },
                          margins: { top: 100, bottom: 100, left: 100, right: 100 }
                      }));
                      docChildren.push(new docx.Paragraph({ text: "" }));

                  } else {
                      let headingLevel: any = undefined;
                      if (el.type === 'heading1') headingLevel = docx.HeadingLevel.HEADING_1;
                      if (el.type === 'heading2') headingLevel = docx.HeadingLevel.HEADING_2;

                      docChildren.push(new docx.Paragraph({
                          text: el.text || "",
                          heading: headingLevel,
                          alignment: el.alignment === 'center' ? docx.AlignmentType.CENTER : 
                                     el.alignment === 'right' ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
                          bullet: el.type === 'bullet' ? { level: 0 } : undefined,
                          children: [
                              new docx.TextRun({
                                  text: el.text || "",
                                  bold: el.bold,
                                  italics: el.italic
                              })
                          ],
                          spacing: { after: 200 }
                      }));
                  }
              });

              if (i < pdf.numPages) {
                  docChildren.push(new docx.Paragraph({ children: [new docx.PageBreak()] }));
              }
          }

          setMessage("Building Word Document...");
          const doc = new docx.Document({
              sections: [{
                  properties: {},
                  children: docChildren
              }]
          });

          const blob = await docx.Packer.toBlob(doc);
          getSaveAs()(blob, `converted_${files[0].name.replace('.pdf', '')}.docx`);
          setMessage("Conversion Complete! (Structure Preserved)");

      } catch (e: any) {
          console.error(e);
          setMessage("Conversion Failed: " + (e.message || "Unknown error"));
      }
  };

  const handleWordToPdf = async () => {
      if (!files || !files[0]) return;
      const docxRenderer = getDocxRenderer(); 
      
      try {
          setMessage("Analyzing Layout with AI Engine...");
          const arrayBuffer = await files[0].arrayBuffer();
          
          const container = document.createElement('div');
          container.id = 'docx-container';
          container.style.width = '210mm';
          container.style.position = 'absolute';
          container.style.left = '-9999px';
          container.style.backgroundColor = '#ffffff';
          document.body.appendChild(container);

          setMessage("Rendering Document Visuals (Images, Shapes, Layout)...");
          
          await docxRenderer.renderAsync(arrayBuffer, container, container, {
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              breakPages: true
          });

          setMessage("Generating PDF...");
          
          if (!window.jspdf) throw new Error("jsPDF not loaded");
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          const pages = container.querySelectorAll('.docx-wrapper > section');
          
          if (pages.length > 0) {
              for (let i = 0; i < pages.length; i++) {
                  setMessage(`Converting Page ${i + 1} of ${pages.length}...`);
                  const pageEl = pages[i] as HTMLElement;
                  
                  const canvas = await window.html2canvas(pageEl, { 
                      scale: 2, 
                      useCORS: true,
                      backgroundColor: '#ffffff'
                  });
                  
                  const imgData = canvas.toDataURL('image/jpeg', 0.95);
                  const imgProps = pdf.getImageProperties(imgData);
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                  
                  if (i > 0) pdf.addPage();
                  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
              }
          } else {
               const canvas = await window.html2canvas(container, { scale: 2, useCORS: true });
               const imgData = canvas.toDataURL('image/jpeg', 0.95);
               const imgProps = pdf.getImageProperties(imgData);
               const pdfWidth = pdf.internal.pageSize.getWidth();
               const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
               pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          }

          document.body.removeChild(container);
          pdf.save(`converted_${files[0].name.replace('.docx', '')}.pdf`);
          setMessage("Converted to PDF Successfully! (High Fidelity)");
          
      } catch (e: any) {
          console.error(e);
          if (document.getElementById('docx-container')) {
              document.body.removeChild(document.getElementById('docx-container')!);
          }
          setMessage("Conversion Failed: " + (e.message || "Unknown error"));
      }
  };

  const handleEditorLoad = async () => {
      if (!files || !files[0]) return;
      const pdfjs = getPdfJs();
      const arrayBuffer = await files[0].arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      
      setEditorPageWidth(viewport.width);
      setEditorPageHeight(viewport.height);
      setEditorPageImage(canvas.toDataURL('image/png'));
      setMessage("Editor Ready. Add text, images, or drawings.");
      setProcessing(false);
  };

  const executeAction = async () => {
    if (!files && activeTool !== 'editor') {
        setMessage("Please select a file.");
        return;
    }
    setProcessing(true);
    setMessage("Processing...");

    try {
        switch (activeTool) {
            case 'merge': await handleMerge(); break;
            case 'split': await handleSplit(); break;
            case 'compress': await handleCompress(); break;
            case 'pdf-to-jpg': await handlePdfToJpg(); break;
            case 'jpg-to-pdf': await handleJpgToPdf(); break;
            case 'editor': await handleEditorLoad(); break;
            case 'pdf-to-word': await handlePdfToWord(); break;
            case 'word-to-pdf': await handleWordToPdf(); break;
        }
    } catch (err: any) {
        console.error(err);
        setMessage("Error: " + (err.message || "Operation failed"));
    } finally {
        if (activeTool !== 'editor') setProcessing(false);
    }
  };

  // --- Premium Editor Component ---
  const PdfEditorView = () => {
      const canvasRef = useRef<HTMLCanvasElement>(null);
      const [tool, setTool] = useState<'cursor' | 'draw' | 'text' | 'image' | 'eraser'>('cursor');
      const [isDrawing, setIsDrawing] = useState(false);
      const [color, setColor] = useState('#EF4444'); // Default red
      const [annotations, setAnnotations] = useState<Annotation[]>([]);
      const [draggedId, setDraggedId] = useState<string | null>(null);

      // Initialize drawing canvas
      useEffect(() => {
          if (canvasRef.current) {
               const canvas = canvasRef.current;
               canvas.width = editorPageWidth;
               canvas.height = editorPageHeight;
               const ctx = canvas.getContext('2d');
               if (ctx) {
                   ctx.lineCap = 'round';
                   ctx.lineJoin = 'round';
               }
          }
      }, [editorPageWidth, editorPageHeight]);

      const startDraw = (e: React.MouseEvent) => {
          if (tool !== 'draw' && tool !== 'eraser') return;
          setIsDrawing(true);
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) {
             ctx.beginPath();
             const rect = canvasRef.current!.getBoundingClientRect();
             const scaleX = editorPageWidth / rect.width;
             const scaleY = editorPageHeight / rect.height;
             ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
             ctx.strokeStyle = tool === 'eraser' ? 'rgba(255,255,255,1)' : color;
             ctx.lineWidth = tool === 'eraser' ? 20 : 3;
             ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
          }
      };

      const draw = (e: React.MouseEvent) => {
          if (!isDrawing || !canvasRef.current) return;
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleX = editorPageWidth / rect.width;
              const scaleY = editorPageHeight / rect.height;
              ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
              ctx.stroke();
          }
      };

      const stopDraw = () => setIsDrawing(false);

      const addText = () => {
          const id = Date.now().toString();
          setAnnotations([...annotations, { id, type: 'text', x: 50, y: 50, content: 'Type here...', color: color, fontSize: 16 }]);
          setTool('cursor');
      };

      const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                  const id = Date.now().toString();
                  setAnnotations([...annotations, { 
                      id, type: 'image', x: 100, y: 100, src: reader.result as string, width: 200, height: 200, file 
                  }]);
              };
              reader.readAsDataURL(file);
          }
          setTool('cursor');
      };

      const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
          setAnnotations(annotations.map(a => a.id === id ? { ...a, ...updates } : a));
      };

      const deleteAnnotation = (id: string) => {
          setAnnotations(annotations.filter(a => a.id !== id));
      };

      // Drag Logic for Annotations
      const handleDragStart = (id: string, e: React.MouseEvent) => {
          if (tool !== 'cursor') return;
          setDraggedId(id);
      };
      
      const handleDragMove = (e: React.MouseEvent) => {
          if (!draggedId) return;
          const container = e.currentTarget.getBoundingClientRect();
          const scaleX = editorPageWidth / container.width;
          const scaleY = editorPageHeight / container.height;
          
          updateAnnotation(draggedId, {
              x: (e.clientX - container.left) * scaleX,
              y: (e.clientY - container.top) * scaleY
          });
      };

      const handleSave = async () => {
          if (!files) return;
          setMessage("Saving Changes to PDF...");
          const { PDFDocument, rgb } = getPdfLib();
          const arrayBuffer = await files[0].arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const page = pdfDoc.getPages()[0]; // Editing Page 1
          const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();
          
          // Helper: Convert Editor Coords to PDF Coords
          const scaleX = pdfPageWidth / editorPageWidth;
          const scaleY = pdfPageHeight / editorPageHeight;
          const mapX = (x: number) => x * scaleX;
          const mapY = (y: number) => pdfPageHeight - (y * scaleY);

          // 1. Burn Drawing Canvas
          if (canvasRef.current) {
              const drawingData = canvasRef.current.toDataURL('image/png');
              const drawingImage = await pdfDoc.embedPng(drawingData);
              page.drawImage(drawingImage, {
                  x: 0,
                  y: 0,
                  width: pdfPageWidth,
                  height: pdfPageHeight
              });
          }

          // 2. Burn Annotations
          for (const ann of annotations) {
              if (ann.type === 'text' && ann.content) {
                  // Approximate font size mapping
                  page.drawText(ann.content, {
                      x: mapX(ann.x),
                      y: mapY(ann.y + 10), // Adjust for baseline
                      size: (ann.fontSize || 16) * scaleX,
                      color: rgb(
                        parseInt(ann.color!.slice(1,3), 16)/255,
                        parseInt(ann.color!.slice(3,5), 16)/255,
                        parseInt(ann.color!.slice(5,7), 16)/255
                      )
                  });
              } else if (ann.type === 'image' && ann.src) {
                   try {
                       let imgEmbed;
                       if (ann.src.startsWith('data:image/png')) imgEmbed = await pdfDoc.embedPng(ann.src);
                       else imgEmbed = await pdfDoc.embedJpg(ann.src);
                       
                       // mapY is bottom-left, so we need to subtract height
                       const drawHeight = (ann.height || 100) * scaleY;
                       page.drawImage(imgEmbed, {
                           x: mapX(ann.x),
                           y: mapY(ann.y) - drawHeight,
                           width: (ann.width || 100) * scaleX,
                           height: drawHeight
                       });
                   } catch(e) {
                       console.error("Failed to embed image", e);
                   }
              }
          }

          const pdfBytes = await pdfDoc.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          getSaveAs()(blob, "edited_document.pdf");
          setMessage("Saved!");
      };

      return (
          <div className="w-full flex flex-col items-center">
               {/* Toolbar */}
               <div className="flex flex-wrap gap-2 mb-4 bg-black/60 backdrop-blur-md p-3 rounded-full border border-gray-700 shadow-xl z-20 sticky top-4">
                  <button 
                    onClick={() => setTool('cursor')} 
                    className={`p-2 rounded-full transition-all ${tool === 'cursor' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="Move / Select"
                  >
                      <MousePointer2 size={20} />
                  </button>
                  <div className="w-px bg-gray-600 mx-2"></div>
                  <button 
                    onClick={addText} 
                    className={`p-2 rounded-full transition-all ${tool === 'text' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="Add Text"
                  >
                      <Type size={20} />
                  </button>
                  <label className={`p-2 rounded-full transition-all cursor-pointer ${tool === 'image' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`} title="Add Image">
                      <ImageIcon size={20} />
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <div className="w-px bg-gray-600 mx-2"></div>
                  <button 
                    onClick={() => setTool('draw')} 
                    className={`p-2 rounded-full transition-all ${tool === 'draw' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="Draw"
                  >
                      <Edit3 size={20} />
                  </button>
                  <button 
                    onClick={() => setTool('eraser')} 
                    className={`p-2 rounded-full transition-all ${tool === 'eraser' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    title="Eraser"
                  >
                      <Eraser size={20} />
                  </button>
                  <div className="w-px bg-gray-600 mx-2"></div>
                  <input 
                    type="color" 
                    value={color} 
                    onChange={(e) => setColor(e.target.value)} 
                    className="w-8 h-8 rounded-full border-none cursor-pointer bg-transparent"
                    title="Color Picker"
                  />
               </div>

               {/* Editor Stage */}
               <div className="relative border-4 border-gray-800 rounded-lg shadow-2xl overflow-hidden bg-gray-900 select-none"
                    style={{ width: '100%', maxWidth: '800px', aspectRatio: `${editorPageWidth}/${editorPageHeight}` }}
                    onMouseMove={handleDragMove}
                    onMouseUp={() => setDraggedId(null)}
               >
                   {/* 1. PDF Background */}
                   <img src={editorPageImage!} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                   
                   {/* 2. Annotations Layer */}
                   <div className="absolute inset-0 z-10 overflow-hidden">
                       {annotations.map(ann => (
                           <div 
                                key={ann.id}
                                className="absolute cursor-move group"
                                style={{ 
                                    left: `${(ann.x / editorPageWidth) * 100}%`, 
                                    top: `${(ann.y / editorPageHeight) * 100}%`,
                                    color: ann.color,
                                    fontSize: `${(ann.fontSize || 16) / editorPageWidth * 100}vw` // Responsive font size estimation
                                }}
                                onMouseDown={(e) => handleDragStart(ann.id, e)}
                           >
                               {ann.type === 'text' ? (
                                   <div className="relative">
                                       <input 
                                         value={ann.content} 
                                         onChange={(e) => updateAnnotation(ann.id, { content: e.target.value })}
                                         className="bg-transparent border-2 border-transparent hover:border-cyan-400/50 focus:border-cyan-400 outline-none rounded px-1"
                                         style={{ color: ann.color, width: 'fit-content', minWidth: '50px' }}
                                       />
                                       <button onClick={() => deleteAnnotation(ann.id)} className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                                   </div>
                               ) : (
                                   <div className="relative group">
                                       <img 
                                          src={ann.src} 
                                          style={{ width: `${(ann.width! / editorPageWidth) * 100}%` }}
                                          className="border-2 border-transparent hover:border-cyan-400 rounded"
                                       />
                                       <button onClick={() => deleteAnnotation(ann.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
                                   </div>
                               )}
                           </div>
                       ))}
                   </div>

                   {/* 3. Drawing Layer */}
                   <canvas 
                        ref={canvasRef}
                        onMouseDown={startDraw}
                        onMouseUp={stopDraw}
                        onMouseMove={draw}
                        onMouseLeave={stopDraw}
                        className={`absolute inset-0 z-20 w-full h-full ${tool === 'draw' || tool === 'eraser' ? 'cursor-crosshair' : 'pointer-events-none'}`}
                   />
               </div>
               
               <div className="flex gap-4 mt-6">
                  <button onClick={handleSave} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 px-8 py-3 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transform hover:scale-105 transition-all">
                      <Save size={20}/> Save Edited PDF
                  </button>
                  <button onClick={resetState} className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-xl font-bold text-white transition-all">
                      Close Editor
                  </button>
               </div>
               <p className="text-gray-500 text-sm mt-4">Drag elements to position. Use "Save" to download the finalized PDF.</p>
          </div>
      );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 animate-float">
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-cyan-400 neon-text brand-font">BHATTI'S PDF SUITE</h2>
        <p className="text-gray-400">Professional PDF tools powered by WebAssembly.</p>
      </div>

      {!activeTool ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {tools.map((tool) => (
            <div 
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className="glass-panel p-6 rounded-xl cursor-pointer hover:bg-white/5 transition-all hover:scale-105 group border border-cyan-900/50 hover:border-cyan-400/50"
            >
              <div className={`w-12 h-12 mb-4 rounded-full flex items-center justify-center bg-cyan-900/50 text-cyan-400 group-hover:text-white transition-colors`}>
                <tool.icon size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-100">{tool.name}</h3>
              <p className="text-sm text-gray-500 group-hover:text-gray-300">{tool.desc}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel p-8 rounded-2xl max-w-5xl mx-auto">
          {!editorPageImage && (
            <button 
                onClick={resetState}
                className="mb-6 text-cyan-400 hover:text-cyan-200 flex items-center gap-2"
            >
                ← Back to Tools
            </button>
          )}
          
          <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
             {tools.find(t => t.id === activeTool)?.icon && React.createElement(tools.find(t => t.id === activeTool)!.icon, { className: 'text-cyan-400' })}
             {tools.find(t => t.id === activeTool)?.name}
          </h3>

          {/* Special view for Editor when active */}
          {activeTool === 'editor' && editorPageImage ? (
              <PdfEditorView />
          ) : (
              // Standard Tool View
              <div className="flex flex-col items-center">
                  <div 
                    className={`w-full border-2 border-dashed rounded-xl p-10 text-center transition-colors bg-black/20 mb-6 relative ${isDragging ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-600 hover:border-cyan-500'}`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    <input 
                        type="file" 
                        onChange={handleFileChange}
                        multiple={tools.find(t => t.id === activeTool)?.multiple}
                        accept={tools.find(t => t.id === activeTool)?.accept || '.pdf'} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center pointer-events-none">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            {activeTool === 'jpg-to-pdf' ? <ImageIcon className="text-gray-400" size={32} /> : 
                             activeTool === 'pdf-to-word' || activeTool === 'word-to-pdf' ? <FileText className="text-gray-400" size={32} /> :
                             activeTool === 'editor' ? <Edit3 className="text-gray-400" size={32} /> :
                             <FileOutput className="text-gray-400" size={32} />}
                        </div>
                        <span className="text-lg font-semibold text-gray-200">
                            {isDragging ? "Drop files here!" : files ? `${files.length} file(s) selected` : "Drag & Drop files or Click to select"}
                        </span>
                        <span className="text-sm text-gray-500 mt-2">
                            {tools.find(t => t.id === activeTool)?.multiple ? "Supports multiple files" : "Single file mode"}
                        </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    {processing ? (
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <span className="text-cyan-400 animate-pulse">{message}</span>
                        </div>
                    ) : (
                        <button 
                            onClick={executeAction}
                            disabled={!files}
                            className="px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-bold text-white hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center gap-2"
                        >
                            Start Process
                        </button>
                    )}
                    {message && !processing && <p className="mt-4 text-green-400 font-medium">{message}</p>}
                  </div>
              </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PdfTools;