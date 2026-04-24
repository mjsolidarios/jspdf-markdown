import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { lexer, Token, Tokens } from 'marked';

/** User-configurable options for the markdown-to-PDF renderer. */
export interface MarkdownToPdfOptions {
  /** Left margin in mm. Default: 15 */
  marginLeft?: number;
  /** Right margin in mm. Default: 15 */
  marginRight?: number;
  /** Top margin in mm. Default: 20 */
  marginTop?: number;
  /** Bottom margin in mm. Default: 20 */
  marginBottom?: number;
  /** Base font size in pt. Default: 11 */
  fontSize?: number;
  /** Line height multiplier. Default: 1.4 */
  lineHeight?: number;
  /** Font family for body text. Default: 'helvetica' */
  fontFamily?: string;
  /** Font family for code blocks. Default: 'courier' */
  codeFontFamily?: string;
  /** Spacing between block elements in mm. Default: 4 */
  blockSpacing?: number;
  /** Whether to show link URLs in brackets after link text. Default: true */
  showLinkUrls?: boolean;
  /** Color for h1 headings as [r,g,b]. Default: [0,0,0] */
  headingColor?: [number, number, number];
  /** Color for code blocks background as [r,g,b]. Default: [245,245,245] */
  codeBackground?: [number, number, number];
  /** Color for blockquote bar as [r,g,b]. Default: [200,200,200] */
  blockquoteColor?: [number, number, number];
  /** Color for horizontal rule as [r,g,b]. Default: [180,180,180] */
  hrColor?: [number, number, number];
  /** Color for link text as [r,g,b]. Default: [0,0,238] */
  linkColor?: [number, number, number];
}

interface ResolvedOptions {
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  codeFontFamily: string;
  blockSpacing: number;
  showLinkUrls: boolean;
  headingColor: [number, number, number];
  codeBackground: [number, number, number];
  blockquoteColor: [number, number, number];
  hrColor: [number, number, number];
  linkColor: [number, number, number];
}

/** A run of text with associated style. */
interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  link: boolean;
  href?: string;
  strikethrough: boolean;
}

/** Internal renderer state passed through rendering functions. */
interface RenderState {
  doc: jsPDF;
  y: number;
  opts: ResolvedOptions;
  pageWidth: number;
  contentWidth: number;
  /** Indent level for nested lists, in mm */
  listIndent: number;
}

function resolveOptions(opts?: MarkdownToPdfOptions): ResolvedOptions {
  return {
    marginLeft: opts?.marginLeft ?? 15,
    marginRight: opts?.marginRight ?? 15,
    marginTop: opts?.marginTop ?? 20,
    marginBottom: opts?.marginBottom ?? 20,
    fontSize: opts?.fontSize ?? 11,
    lineHeight: opts?.lineHeight ?? 1.4,
    fontFamily: opts?.fontFamily ?? 'helvetica',
    codeFontFamily: opts?.codeFontFamily ?? 'courier',
    blockSpacing: opts?.blockSpacing ?? 4,
    showLinkUrls: opts?.showLinkUrls ?? true,
    headingColor: opts?.headingColor ?? [0, 0, 0],
    codeBackground: opts?.codeBackground ?? [245, 245, 245],
    blockquoteColor: opts?.blockquoteColor ?? [200, 200, 200],
    hrColor: opts?.hrColor ?? [180, 180, 180],
    linkColor: opts?.linkColor ?? [0, 0, 238],
  };
}

/**
 * Adds a new page if there is insufficient vertical space for `neededMm` of content.
 * Returns updated state with the y position reset to marginTop when a new page is added.
 */
function ensureSpace(state: RenderState, neededMm: number): RenderState {
  const pageHeight = state.doc.internal.pageSize.getHeight();
  if (state.y + neededMm > pageHeight - state.opts.marginBottom) {
    state.doc.addPage();
    return { ...state, y: state.opts.marginTop };
  }
  return state;
}

/** Convert pt to approximate mm (jsPDF uses mm internally). */
function ptToMm(pt: number): number {
  return pt * 0.352778;
}

/** Return font size for a heading level (h1=1, h6=6). */
function headingFontSize(level: number, baseFontSize: number): number {
  const sizes = [2.2, 1.8, 1.5, 1.25, 1.1, 1.0];
  return baseFontSize * (sizes[level - 1] ?? 1.0);
}

/**
 * Set the document font from state information.
 */
function setFont(
  doc: jsPDF,
  family: string,
  bold: boolean,
  italic: boolean,
): void {
  const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
  try {
    doc.setFont(family, style);
  } catch {
    // Fall back if style not available for font family
    try {
      doc.setFont(family, 'normal');
    } catch {
      // ignore
    }
  }
}

/**
 * Collect inline tokens from a list of marked tokens into a flat array of TextRun objects.
 */
function collectRuns(
  tokens: Token[],
  bold: boolean,
  italic: boolean,
  code: boolean,
  link: boolean,
  href: string | undefined,
  strikethrough: boolean,
): TextRun[] {
  const runs: TextRun[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) {
          runs.push(...collectRuns(t.tokens, bold, italic, code, link, href, strikethrough));
        } else {
          runs.push({ text: t.text, bold, italic, code, link, href, strikethrough });
        }
        break;
      }
      case 'strong': {
        const t = token as Tokens.Strong;
        runs.push(...collectRuns(t.tokens, true, italic, code, link, href, strikethrough));
        break;
      }
      case 'em': {
        const t = token as Tokens.Em;
        runs.push(...collectRuns(t.tokens, bold, true, code, link, href, strikethrough));
        break;
      }
      case 'codespan': {
        const t = token as Tokens.Codespan;
        runs.push({ text: t.text, bold: false, italic: false, code: true, link: false, strikethrough: false });
        break;
      }
      case 'link': {
        const t = token as Tokens.Link;
        runs.push(...collectRuns(t.tokens, bold, italic, code, true, t.href ?? undefined, strikethrough));
        break;
      }
      case 'image': {
        const t = token as Tokens.Image;
        // Render images as italic text showing alt text
        runs.push({ text: `[Image: ${t.text || t.href}]`, bold: false, italic: true, code: false, link: false, strikethrough: false });
        break;
      }
      case 'escape': {
        const t = token as Tokens.Escape;
        runs.push({ text: t.text, bold, italic, code, link, href, strikethrough });
        break;
      }
      case 'del': {
        const t = token as Tokens.Del;
        runs.push(...collectRuns(t.tokens, bold, italic, code, link, href, true));
        break;
      }
      case 'br': {
        runs.push({ text: '\n', bold, italic, code, link, href, strikethrough });
        break;
      }
      case 'html':
      case 'tag': {
        // Skip HTML tags
        break;
      }
      default: {
        // Generic token with possible text
        const t = token as Tokens.Generic;
        if (typeof t.text === 'string' && t.text) {
          runs.push({ text: t.text, bold, italic, code, link, href, strikethrough });
        }
        break;
      }
    }
  }

  return runs;
}

/**
 * Measure the width of a text string in the current font/size.
 */
function measureText(doc: jsPDF, text: string): number {
  return doc.getTextWidth(text);
}

/**
 * Render a list of TextRuns starting at (x, y), wrapping at (x + maxWidth).
 * Returns the new y position after rendering all runs.
 */
function renderRuns(
  state: RenderState,
  runs: TextRun[],
  startX: number,
  startY: number,
  maxWidth: number,
): number {
  const { doc, opts } = state;
  const lineHeightMm = ptToMm(opts.fontSize) * opts.lineHeight;

  let curX = startX;
  let curY = startY;

  // Split runs by explicit newlines
  const expandedRuns: (TextRun | null)[] = [];
  for (const run of runs) {
    const parts = run.text.split('\n');
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) expandedRuns.push(null); // newline sentinel
      if (parts[i]) {
        expandedRuns.push({ ...run, text: parts[i] });
      }
    }
  }

  for (const run of expandedRuns) {
    if (run === null) {
      // Explicit line break
      curX = startX;
      curY += lineHeightMm;
      const newState = ensureSpace(state, lineHeightMm);
      curY = newState.y !== state.y ? newState.y : curY;
      continue;
    }

    // Set font for this run
    if (run.code) {
      setFont(doc, opts.codeFontFamily, false, false);
    } else {
      setFont(doc, opts.fontFamily, run.bold, run.italic);
    }

    // Set text color
    if (run.link) {
      doc.setTextColor(...opts.linkColor);
    } else {
      doc.setTextColor(0, 0, 0);
    }

    // Word-wrap this run within remaining width
    const words = run.text.split(' ');
    let wordBuf = '';

    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      const candidate = wordBuf ? wordBuf + ' ' + word : word;
      const candidateWidth = measureText(doc, candidate);

      if (curX + candidateWidth > startX + maxWidth && wordBuf) {
        // Flush wordBuf, wrap to next line
        doc.text(wordBuf, curX, curY);
        curX = startX;
        curY += lineHeightMm;
        wordBuf = word;
      } else {
        wordBuf = candidate;
      }
    }

    // Flush remaining buffer
    if (wordBuf) {
      const wordWidth = measureText(doc, wordBuf);

      // Check if we need to wrap before rendering
      if (curX + wordWidth > startX + maxWidth && curX > startX) {
        curX = startX;
        curY += lineHeightMm;
      }

      doc.text(wordBuf, curX, curY);

      // Add underline decoration for links
      if (run.link || run.strikethrough) {
        const lineY = run.strikethrough ? curY - ptToMm(opts.fontSize) * 0.35 : curY + 0.3;
        const lineColor = run.link ? opts.linkColor : ([0, 0, 0] as [number, number, number]);
        doc.setDrawColor(...lineColor);
        doc.setLineWidth(0.2);
        doc.line(curX, lineY, curX + wordWidth, lineY);
      }

      curX += wordWidth + measureText(doc, ' ');
    }
  }

  // Reset colors
  doc.setTextColor(0, 0, 0);
  setFont(doc, opts.fontFamily, false, false);

  return curY;
}

/**
 * Render inline tokens (a paragraph or heading's inline content) on a single "block".
 * Handles wrapping and returns the new y position.
 */
function renderInline(
  state: RenderState,
  tokens: Token[],
  x: number,
  y: number,
  maxWidth: number,
): number {
  const runs = collectRuns(tokens, false, false, false, false, undefined, false);
  return renderRuns(state, runs, x, y, maxWidth);
}

/** Add vertical space, checking for page breaks. */
function addSpace(state: RenderState, spaceMm: number): RenderState {
  return ensureSpace({ ...state, y: state.y + spaceMm }, 0);
}

/**
 * Render a horizontal rule.
 */
function renderHr(state: RenderState): RenderState {
  let s = ensureSpace(state, 6);
  s.doc.setDrawColor(...s.opts.hrColor);
  s.doc.setLineWidth(0.4);
  s.doc.line(s.opts.marginLeft, s.y + 2, s.opts.marginLeft + s.contentWidth, s.y + 2);
  s.doc.setDrawColor(0, 0, 0);
  return { ...s, y: s.y + 6 };
}

/**
 * Render a heading token.
 */
function renderHeading(state: RenderState, token: Tokens.Heading): RenderState {
  const { doc, opts } = state;
  const fontSize = headingFontSize(token.depth, opts.fontSize);
  doc.setFontSize(fontSize);
  setFont(doc, opts.fontFamily, true, false);
  doc.setTextColor(...opts.headingColor);

  const lineHeightMm = ptToMm(fontSize) * opts.lineHeight;
  let s = ensureSpace(state, lineHeightMm + opts.blockSpacing * 1.5);

  // Add extra space before headings (except at top of page)
  if (s.y > opts.marginTop + lineHeightMm) {
    s = addSpace(s, opts.blockSpacing);
  }

  const newY = renderInline(s, token.tokens, opts.marginLeft, s.y + ptToMm(fontSize), s.contentWidth);

  // Underline h1 and h2
  if (token.depth <= 2) {
    doc.setDrawColor(...opts.headingColor);
    doc.setLineWidth(token.depth === 1 ? 0.5 : 0.3);
    doc.line(opts.marginLeft, newY + 1.5, opts.marginLeft + s.contentWidth, newY + 1.5);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(opts.fontSize);
  setFont(doc, opts.fontFamily, false, false);

  return addSpace({ ...s, y: newY + (token.depth <= 2 ? 3 : 1) }, opts.blockSpacing);
}

/**
 * Render a paragraph token.
 */
function renderParagraph(state: RenderState, token: Tokens.Paragraph): RenderState {
  const { doc, opts } = state;
  const lineHeightMm = ptToMm(opts.fontSize) * opts.lineHeight;

  doc.setFontSize(opts.fontSize);
  setFont(doc, opts.fontFamily, false, false);

  let s = ensureSpace(state, lineHeightMm);
  const startY = s.y + ptToMm(opts.fontSize);
  const newY = renderInline(s, token.tokens, opts.marginLeft, startY, s.contentWidth);

  return addSpace({ ...s, y: newY }, opts.blockSpacing);
}

/**
 * Render a code block token.
 */
function renderCode(state: RenderState, token: Tokens.Code): RenderState {
  const { doc, opts } = state;
  const codeFontSize = opts.fontSize * 0.9;
  const lineHeightMm = ptToMm(codeFontSize) * opts.lineHeight;
  const lines = token.text.split('\n');
  const blockHeight = lineHeightMm * lines.length + 6;

  let s = ensureSpace(state, Math.min(blockHeight, 40));

  // Draw background rectangle
  const bg = opts.codeBackground;
  doc.setFillColor(bg[0], bg[1], bg[2]);
  doc.rect(opts.marginLeft, s.y, s.contentWidth, blockHeight, 'F');

  // Draw a left accent bar
  doc.setFillColor(150, 150, 150);
  doc.rect(opts.marginLeft, s.y, 1, blockHeight, 'F');

  doc.setFontSize(codeFontSize);
  setFont(doc, opts.codeFontFamily, false, false);
  doc.setTextColor(40, 40, 40);

  let lineY = s.y + ptToMm(codeFontSize) + 2;
  for (const line of lines) {
    if (lineY > doc.internal.pageSize.getHeight() - opts.marginBottom) {
      doc.addPage();
      lineY = opts.marginTop + ptToMm(codeFontSize) + 2;
      // Redraw background on new page (simplified: just skip bg for continuation)
    }
    doc.text(line, opts.marginLeft + 3, lineY);
    lineY += lineHeightMm;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(opts.fontSize);
  setFont(doc, opts.fontFamily, false, false);

  return addSpace({ ...s, y: s.y + blockHeight }, opts.blockSpacing);
}

/**
 * Render a blockquote token (recursively renders its child tokens).
 */
function renderBlockquote(state: RenderState, token: Tokens.Blockquote): RenderState {
  const { doc, opts } = state;
  const indentX = opts.marginLeft + 8;
  const innerWidth = state.contentWidth - 8;

  let s = ensureSpace(state, ptToMm(opts.fontSize) * opts.lineHeight);
  const startY = s.y;

  // Temporarily adjust margins for nested rendering
  const innerState: RenderState = {
    ...s,
    y: s.y,
    opts: { ...opts, marginLeft: indentX, fontFamily: opts.fontFamily },
    contentWidth: innerWidth,
  };

  doc.setTextColor(80, 80, 80);

  let rendered = innerState;
  for (const child of token.tokens) {
    rendered = renderToken(rendered, child);
  }

  const endY = rendered.y;

  // Draw left border bar
  doc.setFillColor(...opts.blockquoteColor);
  doc.rect(opts.marginLeft + 1, startY, 2, endY - startY + 2, 'F');

  doc.setTextColor(0, 0, 0);

  return { ...rendered, opts, contentWidth: state.contentWidth };
}

/**
 * Render a list (ordered or unordered), supporting nesting.
 */
function renderList(state: RenderState, token: Tokens.List, startNumber: number = 1): RenderState {
  let s = state;
  const { opts } = s;
  const indentMm = 6;
  const bulletX = opts.marginLeft + s.listIndent;
  const textX = bulletX + indentMm;
  const textWidth = s.contentWidth - s.listIndent - indentMm;
  const lineHeightMm = ptToMm(opts.fontSize) * opts.lineHeight;

  let itemNumber = startNumber;

  for (const item of token.items) {
    s = ensureSpace(s, lineHeightMm);
    const itemY = s.y + ptToMm(opts.fontSize);

    // Render bullet/number
    s.doc.setFontSize(opts.fontSize);
    setFont(s.doc, opts.fontFamily, false, false);

    if (token.ordered) {
      s.doc.text(`${itemNumber}.`, bulletX, itemY);
    } else {
      s.doc.text('•', bulletX, itemY);
    }

    // Render item content inline
    // Collect all paragraph/text tokens from the item
    const itemState: RenderState = {
      ...s,
      opts: { ...opts, marginLeft: textX },
      contentWidth: textWidth,
      listIndent: 0,
    };

    let afterItem = itemState;
    for (const child of item.tokens) {
      if (child.type === 'list') {
        // Nested list
        afterItem = renderList(
          { ...afterItem, listIndent: afterItem.listIndent + indentMm },
          child as Tokens.List,
        );
      } else if (child.type === 'paragraph' || child.type === 'text') {
        const inlineTokens = (child as Tokens.Paragraph | Tokens.Text).tokens ?? [];
        const newY = renderInline(
          afterItem,
          inlineTokens.length > 0
            ? inlineTokens
            : [{ type: 'text', raw: (child as Tokens.Text).text, text: (child as Tokens.Text).text } as Tokens.Text],
          textX,
          afterItem.y + ptToMm(opts.fontSize),
          textWidth,
        );
        afterItem = { ...afterItem, y: newY };
      } else {
        afterItem = renderToken(afterItem, child);
      }
    }

    s = addSpace({ ...s, y: afterItem.y }, 1);
    itemNumber++;
  }

  return addSpace(s, opts.blockSpacing);
}

/**
 * Render a table token using jspdf-autotable.
 */
function renderTable(state: RenderState, token: Tokens.Table): RenderState {
  const { doc, opts } = state;

  const head: string[][] = [
    token.header.map((cell) => {
      const runs = collectRuns(cell.tokens, false, false, false, false, undefined, false);
      return runs.map((r) => r.text).join('');
    }),
  ];

  const body: string[][] = token.rows.map((row) =>
    row.map((cell) => {
      const runs = collectRuns(cell.tokens, false, false, false, false, undefined, false);
      return runs.map((r) => r.text).join('');
    }),
  );

  let finalY = state.y;

  autoTable(doc, {
    head,
    body,
    startY: state.y + opts.blockSpacing,
    margin: { left: opts.marginLeft, right: opts.marginRight },
    styles: {
      fontSize: opts.fontSize * 0.9,
      font: opts.fontFamily,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [80, 80, 80],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    theme: 'striped',
    didDrawPage: (data) => {
      finalY = data.cursor?.y ?? finalY;
    },
    didDrawCell: (data) => {
      if (data.row.index === (token.rows.length - 1) && data.column.index === (token.header.length - 1)) {
        finalY = data.cursor?.y ?? finalY;
      }
    },
  });

  // After autoTable, get the last Y position
  const lastY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? finalY;

  return addSpace({ ...state, y: lastY }, opts.blockSpacing * 2);
}

/**
 * Dispatch rendering for a single top-level token.
 */
function renderToken(state: RenderState, token: Token): RenderState {
  switch (token.type) {
    case 'heading':
      return renderHeading(state, token as Tokens.Heading);
    case 'paragraph':
      return renderParagraph(state, token as Tokens.Paragraph);
    case 'code':
      return renderCode(state, token as Tokens.Code);
    case 'blockquote':
      return renderBlockquote(state, token as Tokens.Blockquote);
    case 'list':
      return renderList(state, token as Tokens.List);
    case 'table':
      return renderTable(state, token as Tokens.Table);
    case 'hr':
      return renderHr(state);
    case 'space':
      return addSpace(state, ptToMm(state.opts.fontSize) * state.opts.lineHeight * 0.5);
    case 'html':
      // Skip raw HTML blocks
      return state;
    default:
      return state;
  }
}

/**
 * Parse a markdown string and render it into a jsPDF document.
 *
 * @param doc     - An existing jsPDF instance to render into.
 * @param markdown - The markdown string to render.
 * @param options  - Optional configuration for margins, fonts, colors, etc.
 * @returns The jsPDF document (same reference as `doc`) for chaining.
 *
 * @example
 * ```typescript
 * import { jsPDF } from 'jspdf';
 * import { markdownToPdf } from 'jspdf-markdown';
 *
 * const doc = new jsPDF();
 * markdownToPdf(doc, '# Hello World\n\nThis is **bold** text.');
 * doc.save('output.pdf');
 * ```
 */
export function markdownToPdf(
  doc: jsPDF,
  markdown: string,
  options?: MarkdownToPdfOptions,
): jsPDF {
  const opts = resolveOptions(options);
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - opts.marginLeft - opts.marginRight;

  const tokens = lexer(markdown);

  let state: RenderState = {
    doc,
    y: opts.marginTop,
    opts,
    pageWidth,
    contentWidth,
    listIndent: 0,
  };

  doc.setFontSize(opts.fontSize);
  setFont(doc, opts.fontFamily, false, false);

  for (const token of tokens) {
    state = renderToken(state, token);
  }

  return doc;
}

export default markdownToPdf;
