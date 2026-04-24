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
  /** Color for headings as [r,g,b]. Default: [0,0,0] */
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

type RGB = [number, number, number];

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
  /** Indent level for nested lists, in mm. */
  listIndent: number;
  /** Default text color for inline rendering (headings, blockquotes, etc.). */
  textColor: RGB;
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
 * Decode the subset of HTML entities that `marked` inserts when escaping text.
 * Marked emits HTML-safe text by default (even in its lexer), so we have to
 * turn `&quot;`, `&amp;`, etc. back into literal characters before drawing.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    // keep `&amp;` last so we do not double-decode
    .replace(/&amp;/g, '&');
}

/**
 * Add a new page if there is insufficient vertical space for `neededMm`.
 * Returns updated state with `y` reset to `marginTop` when a new page is added.
 */
function ensureSpace(state: RenderState, neededMm: number): RenderState {
  const pageHeight = state.doc.internal.pageSize.getHeight();
  if (state.y + neededMm > pageHeight - state.opts.marginBottom) {
    state.doc.addPage();
    return { ...state, y: state.opts.marginTop };
  }
  return state;
}

/** Convert pt to mm (jsPDF uses mm internally). */
function ptToMm(pt: number): number {
  return pt * 0.352778;
}

/** Return font size for a heading level (h1=1, h6=6). */
function headingFontSize(level: number, baseFontSize: number): number {
  const sizes = [2.2, 1.8, 1.5, 1.25, 1.1, 1.0];
  return baseFontSize * (sizes[level - 1] ?? 1.0);
}

/** Set jsPDF font, gracefully falling back when a style is unavailable. */
function setFont(doc: jsPDF, family: string, bold: boolean, italic: boolean): void {
  const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
  try {
    doc.setFont(family, style);
  } catch {
    try {
      doc.setFont(family, 'normal');
    } catch {
      // ignore
    }
  }
}

/**
 * Flatten a list of marked inline tokens into styled `TextRun`s.
 *
 * When `showLinkUrls` is true, a non-link run with ` (href)` is appended
 * after each link (except autolinks, where the visible text already equals
 * the href).
 */
function collectRuns(
  tokens: Token[],
  bold: boolean,
  italic: boolean,
  code: boolean,
  link: boolean,
  href: string | undefined,
  strikethrough: boolean,
  showLinkUrls: boolean,
): TextRun[] {
  const runs: TextRun[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'text': {
        const t = token as Tokens.Text;
        if (t.tokens && t.tokens.length > 0) {
          runs.push(
            ...collectRuns(t.tokens, bold, italic, code, link, href, strikethrough, showLinkUrls),
          );
        } else {
          runs.push({
            text: decodeEntities(t.text),
            bold,
            italic,
            code,
            link,
            href,
            strikethrough,
          });
        }
        break;
      }
      case 'strong': {
        const t = token as Tokens.Strong;
        runs.push(
          ...collectRuns(t.tokens, true, italic, code, link, href, strikethrough, showLinkUrls),
        );
        break;
      }
      case 'em': {
        const t = token as Tokens.Em;
        runs.push(
          ...collectRuns(t.tokens, bold, true, code, link, href, strikethrough, showLinkUrls),
        );
        break;
      }
      case 'codespan': {
        const t = token as Tokens.Codespan;
        runs.push({
          text: decodeEntities(t.text),
          bold: false,
          italic: false,
          code: true,
          link,
          href,
          strikethrough,
        });
        break;
      }
      case 'link': {
        const t = token as Tokens.Link;
        const linkRuns = collectRuns(
          t.tokens,
          bold,
          italic,
          code,
          true,
          t.href ?? undefined,
          strikethrough,
          showLinkUrls,
        );
        runs.push(...linkRuns);
        if (showLinkUrls && t.href) {
          const visible = linkRuns.map((r) => r.text).join('');
          if (visible !== t.href) {
            runs.push({
              text: ` (${t.href})`,
              bold,
              italic,
              code: false,
              link: false,
              strikethrough,
            });
          }
        }
        break;
      }
      case 'image': {
        const t = token as Tokens.Image;
        runs.push({
          text: `[Image: ${t.text || t.href}]`,
          bold: false,
          italic: true,
          code: false,
          link: false,
          strikethrough: false,
        });
        break;
      }
      case 'escape': {
        const t = token as Tokens.Escape;
        runs.push({
          text: decodeEntities(t.text),
          bold,
          italic,
          code,
          link,
          href,
          strikethrough,
        });
        break;
      }
      case 'del': {
        const t = token as Tokens.Del;
        runs.push(
          ...collectRuns(t.tokens, bold, italic, code, link, href, true, showLinkUrls),
        );
        break;
      }
      case 'br': {
        runs.push({ text: '\n', bold, italic, code, link, href, strikethrough });
        break;
      }
      case 'html':
      case 'tag': {
        // Recognise inline <br> as a hard line break. Marked emits them as
        // `html` tokens inside table cells and inline contexts rather than
        // as dedicated `br` tokens.
        const html = (token as Tokens.HTML | Tokens.Tag).text ?? '';
        if (/^\s*<br\s*\/?\s*>\s*$/i.test(html)) {
          runs.push({ text: '\n', bold, italic, code, link, href, strikethrough });
        }
        // otherwise skip raw HTML
        break;
      }
      default: {
        const t = token as Tokens.Generic;
        if (typeof t.text === 'string' && t.text) {
          runs.push({
            text: decodeEntities(t.text),
            bold,
            italic,
            code,
            link,
            href,
            strikethrough,
          });
        }
        break;
      }
    }
  }

  return runs;
}

/**
 * Apply the jsPDF font for a given run (switching family / style as needed).
 */
function applyRunFont(doc: jsPDF, opts: ResolvedOptions, run: TextRun): void {
  if (run.code) {
    setFont(doc, opts.codeFontFamily, false, false);
  } else {
    setFont(doc, opts.fontFamily, run.bold, run.italic);
  }
}

/**
 * An atomic drawing piece produced from a `TextRun`. Spaces and words are
 * kept distinct so we can wrap without introducing phantom spaces between
 * runs (e.g. `**bold**,` previously became `bold ,`).
 */
type InlinePiece =
  | { kind: 'word'; text: string; run: TextRun; width: number }
  | { kind: 'space'; run: TextRun; width: number }
  | { kind: 'newline' };

/**
 * Render a list of `TextRun`s starting at (x, y), wrapping at (x + maxWidth).
 *
 * Returns the y position of the baseline of the last line drawn. If the
 * text spans a page boundary, new pages are added as needed.
 */
function renderRuns(
  state: RenderState,
  runs: TextRun[],
  startX: number,
  startY: number,
  maxWidth: number,
): number {
  const { doc, opts } = state;
  const baseFontSize = doc.getFontSize();
  const lineHeightMm = ptToMm(baseFontSize) * opts.lineHeight;
  const pageBottom = () =>
    doc.internal.pageSize.getHeight() - opts.marginBottom;

  // -----------------------------------------------------------------
  // 1. Build the piece list. We measure each word/space with the font
  // that will actually be used for that run so widths are accurate.
  // -----------------------------------------------------------------
  const pieces: InlinePiece[] = [];
  const spaceWidthByRun = new Map<TextRun, number>();

  for (const run of runs) {
    applyRunFont(doc, opts, run);
    const spaceWidth = doc.getTextWidth(' ');
    spaceWidthByRun.set(run, spaceWidth);

    const lines = run.text.split('\n');
    for (let li = 0; li < lines.length; li++) {
      if (li > 0) pieces.push({ kind: 'newline' });
      const line = lines[li];
      if (!line) continue;
      const tokenRx = /(\s+)|(\S+)/g;
      let m: RegExpExecArray | null;
      while ((m = tokenRx.exec(line)) !== null) {
        if (m[1] !== undefined) {
          pieces.push({ kind: 'space', run, width: spaceWidth });
        } else {
          pieces.push({
            kind: 'word',
            text: m[2],
            run,
            width: doc.getTextWidth(m[2]),
          });
        }
      }
    }
  }

  // -----------------------------------------------------------------
  // 2. Greedy line breaker. We buffer pieces for the current line and
  // flush them together so decorations (links, strikethrough) are
  // drawn at their final (x, y) position.
  // -----------------------------------------------------------------
  type WordSegment = { piece: Extract<InlinePiece, { kind: 'word' }>; x: number };

  let curX = startX;
  let curY = startY;
  let pendingSpace = 0;
  let segments: WordSegment[] = [];

  const flushLine = () => {
    for (const seg of segments) {
      const run = seg.piece.run;
      applyRunFont(doc, opts, run);
      if (run.link) {
        doc.setTextColor(...opts.linkColor);
      } else {
        doc.setTextColor(...state.textColor);
      }
      doc.text(seg.piece.text, seg.x, curY);

      if (run.link || run.strikethrough) {
        const fontSize = doc.getFontSize();
        const lineY = run.strikethrough
          ? curY - ptToMm(fontSize) * 0.3
          : curY + 0.3;
        const color: RGB = run.link
          ? opts.linkColor
          : state.textColor;
        doc.setDrawColor(...color);
        doc.setLineWidth(0.2);
        doc.line(seg.x, lineY, seg.x + seg.piece.width, lineY);
      }
    }
    segments = [];
  };

  const advanceLine = () => {
    flushLine();
    curX = startX;
    curY += lineHeightMm;
    pendingSpace = 0;
    if (curY > pageBottom()) {
      doc.addPage();
      curY = opts.marginTop + ptToMm(baseFontSize);
    }
  };

  for (const piece of pieces) {
    if (piece.kind === 'newline') {
      advanceLine();
      continue;
    }

    if (piece.kind === 'space') {
      if (curX > startX) {
        pendingSpace += piece.width;
      }
      continue;
    }

    // word
    const widthWithSpace = pendingSpace + piece.width;
    if (curX + widthWithSpace > startX + maxWidth && curX > startX) {
      advanceLine();
    }
    if (curX > startX) {
      curX += pendingSpace;
    }
    segments.push({ piece, x: curX });
    curX += piece.width;
    pendingSpace = 0;
  }

  flushLine();

  doc.setTextColor(...state.textColor);
  setFont(doc, opts.fontFamily, false, false);

  return curY;
}

/**
 * Render inline tokens (a paragraph or heading's inline content) as a block.
 * Returns the baseline-y of the last line drawn.
 */
function renderInline(
  state: RenderState,
  tokens: Token[],
  x: number,
  y: number,
  maxWidth: number,
): number {
  const runs = collectRuns(tokens, false, false, false, false, undefined, false, state.opts.showLinkUrls);
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
  const s = ensureSpace(state, 6);
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

  const lineHeightMm = ptToMm(fontSize) * opts.lineHeight;
  let s = ensureSpace(state, lineHeightMm + opts.blockSpacing);

  // Scale leading whitespace by heading depth: h1/h2 get a clear break,
  // h3-h6 hug the previous block more tightly.
  if (s.y > opts.marginTop + lineHeightMm) {
    const leadScale = token.depth <= 2 ? 1 : token.depth === 3 ? 0.5 : 0.25;
    s = addSpace(s, opts.blockSpacing * leadScale);
  }

  const headingState: RenderState = { ...s, textColor: opts.headingColor };
  const newY = renderInline(
    headingState,
    token.tokens,
    opts.marginLeft,
    s.y + ptToMm(fontSize),
    s.contentWidth,
  );

  if (token.depth <= 2) {
    doc.setDrawColor(...opts.headingColor);
    doc.setLineWidth(token.depth === 1 ? 0.5 : 0.3);
    doc.line(opts.marginLeft, newY + 1.5, opts.marginLeft + s.contentWidth, newY + 1.5);
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(opts.fontSize);
  setFont(doc, opts.fontFamily, false, false);

  const trailScale = token.depth <= 2 ? 1 : token.depth === 3 ? 0.75 : 0.5;
  return addSpace(
    { ...s, y: newY + (token.depth <= 2 ? 3 : 1) },
    opts.blockSpacing * trailScale,
  );
}

/**
 * Render a paragraph token.
 */
function renderParagraph(state: RenderState, token: Tokens.Paragraph): RenderState {
  const { doc, opts } = state;
  const lineHeightMm = ptToMm(opts.fontSize) * opts.lineHeight;

  doc.setFontSize(opts.fontSize);
  setFont(doc, opts.fontFamily, false, false);

  const s = ensureSpace(state, lineHeightMm);
  const startY = s.y + ptToMm(opts.fontSize);
  const newY = renderInline(s, token.tokens, opts.marginLeft, startY, s.contentWidth);

  return addSpace({ ...s, y: newY }, opts.blockSpacing);
}

/**
 * Render a fenced / indented code block.
 */
function renderCode(state: RenderState, token: Tokens.Code): RenderState {
  const { doc, opts } = state;
  const codeFontSize = opts.fontSize * 0.9;
  const lineHeightMm = ptToMm(codeFontSize) * opts.lineHeight;
  const padding = 3;

  const rawLines = token.text.split('\n');

  // Wrap each source line to the available width so long code doesn't run
  // off the right margin. We measure using the code font.
  setFont(doc, opts.codeFontFamily, false, false);
  doc.setFontSize(codeFontSize);
  const maxTextWidth = state.contentWidth - padding * 2;
  const wrapped: string[] = [];
  for (const line of rawLines) {
    if (!line) {
      wrapped.push('');
      continue;
    }
    const split = doc.splitTextToSize(line, maxTextWidth);
    wrapped.push(...(Array.isArray(split) ? split : [String(split)]));
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  let s = ensureSpace(state, lineHeightMm + padding * 2);

  let idx = 0;
  while (idx < wrapped.length) {
    // How many lines fit on this page (after the current y + padding)?
    const availableHeight = pageHeight - opts.marginBottom - s.y - padding * 2;
    const linesThatFit = Math.max(1, Math.floor(availableHeight / lineHeightMm));
    const chunkCount = Math.min(linesThatFit, wrapped.length - idx);
    const chunk = wrapped.slice(idx, idx + chunkCount);
    const blockHeight = chunk.length * lineHeightMm + padding * 2;

    // Background + accent bar
    const bg = opts.codeBackground;
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(opts.marginLeft, s.y, s.contentWidth, blockHeight, 'F');
    doc.setFillColor(150, 150, 150);
    doc.rect(opts.marginLeft, s.y, 1, blockHeight, 'F');

    doc.setFontSize(codeFontSize);
    setFont(doc, opts.codeFontFamily, false, false);
    doc.setTextColor(40, 40, 40);

    let lineY = s.y + ptToMm(codeFontSize) + padding - 1;
    for (const line of chunk) {
      doc.text(line, opts.marginLeft + padding, lineY);
      lineY += lineHeightMm;
    }

    idx += chunkCount;
    s = { ...s, y: s.y + blockHeight };

    if (idx < wrapped.length) {
      // Need a new page to continue the block.
      doc.addPage();
      s = { ...s, y: opts.marginTop };
    }
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(opts.fontSize);
  setFont(doc, opts.fontFamily, false, false);

  return addSpace(s, opts.blockSpacing);
}

/**
 * Render a blockquote (recursively renders its child tokens).
 */
function renderBlockquote(state: RenderState, token: Tokens.Blockquote): RenderState {
  const { doc, opts } = state;
  const indentX = opts.marginLeft + 8;
  const innerWidth = state.contentWidth - 8;

  let s = ensureSpace(state, ptToMm(opts.fontSize) * opts.lineHeight);
  const startY = s.y;
  const startPage = doc.getNumberOfPages();

  const innerState: RenderState = {
    ...s,
    y: s.y,
    opts: { ...opts, marginLeft: indentX },
    contentWidth: innerWidth,
    textColor: [80, 80, 80],
  };

  let rendered = innerState;
  for (const child of token.tokens) {
    rendered = renderToken(rendered, child);
  }

  const endY = rendered.y;
  const endPage = doc.getNumberOfPages();

  // Draw the left border bar. If the blockquote spans multiple pages we
  // draw one bar per page segment.
  doc.setFillColor(...opts.blockquoteColor);
  if (startPage === endPage) {
    doc.rect(opts.marginLeft + 1, startY, 2, Math.max(0.5, endY - startY + 2), 'F');
  } else {
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setPage(startPage);
    doc.rect(
      opts.marginLeft + 1,
      startY,
      2,
      pageHeight - opts.marginBottom - startY,
      'F',
    );
    for (let p = startPage + 1; p < endPage; p++) {
      doc.setPage(p);
      doc.rect(
        opts.marginLeft + 1,
        opts.marginTop,
        2,
        pageHeight - opts.marginBottom - opts.marginTop,
        'F',
      );
    }
    doc.setPage(endPage);
    doc.rect(
      opts.marginLeft + 1,
      opts.marginTop,
      2,
      Math.max(0.5, endY - opts.marginTop + 2),
      'F',
    );
  }

  doc.setTextColor(0, 0, 0);

  return {
    ...rendered,
    opts,
    contentWidth: state.contentWidth,
    textColor: state.textColor,
  };
}

/**
 * Render a list (ordered or unordered), supporting nesting.
 * When `nested` is true, the trailing block spacing is omitted so the list
 * hugs the surrounding item tightly.
 */
function renderList(
  state: RenderState,
  token: Tokens.List,
  startNumber: number = 1,
  nested: boolean = false,
): RenderState {
  let s = state;
  const { opts } = s;
  const indentMm = 6;
  const bulletX = opts.marginLeft + s.listIndent;
  const textX = bulletX + indentMm;
  const textWidth = s.contentWidth - s.listIndent - indentMm;
  const lineHeightMm = ptToMm(opts.fontSize) * opts.lineHeight;

  let itemNumber = token.start != null && typeof token.start === 'number' ? token.start : startNumber;

  for (const item of token.items) {
    s = ensureSpace(s, lineHeightMm);
    const itemY = s.y + ptToMm(opts.fontSize);

    s.doc.setFontSize(opts.fontSize);
    setFont(s.doc, opts.fontFamily, false, false);
    s.doc.setTextColor(...s.textColor);

    if (token.ordered) {
      s.doc.text(`${itemNumber}.`, bulletX, itemY);
    } else {
      s.doc.text('\u2022', bulletX, itemY);
    }

    const itemState: RenderState = {
      ...s,
      opts: { ...opts, marginLeft: textX },
      contentWidth: textWidth,
      listIndent: 0,
    };

    let afterItem = itemState;
    for (const child of item.tokens) {
      if (child.type === 'list') {
        afterItem = renderList(
          { ...afterItem, listIndent: afterItem.listIndent + indentMm },
          child as Tokens.List,
          1,
          true,
        );
      } else if (child.type === 'paragraph' || child.type === 'text') {
        const inlineTokens = (child as Tokens.Paragraph | Tokens.Text).tokens ?? [];
        const newY = renderInline(
          afterItem,
          inlineTokens.length > 0
            ? inlineTokens
            : [
                {
                  type: 'text',
                  raw: (child as Tokens.Text).text,
                  text: (child as Tokens.Text).text,
                } as Tokens.Text,
              ],
          textX,
          afterItem.y + ptToMm(opts.fontSize),
          textWidth,
        );
        afterItem = { ...afterItem, y: newY };
      } else {
        afterItem = renderToken(afterItem, child);
      }
    }

    s = { ...s, y: afterItem.y + 1 };
    itemNumber++;
  }

  return nested ? s : addSpace(s, opts.blockSpacing);
}

/** Map a marked column alignment value onto jspdf-autotable's `halign`. */
function mapAlign(a: 'left' | 'center' | 'right' | null | undefined): 'left' | 'center' | 'right' {
  return a === 'center' ? 'center' : a === 'right' ? 'right' : 'left';
}

/** True when a run list carries any styling that needs rich rendering. */
function hasInlineStyling(runs: TextRun[]): boolean {
  return runs.some(
    (r) => r.bold || r.italic || r.code || r.link || r.strikethrough,
  );
}

/** One laid-out line of text inside a cell. */
interface CellLine {
  segments: Array<{ text: string; run: TextRun; xOffset: number; width: number }>;
  width: number;
}

/**
 * Lay out a run list into lines, wrapping at `maxWidth`. Measurements use
 * the run's own font (with `forceBold` merged in, matching autoTable's
 * bold header rendering).
 */
function layoutCellRuns(
  doc: jsPDF,
  opts: ResolvedOptions,
  runs: TextRun[],
  maxWidth: number,
  forceBold: boolean,
): CellLine[] {
  type Piece =
    | { kind: 'word'; text: string; run: TextRun; width: number }
    | { kind: 'space'; width: number }
    | { kind: 'newline' };

  const pieces: Piece[] = [];
  for (const run of runs) {
    if (run.code) {
      setFont(doc, opts.codeFontFamily, false, false);
    } else {
      setFont(doc, opts.fontFamily, forceBold || run.bold, run.italic);
    }
    const spaceWidth = doc.getTextWidth(' ');
    const chunks = run.text.split('\n');
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) pieces.push({ kind: 'newline' });
      const seg = chunks[i];
      if (!seg) continue;
      const rx = /(\s+)|(\S+)/g;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(seg)) !== null) {
        if (m[1] !== undefined) {
          pieces.push({ kind: 'space', width: spaceWidth });
        } else {
          pieces.push({
            kind: 'word',
            text: m[2],
            run,
            width: doc.getTextWidth(m[2]),
          });
        }
      }
    }
  }

  const lines: CellLine[] = [];
  let cur: CellLine = { segments: [], width: 0 };
  let pendingSpace = 0;

  for (const p of pieces) {
    if (p.kind === 'newline') {
      lines.push(cur);
      cur = { segments: [], width: 0 };
      pendingSpace = 0;
      continue;
    }
    if (p.kind === 'space') {
      if (cur.segments.length > 0) pendingSpace += p.width;
      continue;
    }
    const needed = pendingSpace + p.width;
    if (cur.width + needed > maxWidth && cur.segments.length > 0) {
      lines.push(cur);
      cur = { segments: [], width: 0 };
      pendingSpace = 0;
    }
    const x = cur.segments.length > 0 ? cur.width + pendingSpace : 0;
    cur.segments.push({ text: p.text, run: p.run, xOffset: x, width: p.width });
    cur.width = x + p.width;
    pendingSpace = 0;
  }
  lines.push(cur);

  setFont(doc, opts.fontFamily, false, false);
  return lines;
}

/**
 * Draw a list of pre-laid-out lines inside an autoTable cell, respecting
 * the cell's `halign` / `valign` and filling in per-run font styles.
 */
function drawRichCell(
  doc: jsPDF,
  opts: ResolvedOptions,
  cell: {
    x: number;
    y: number;
    width: number;
    height: number;
    padding: (n: 'top' | 'bottom' | 'left' | 'right') => number;
    styles: { halign?: string; valign?: string; textColor?: unknown };
  },
  runs: TextRun[],
  forceBold: boolean,
): void {
  const fontSize = doc.getFontSize();
  const lineHeightMm = ptToMm(fontSize) * opts.lineHeight;
  const padLeft = cell.padding('left');
  const padRight = cell.padding('right');
  const padTop = cell.padding('top');
  const padBottom = cell.padding('bottom');
  const availWidth = Math.max(0, cell.width - padLeft - padRight);
  const availHeight = Math.max(0, cell.height - padTop - padBottom);

  const lines = layoutCellRuns(doc, opts, runs, availWidth, forceBold);
  const totalHeight = Math.max(0, lines.length * lineHeightMm);

  const valign = cell.styles.valign ?? 'top';
  const halign = cell.styles.halign ?? 'left';

  let baselineY: number;
  if (valign === 'middle') {
    baselineY =
      cell.y + padTop + (availHeight - totalHeight) / 2 + ptToMm(fontSize);
  } else if (valign === 'bottom') {
    baselineY = cell.y + cell.height - padBottom - totalHeight + ptToMm(fontSize);
  } else {
    baselineY = cell.y + padTop + ptToMm(fontSize);
  }

  const cellColor = cell.styles.textColor;
  const defaultColor: RGB = Array.isArray(cellColor)
    ? [cellColor[0] ?? 0, cellColor[1] ?? 0, cellColor[2] ?? 0]
    : [0, 0, 0];

  let y = baselineY;
  for (const line of lines) {
    let offset = 0;
    if (halign === 'center') offset = (availWidth - line.width) / 2;
    else if (halign === 'right') offset = availWidth - line.width;
    const lineX = cell.x + padLeft + offset;

    for (const seg of line.segments) {
      const run = seg.run;
      if (run.code) {
        setFont(doc, opts.codeFontFamily, false, false);
      } else {
        setFont(doc, opts.fontFamily, forceBold || run.bold, run.italic);
      }
      if (run.link) {
        doc.setTextColor(...opts.linkColor);
      } else {
        doc.setTextColor(defaultColor[0], defaultColor[1], defaultColor[2]);
      }
      const drawX = lineX + seg.xOffset;
      doc.text(seg.text, drawX, y);

      if (run.link || run.strikethrough) {
        const lineY = run.strikethrough
          ? y - ptToMm(fontSize) * 0.3
          : y + 0.3;
        const color: RGB = run.link ? opts.linkColor : defaultColor;
        doc.setDrawColor(...color);
        doc.setLineWidth(0.2);
        doc.line(drawX, lineY, drawX + seg.width, lineY);
      }
    }
    y += lineHeightMm;
  }

  setFont(doc, opts.fontFamily, false, false);
  doc.setTextColor(0, 0, 0);
}

/**
 * Render a GFM table using jspdf-autotable. Supports column alignment
 * (`:---`, `:---:`, `---:`), inline formatting inside cells
 * (**bold**, *italic*, `code`, [links](…), ~~strikethrough~~), and
 * `<br>` line breaks. Merged cells are not part of GFM; use a raw
 * `<table>` block with `colspan`/`rowspan` attributes for those.
 */
function renderTable(state: RenderState, token: Tokens.Table): RenderState {
  const { doc, opts } = state;

  const cellize = (cell: Tokens.TableCell): { plain: string; runs: TextRun[] } => {
    const runs = collectRuns(
      cell.tokens,
      false,
      false,
      false,
      false,
      undefined,
      false,
      opts.showLinkUrls,
    );
    return { plain: runs.map((r) => r.text).join(''), runs };
  };

  const headRich = token.header.map(cellize);
  const bodyRich = token.rows.map((row) => row.map(cellize));

  const head: string[][] = [headRich.map((c) => c.plain)];
  const body: string[][] = bodyRich.map((row) => row.map((c) => c.plain));

  const columnStyles: Record<string, { halign: 'left' | 'center' | 'right' }> = {};
  (token.align ?? []).forEach((a, i) => {
    columnStyles[String(i)] = { halign: mapAlign(a) };
  });

  const richFor = (section: string, rowIdx: number, colIdx: number) => {
    if (section === 'head') return headRich[colIdx];
    if (section === 'body') return bodyRich[rowIdx]?.[colIdx];
    return undefined;
  };

  autoTable(doc, {
    head,
    body,
    startY: state.y + opts.blockSpacing,
    margin: { left: opts.marginLeft, right: opts.marginRight },
    styles: {
      fontSize: opts.fontSize * 0.9,
      font: opts.fontFamily,
      cellPadding: 2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [80, 80, 80],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    columnStyles,
    theme: 'striped',
    willDrawCell: (data) => {
      const rich = richFor(data.section, data.row.index, data.column.index);
      if (rich && hasInlineStyling(rich.runs)) {
        // Let autoTable draw the background/border but suppress the default
        // text; we draw styled runs in didDrawCell.
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      const rich = richFor(data.section, data.row.index, data.column.index);
      if (rich && hasInlineStyling(rich.runs)) {
        drawRichCell(doc, opts, data.cell, rich.runs, data.section === 'head');
      }
    },
  });

  const lastY =
    (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ??
    state.y;

  return addSpace({ ...state, y: lastY }, opts.blockSpacing);
}

/** One cell extracted from a raw HTML `<table>`. */
interface HtmlTableCell {
  header: boolean;
  content: string;
  colSpan: number;
  rowSpan: number;
}

/**
 * Extract all `<tr>...</tr>` blocks from an HTML fragment and parse their
 * cells. `<br>` inside cells becomes a newline; any other tags are stripped.
 */
function parseHtmlTableRows(html: string): HtmlTableCell[][] {
  const rows: HtmlTableCell[][] = [];
  const rowRx = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm: RegExpExecArray | null;
  while ((rm = rowRx.exec(html)) !== null) {
    const cellRx = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
    const cells: HtmlTableCell[] = [];
    let cm: RegExpExecArray | null;
    while ((cm = cellRx.exec(rm[1])) !== null) {
      const tag = cm[1].toLowerCase();
      const attrs = cm[2];
      const rawContent = cm[3];
      const colspanMatch = /colspan\s*=\s*["']?(\d+)/i.exec(attrs);
      const rowspanMatch = /rowspan\s*=\s*["']?(\d+)/i.exec(attrs);
      const content = decodeEntities(
        rawContent
          .replace(/<br\s*\/?\s*>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim(),
      );
      cells.push({
        header: tag === 'th',
        content,
        colSpan: colspanMatch ? parseInt(colspanMatch[1], 10) : 1,
        rowSpan: rowspanMatch ? parseInt(rowspanMatch[1], 10) : 1,
      });
    }
    rows.push(cells);
  }
  return rows;
}

/**
 * Render a raw HTML `<table>` block, including `colspan`/`rowspan`
 * merged-cell support. Returns `null` when the block is not a table, so
 * the caller can fall through to its default html handling.
 */
function renderHtmlTable(state: RenderState, rawHtml: string): RenderState | null {
  const outer = rawHtml.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
  if (!outer) return null;
  const inner = outer[1];

  const theadMatch = inner.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
  const tbodyMatch = inner.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i);
  const bodySource = tbodyMatch
    ? tbodyMatch[1]
    : theadMatch
      ? inner.replace(theadMatch[0], '')
      : inner;

  let headRows = theadMatch ? parseHtmlTableRows(theadMatch[1]) : [];
  const bodyRows = parseHtmlTableRows(bodySource);

  // If there's no explicit <thead> but the first body row is all <th>,
  // promote it to the header.
  if (
    headRows.length === 0 &&
    bodyRows.length > 0 &&
    bodyRows[0].every((c) => c.header)
  ) {
    headRows = [bodyRows.shift() as HtmlTableCell[]];
  }

  if (headRows.length === 0 && bodyRows.length === 0) return null;

  const { doc, opts } = state;

  const toCellDef = (c: HtmlTableCell) => ({
    content: c.content,
    colSpan: c.colSpan,
    rowSpan: c.rowSpan,
  });

  autoTable(doc, {
    head: headRows.map((r) => r.map(toCellDef)),
    body: bodyRows.map((r) => r.map(toCellDef)),
    startY: state.y + opts.blockSpacing,
    margin: { left: opts.marginLeft, right: opts.marginRight },
    styles: {
      fontSize: opts.fontSize * 0.9,
      font: opts.fontFamily,
      cellPadding: 2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [80, 80, 80],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    theme: 'striped',
  });

  const lastY =
    (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ??
    state.y;

  return addSpace({ ...state, y: lastY }, opts.blockSpacing);
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
    case 'html': {
      // Attempt to render <table> HTML blocks with colspan/rowspan; fall
      // through (skipping) otherwise.
      const htmlToken = token as Tokens.HTML;
      if (/^\s*<table\b/i.test(htmlToken.text ?? '')) {
        const rendered = renderHtmlTable(state, htmlToken.text);
        if (rendered) return rendered;
      }
      return state;
    }
    default:
      return state;
  }
}

/**
 * Parse a markdown string and render it into a jsPDF document.
 *
 * @param doc      An existing jsPDF instance to render into.
 * @param markdown The markdown string to render.
 * @param options  Optional configuration for margins, fonts, colors, etc.
 * @returns The same jsPDF document (for chaining).
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
    textColor: [0, 0, 0],
  };

  doc.setFontSize(opts.fontSize);
  setFont(doc, opts.fontFamily, false, false);

  for (const token of tokens) {
    state = renderToken(state, token);
  }

  return doc;
}

export default markdownToPdf;
