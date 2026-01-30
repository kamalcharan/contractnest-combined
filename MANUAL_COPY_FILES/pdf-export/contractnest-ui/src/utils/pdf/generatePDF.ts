// src/utils/pdf/generatePDF.ts
// Reusable PDF generation utility using html2canvas + jsPDF
// Captures a DOM element and exports it as a multi-page A4 PDF

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface GeneratePDFOptions {
  /** Output filename (default: 'document.pdf') */
  filename?: string;
  /** Page margin in mm (default: 10) */
  margin?: number;
  /** Page orientation (default: 'portrait') */
  orientation?: 'portrait' | 'landscape';
  /** JPEG quality 0-1 (default: 0.92) */
  quality?: number;
  /** Canvas scale factor — higher = sharper (default: 2) */
  scale?: number;
  /** Force light background for PDF regardless of dark mode (default: true) */
  forceLightBg?: boolean;
}

/**
 * Generates a PDF from a DOM element.
 * Handles multi-page content automatically by slicing the captured canvas.
 *
 * Usage:
 *   const el = document.getElementById('paper');
 *   await generatePDF(el, { filename: 'contract.pdf' });
 */
export const generatePDF = async (
  element: HTMLElement,
  options: GeneratePDFOptions = {}
): Promise<void> => {
  const {
    filename = 'document.pdf',
    margin = 10,
    orientation = 'portrait',
    quality = 0.92,
    scale = 2,
    forceLightBg = true,
  } = options;

  // Capture element as high-res canvas
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: forceLightBg ? '#FFFFFF' : null,
    // Ensure gradients and shadows render correctly
    allowTaint: false,
    imageTimeout: 15000,
  });

  const imgData = canvas.toDataURL('image/jpeg', quality);

  // Create PDF (A4: 210 x 297 mm)
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - 2 * margin;
  const usableHeight = pageHeight - 2 * margin;

  // Scale image to fit page width
  const imgWidth = usableWidth;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  if (imgHeight <= usableHeight) {
    // ─── Single page ───
    pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
  } else {
    // ─── Multi-page: slice the source canvas into page-height chunks ───
    const pageCanvasHeight = (canvas.width * usableHeight) / usableWidth;
    let remainingHeight = canvas.height;
    let sourceY = 0;
    let pageIndex = 0;

    while (remainingHeight > 0) {
      const sliceHeight = Math.min(pageCanvasHeight, remainingHeight);

      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          0, sourceY,             // source x, y
          canvas.width, sliceHeight, // source w, h
          0, 0,                   // dest x, y
          canvas.width, sliceHeight  // dest w, h
        );
      }

      const pageImgData = pageCanvas.toDataURL('image/jpeg', quality);
      const pageImgHeight = (sliceHeight * usableWidth) / canvas.width;

      if (pageIndex > 0) {
        pdf.addPage();
      }

      pdf.addImage(pageImgData, 'JPEG', margin, margin, imgWidth, pageImgHeight);

      remainingHeight -= sliceHeight;
      sourceY += sliceHeight;
      pageIndex++;
    }
  }

  pdf.save(filename);
};
