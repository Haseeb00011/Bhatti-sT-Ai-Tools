import React, { useState, useRef, useEffect } from 'react';
import { Wand2, Download, User, GraduationCap, RefreshCw, Palette, Briefcase, Mail, Phone, MapPin, Calendar, Flag, Hash, Star, Layout } from 'lucide-react';
import { ResumeData, GeneratedResumeContent } from '../types';
import { generateResumeContent } from '../services/gemini';

// --- Shared Helper ---
const hasExperience = (exp: string) => {
    return exp && exp.trim() !== '' && exp.trim() !== '0';
};

// ==========================================
// 1. DESIGN TOKEN CONSTANTS
// ==========================================

const PALETTES = [
    { name: 'Emerald', primary: '#059669', secondary: '#ecfdf5', text: '#064e3b', accent: '#34d399' },
    { name: 'Navy', primary: '#1e3a8a', secondary: '#eff6ff', text: '#1e3a8a', accent: '#60a5fa' },
    { name: 'Crimson', primary: '#b91c1c', secondary: '#fef2f2', text: '#7f1d1d', accent: '#f87171' },
    { name: 'Slate', primary: '#334155', secondary: '#f8fafc', text: '#0f172a', accent: '#94a3b8' },
    { name: 'Purple', primary: '#7c3aed', secondary: '#f5f3ff', text: '#5b21b6', accent: '#a78bfa' },
    { name: 'Teal', primary: '#0d9488', secondary: '#f0fdfa', text: '#134e4a', accent: '#2dd4bf' },
    { name: 'Gold', primary: '#b45309', secondary: '#fffbeb', text: '#78350f', accent: '#fbbf24' },
    { name: 'Black', primary: '#171717', secondary: '#fafafa', text: '#000000', accent: '#525252' },
    { name: 'Indigo', primary: '#4338ca', secondary: '#e0e7ff', text: '#312e81', accent: '#818cf8' },
    { name: 'Rose', primary: '#e11d48', secondary: '#fff1f2', text: '#881337', accent: '#fb7185' },
    { name: 'Orange', primary: '#ea580c', secondary: '#fff7ed', text: '#7c2d12', accent: '#fb923c' },
    { name: 'Cyan', primary: '#0891b2', secondary: '#ecfeff', text: '#155e75', accent: '#22d3ee' },
    { name: 'Lime', primary: '#65a30d', secondary: '#f7fee7', text: '#365314', accent: '#a3e635' },
    { name: 'Fuchsia', primary: '#c026d3', secondary: '#fdf4ff', text: '#701a75', accent: '#e879f9' },
    { name: 'Sky', primary: '#0284c7', secondary: '#f0f9ff', text: '#0c4a6e', accent: '#38bdf8' },
];

const FONTS = [
    { name: 'Modern', header: 'Helvetica, Arial, sans-serif', body: 'Helvetica, Arial, sans-serif' },
    { name: 'Classic', header: '"Georgia", serif', body: '"Georgia", serif' },
    { name: 'Tech', header: '"Courier New", monospace', body: '"Verdana", sans-serif' },
    { name: 'Elegant', header: '"Times New Roman", serif', body: '"Times New Roman", serif' },
    { name: 'Clean', header: '"Verdana", sans-serif', body: '"Verdana", sans-serif' },
    { name: 'Futuristic', header: '"Orbitron", sans-serif', body: '"Inter", sans-serif' },
];

// ==========================================
// 2. UNIVERSAL TEMPLATE ENGINE TYPES
// ==========================================

interface LayoutConfig {
    id: string;
    name: string;
    structure: 'left-sidebar' | 'right-sidebar' | 'single-column' | 'banner-top' | 'split-header' | 'grid-modern';
    headerStyle: 'simple' | 'banner' | 'boxed' | 'centered' | 'split' | 'floating';
    sectionStyle: 'underline' | 'box' | 'left-border' | 'minimal' | 'icon-header' | 'shaded';
    sidebarWidth: string; 
    hasIcons: boolean;
    useCaps: boolean;
    fontFamily: typeof FONTS[0];
    palette: typeof PALETTES[0];
    density: 'compact' | 'comfortable' | 'spacious';
    baseFontSize: number;
}

// ==========================================
// 3. MASTER LAYOUT PRESETS
// ==========================================

const createPreset = (i: number): LayoutConfig => {
    const structures = ['left-sidebar', 'right-sidebar', 'single-column', 'banner-top', 'split-header', 'grid-modern'] as const;
    const headers = ['simple', 'banner', 'boxed', 'centered', 'split', 'floating'] as const;
    const sections = ['underline', 'box', 'left-border', 'minimal', 'icon-header', 'shaded'] as const;
    // Adjusted densities to be more realistic for A4 fitting
    const densities = ['compact', 'comfortable', 'spacious'] as const;

    const structure = structures[i % structures.length];
    const header = headers[(i + 1) % headers.length];
    const section = sections[(i + 2) % sections.length];
    const font = FONTS[i % FONTS.length];
    const palette = PALETTES[i % PALETTES.length];
    const density = densities[i % densities.length];
    
    // Adjusted base font size range (9px to 11px) to prevent overflow
    const baseFontSize = 9 + (i % 3); 

    return {
        id: `layout-${i}`,
        name: `Master Layout ${i + 1}`,
        structure,
        headerStyle: header,
        sectionStyle: section,
        sidebarWidth: i % 4 === 0 ? '35%' : '30%',
        hasIcons: i % 2 === 0,
        useCaps: i % 3 === 0,
        fontFamily: font,
        palette,
        density,
        baseFontSize
    };
};

const MASTER_LAYOUTS: LayoutConfig[] = Array.from({ length: 150 }, (_, i) => createPreset(i));

// --- Style Helpers ---
const getSpacing = (config: LayoutConfig) => {
    switch (config.density) {
        case 'spacious': return { sectionMb: '20px', itemMb: '12px', lineHeight: '1.6' };
        case 'compact': return { sectionMb: '12px', itemMb: '6px', lineHeight: '1.3' };
        default: return { sectionMb: '16px', itemMb: '8px', lineHeight: '1.45' }; // Comfortable
    }
};

// ==========================================
// 4. SUB-COMPONENTS
// ==========================================

const ContactItem = ({ icon: Icon, text, config }: { icon: any, text: string, config: LayoutConfig }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: `${config.baseFontSize}px` }}>
        {config.hasIcons && <Icon size={config.baseFontSize + 2} color={config.structure.includes('sidebar') ? 'inherit' : config.palette.primary} />}
        <span>{text}</span>
    </div>
);

const SectionTitle = ({ title, config }: { title: string, config: LayoutConfig }) => {
    const text = config.useCaps ? title.toUpperCase() : title;
    const color = config.structure.includes('sidebar') ? config.palette.text : config.palette.primary;
    const fontSize = `${config.baseFontSize + 3}px`;
    const spacing = getSpacing(config);

    const styleCommon = { fontSize, fontWeight: 'bold' as const, marginBottom: spacing.itemMb, marginTop: '4px' };

    switch (config.sectionStyle) {
        case 'underline':
            return <h3 style={{ ...styleCommon, color: color, borderBottom: `2px solid ${config.palette.accent}`, paddingBottom: '3px' }}>{text}</h3>;
        case 'box':
            return <h3 style={{ ...styleCommon, backgroundColor: config.palette.secondary, color: config.palette.text, padding: '4px 10px', borderRadius: '4px' }}>{text}</h3>;
        case 'left-border':
            return <h3 style={{ ...styleCommon, color: color, borderLeft: `4px solid ${config.palette.primary}`, paddingLeft: '8px' }}>{text}</h3>;
        case 'icon-header':
            return <h3 style={{ ...styleCommon, color: color, display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={config.baseFontSize + 3} fill={color} /> {text}</h3>;
        case 'shaded':
            return <h3 style={{ ...styleCommon, color: '#fff', backgroundColor: config.palette.primary, padding: '3px 10px', display: 'inline-block' }}>{text}</h3>;
        default: 
            return <h3 style={{ ...styleCommon, color: color, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>{text}</h3>;
    }
};

const ResumeHeader = ({ data, photo, config }: { data: ResumeData, photo: string | null, config: LayoutConfig }) => {
    const textColor = config.headerStyle === 'banner' ? '#fff' : config.palette.text;
    const bgStyle = config.headerStyle === 'banner' ? { backgroundColor: config.palette.primary, padding: '25px' } : { paddingBottom: '20px', borderBottom: config.headerStyle === 'simple' ? `1px solid ${config.palette.accent}` : 'none' };
    const align = config.headerStyle === 'centered' ? 'center' : 'left';
    const nameSize = config.baseFontSize * 2.8; 
    const roleSize = config.baseFontSize * 1.3;

    return (
        <div style={{ ...bgStyle, textAlign: align, fontFamily: config.fontFamily.header, marginBottom: getSpacing(config).sectionMb }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: config.headerStyle === 'centered' ? 'center' : 'space-between', flexDirection: config.headerStyle === 'centered' ? 'column' : 'row' }}>
                <div style={{ order: config.headerStyle === 'centered' ? 2 : 1 }}>
                    <h1 style={{ fontSize: `${nameSize}px`, fontWeight: 'bold', color: textColor, margin: 0, lineHeight: 1.1 }}>
                        {config.useCaps ? data.fullName.toUpperCase() : data.fullName}
                    </h1>
                    <p style={{ fontSize: `${roleSize}px`, color: config.headerStyle === 'banner' ? 'rgba(255,255,255,0.9)' : config.palette.accent, marginTop: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>
                        {data.targetRole}
                    </p>
                </div>
                {photo && (
                    <div style={{ order: config.headerStyle === 'centered' ? 1 : 2, marginBottom: config.headerStyle === 'centered' ? '15px' : 0 }}>
                         <img src={photo} style={{ width: '100px', height: '100px', borderRadius: config.headerStyle === 'banner' ? '50%' : '6px', objectFit: 'cover', border: `3px solid ${config.headerStyle === 'banner' ? '#fff' : config.palette.primary}` }} />
                    </div>
                )}
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: align, marginTop: '15px', color: config.headerStyle === 'banner' ? '#fff' : '#555' }}>
                {data.phone && <ContactItem icon={Phone} text={data.phone} config={config} />}
                {data.email && <ContactItem icon={Mail} text={data.email} config={config} />}
                {data.address && <ContactItem icon={MapPin} text={data.address} config={config} />}
            </div>
        </div>
    );
};

const SidebarContent = ({ data, content, photo, config }: { data: ResumeData, content: GeneratedResumeContent, photo: string | null, config: LayoutConfig }) => {
    const spacing = getSpacing(config);
    return (
        <div style={{ fontSize: `${config.baseFontSize}px`, lineHeight: spacing.lineHeight, display: 'flex', flexDirection: 'column', gap: spacing.sectionMb }}>
            {photo && config.headerStyle !== 'banner' && config.headerStyle !== 'centered' && (
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <img src={photo} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)' }} />
                </div>
            )}
            
            {config.structure === 'split-header' && (
                 <div style={{ marginBottom: '15px', color: '#fff' }}>
                     <div style={{ fontSize: '28px', fontWeight: 'bold', lineHeight: 1.1 }}>{data.fullName}</div>
                     <div style={{ fontSize: '16px', opacity: 0.9, marginTop: '8px' }}>{data.targetRole}</div>
                 </div>
            )}

            <div>
                <h4 style={{ fontSize: `${config.baseFontSize + 2}px`, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>Details</h4>
                {data.dob && <div style={{ marginBottom: '4px' }}><Calendar size={config.baseFontSize} style={{ display: 'inline', marginRight: '6px' }} /> {data.dob}</div>}
                {data.nationality && <div style={{ marginBottom: '4px' }}><Flag size={config.baseFontSize} style={{ display: 'inline', marginRight: '6px' }} /> {data.nationality}</div>}
                {data.cnicNo && <div style={{ marginBottom: '4px' }}><Hash size={config.baseFontSize} style={{ display: 'inline', marginRight: '6px' }} /> {data.cnicNo}</div>}
                {data.passportNo && <div>Pass: {data.passportNo}</div>}
            </div>

            <div>
                <h4 style={{ fontSize: `${config.baseFontSize + 2}px`, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>Education</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{data.education}</p>
            </div>

            <div>
                <h4 style={{ fontSize: `${config.baseFontSize + 2}px`, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '4px', marginBottom: '8px', textTransform: 'uppercase' }}>Expertise</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {content.skills && content.skills.map((s, i) => (
                        <span key={i} style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: `${config.baseFontSize - 1}px` }}>{s}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};

const MainContent = ({ data, content, config }: { data: ResumeData, content: GeneratedResumeContent, config: LayoutConfig }) => {
    const spacing = getSpacing(config);
    return (
        <div style={{ fontSize: `${config.baseFontSize}px`, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <section style={{ marginBottom: spacing.sectionMb }}>
                <SectionTitle title="Professional Summary" config={config} />
                <p style={{ lineHeight: spacing.lineHeight, textAlign: 'justify' }}>{content.careerObjective || content.summary}</p>
            </section>

            {(hasExperience(data.experienceLocal) || hasExperience(data.experienceAbroad)) && (
                <section style={{ marginBottom: spacing.sectionMb, flex: 1 }}>
                    <SectionTitle title="Experience" config={config} />
                    
                    {hasExperience(data.experienceAbroad) && (
                        <div style={{ marginBottom: spacing.itemMb }}>
                            <div style={{ fontSize: `${config.baseFontSize + 1}px`, fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>International Assignment</div>
                            <p style={{ whiteSpace: 'pre-wrap', color: '#333', lineHeight: spacing.lineHeight }}>{data.experienceAbroad}</p>
                        </div>
                    )}
                    
                    {hasExperience(data.experienceLocal) && (
                        <div style={{ marginBottom: spacing.itemMb }}>
                            <div style={{ fontSize: `${config.baseFontSize + 1}px`, fontWeight: 'bold', color: '#000', marginBottom: '4px' }}>Domestic Assignment</div>
                            <p style={{ whiteSpace: 'pre-wrap', color: '#333', lineHeight: spacing.lineHeight }}>{data.experienceLocal}</p>
                        </div>
                    )}

                    <div style={{ marginTop: '12px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: `${config.baseFontSize}px` }}>Key Responsibilities:</div>
                        <ul style={{ paddingLeft: '18px', lineHeight: spacing.lineHeight, listStyleType: 'disc' }}>
                            {content.responsibilities && content.responsibilities.slice(0, 8).map((r, i) => <li key={i} style={{ marginBottom: '4px' }}>{r}</li>)}
                        </ul>
                    </div>
                </section>
            )}

            {/* If structure is NOT sidebar, show education/skills here too */}
            {(!config.structure.includes('sidebar')) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: spacing.sectionMb }}>
                     <section>
                        <SectionTitle title="Education" config={config} />
                        <p style={{ whiteSpace: 'pre-wrap', lineHeight: spacing.lineHeight }}>{data.education}</p>
                     </section>
                     <section>
                        <SectionTitle title="Skills" config={config} />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {content.skills && content.skills.map((s, i) => (
                                <span key={i} style={{ border: `1px solid ${config.palette.accent}`, padding: '4px 8px', borderRadius: '4px', color: config.palette.primary, fontSize: `${config.baseFontSize - 1}px` }}>{s}</span>
                            ))}
                        </div>
                     </section>
                </div>
            )}
            
            {(!config.structure.includes('sidebar')) && (
                <section style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', fontSize: `${config.baseFontSize - 1}px`, color: '#666' }}>
                         {data.dob && <div><strong>DOB:</strong> {data.dob}</div>}
                         {data.nationality && <div><strong>NAT:</strong> {data.nationality}</div>}
                         {data.cnicNo && <div><strong>ID:</strong> {data.cnicNo}</div>}
                         {data.passportNo && <div><strong>PASS:</strong> {data.passportNo}</div>}
                    </div>
                </section>
            )}
        </div>
    );
};

// ==========================================
// 5. UNIVERSAL RENDERER
// ==========================================

const UniversalResumeRenderer = ({ data, content, photo, config }: { data: ResumeData, content: GeneratedResumeContent, photo: string | null, config: LayoutConfig }) => {
    
    // Explicitly set dimensions to A4: 210mm x 297mm. Overflow hidden ensures we don't print extra pages.
    const pageStyle: React.CSSProperties = {
        width: '210mm',
        height: '297mm',
        overflow: 'hidden',
        fontFamily: config.fontFamily.body,
        color: '#333',
        backgroundColor: '#fff',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
    };

    // -- Structure 1: Sidebar Left --
    if (config.structure === 'left-sidebar') {
        return (
            <div style={{...pageStyle, flexDirection: 'row'}}>
                <div style={{ width: config.sidebarWidth, backgroundColor: config.palette.primary, color: '#fff', padding: '10mm 6mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                    <SidebarContent data={data} content={content} photo={photo} config={config} />
                </div>
                <div style={{ flex: 1, padding: '10mm', backgroundColor: '#fff', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                    <ResumeHeader data={data} photo={null} config={{...config, headerStyle: 'simple'}} />
                    <MainContent data={data} content={content} config={config} />
                </div>
            </div>
        );
    }

    // -- Structure 2: Sidebar Right --
    if (config.structure === 'right-sidebar') {
         return (
            <div style={{...pageStyle, flexDirection: 'row'}}>
                <div style={{ flex: 1, padding: '10mm', backgroundColor: '#fff', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                    <ResumeHeader data={data} photo={null} config={{...config, headerStyle: 'simple'}} />
                    <MainContent data={data} content={content} config={config} />
                </div>
                <div style={{ width: config.sidebarWidth, backgroundColor: config.palette.secondary, color: config.palette.text, padding: '10mm 6mm', boxSizing: 'border-box', borderLeft: `2px solid ${config.palette.primary}`, display: 'flex', flexDirection: 'column' }}>
                    <SidebarContent data={data} content={content} photo={photo} config={config} />
                </div>
            </div>
        );
    }

    // -- Structure 3: Banner Top --
    if (config.structure === 'banner-top') {
        return (
            <div style={pageStyle}>
                <ResumeHeader data={data} photo={photo} config={{...config, headerStyle: 'banner'}} />
                <div style={{ padding: '0 10mm 10mm 10mm', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <MainContent data={data} content={content} config={config} />
                </div>
            </div>
        );
    }

    // -- Structure 4: Split Header --
    if (config.structure === 'split-header') {
        return (
             <div style={{...pageStyle, flexDirection: 'row'}}>
                 <div style={{ width: '35%', backgroundColor: config.palette.text, color: '#fff', padding: '10mm 6mm', display: 'flex', flexDirection: 'column' }}>
                     <SidebarContent data={data} content={content} photo={photo} config={config} />
                 </div>
                 <div style={{ width: '65%', padding: '10mm', display: 'flex', flexDirection: 'column' }}>
                     <div style={{ textAlign: 'right', marginBottom: '20px', fontSize: `${config.baseFontSize}px`, color: '#666' }}>
                         {data.email} | {data.phone}
                     </div>
                     <MainContent data={data} content={content} config={config} />
                 </div>
             </div>
        );
    }

     // -- Structure 5: Grid/Modern --
     if (config.structure === 'grid-modern') {
         return (
             <div style={{...pageStyle, padding: '10mm'}}>
                 <div style={{ borderBottom: `3px solid ${config.palette.primary}`, marginBottom: '20px', paddingBottom: '15px' }}>
                    <ResumeHeader data={data} photo={photo} config={{...config, headerStyle: 'floating'}} />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', flex: 1, overflow: 'hidden' }}>
                     <div style={{ backgroundColor: config.palette.secondary, padding: '15px', borderRadius: '8px', height: 'fit-content' }}>
                         <SidebarContent data={data} content={content} photo={null} config={config} />
                     </div>
                     <div style={{ overflow: 'hidden' }}>
                         <MainContent data={data} content={content} config={config} />
                     </div>
                 </div>
             </div>
         );
     }

    // -- Default: Single Column --
    return (
        <div style={{...pageStyle, padding: '10mm'}}>
            <ResumeHeader data={data} photo={photo} config={config} />
            <MainContent data={data} content={content} config={config} />
        </div>
    );
};

// ==========================================
// 6. MAIN COMPONENT
// ==========================================

const ResumeBuilder: React.FC = () => {
  const [formData, setFormData] = useState<ResumeData>({
    fullName: '', fatherName: '', dob: '', passportNo: '', cnicNo: '', maritalStatus: '',
    nationality: '', religion: '', gender: '',
    email: '', phone: '', address: '', experienceLocal: '', experienceAbroad: '',
    education: '', targetRole: ''
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedResumeContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentLayoutIndex, setCurrentLayoutIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const processPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processPhoto(e.target.files[0]);
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
      if(e.dataTransfer.files?.[0]) processPhoto(e.dataTransfer.files[0]);
  };

  const pickRandomLayout = () => {
      const newIndex = Math.floor(Math.random() * MASTER_LAYOUTS.length);
      setCurrentLayoutIndex(newIndex);
  };

  const handleGenerateAI = async () => {
    setLoading(true);
    pickRandomLayout(); 
    try {
      const content = await generateResumeContent(formData);
      setGeneratedContent(content);
    } catch (error) {
      alert("Failed to generate AI content.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || !window.jspdf || !window.html2canvas) return;
    const element = printRef.current;
    element.style.display = 'block'; 
    try {
        const canvas = await window.html2canvas(element, { 
            scale: 2, 
            useCORS: true,
            width: 794, // A4 width in px at 96 DPI (approx 210mm)
            height: 1123, // A4 height in px at 96 DPI (approx 297mm)
            windowWidth: 794,
            windowHeight: 1123
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${formData.fullName.replace(/\s+/g, '_')}_CV.pdf`);
    } finally {
        element.style.display = 'none'; 
    }
  };

  const currentConfig = MASTER_LAYOUTS[currentLayoutIndex];

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold mb-4 text-emerald-400 neon-text brand-font">NEON CV FORGE</h2>
        <p className="text-gray-400">Complete personal profiling with intelligent formatting.</p>
        <p className="text-xs text-emerald-500/80 mt-2">
            Active Preset: {currentConfig.name} | Density: {currentConfig.density.toUpperCase()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[85vh]">
        {/* Form Side */}
        <div className="glass-panel p-6 rounded-2xl overflow-y-auto custom-scrollbar h-full">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <User className="text-emerald-400" /> Personal Details
          </h3>
          <div className="space-y-4">
             {/* Photo Upload */}
             <div 
                className={`flex items-center gap-4 mb-6 p-4 rounded-xl border-2 border-dashed transition-all ${isDragging ? 'border-emerald-500 bg-emerald-900/20' : 'border-transparent'}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
             >
                <div className="w-20 h-20 rounded-full bg-gray-700 overflow-hidden border-2 border-emerald-500 flex-shrink-0">
                    {photo ? <img src={photo} className="w-full h-full object-cover" /> : <User className="w-full h-full p-5 text-gray-500"/>}
                </div>
                <div className="flex-1">
                    <label className="block text-sm text-emerald-400 mb-2">
                        {isDragging ? 'Drop Image Here' : 'Profile Photo (Drag & Drop)'}
                    </label>
                    <input type="file" onChange={handlePhotoUpload} className="text-sm text-gray-400 w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-900 file:text-emerald-300 hover:file:bg-emerald-800" />
                </div>
             </div>
             {/* Fields */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="fullName" placeholder="Full Name" onChange={handleInputChange} className="bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm" />
                <input name="fatherName" placeholder="Father's Name" onChange={handleInputChange} className="bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <input name="dob" type="date" onChange={handleInputChange} className="w-full bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm text-gray-400" />
                 </div>
                 <div>
                    <select name="gender" onChange={handleInputChange} className="w-full bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm">
                        <option value="">Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                 </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select name="maritalStatus" onChange={handleInputChange} className="bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm">
                    <option value="">Marital Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                </select>
                <input name="religion" placeholder="Religion" onChange={handleInputChange} className="bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="nationality" placeholder="Nationality" onChange={handleInputChange} className="bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm" />
                <input name="passportNo" placeholder="Passport No" onChange={handleInputChange} className="bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm" />
             </div>
             <input name="cnicNo" placeholder="CNIC / ID Number" onChange={handleInputChange} className="w-full bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm" />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="phone" placeholder="Contact Number" onChange={handleInputChange} className="bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm" />
                <input name="email" placeholder="Email Address" onChange={handleInputChange} className="bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm" />
             </div>
             <input name="address" placeholder="Residential Address" onChange={handleInputChange} className="w-full bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none text-sm" />

             <h3 className="text-xl font-bold text-white mt-8 mb-4 flex items-center gap-2">
               <GraduationCap className="text-emerald-400" /> Professional Data
             </h3>
             <input name="targetRole" placeholder="Target Job Role" onChange={handleInputChange} className="w-full bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none mb-4 text-sm" />
             <label className="block text-gray-400 text-xs mb-1">Local Experience</label>
             <textarea name="experienceLocal" placeholder="Company, Role, Years..." onChange={handleInputChange} className="w-full bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none h-16 mb-2 text-sm" />
             <label className="block text-gray-400 text-xs mb-1">Abroad Experience</label>
             <textarea name="experienceAbroad" placeholder="Country, Company, Role, Years..." onChange={handleInputChange} className="w-full bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none h-16 mb-4 text-sm" />
             <label className="block text-gray-400 text-xs mb-1">Education Details</label>
             <textarea name="education" placeholder="Degree, Institute, Passing Year..." onChange={handleInputChange} className="w-full bg-black/40 border border-gray-700 p-2.5 rounded text-white focus:border-emerald-500 outline-none h-20 text-sm" />

             <button 
                onClick={handleGenerateAI}
                disabled={loading}
                className="w-full py-4 mt-6 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2"
             >
                {loading ? <Wand2 className="animate-spin" /> : <Wand2 />} Generate Professional CV (New Design)
             </button>
             
             {generatedContent && (
                 <button 
                    onClick={pickRandomLayout}
                    className="w-full py-3 mt-3 bg-gray-700 rounded-lg font-bold text-white hover:bg-gray-600 transition-all flex items-center justify-center gap-2 border border-gray-600"
                 >
                    <RefreshCw size={18} /> Shuffle Layout ({currentLayoutIndex + 1}/150)
                 </button>
             )}
          </div>
        </div>

        {/* Preview Side */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col h-full bg-gray-900/50">
           {/* Preview Container: Fixed aspect ratio A4 window */}
           <div className="flex-1 flex items-center justify-center bg-gray-800/50 rounded-lg shadow-inner overflow-hidden relative">
              {!generatedContent ? (
                  <div className="flex flex-col items-center justify-center text-gray-400 gap-4 p-8 text-center">
                      <Layout size={48} className="text-gray-600" />
                      <div>
                        <p className="text-lg font-semibold">Ready to Forge</p>
                        <p className="text-sm text-gray-500">Fill details and generate to see preview</p>
                      </div>
                  </div>
              ) : (
                  // The scaling container. The inner div is exactly A4 (210mm x 297mm).
                  // We scale it down to fit the preview window using CSS transform.
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden p-4">
                      <div 
                        style={{ 
                            transform: 'scale(0.55)', // Scaled down to view
                            transformOrigin: 'center center',
                            boxShadow: '0 0 30px rgba(0,0,0,0.5)'
                        }}
                      >
                         <UniversalResumeRenderer data={formData} content={generatedContent} photo={photo} config={currentConfig} />
                      </div>
                  </div>
              )}
           </div>
           
           <div className="mt-4 flex flex-col items-center">
             {generatedContent && (
                <div className="text-emerald-400 text-xs mb-2 flex gap-3">
                   <span className="flex items-center gap-1"><Palette size={10}/> {currentConfig.palette.name}</span>
                   <span>|</span>
                   <span>{currentConfig.fontFamily.name}</span>
                   <span>|</span>
                   <span>{currentConfig.density.toUpperCase()}</span>
                </div>
             )}
             <button 
                onClick={handleDownloadPdf}
                disabled={!generatedContent}
                className="w-full max-w-sm py-3 bg-white text-emerald-900 font-bold rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
             >
                <Download size={20} /> Download Final PDF (A4)
             </button>
           </div>
        </div>
      </div>

      {/* HIDDEN PRINT TEMPLATE - STRICTLY A4 */}
      <div 
         ref={printRef} 
         style={{ 
             display: 'none', 
             width: '210mm', 
             height: '297mm', 
             backgroundColor: 'white', 
             boxSizing: 'border-box'
         }}
      >
         {generatedContent && <UniversalResumeRenderer data={formData} content={generatedContent} photo={photo} config={currentConfig} />}
      </div>
    </div>
  );
};

export default ResumeBuilder;