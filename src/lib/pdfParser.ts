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
 * Reconnects hyphenated words split across line breaks and unifies
 * lines within a paragraph while preserving genuine paragraph breaks.
 */
function cleanExtractedParagraphs(text: string): string {
  if (!text) return '';
  // Rejoin hyphenated words (e.g. "com-\nputing" -> "computing")
  let cleaned = text.replace(/(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)/g, '$1$2');
  // Mark genuine paragraph breaks
  cleaned = cleaned.replace(/\n\s*\n+/g, '{{PARABREAK}}');
  // Replace single newlines with spaces so sentences flow continuously
  cleaned = cleaned.replace(/\n\s*/g, ' ');
  // Restore paragraph breaks
  cleaned = cleaned.replace(/\{\{PARABREAK\}\}/g, '\n\n');
  return cleaned
    .split('\n\n')
    .map((p) => p.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Normalizes extracted keywords, rejoining wrapped words and splitting on
 * genuine delimiters (comma, semicolon, bullet).
 */
function cleanKeywords(rawKw: string): string {
  if (!rawKw) return '';
  let text = rawKw.replace(/(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)/g, '$1$2');
  text = text.replace(/\n\s*/g, ' ');
  text = text.replace(/[\.\;]+$/, '').trim();
  const items = text
    .split(/[,;•]|\s{3,}/)
    .map((k) => k.trim())
    .filter(
      (k) =>
        k.length > 1 &&
        !/^(1|introduction|instructions|index\s*terms|keywords)$/i.test(k) &&
        k.length < 90
    );
  return items.join(', ');
}

/**
 * Formats extracted reference list entries, rejoining wrapped lines and
 * separating individual citations cleanly.
 */
function formatReferences(rawRefs: string): string {
  if (!rawRefs) return '';
  const text = rawRefs.replace(/(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)/g, '$1$2');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const formatted: string[] = [];
  let currentRef = '';

  for (const line of lines) {
    if (/^(references|bibliography)$/i.test(line)) continue;
    if (/^(\[\d+\]|\d+\.)/.test(line)) {
      if (currentRef) formatted.push(currentRef);
      currentRef = line;
    } else {
      currentRef = currentRef ? currentRef + ' ' + line : line;
    }
  }
  if (currentRef) formatted.push(currentRef);
  return formatted.join('\n\n');
}

/**
 * Validates and extracts a complete author name, preserving initials with periods,
 * middle names, hyphens, and apostrophes.
 */
function parseAuthorName(candidateStr: string): string | null {
  if (!candidateStr) return null;
  let s = candidateStr.trim();

  // Strip academic / professional titles
  s = s.replace(/^(?:Dr\.|Prof\.|Professor|Mr\.|Ms\.|Mrs\.)\s+/i, '').trim();

  // Filter out non-name terms
  if (
    /(?:department|faculty|school|division|centre|center|university|institute|college|laboratory|journal|science|frontiers|paper|abstract|title|keywords|index terms|email|country|state|volume|issue)/i.test(
      s
    )
  ) {
    return null;
  }

  // Must contain letters and no digits or email signs
  if (!/[a-zA-Z\u00C0-\u024F]/.test(s)) return null;
  if (/[\d@]/.test(s)) return null;

  // Clean footnotes, superscripts, or symbols
  const cleaned = s
    .replace(/[\d\*†‡§\^\(\)]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length < 2 || tokens.length > 5) return null;

  // Each token must be an initial or valid name part (supporting hyphens, apostrophes, accents)
  const isValid = tokens.every((tok) =>
    /^[A-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F'\-]*\.?$/.test(tok)
  );

  return isValid ? cleaned : null;
}

/**
 * Two-column aware sorting for PDF text items.
 * If the items span across two distinct columns, sorts Column 1 top-to-bottom,
 * then Column 2 top-to-bottom to prevent interleaving.
 */
function sortPageItems(items: PdfItem[]): PdfItem[] {
  if (items.length === 0) return items;

  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x));
  const midX = (minX + maxX) / 2;

  const leftCol = items.filter((i) => i.x < midX - 15);
  const rightCol = items.filter((i) => i.x >= midX - 15);

  const isTwoColumn = leftCol.length > items.length * 0.25 && rightCol.length > items.length * 0.25;

  if (isTwoColumn) {
    leftCol.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 4) return yDiff;
      return a.x - b.x;
    });
    rightCol.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 4) return yDiff;
      return a.x - b.x;
    });
    return [...leftCol, ...rightCol];
  }

  return [...items].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 4) return yDiff;
    return a.x - b.x;
  });
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

    // Top-to-bottom sort for Page 1 top elements (Title, Authors, Abstract, Keywords)
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
        const pItems: PdfItem[] = [];
        for (const item of pContent.items as any[]) {
          if (item.str && item.str.trim()) {
            pItems.push({
              str: item.str.trim(),
              height: Math.abs(item.transform?.[3] || item.height || 10),
              y: Math.round((item.transform?.[5] || 0) * 10) / 10,
              x: Math.round((item.transform?.[4] || 0) * 10) / 10,
            });
          }
        }
        const sortedPItems = sortPageItems(pItems);
        scannedPages.push(sortedPItems.map((i) => i.str).join(' '));
      } catch (e) {
        console.warn(`Could not read page ${p} for template verification:`, e);
      }
    }

    // 3. Extract text from the last 1-2 pages specifically for References (column-aware)
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
        const sortedRefItems = sortPageItems(rItems);
        lastPageTexts.push(sortedRefItems.map((i) => i.str).join('\n'));
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
    let minTitleY = maxY;
    if (candidateTitleItems.length > 0) {
      const maxTitleHeight = Math.max(...candidateTitleItems.map((i) => i.height));
      const titleLines = candidateTitleItems.filter((i) => i.height >= maxTitleHeight * 0.8);
      if (titleLines.length > 0) {
        minTitleY = Math.min(...titleLines.map((i) => i.y));
        extractedTitle = titleLines.map((i) => i.str.trim()).join(' ');
        extractedTitle = extractedTitle.replace(/\s+/g, ' ').trim();
      }
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
    const absRegex = /\babstract\b[\s:\-–—\.\s]+([\s\S]+?)(?=(?:\n|\.\s+|\s{2,})(?:index\s*terms|keywords|key\s*words)\s*[-–—:]|\bI[\.\s]+INTRODUCTION\b|\b1[\.\s]+Introduction\b|$)/i;
    const absMatch = page1Text.match(absRegex);

    if (absMatch && absMatch[1]) {
      extractedAbstract = absMatch[1].trim();
    } else {
      const absIdx = page1Text.search(/\babstract\b/i);
      if (absIdx !== -1) {
        const rest = page1Text.substring(absIdx + 8).replace(/^[\s:\-–—\.\s]+/, '');
        const stop = rest.search(/(?:\n|\.\s+)(?:index\s*terms|keywords|key\s*words)\s*[-–—:]|\bI[\.\s]+INTRODUCTION\b/i);
        if (stop !== -1) {
          extractedAbstract = rest.substring(0, stop).trim();
        } else {
          extractedAbstract = rest.substring(0, 1500).trim();
        }
      }
    }

    // Clean template instructions if present at end of abstract
    extractedAbstract = extractedAbstract.replace(/INSTRUCTIONS:[\s\S]*$/, '').trim();
    // Normalize paragraphs and rejoin words split across lines
    extractedAbstract = cleanExtractedParagraphs(extractedAbstract);

    // --- 3. KEYWORDS / INDEX TERMS EXTRACTION ---
    let extractedKeywords = '';
    const kwRegex = /(?:index\s*terms|keywords|key\s*words)\s*[-–—:]\s*([\s\S]+?)(?=\bI[\.\s]+INTRODUCTION\b|\b1[\.\s]+Introduction\b|\n\s*\n\s*[A-Z]|$)/i;
    const kwMatch = page1Text.match(kwRegex);

    if (kwMatch && kwMatch[1]) {
      extractedKeywords = cleanKeywords(kwMatch[1]);
    }

    // --- 4. AUTHORS & AFFILIATIONS EXTRACTION ---
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const extractedAuthors: ExtractedAuthor[] = [];

    // Focus on the author block region between Title bottom and Abstract top
    const authorBlockItems = items.filter(
      (i) => i.y < minTitleY && (absY > 0 ? i.y > absY : i.y > maxY - 300)
    );

    // Identify emails located on Page 1
    const emailItems = authorBlockItems.filter((i) => emailRegex.test(i.str));
    // If none found in bounded author block, check entire Page 1
    const allPage1Emails = items.filter((i) => emailRegex.test(i.str));
    const activeEmails = emailItems.length > 0 ? emailItems : allPage1Emails;

    if (activeEmails.length > 0) {
      activeEmails.forEach((emailItem, idx) => {
        const matchedEmail = emailItem.str.match(emailRegex)?.[0] || emailItem.str;

        // Find candidate items in the same horizontal column, strictly above the email (within 70pt)
        const colItems = authorBlockItems
          .filter(
            (i) =>
              Math.abs(i.x - emailItem.x) < 140 &&
              i.y > emailItem.y &&
              i.y <= emailItem.y + 70
          )
          // Sort ascending (closest upward from email)
          .sort((a, b) => a.y - emailItem.y - (b.y - emailItem.y));

        let nameGuess = '';
        let deptGuess = '';
        let affGuess = '';

        for (const item of colItems) {
          const parsed = parseAuthorName(item.str);
          if (parsed && !nameGuess) {
            nameGuess = parsed;
          } else if (/(department|faculty|school|division|dept\.)/i.test(item.str)) {
            const parts = item.str.split(',');
            deptGuess = parts[0]?.trim() || item.str;
            if (parts.length > 1) {
              affGuess = parts.slice(1).join(', ').trim();
            }
          } else if (/(university|institute|college|laboratory)/i.test(item.str) && !affGuess) {
            affGuess = item.str;
          }
        }

        // If no name found in closest vertical range, check surrounding page 1 text chunk
        if (!nameGuess) {
          const emailIdx = page1Text.indexOf(matchedEmail);
          if (emailIdx !== -1) {
            const beforeChunk = page1Text.substring(Math.max(0, emailIdx - 140), emailIdx);
            const lines = beforeChunk.split('\n').map((l) => l.trim()).filter(Boolean);
            for (let li = lines.length - 1; li >= 0; li--) {
              const pName = parseAuthorName(lines[li]);
              if (pName) {
                nameGuess = pName;
                break;
              }
            }
          }
        }

        extractedAuthors.push({
          name: nameGuess || `Author ${idx + 1}`,
          email: matchedEmail,
          affiliation: affGuess || 'Department of Science & Technology',
          department: deptGuess || 'Faculty of Engineering',
          corresponding: idx === 0,
          orcid: '',
        });
      });
    }

    // Fallback: If no emails in document, extract names from the block above abstract
    if (extractedAuthors.length === 0) {
      const searchItems = authorBlockItems.length > 0 ? authorBlockItems : items.slice(0, 10);
      for (const item of searchItems) {
        const pName = parseAuthorName(item.str);
        if (pName && !extractedAuthors.some((a) => a.name === pName)) {
          extractedAuthors.push({
            name: pName,
            email: '',
            affiliation: 'Department of Science & Technology',
            department: 'Faculty of Engineering',
            corresponding: extractedAuthors.length === 0,
            orcid: '',
          });
          if (extractedAuthors.length >= 8) break;
        }
      }
    }

    // --- 5. REFERENCES EXTRACTION ---
    let extractedReferences = '';
    const refMatch = combinedLastPages.match(/\b(?:references|bibliography)\b[\s:\-–—\n]+([\s\S]+)$/i);
    if (refMatch && refMatch[1]) {
      extractedReferences = formatReferences(refMatch[1].trim());
    } else {
      const lines = combinedLastPages.split('\n');
      const refLines = lines.filter((l) => /^\s*(\[\d+\]|\d+\.)/.test(l.trim()));
      if (refLines.length > 0) {
        extractedReferences = formatReferences(refLines.join('\n'));
      }
    }

    // --- 6. STRICT TJASF TEMPLATE CONFORMANCE DETECTION ---
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

    // 3. TJASF template structural layout:
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
