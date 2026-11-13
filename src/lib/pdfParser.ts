import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.js?url';

// Resolve ES module / CJS interop
const pdfjs: any = (pdfjsLib as any).getDocument ? (pdfjsLib as any) : ((pdfjsLib as any).default || pdfjsLib);

// Configure the worker to use the local bundle if available
if (pdfjs && pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
}

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
  isScanned?: boolean;
  rawPage1Text: string;
}

interface PdfItem {
  str: string;
  height: number;
  y: number;
  x: number;
}

/**
 * Identifies and excludes journal running headers, ISSN lines, volume/issue numbers,
 * and publisher metadata from content parsing.
 */
function isJournalHeader(item: PdfItem, maxY: number): boolean {
  const s = item.str.toLowerCase().trim();
  if (s.length < 2) return true;

  // Items positioned in the top header zone of the page
  if (item.y > maxY - 85) {
    if (
      /(journal|tjasf|frontiers|issn|volume|issue|pages|doi|copyright|published|received|revised|accepted|page\s*\d+)/i.test(
        s
      )
    ) {
      return true;
    }
  }

  // Exact or prominent journal branding lines anywhere
  if (
    /^(the journal of advanced scientific frontiers|the journal of applied science|tjasf|issn\s*\(?\s*online\s*\)?)/i.test(
      s
    )
  ) {
    return true;
  }

  if (
    /(volume\s+\d+|issue\s+\d+|pages\s+\d+-\d+|doi:\s*10\.\d+|all rights reserved|published by)/i.test(
      s
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts metadata from an academic PDF manuscript and validates
 * strictly against the official TJASF journal template.
 */
export async function parsePdfManuscript(file: File): Promise<ExtractedManuscript | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);

    let pdf: pdfjsLib.PDFDocumentProxy;
    try {
      const loadingTask = pdfjs.getDocument({
        data: typedArray,
        useSystemFonts: true,
        disableFontFace: true,
      });
      pdf = await loadingTask.promise;
    } catch (loadErr) {
      console.warn('Standard PDF worker failed, retrying with fallback settings:', loadErr);
      const fallbackTask = pdfjs.getDocument({
        data: typedArray,
        useSystemFonts: true,
        disableFontFace: true,
        disableWorker: true,
      } as any);
      pdf = await fallbackTask.promise;
    }

    if (!pdf || pdf.numPages === 0) return null;

    // 1. Extract Page 1 text items with coordinates & font heights
    const page1 = await pdf.getPage(1);
    const textContent1 = await page1.getTextContent();
    const items: PdfItem[] = [];

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

    // Sort page 1 items top-to-bottom (PDF y is larger at top), then left-to-right
    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 4) return yDiff;
      return a.x - b.x;
    });

    // Build structured text for page 1 preserving linebreaks
    let page1Text = '';
    let prevY = items.length > 0 ? items[0].y : 0;
    for (const item of items) {
      if (Math.abs(item.y - prevY) > 6) {
        page1Text += '\n' + item.str;
      } else {
        page1Text += (page1Text.endsWith('\n') || page1Text === '' ? '' : ' ') + item.str;
      }
      prevY = item.y;
    }

    // 2. Scan initial pages for body text & template markers
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

    // 3. Extract text from the last 1-2 pages specifically for References
    const lastPageTexts: string[] = [];
    const refStartPage = Math.max(1, pdf.numPages - 1);
    for (let p = refStartPage; p <= pdf.numPages; p++) {
      try {
        const rPage = await pdf.getPage(p);
        const rContent = await rPage.getTextContent();
        const rItems: PdfItem[] = [];
        for (const item of rContent.items as any[]) {
          if (item.str && item.str.trim()) {
            rItems.push({
              str: item.str.trim(),
              height: Math.abs(item.transform?.[3] || item.height || 10),
              y: Math.round((item.transform?.[5] || 0) * 10) / 10,
              x: Math.round((item.transform?.[4] || 0) * 10) / 10,
            });
          }
        }
        rItems.sort((a, b) => (Math.abs(b.y - a.y) > 4 ? b.y - a.y : a.x - b.x));
        lastPageTexts.push(rItems.map((i) => i.str).join('\n'));
      } catch (e) {
        console.warn(`Could not read page ${p} for references:`, e);
      }
    }
    const combinedLastPages = lastPageTexts.join('\n');
    scannedPages.push(combinedLastPages);

    const fullScannedText = scannedPages.join('\n');

    // Detect unreadable or scanned documents
    if (page1Text.trim().length < 30) {
      return {
        title: '',
        abstract: '',
        keywords: '',
        references: '',
        authors: [],
        isTemplateConformant: false,
        isScanned: true,
        rawPage1Text: '',
      };
    }

    const maxY = Math.max(...items.map((i) => i.y));

    // --- 1. TITLE EXTRACTION ---
    // Filter out running headers and top metadata lines
    const nonHeaderItems = items.filter((item) => !isJournalHeader(item, maxY));

    // Locate the vertical position of the Abstract heading on page 1
    const absItem = nonHeaderItems.find((i) => /\babstract\b/i.test(i.str));
    const absY = absItem ? absItem.y : 0;

    // The genuine manuscript title MUST be positioned above the Abstract
    const preAbstractItems = nonHeaderItems.filter((i) => i.y > absY);

    // Filter out lines containing emails, departments, or universities
    const candidateTitleItems = preAbstractItems.filter((i) => {
      const s = i.str.toLowerCase();
      if (/@/.test(s)) return false;
      if (/(department|faculty|school|university|institute|college|laboratory|dept\.)/i.test(s)) return false;
      return true;
    });

    let extractedTitle = '';
    if (candidateTitleItems.length > 0) {
      // Find the maximum font height among candidate title items (typically 20-24pt)
      const maxTitleHeight = Math.max(...candidateTitleItems.map((i) => i.height));
      // Collect all lines with font size >= 80% of max title font
      const titleLines = candidateTitleItems.filter((i) => i.height >= maxTitleHeight * 0.8);
      extractedTitle = titleLines.map((i) => i.str.trim()).join(' ');
      extractedTitle = extractedTitle.replace(/\s+/g, ' ').trim();
    }

    // Clean placeholder title if user uploaded raw template
    if (/^full paper title(\s+instructions)?:?$/i.test(extractedTitle.trim())) {
      extractedTitle = 'Full Paper Title';
    }

    // Fallback title to clean filename if not found or corrupted
    if (!extractedTitle || extractedTitle.length < 5) {
      extractedTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // --- 2. ABSTRACT EXTRACTION ---
    let extractedAbstract = '';
    // Abstract starts after "Abstract" and ends before genuine "Index Terms" / "Keywords" heading or "I. INTRODUCTION"
    // Crucially requires Index Terms / Keywords to be preceded by newline, sentence period, or double-space, AND followed by delimiter
    const absRegex = /\babstract\b[\s:\-–—\.\s]+([\s\S]+?)(?=(?:\n|\.\s+|\s{2,})(?:index\s*terms|keywords|key\s*words)\s*[-–—:]|\bI[\.\s]+INTRODUCTION\b|\b1[\.\s]+Introduction\b|$)/i;
    const absMatch = page1Text.match(absRegex);

    if (absMatch && absMatch[1]) {
      extractedAbstract = absMatch[1].trim();
    } else {
      // Secondary fallback
      const absIdx = page1Text.search(/\babstract\b/i);
      if (absIdx !== -1) {
        const rest = page1Text.substring(absIdx + 8).replace(/^[\s:\-–—\.\s]+/, '');
        const stop = rest.search(/(?:\n|\.\s+)(?:index\s*terms|keywords|key\s*words)\s*[-–—:]|\bI[\.\s]+INTRODUCTION\b/i);
        if (stop !== -1) {
          extractedAbstract = rest.substring(0, stop).trim();
        } else {
          extractedAbstract = rest.substring(0, 1200).trim();
        }
      }
    }

    // Clean template instructions if present at end of abstract
    extractedAbstract = extractedAbstract.replace(/INSTRUCTIONS:[\s\S]*$/, '').trim();
    extractedAbstract = extractedAbstract.replace(/[\-–—\s\.]+$/, '');

    // --- 3. KEYWORDS / INDEX TERMS EXTRACTION ---
    let extractedKeywords = '';
    const kwRegex = /(?:index\s*terms|keywords|key\s*words)\s*[-–—:]\s*([\s\S]+?)(?=\bI[\.\s]+INTRODUCTION\b|\b1[\.\s]+Introduction\b|\n\s*\n\s*[A-Z]|$)/i;
    const kwMatch = page1Text.match(kwRegex);

    if (kwMatch && kwMatch[1]) {
      const rawKw = kwMatch[1].trim().replace(/[\.\;]$/, '');
      extractedKeywords = rawKw
        .split(/[;,\n•—]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 1 && !/^(1|introduction|instructions)$/i.test(k) && k.length < 90)
        .join(', ');
    }

    // --- 4. AUTHORS & AFFILIATIONS EXTRACTION ---
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = Array.from(new Set(page1Text.match(emailRegex) || []));
    const extractedAuthors: ExtractedAuthor[] = [];

    // Clean name helper to ensure names satisfy form validation: /^[a-zA-Z\s\.\-]+$/
    const sanitizeAuthorName = (name: string): string => {
      return name
        .replace(/[\d\*†‡§\^\(\)]/g, '') // remove footnotes, superscripts, symbols
        .replace(/\s+/g, ' ')
        .trim();
    };

    if (emails.length > 0) {
      emails.forEach((email, idx) => {
        let nameGuess = '';
        let deptGuess = 'Faculty of Engineering';
        let affGuess = 'Department of Science & Technology';

        const emailIdx = page1Text.indexOf(email);
        if (emailIdx !== -1) {
          const beforeChunk = page1Text.substring(Math.max(0, emailIdx - 160), emailIdx);

          // Extract capitalized name immediately preceding email / affiliation
          // Using horizontal whitespace [ \t]+ so newlines separate tokens
          const nameMatches = beforeChunk.match(/([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)/g) || [];
          const validNames = nameMatches.filter(
            (n) =>
              !/(journal|applied|science|frontiers|paper|title|department|university|author|institution|country|faculty|school|division|centre|center)/i.test(
                n
              )
          );
          nameGuess = validNames.pop() || '';

          // Extract department and institution from preceding lines
          const lines = beforeChunk.split('\n').map((l) => l.trim()).filter(Boolean);
          for (const line of lines) {
            if (
              /(?:department|faculty|school|division|centre|center|dept\.)/i.test(line) ||
              /(?:university|institute|college|laboratory)/i.test(line)
            ) {
              const parts = line.split(',');
              for (const part of parts) {
                const pt = part.trim();
                if (/(?:department|faculty|school|division|centre|center|dept\.)/i.test(pt)) {
                  deptGuess = pt;
                } else if (/(?:university|institute|college|laboratory|corp|ltd)/i.test(pt)) {
                  affGuess = pt;
                }
              }
            }
          }
        }

        const cleanName = nameGuess ? sanitizeAuthorName(nameGuess) : `Author ${idx + 1}`;
        // Ensure name contains only letters, spaces, periods, or hyphens
        const validatedName = /^[a-zA-Z\s\.\-]+$/.test(cleanName) ? cleanName : `Author ${idx + 1}`;

        extractedAuthors.push({
          name: validatedName,
          email: email,
          affiliation: affGuess,
          department: deptGuess,
          corresponding: idx === 0,
          orcid: '',
        });
      });
    }

    // Fallback: If no emails in document, extract names from the block above abstract
    if (extractedAuthors.length === 0) {
      const headerArea = absY > 0 ? items.filter((i) => i.y > absY && i.y < maxY - 100) : items.slice(0, 8);
      const combinedHeader = headerArea.map((i) => i.str).join(' ');
      const nameMatches = combinedHeader.match(/([A-Z][a-z]+(?:[ \t]+[A-Z][a-z]+)+)/g) || [];
      const filteredNames = nameMatches.filter(
        (n) =>
          !/(journal|applied|science|frontiers|paper|title|department|university|abstract|author|institution|country)/i.test(
            n
          )
      );

      if (filteredNames.length > 0) {
        filteredNames.slice(0, 3).forEach((n, idx) => {
          const cleanName = sanitizeAuthorName(n);
          const valid = /^[a-zA-Z\s\.\-]+$/.test(cleanName) ? cleanName : `Author ${idx + 1}`;
          extractedAuthors.push({
            name: valid,
            email: '',
            affiliation: 'Department of Science & Technology',
            department: 'Faculty of Engineering',
            corresponding: idx === 0,
            orcid: '',
          });
        });
      }
    }

    // --- 5. REFERENCES EXTRACTION ---
    let extractedReferences = '';
    const refMatch = combinedLastPages.match(/\b(?:references|bibliography)\b[\s:\-–—\n]+([\s\S]+)$/i);
    if (refMatch && refMatch[1]) {
      extractedReferences = refMatch[1].trim();
    } else {
      const lines = combinedLastPages.split('\n');
      const refLines = lines.filter((l) => /^\s*(\[\d+\]|\d+\.)/.test(l.trim()));
      if (refLines.length > 0) {
        extractedReferences = refLines.join('\n');
      }
    }

    // --- 6. STRICT TJASF TEMPLATE CONFORMANCE DETECTION ---
    // Reject any generic conference, IEEE, ACM, Springer, or non-TJASF papers.
    // 1. Direct TJASF Journal branding / ISSN / Acronym:
    const hasTjasfBranding =
      /(tjasf|journal of advanced scientific frontiers|journal of applied science|the journal of applied science & frontiers|the journal of applied science and frontiers|issn\s*\(?\s*online\s*\)?\s*:?\s*xxxx-xxxx)/i.test(
        fullScannedText
      ) || /(tjasf|paper[\s_-]*template)/i.test(file.name);

    // 2. Specific textual instructions and phrases unique to the TJASF template:
    const hasTjasfSpecificPhrasing =
      /(must not exceed 12 pages when formatted with this template|must not exceed 12 pages|two-column formatting is mandatory|3\.25\s*in(?:ches)? wide with a 5\/16|corresponding author name\s*&?\s*email|leave one blank line between the abstract and index terms|section ii reviews related work; section iii describes|table i\.\s*example comparison table|iv\.\s*figures and tables|v\.\s*equations and notation|vi\.\s*citations and references|vii\.\s*proposed method)/i.test(
        fullScannedText
      );

    // 3. TJASF template structural layout (Index Terms + Roman Numeral I. INTRODUCTION + II. RELATED WORK or other TJASF numbered sections):
    const hasTjasfSectionStructure =
      /index\s*terms/i.test(page1Text) &&
      /\bI\.\s*INTRODUCTION\b/i.test(fullScannedText) &&
      /(\bII\.\s*RELATED\s*WORK\b|\bVII\.\s*PROPOSED\s*METHOD\b|\bVIII\.\s*RESULTS\s*AND\s*DISCUSSION\b)/i.test(
        fullScannedText
      );

    const isTemplateConformant = Boolean(
      hasTjasfBranding || hasTjasfSpecificPhrasing || hasTjasfSectionStructure
    );

    return {
      title: extractedTitle,
      abstract: extractedAbstract,
      keywords: extractedKeywords,
      references: extractedReferences,
      authors: extractedAuthors,
      isTemplateConformant,
      isScanned: false,
      rawPage1Text: page1Text,
    };
  } catch (err) {
    console.error('parsePdfManuscript error:', err);
    return null;
  }
}
