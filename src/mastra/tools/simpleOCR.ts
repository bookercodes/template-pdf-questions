import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
// @ts-ignore
import PDFParser from 'pdf2json';

// Simple text extraction tool using pure JavaScript PDF parsing
export const simpleOCRTool = createTool({
  id: 'simple-text-extractor',
  description: 'Extract text from PDF using JavaScript PDF parser',
  inputSchema: z.object({
    pdfBuffer: z.instanceof(Buffer).describe('The PDF file buffer to process'),
  }),
  outputSchema: z.object({
    extractedText: z.string().describe('The text extracted from the PDF'),
    pagesCount: z.number().describe('Number of pages processed'),
  }),
  execute: async ({ context }) => {
    return await extractTextFromPDFSimple(context.pdfBuffer);
  },
});

// Simple function to extract text from PDF using pure JavaScript
export async function extractTextFromPDFSimple(pdfBuffer: Buffer): Promise<{ extractedText: string; pagesCount: number }> {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error('Invalid PDF file: empty buffer');
  }

  console.log('🔍 Extracting text from PDF...');

  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        let extractedText = '';
        let pageCount = 0;

        if (pdfData && pdfData.Pages) {
          pageCount = pdfData.Pages.length;

          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const textItem of page.Texts) {
                if (textItem.R) {
                  for (const textRun of textItem.R) {
                    if (textRun.T) {
                      // Decode URI component to get readable text
                      const decodedText = decodeURIComponent(textRun.T);
                      extractedText += decodedText + ' ';
                    }
                  }
                }
              }
            }
            extractedText += '\n\n'; // Add page break
          }
        }

        extractedText = extractedText.trim();

        if (!extractedText) {
          reject(new Error('No text could be extracted from the PDF'));
          return;
        }

        console.log(`✅ Extracted ${extractedText.length} characters from ${pageCount} pages`);

        resolve({
          extractedText,
          pagesCount: pageCount,
        });

      } catch (error) {
        reject(new Error(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });

    pdfParser.on('pdfParser_dataError', (error: any) => {
      reject(new Error(`PDF parsing failed: ${error.parserError || error.message || 'Unknown error'}`));
    });

    // Parse the PDF buffer
    pdfParser.parseBuffer(pdfBuffer);
  });
}
