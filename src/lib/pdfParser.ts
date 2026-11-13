import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Configure the worker to use the local same-origin bundle produced by Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface ExtractedAuthor {
  name: string;
  email: string;
  affiliation: string;
  department: string;
  corresponding: boolean;
  orcid?: string;
}

export interface ExtractedManuscript {
  title: string;
  abstract: string;
  keywords: string;
  references: string;
  authors: ExtractedAuthor[];
  isTemplateConformant: boolean;
  rawPage1Text: string;
}

/**
 * Extracts metadata from an academic PDF manuscript and validates
 * strictly against the official TJASF journal template.
 */
export async function parsePdfManuscript(file: File): Promise<ExtractedManuscript | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdf = await loadingTask.promise;
    if (!pdf || pdf.numPages === 0) return null;

    // 1. Extract Page 1 text items with geometry for smart title extraction
    const page1 = await pdf.getPage(1);
    const textContent1 = await page1.getTextContent();
    const items: Array<{ str: string; height: number; y: number; x: number }> = [];

    for (const item of textContent1.items as any[]) {
      if (item.str && item.str.trim()) {
        const height = Math.abs(item.transform?.[3] || item.height || 10);
        items.push({
          str: item.str.trim(),
          height: Math.round(height * 10) / 10,
          y: Math.round((item.transform?.[5] || 0) * 10) / 10,
          x: Math.round((item.transform?.[4] || 0) * 10) / 10,
        });
      }
    }

    // Build raw text string for page 1
    const page1Strings = items.map((i) => i.str);
    const page1Text = page1Strings.join(' ');

    // 2. Scan first few pages to detect template conformance markers (headers, footers, sections)
    const scannedPages: string[] = [page1Text];
    const maxScanPages = Math.min(pdf.numPages, 5);
    for (let p = 2; p <= maxScanPages; p++) {
      try {
        const pPage = await pdf.getPage(p);
        const pContent = await pPage.getTextContent();
        const pText = (pContent.items as any[])
          .map((i) => (i.str || '').trim())
          .filter(Boolean)
          .join(' ');
        scannedPages.push(pText);
      } catch (e) {
        console.warn(`Could not read page ${p} for template verification:`, e);
      }
    }

    // 3. Extract Last Page text for references
    let lastPageText = page1Text;
    if (pdf.numPages > 1) {
      try {
        const lastPage = await pdf.getPage(pdf.numPages);
        const textContentLast = await lastPage.getTextContent();
        const lastPageItems = (textContentLast.items as any[])
          .map((i) => (i.str || '').trim())
          .filter(Boolean);
        lastPageText = lastPageItems.join(' \n');
        scannedPages.push(lastPageText);
      } catch (e) {
        console.warn('Could not read last page for references:', e);
      }
    }

    const fullScannedText = scannedPages.join(' \n ');

    // If completely empty (e.g. scanned image PDF)
    if (!page1Text.trim() && !lastPageText.trim()) {
      return null;
    }

    // --- TITLE EXTRACTION ---
    // Filter out common header phrases (ISSN, Journal name, Volume, DOI, page numbers)
    const nonHeaderItems = items.filter((item) => {
      const s = item.str.toLowerCase();
      if (s.length < 3) return false;
      if (/^(tjasf|the journal|international journal|volume|issue|issn|doi|http|www|page|\d+$)/i.test(s)) return false;
      if (/(all rights reserved|published by|copyright|received:|accepted:|published:|journal of advanced|scientific frontiers)/i.test(s)) return false;
      return true;
    });

    let extractedTitle = '';
    if (nonHeaderItems.length > 0) {
      // Find maximum font size among top items (usually title)
      const topItems = nonHeaderItems.slice(0, 8);
      const maxHeight = Math.max(...topItems.map((i) => i.height));
      const titleCandidates = topItems.filter((i) => i.height >= maxHeight * 0.9);
      if (titleCandidates.length > 0) {
        extractedTitle = titleCandidates.map((i) => i.str).join(' ');
      } else {
        extractedTitle = topItems[0].str;
      }
    }

    // Fallback title to filename if not found
    if (!extractedTitle || extractedTitle.length < 5) {
      extractedTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Clean up title placeholder if uploaded raw template
    if (/^full paper title$/i.test(extractedTitle.trim())) {
      extractedTitle = '';
    }

    // --- ABSTRACT EXTRACTION ---
    let extractedAbstract = '';
    const abstractMatch = page1Text.match(/abstract[\s:\-–—\n]+([\s\S]+?)(keywords|key\s*words|index\s*terms|1[\.\s]+introduction|introduction|i\.\s+introduction|$)/i);
    if (abstractMatch && abstractMatch[1]) {
      extractedAbstract = abstractMatch[1].trim();
    } else {
      const absIdx = page1Text.search(/abstract/i);
      if (absIdx !== -1) {
        let rest = page1Text.substring(absIdx + 8).replace(/^[\s:\-–—\n]+/, '');
        const stop = rest.match(/(keywords|key\s*words|index\s*terms|1[\.\s]+introduction|introduction|i\.\s+introduction)/i);
        if (stop && stop.index) {
          extractedAbstract = rest.substring(0, stop.index).trim();
        } else {
          extractedAbstract = rest.substring(0, 900).trim();
        }
      }
    }
    extractedAbstract = extractedAbstract.replace(/[\-–—\s]+$/, '');

    // --- KEYWORDS / INDEX TERMS EXTRACTION ---
    let extractedKeywords = '';
    const kwMatch = page1Text.match(/(?:keywords|key\s*words|index\s*terms)[\s:\-–—\n]+([\s\S]+?)(?:1[\.\s]+introduction|introduction|i[\.\s]+introduction|\n\s*\n|$)/i);
    if (kwMatch && kwMatch[1]) {
      extractedKeywords = kwMatch[1]
        .replace(/[\.\;]$/, '')
        .split(/[;,\n•—]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 1 && !/^(1|introduction|instructions)$/i.test(k))
        .join(', ');
    }

    // --- REFERENCES EXTRACTION ---
    let extractedReferences = '';
    const refMatch = lastPageText.match(/(?:references|bibliography)[\s:\-–—\n]+([\s\S]+)$/i);
    if (refMatch && refMatch[1]) {
      extractedReferences = refMatch[1].trim();
    } else {
      const lines = lastPageText.split('\n');
      const refLines = lines.filter((l) => /^\s*(\[\d+\]|\d+\.)/.test(l));
      if (refLines.length > 0) {
        extractedReferences = refLines.join('\n');
      }
    }

    // --- AUTHORS & EMAILS EXTRACTION ---
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = Array.from(new Set(page1Text.match(emailRegex) || []));
    const extractedAuthors: ExtractedAuthor[] = [];

    if (emails.length > 0) {
      emails.forEach((email, idx) => {
        let nameGuess = '';
        const emailIdx = page1Text.indexOf(email);
        if (emailIdx !== -1) {
          const beforeChunk = page1Text.substring(Math.max(0, emailIdx - 120), emailIdx);
          const nameMatches = beforeChunk.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g) || [];
          nameGuess = nameMatches.pop() || `Author ${idx + 1}`;
        } else {
          nameGuess = `Author ${idx + 1}`;
        }

        extractedAuthors.push({
          name: nameGuess,
          email: email,
          affiliation: 'Department of Science & Technology',
          department: 'Faculty of Engineering',
          corresponding: idx === 0,
          orcid: '',
        });
      });
    }

    // --- STRICT TJASF TEMPLATE CONFORMANCE DETECTION ---
    // Reject any generic conference, IEEE, ACM, Springer, or non-TJASF papers.
    // 1. Direct TJASF Journal branding / ISSN / Acronym:
    const hasTjasfBranding = /(tjasf|journal of advanced scientific frontiers|journal of applied science|the journal of applied science & frontiers|the journal of applied science and frontiers|ijasf|issn\s*\(?\s*online\s*\)?\s*:?\s*xxxx-xxxx)/i.test(fullScannedText) ||
      /(tjasf|paper[\s_-]*template)/i.test(file.name);

    // 2. Specific textual instructions and phrases unique to the TJASF template:
    const hasTjasfSpecificPhrasing = /(must not exceed 12 pages when formatted with this template|must not exceed 12 pages|two-column formatting is mandatory|3\.25\s*in(?:ches)? wide with a 5\/16|corresponding author name\s*&?\s*email|section ii reviews related work; section iii describes|table i\.\s*example comparison table|iv\.\s*figures and tables|v\.\s*equations and notation|vi\.\s*citations and references|vii\.\s*proposed method)/i.test(fullScannedText);

    // 3. TJASF template structural layout (Index Terms + Roman Numeral I. INTRODUCTION + II. RELATED WORK or other TJASF numbered sections):
    const hasTjasfSectionStructure = /index\s*terms/i.test(page1Text) &&
      /\bI\.\s*INTRODUCTION\b/i.test(fullScannedText) &&
      /(\bII\.\s*RELATED\s*WORK\b|\bVII\.\s*PROPOSED\s*METHOD\b|\bVIII\.\s*RESULTS\s*AND\s*DISCUSSION\b)/i.test(fullScannedText);

    const isTemplateConformant = Boolean(hasTjasfBranding || hasTjasfSpecificPhrasing || hasTjasfSectionStructure);

    return {
      title: extractedTitle,
      abstract: extractedAbstract,
      keywords: extractedKeywords,
      references: extractedReferences,
      authors: extractedAuthors,
      isTemplateConformant,
      rawPage1Text: page1Text,
    };
  } catch (err) {
    console.error('parsePdfManuscript error:', err);
    return null;
  }
}
