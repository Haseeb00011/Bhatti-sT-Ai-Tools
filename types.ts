
export enum AppSection {
  PDF_TOOLS = 'PDF_TOOLS',
  IMAGE_MODIFIER = 'IMAGE_MODIFIER',
  RESUME_BUILDER = 'RESUME_BUILDER',
  DOCUMENT_SCANNER = 'DOCUMENT_SCANNER'
}

export interface PdfTool {
  id: string;
  name: string;
  icon: any;
  description: string;
  isAi?: boolean;
}

export interface ResumeData {
  fullName: string;
  fatherName: string;
  dob: string;
  passportNo: string;
  cnicNo: string;
  maritalStatus: string;
  nationality: string;
  religion: string;
  gender: string;
  email: string;
  phone: string;
  address: string;
  experienceLocal: string;
  experienceAbroad: string;
  education: string;
  targetRole: string; // To help AI generate objectives
}

export interface GeneratedResumeContent {
  careerObjective: string;
  skills: string[];
  responsibilities: string[];
  summary: string;
}

// Global definition for libraries loaded via CDN
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
    PDFLib: any;
    JSZip: any;
    saveAs: any;
    pdfjsLib: any;
    docxGenerator: any; // The docx library for creating .docx
    docx: any; // The docx-preview library for rendering .docx
    mammoth: any;
  }
}