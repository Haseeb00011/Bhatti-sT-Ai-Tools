import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedResumeContent, ResumeData } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const enhancePassportPhoto = async (base64Image: string): Promise<string> => {
  const ai = getAiClient();
  // Using Standard Flash Image model (Free Tier Compatible)
  const model = "gemini-2.5-flash-image";

  const data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const suitColors = ["Navy Blue", "Charcoal Grey", "Dark Slate", "Deep Black", "Midnight Blue", "Dark Brown"];
  const selectedColor = suitColors[Math.floor(Math.random() * suitColors.length)];

  // Retaining the high-quality prompt to get the best possible result from the standard model
  const prompt = `
    Act as a professional photo retoucher.
    
    TASK: Transform this selfie into a professional Passport Photo.
    
    INSTRUCTIONS:
    1.  **Identity**: Strictly preserve the facial features and identity.
    2.  **Attire**: Change the clothing to a professional ${selectedColor} business suit with a white shirt and tie.
    3.  **Style**: Realistic photography style. Avoid cartoonish or 3D rendered looks.
    4.  **Lighting**: Soft, even studio lighting.
    5.  **Background**: Pure white background.
    
    Output the processed image ONLY.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data } },
          { text: prompt }
        ]
      },
      config: {
        // 'imageSize' is removed as it is not supported in gemini-2.5-flash-image
        // 'aspectRatio' is supported
        // responseMimeType is NOT supported for this model
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/jpeg;base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini Image Gen Error:", error);
    throw error;
  }
};

export const scanAndEnhanceDocument = async (base64Image: string): Promise<string> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash-image";

  const data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const prompt = `
    Task: Intelligent Document Scanning & Enhancement.

    Input: An image containing a document (CV, Passport, ID Card, or Paper Document).

    Strict Requirements:
    1. **Crop**: Identify the document boundaries and crop out the background/table surface completely.
    2. **Perspective**: Correct any skew or angle so the document appears flat (top-down view).
    3. **Enhance**: Increase contrast and sharpness to make the text highly readable. Make the background of the paper clean (remove shadows/noise).
    4. **Text Fidelity**: PRESERVE ORIGINAL TEXT EXACTLY. Do not change, summarize, or hallucinate a single character. The text must remain legible and identical to the source.
    
    Output: The high-quality cropped and enhanced image file only.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data } },
          { text: prompt }
        ]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/jpeg;base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini Doc Scan Error:", error);
    throw error;
  }
};

export const generateResumeContent = async (data: ResumeData): Promise<GeneratedResumeContent> => {
  const ai = getAiClient();
  const model = "gemini-2.5-flash";

  const prompt = `
    Generate professional resume content for:
    Name: ${data.fullName}
    Target Role: ${data.targetRole}
    Experience Local: ${data.experienceLocal}
    Experience Abroad: ${data.experienceAbroad}

    Please provide:
    1. A strong Career Objective (2-3 sentences).
    2. Key Skills (list of 8-10 relevant skills).
    3. Key Responsibilities (bullet points suitable for their experience).
    4. A Professional Summary (short paragraph).

    Return ONLY raw JSON with keys: careerObjective, skills (array of strings), responsibilities (array of strings), summary.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          careerObjective: { type: Type.STRING },
          skills: { type: Type.ARRAY, items: { type: Type.STRING } },
          responsibilities: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING }
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate content");
  return JSON.parse(text);
};

export const analyzePdfContent = async (textChunk: string) => {
    const ai = getAiClient();
    const model = "gemini-2.5-flash"; 
    const response = await ai.models.generateContent({
        model,
        contents: `Analyze this document text and provide a concise summary and 3 key takeaways:\n\n${textChunk.substring(0, 8000)}`
    });
    return response.text;
}

// Improved Interface for Docx Structure including Tables
export interface DocxElement {
    type: 'heading1' | 'heading2' | 'paragraph' | 'bullet' | 'table';
    text?: string;
    rows?: string[][]; // For tables: array of rows, where each row is array of cell text
    bold?: boolean;
    italic?: boolean;
    alignment?: 'left' | 'center' | 'right' | 'justify';
}

export const convertPageToDocxStructure = async (base64Image: string): Promise<DocxElement[]> => {
    const ai = getAiClient();
    const model = "gemini-2.5-flash"; 
    
    // Clean base64
    const data = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const prompt = `
        You are a highly accurate OCR engine. Your ONLY job is to transcribe the content of this image into structured JSON for a Word document.
        
        DO NOT converse. DO NOT ask questions. DO NOT summarize.
        EXTRACT EVERYTHING VISIBLE.

        Instructions:
        1. Identify headings and paragraphs.
        2. Identify TABLES. If you see a grid or list of data, extract it as a 'table' type with 'rows'.
        3. Identify Lists.
        4. Preserve alignment (center/left/right).
        
        Output JSON Format:
        {
            "elements": [
                { "type": "heading1", "text": "Title Here", "alignment": "center" },
                { "type": "paragraph", "text": "Content goes here..." },
                { "type": "table", "rows": [ ["Header1", "Header2"], ["Cell1", "Cell2"] ] }
            ]
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType: "image/jpeg", data } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
            }
        });

        let text = response.text || '{"elements": []}';
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const json = JSON.parse(text);
        return json.elements || [];
    } catch (e) {
        console.error("Gemini Docx Conversion Error:", e);
        return [];
    }
};