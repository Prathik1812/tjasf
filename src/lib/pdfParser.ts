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
  let cleaned = text.replace(/(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)/g, '$1$2');
  cleaned = cleaned.replace(/\n\s*\n+/g, '{{PARABREAK}}');
  cleaned = cleaned.replace(/\n\s*/g, ' ');
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

const NON_PERSON_TERMS = /(?:department|faculty|school|division|centre|center|university|institute|college|laboratory|journal|science|frontiers|paper|abstract|title|keywords|index terms|email|country|state|volume|issue|corresponding|correspondence|manuscript|research|article|international|engineering|technology|computing|intelligence|systems|analytics|networks|security|review|society|association|foundation|organization|corp|inc|ltd|gmbh|llc|hospital|clinic|press|publisher|united states|united kingdom|hong kong|san francisco|los angeles|new york|south korea|north carolina|new jersey|new zealand|saudi arabia|south africa|street|avenue|road|campus|building|box|hall|lane|drive|park|way|circle|length|must|exceed|table|figure|received|revised|accepted|published)/i;

/**
 * Validates and extracts a complete author name, preserving initials with periods,
 * middle names, hyphens, and apostrophes.
 */
function parseAuthorName(candidateStr: string): string | null {
  if (!candidateStr) return null;
  let s = candidateStr.trim();

  // Strip academic / professional titles
  s = s.replace(/^(?:Dr\.|Prof\.|Professor|Mr\.|Ms\.|Mrs\.)\s+/i, '').trim();

  // Strip footnote numbers, superscripts, or symbols FIRST
  s = s.replace(/[\d\*†‡§\^\(\)]/g, '').replace(/\s+/g, ' ').trim();
  if (s.length < 3) return null;

  // Accept template placeholder
  if (/^author\s*name$/i.test(s)) {
    return 'Author Name';
  }

  // Reject non-person terms (departments, cities, countries, disciplines)
  if (NON_PERSON_TERMS.test(s)) {
    return null;
  }

  // Must contain letters and no @
  if (!/[a-zA-Z\u00C0-\u024F]/.test(s)) return null;
  if (/@/.test(s)) return null;

  const tokens = s.split(' ').filter(Boolean);
  if (tokens.length < 2 || tokens.length > 5) return null;

  // Each token must be an initial or valid name part (supporting hyphens, apostrophes, accents)
  const isValid = tokens.every((tok) =>
    /^[A-Z\u00C0-\u024F][a-zA-Z\u00C0-\u024F'\-]*\.?$/.test(tok)
  );

  return isValid ? s : null;
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

    // --- 4. AUTHORS & AFFILIATIONS EXTRACTION (ALL AUTHORS EXTRACTED) ---
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Focus on the author block region between Title bottom and Abstract top
    const authorBlockItems = items.filter(
      (i) => i.y < minTitleY && (absY > 0 ? i.y > absY : i.y > maxY - 320)
    );

    // Collect all distinct emails in order of appearance
    const page1Emails: string[] = [];
    const rawEmailMatches = page1Text.match(emailRegex) || [];
    for (const em of rawEmailMatches) {
      if (!page1Emails.includes(em)) {
        page1Emails.push(em);
      }
    }

    // Build affiliation map from numbered lines (e.g. "1 Stanford University", "2 MIT")
    const footnoteAffMap: Record<string, string> = {};
    const allAffLines: string[] = [];
    const allDeptLines: string[] = [];

    for (const item of authorBlockItems) {
      const s = item.str.trim();
      const fnMatch = s.match(/^(\d+)\s+(.+)$/);
      if (fnMatch) {
        footnoteAffMap[fnMatch[1]] = fnMatch[2].trim();
      }
      if (/(?:department|faculty|school|division|centre|center|dept\.)/i.test(s)) {
        const parts = s.split(',');
        allDeptLines.push(parts[0]?.trim() || s);
        if (parts.length > 1) {
          allAffLines.push(parts.slice(1).join(', ').trim());
        }
      } else if (/(?:university|institute|college|laboratory|corp)/i.test(s)) {
        allAffLines.push(s);
      }
    }

    const defaultDept = allDeptLines[0] || 'Faculty of Engineering';
    const defaultAff = allAffLines[0] || 'Department of Science & Technology';

    // Identify all author entries across all layout styles (inline comma-separated, columns, or stacked)
    interface RawAuthorCandidate {
      name: string;
      footnoteNum?: string;
      hasStar?: boolean;
      x: number;
      y: number;
    }
    const rawAuthors: RawAuthorCandidate[] = [];

    // Scan author block items
    for (const item of authorBlockItems) {
      const s = item.str.trim();
      if (emailRegex.test(s)) continue;
      if (/(?:department|faculty|school|division|centre|center|university|institute|college|laboratory)/i.test(s)) continue;
      if (NON_PERSON_TERMS.test(s)) continue;

      // Check if item contains multiple names (e.g. "Author One 1, Author Two 2, and Author Three 3")
      if (s.includes(',') || /\s+(?:and|&)\s+/i.test(s)) {
        const parts = s
          .replace(/\s+(?:and|&)\s+/gi, ', ')
          .split(/[,;]/)
          .map((p) => p.trim())
          .filter(Boolean);

        for (const part of parts) {
          const fnMatch = part.match(/\b(\d+)\b/);
          const hasStar = /\*|corresponding|correspondence/i.test(part);
          const parsed = parseAuthorName(part);
          if (parsed) {
            const isDuplicate =
              parsed !== 'Author Name' &&
              rawAuthors.some((a) => a.name.toLowerCase() === parsed.toLowerCase());
            if (!isDuplicate) {
              rawAuthors.push({
                name: parsed,
                footnoteNum: fnMatch ? fnMatch[1] : undefined,
                hasStar,
                x: item.x,
                y: item.y,
              });
            }
          }
        }
      } else {
        // Single name item
        const fnMatch = s.match(/\b(\d+)\b/);
        const hasStar = /\*|corresponding|correspondence/i.test(s);
        const parsed = parseAuthorName(s);
        if (parsed) {
          const isDuplicate =
            parsed !== 'Author Name' &&
            rawAuthors.some((a) => a.name.toLowerCase() === parsed.toLowerCase());
          if (!isDuplicate) {
            rawAuthors.push({
              name: parsed,
              footnoteNum: fnMatch ? fnMatch[1] : undefined,
              hasStar,
              x: item.x,
              y: item.y,
            });
          }
        }
      }
    }

    // Fallback: Check text lines between title and abstract
    if (rawAuthors.length === 0) {
      const absIdx = page1Text.toLowerCase().indexOf('abstract');
      const headerSlice = absIdx > 0 ? page1Text.substring(0, absIdx) : page1Text.substring(0, 400);
      const lines = headerSlice.split('\n').map((l) => l.trim()).filter(Boolean);

      for (const line of lines) {
        if (emailRegex.test(line)) continue;
        if (/(?:department|faculty|school|division|centre|center|university|institute|college|laboratory)/i.test(line)) continue;
        if (NON_PERSON_TERMS.test(line)) continue;

        if (line.includes(',') || /\s+(?:and|&)\s+/i.test(line)) {
          const parts = line.replace(/\s+(?:and|&)\s+/gi, ', ').split(/[,;]/).map((p) => p.trim()).filter(Boolean);
          for (const part of parts) {
            const fnMatch = part.match(/\b(\d+)\b/);
            const hasStar = /\*|corresponding|correspondence/i.test(part);
            const parsed = parseAuthorName(part);
            if (parsed) {
              const isDuplicate =
                parsed !== 'Author Name' &&
                rawAuthors.some((a) => a.name.toLowerCase() === parsed.toLowerCase());
              if (!isDuplicate) {
                rawAuthors.push({
                  name: parsed,
                  footnoteNum: fnMatch ? fnMatch[1] : undefined,
                  hasStar,
                  x: 100,
                  y: 500,
                });
              }
            }
          }
        } else {
          const fnMatch = line.match(/\b(\d+)\b/);
          const hasStar = /\*|corresponding|correspondence/i.test(line);
          const parsed = parseAuthorName(line);
          if (parsed) {
            const isDuplicate =
              parsed !== 'Author Name' &&
              rawAuthors.some((a) => a.name.toLowerCase() === parsed.toLowerCase());
            if (!isDuplicate) {
              rawAuthors.push({
                name: parsed,
                footnoteNum: fnMatch ? fnMatch[1] : undefined,
                hasStar,
                x: 100,
                y: 500,
              });
            }
          }
        }
      }
    }

    // If still empty, create author entries from emails or fallback
    if (rawAuthors.length === 0) {
      if (page1Emails.length > 0) {
        page1Emails.forEach((_em, idx) => {
          rawAuthors.push({ name: `Author ${idx + 1}`, x: 100, y: 500 });
        });
      } else {
        rawAuthors.push({ name: 'Author 1', x: 100, y: 500 });
      }
    }

    // Map each author to their email, affiliation, and department
    const extractedAuthors: ExtractedAuthor[] = rawAuthors.map((entry, idx) => {
      let matchedEmail = '';
      const nameTokens = entry.name.toLowerCase().split(' ').filter((t) => t.length > 2);

      // 1. By author name token matching in email address
      for (const em of page1Emails) {
        const emLower = em.toLowerCase();
        if (nameTokens.some((tok) => emLower.includes(tok))) {
          matchedEmail = em;
          break;
        }
      }

      // 2. By column proximity (if email directly under author block)
      if (!matchedEmail) {
        const nearbyEmail = authorBlockItems.find(
          (i) =>
            emailRegex.test(i.str) &&
            Math.abs(i.x - entry.x) < 140 &&
            i.y < entry.y &&
            i.y >= entry.y - 80
        );
        if (nearbyEmail) {
          if (!/correspond/i.test(nearbyEmail.str) || entry.hasStar || idx === 0) {
            matchedEmail = nearbyEmail.str.match(emailRegex)?.[0] || '';
          }
        }
      }

      // 3. By index matching
      if (!matchedEmail && page1Emails[idx]) {
        matchedEmail = page1Emails[idx];
      } else if (!matchedEmail && page1Emails.length === 1 && (entry.hasStar || idx === 0)) {
        matchedEmail = page1Emails[0];
      }

      // Determine affiliation & department
      let aff = defaultAff;
      let dept = defaultDept;

      if (entry.footnoteNum && footnoteAffMap[entry.footnoteNum]) {
        aff = footnoteAffMap[entry.footnoteNum];
      } else {
        const nearbyDept = authorBlockItems.find(
          (i) =>
            /(?:department|faculty|school|division|dept\.)/i.test(i.str) &&
            Math.abs(i.x - entry.x) < 140 &&
            i.y < entry.y &&
            i.y >= entry.y - 70
        );
        const nearbyAff = authorBlockItems.find(
          (i) =>
            /(?:university|institute|college|laboratory|corp)/i.test(i.str) &&
            Math.abs(i.x - entry.x) < 140 &&
            i.y < entry.y &&
            i.y >= entry.y - 70
        );
        if (nearbyDept) {
          const parts = nearbyDept.str.split(',');
          dept = parts[0]?.trim() || nearbyDept.str;
          if (parts.length > 1) aff = parts.slice(1).join(', ').trim();
        }
        if (nearbyAff) {
          aff = nearbyAff.str;
        }
      }

      const isCorresponding = Boolean(entry.hasStar || (idx === 0 && !rawAuthors.some((a) => a.hasStar)));

      return {
        name: entry.name,
        email: matchedEmail || '',
        affiliation: aff,
        department: dept,
        corresponding: isCorresponding,
        orcid: '',
      };
    });

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
    const hasTjasfBranding =
      /(tjasf|journal of advanced scientific frontiers|journal of applied science|the journal of applied science & frontiers|the journal of applied science and frontiers|issn\s*\(?\s*online\s*\)?\s*:?\s*xxxx-xxxx)/i.test(
        fullScannedText
      ) || /(tjasf|paper[\s_-]*template)/i.test(file.name);

    const hasTjasfSpecificPhrasing =
      /(must not exceed 12 pages when formatted with this template|must not exceed 12 pages|two-column formatting is mandatory|3\.25\s*in(?:ches)? wide with a 5\/16|corresponding author name\s*&?\s*email|leave one blank line between the abstract and index terms|section ii reviews related work; section iii describes|table i\.\s*example comparison table|iv\.\s*figures and tables|v\.\s*equations and notation|vi\.\s*citations and references|vii\.\s*proposed method)/i.test(
        fullScannedText
      );

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
