import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  Color as AutoTableColor,
  Styles as AutoTableStyles,
  ThemeType as AutoTableThemeType,
  UserOptions as AutoTableUserOptions,
} from 'jspdf-autotable';
import { lexer, Token, Tokens } from 'marked';

// ---------------------------------------------------------------------------
// Table styling public types
// ---------------------------------------------------------------------------

/**
 * Styling overrides for a section of a table. All fields are optional
 * and map 1:1 to jspdf-autotable's `Styles` interface, so anything
 * autoTable supports can be set here. `fillColor: false` disables the
 * default fill for a section (e.g. to drop alternate-row striping).
 *
 * @see https://github.com/simonbengtsson/jsPDF-AutoTable#styling
 */
export type TableCellStyles = Partial<Omit<AutoTableStyles, 'fillColor'>> & {
  /** Fill colour, or `false` to disable the default fill. */
  fillColor?: AutoTableColor | false;
};

/**
 * Declarative table styling. Applied to every Markdown table (GFM pipe
 * tables and raw HTML `<table>` blocks alike). All fields are optional;
 * unspecified fields fall back to the library's defaults.
 *
 * @example Brand-coloured header with zebra striping
 * ```ts
 * const tableStyles: TableStyles = {
 *   headStyles: {
 *     fillColor: [25, 55, 120],
 *     textColor: [255, 255, 255],
 *     halign: 'center',
 *   },
 *   alternateRowStyles: { fillColor: [240, 245, 255] },
 *   columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
 * };
 * markdownToPdf(doc, md, { tableStyles });
 * ```
 *
 * @example Escape hatch for autoTable-only options
 * ```ts
 * markdownToPdf(doc, md, {
 *   tableStyles: {
 *     customize: (opts) => ({ ...opts, rowPageBreak: 'avoid' }),
 *   },
 * });
 * ```
 */
export interface TableStyles {
  /**
   * autoTable theme.
   *
   * - `'striped'` (default): alternate body rows get
   *   {@link TableStyles.alternateRowStyles}.
   * - `'grid'`: borders on every side, no alternate stripe by default.
   * - `'plain'`: no borders and no alternate stripe by default.
   */
  theme?: AutoTableThemeType;
  /**
   * Base styles inherited by every section. Library defaults:
   * `{ fontSize: options.fontSize * 0.9, font: options.fontFamily,
   * cellPadding: 2, valign: 'middle' }`.
   */
  styles?: TableCellStyles;
  /**
   * Overrides for header rows. Library defaults: dark-grey fill
   * (`[80, 80, 80]`), white bold text.
   */
  headStyles?: TableCellStyles;
  /** Overrides for body rows. No defaults; inherits from `styles`. */
  bodyStyles?: TableCellStyles;
  /**
   * Overrides for striped alternate body rows. Only applied when
   * `theme === 'striped'`. Library default: `{ fillColor: [248, 248, 248] }`.
   * Pass `fillColor: false` to drop the stripe while keeping stripes on.
   */
  alternateRowStyles?: TableCellStyles;
  /**
   * Per-column overrides keyed by zero-based column index. A user entry
   * here wins over GFM column-alignment (`:---:`) for the same column.
   *
   * ```ts
   * columnStyles: {
   *   0: { fontStyle: 'bold' },
   *   2: { halign: 'right', textColor: [20, 100, 40] },
   * }
   * ```
   */
  columnStyles?: Record<string | number, TableCellStyles>;
  /**
   * Escape hatch: last-mile customisation. Invoked with the fully
   * composed autoTable options (including head/body, merged styles,
   * and the rich-cell `willDrawCell` / `didDrawCell` hooks for GFM
   * tables) and must return the options that will be passed to
   * `autoTable`. Spread the argument to keep the library defaults:
   *
   * ```ts
   * customize: (opts) => ({
   *   ...opts,
   *   rowPageBreak: 'avoid',
   *   didDrawPage: (data) => {
   *     doc.text(`Page ${data.pageNumber}`, 15, 10);
   *   },
   * })
   * ```
   *
   * Running this for a raw HTML `<table>` is also supported (the
   * rich-cell hooks are only set for GFM tables).
   */
  customize?: (options: AutoTableUserOptions) => AutoTableUserOptions;
}

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
  /**
   * Custom table styling applied to every Markdown table rendered with
   * these options — GFM pipe tables **and** raw HTML `<table>` blocks
   * (including merged-cell tables using `colspan` / `rowspan`).
   *
   * Declarative fields (`styles`, `headStyles`, `bodyStyles`,
   * `alternateRowStyles`, `columnStyles`, `theme`) are shallow-merged
   * on top of the library's defaults. User `columnStyles[i]` wins over
   * GFM column alignment for the same column. For anything autoTable
   * supports that isn't surfaced here, use
   * {@link TableStyles.customize} to rewrite the final autoTable
   * options just before they're invoked.
   *
   * @see {@link TableStyles}
   * @see {@link TableCellStyles}
   */
  tableStyles?: TableStyles;
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
  tableStyles: TableStyles;
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
    tableStyles: opts?.tableStyles ?? {},
  };
}

/**
 * Decode HTML entities. Handles the named entities that `marked` inserts
 * when escaping text (e.g. `&quot;`, `&amp;`), common typographic entities
 * (`&mdash;`, `&ldquo;`, `&hellip;`, …), and all decimal / hexadecimal
 * numeric entities (`&#169;`, `&#x00A9;`).
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '\u00A0')
    // Common typographic named entities
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&bull;/g, '\u2022')
    .replace(/&middot;/g, '\u00B7')
    .replace(/&copy;/g, '\u00A9')
    .replace(/&reg;/g, '\u00AE')
    .replace(/&trade;/g, '\u2122')
    .replace(/&deg;/g, '\u00B0')
    .replace(/&plusmn;/g, '\u00B1')
    .replace(/&times;/g, '\u00D7')
    .replace(/&divide;/g, '\u00F7')
    .replace(/&frac12;/g, '\u00BD')
    .replace(/&frac14;/g, '\u00BC')
    .replace(/&frac34;/g, '\u00BE')
    .replace(/&laquo;/g, '\u00AB')
    .replace(/&raquo;/g, '\u00BB')
    .replace(/&euro;/g, '\u20AC')
    .replace(/&pound;/g, '\u00A3')
    .replace(/&yen;/g, '\u00A5')
    .replace(/&cent;/g, '\u00A2')
    // Generic decimal numeric entities &#NNN;
    .replace(/&#(\d+);/g, (match: string, n: string) => {
      try { return String.fromCodePoint(parseInt(n, 10)); }
      // String.fromCodePoint throws RangeError for invalid code points
      // (e.g. surrogates). Return the original entity so users can see it.
      catch { return match; }
    })
    // Generic hex numeric entities &#xHHH;
    .replace(/&#x([0-9a-f]+);/gi, (match: string, h: string) => {
      try { return String.fromCodePoint(parseInt(h, 16)); }
      // String.fromCodePoint throws RangeError for invalid code points.
      // Return the original entity so users can see it.
      catch { return match; }
    })
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

/** One laid-out line of inline runs, ready to draw at a position. */
interface InlineLine {
  segments: Array<{ text: string; run: TextRun; xOffset: number; width: number }>;
  width: number;
}

/**
 * Lay out a run list into lines, wrapping at `maxWidth`. Measurements use
 * the run's own font (with `forceBold` merged in, matching autoTable's
 * bold header rendering when laying out table cells).
 */
function layoutInlineRuns(
  doc: jsPDF,
  opts: ResolvedOptions,
  runs: TextRun[],
  maxWidth: number,
  forceBold: boolean,
  fontFamilyOverride?: string,
): InlineLine[] {
  const fontFamily = fontFamilyOverride ?? opts.fontFamily;
  type Piece =
    | { kind: 'word'; text: string; run: TextRun; width: number }
    | { kind: 'space'; width: number }
    | { kind: 'newline' };

  const pieces: Piece[] = [];
  for (const run of runs) {
    if (run.code) {
      setFont(doc, opts.codeFontFamily, false, false);
    } else {
      setFont(doc, fontFamily, forceBold || run.bold, run.italic);
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

  const lines: InlineLine[] = [];
  let cur: InlineLine = { segments: [], width: 0 };
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

  setFont(doc, fontFamily, false, false);
  return lines;
}

/**
 * Draw a list of pre-laid-out inline lines anchored at (`boxX`, `baselineY`)
 * with a given per-line content width. Each line is shifted horizontally
 * by `halign` and drawn top-down using `opts.lineHeight`.
 *
 * Returns the y position after the last line (one line-height below its
 * baseline), useful for chaining further rendering.
 */
function drawInlineLines(
  doc: jsPDF,
  opts: ResolvedOptions,
  lines: InlineLine[],
  boxX: number,
  baselineY: number,
  boxWidth: number,
  halign: 'left' | 'center' | 'right',
  defaultColor: RGB,
  forceBold: boolean,
  fontFamilyOverride?: string,
): number {
  const fontFamily = fontFamilyOverride ?? opts.fontFamily;
  const fontSize = doc.getFontSize();
  const lineHeightMm = ptToMm(fontSize) * opts.lineHeight;

  let y = baselineY;
  for (const line of lines) {
    let offset = 0;
    if (halign === 'center') offset = Math.max(0, (boxWidth - line.width) / 2);
    else if (halign === 'right') offset = Math.max(0, boxWidth - line.width);
    const lineX = boxX + offset;

    for (const seg of line.segments) {
      const run = seg.run;
      if (run.code) {
        setFont(doc, opts.codeFontFamily, false, false);
      } else {
        setFont(doc, fontFamily, forceBold || run.bold, run.italic);
      }
      if (run.link) {
        doc.setTextColor(...opts.linkColor);
      } else {
        doc.setTextColor(defaultColor[0], defaultColor[1], defaultColor[2]);
      }
      const drawX = lineX + seg.xOffset;
      doc.text(seg.text, drawX, y);

      if (run.link || run.strikethrough) {
        const decorY = run.strikethrough
          ? y - ptToMm(fontSize) * 0.3
          : y + 0.3;
        const color: RGB = run.link ? opts.linkColor : defaultColor;
        doc.setDrawColor(...color);
        doc.setLineWidth(0.2);
        doc.line(drawX, decorY, drawX + seg.width, decorY);
      }
    }
    y += lineHeightMm;
  }

  setFont(doc, opts.fontFamily, false, false);
  doc.setTextColor(0, 0, 0);
  return y;
}

/**
 * Draw a list of pre-laid-out lines inside an autoTable cell, respecting
 * the cell's `halign` / `valign` and padding. A thin adapter around
 * `drawInlineLines`.
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
    styles: {
      halign?: string;
      valign?: string;
      textColor?: unknown;
      fontSize?: number;
      font?: string;
    };
  },
  runs: TextRun[],
  forceBold: boolean,
): void {
  const fontSize = cell.styles.fontSize ?? doc.getFontSize();
  const fontFamily = cell.styles.font ?? opts.fontFamily;
  doc.setFontSize(fontSize);
  const lineHeightMm = ptToMm(fontSize) * opts.lineHeight;
  const padLeft = cell.padding('left');
  const padRight = cell.padding('right');
  const padTop = cell.padding('top');
  const padBottom = cell.padding('bottom');
  const availWidth = Math.max(0, cell.width - padLeft - padRight);
  const availHeight = Math.max(0, cell.height - padTop - padBottom);

  const lines = layoutInlineRuns(doc, opts, runs, availWidth, forceBold, fontFamily);
  const totalHeight = Math.max(0, lines.length * lineHeightMm);

  const valign = cell.styles.valign ?? 'top';
  const halign = (cell.styles.halign as 'left' | 'center' | 'right' | undefined) ?? 'left';

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

  drawInlineLines(
    doc,
    opts,
    lines,
    cell.x + padLeft,
    baselineY,
    availWidth,
    halign,
    defaultColor,
    forceBold,
    fontFamily,
  );
}

/** Shallow-merge a list of style objects; later entries win. */
function mergeStyles(
  ...styles: Array<Partial<AutoTableStyles> | undefined>
): Partial<AutoTableStyles> {
  const out: Partial<AutoTableStyles> = {};
  for (const s of styles) {
    if (s) Object.assign(out, s);
  }
  return out;
}

/**
 * Build the autoTable configuration shared by GFM pipe tables and raw
 * HTML `<table>` blocks.
 *
 * Merges, in order:
 * 1. The library's baked-in defaults (dark-grey header, striped
 *    alternate rows, 90%-scale body font, 2 mm padding, …).
 * 2. User-provided {@link TableStyles} from `opts.tableStyles`.
 * 3. GFM column alignment (`:---:`) for columns the user didn't
 *    explicitly style via `columnStyles`.
 *
 * The resulting options still need `head` / `body` (and, for GFM
 * tables, the rich-cell hooks) to be added by the caller before being
 * passed through {@link finaliseTableOptions}.
 */
function buildTableOptions(
  state: RenderState,
  gfmColumnStyles?: Record<string, Partial<AutoTableStyles>>,
): AutoTableUserOptions {
  const { opts } = state;
  const user = opts.tableStyles;

  const columnStyles: Record<string, Partial<AutoTableStyles>> = {};
  if (gfmColumnStyles) {
    for (const [k, v] of Object.entries(gfmColumnStyles)) {
      columnStyles[k] = { ...v };
    }
  }
  if (user.columnStyles) {
    for (const [k, v] of Object.entries(user.columnStyles)) {
      columnStyles[k] = {
        ...(columnStyles[k] ?? {}),
        ...(v as Partial<AutoTableStyles>),
      };
    }
  }

  return {
    startY: state.y + opts.blockSpacing,
    margin: { left: opts.marginLeft, right: opts.marginRight },
    theme: user.theme ?? 'striped',
    styles: mergeStyles(
      {
        fontSize: opts.fontSize * 0.9,
        font: opts.fontFamily,
        cellPadding: 2,
        valign: 'middle',
      },
      user.styles as Partial<AutoTableStyles> | undefined,
    ),
    headStyles: mergeStyles(
      {
        fillColor: [80, 80, 80],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      user.headStyles as Partial<AutoTableStyles> | undefined,
    ),
    bodyStyles: user.bodyStyles as Partial<AutoTableStyles> | undefined,
    // Only ship the default zebra-stripe under the 'striped' theme so
    // that `theme: 'plain'` and `theme: 'grid'` render as expected.
    alternateRowStyles: mergeStyles(
      (user.theme ?? 'striped') === 'striped'
        ? { fillColor: [248, 248, 248] }
        : undefined,
      user.alternateRowStyles as Partial<AutoTableStyles> | undefined,
    ),
    columnStyles,
  };
}

/**
 * Apply the user's {@link TableStyles.customize} callback (if set) to
 * the final autoTable options and return the result. This runs last,
 * *after* all declarative tableStyles have been merged in and *after*
 * the caller has added `head`, `body`, and any rich-cell hooks.
 */
function finaliseTableOptions(
  opts: ResolvedOptions,
  options: AutoTableUserOptions,
): AutoTableUserOptions {
  const customize = opts.tableStyles.customize;
  return customize ? customize(options) : options;
}

/**
 * Render a GFM pipe table via jspdf-autotable.
 *
 * Features:
 * - Column alignment via `:---`, `:---:`, `---:`.
 * - Full inline formatting inside cells: **bold**, *italic*,
 *   `code`, [links](…), ~~strikethrough~~, and `<br>` line breaks.
 * - Cell styling is routed through {@link buildTableOptions} so the
 *   user's {@link TableStyles} fully applies (fills, borders, fonts,
 *   padding, per-column overrides, `customize` escape hatch).
 *
 * Cells that contain inline styling are re-drawn by
 * {@link drawRichCell} inside autoTable's
 * `willDrawCell` / `didDrawCell` hooks so bold / italic / code / link
 * styling survives the default cell rendering. The font size, font
 * family, and default text colour for those rich runs are taken from
 * the per-cell autoTable styles, so `headStyles.fontSize = 14`
 * correctly scales header rich-cells as well.
 *
 * Merged cells are not part of GFM; use a raw `<table>` block with
 * `colspan` / `rowspan` attributes for those — see
 * {@link renderHtmlTable}.
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

  const gfmColumnStyles: Record<string, Partial<AutoTableStyles>> = {};
  (token.align ?? []).forEach((a, i) => {
    gfmColumnStyles[String(i)] = { halign: mapAlign(a) };
  });

  const richFor = (section: string, rowIdx: number, colIdx: number) => {
    if (section === 'head') return headRich[colIdx];
    if (section === 'body') return bodyRich[rowIdx]?.[colIdx];
    return undefined;
  };

  const base = buildTableOptions(state, gfmColumnStyles);
  const options = finaliseTableOptions(opts, {
    ...base,
    head,
    body,
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

  autoTable(doc, options);

  const lastY =
    (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ??
    state.y;

  return addSpace({ ...state, y: lastY }, opts.blockSpacing);
}

/** One cell extracted from a raw HTML `<table>`. */
interface HtmlTableCell {
  header: boolean;
  /** Plain-text content (HTML tags stripped, entities decoded, `<br>` → `\n`). */
  content: string;
  /** Raw HTML content as it appeared between the opening and closing cell tag. */
  rawContent: string;
  colSpan: number;
  rowSpan: number;
  /** Horizontal alignment from `align` attribute or `text-align` CSS, if present. */
  align?: 'left' | 'center' | 'right';
}

/**
 * Extract the horizontal alignment from HTML cell attributes.
 * Recognises the `align` attribute and `text-align` in an inline `style`.
 */
function parseCellAlign(attrs: string): 'left' | 'center' | 'right' | undefined {
  const alignAttr = /\balign\s*=\s*["']?(left|center|right)["']?/i.exec(attrs);
  if (alignAttr) return alignAttr[1].toLowerCase() as 'left' | 'center' | 'right';
  const styleAttr = /\bstyle\s*=\s*["']([^"']*)["']/i.exec(attrs);
  if (styleAttr) {
    const textAlign = /text-align\s*:\s*(left|center|right)/i.exec(styleAttr[1]);
    if (textAlign) return textAlign[1].toLowerCase() as 'left' | 'center' | 'right';
  }
  return undefined;
}

/**
 * Convert raw HTML cell content to a list of styled {@link TextRun}s,
 * enabling bold, italic, code, links, and strikethrough inside HTML table
 * cells — just like GFM pipe-table cells.
 *
 * Uses a single-pass regex over the raw HTML so that the output string can
 * never contain `<…>` patterns (each tag is consumed exactly once and
 * converted to its markdown equivalent or stripped). This avoids the
 * multi-character sanitization concern that chained replacements exhibit.
 *
 * Recognised inline HTML tags are converted to markdown equivalents:
 * - `<strong>`/`<b>` → `**`  and `</strong>`/`</b>` → `**`
 * - `<em>`/`<i>` → `*` and `</em>`/`</i>` → `*`
 * - `<code>` → `` ` `` and `</code>` → `` ` ``
 * - `<del>`/`<s>` → `~~` and `</del>`/`</s>` → `~~`
 * - `<a href="…">` → `[` (with href captured for the closing `](…)`)
 * - `</a>` → `](href)`
 * - `<br>` → `\\\n` (GFM hard line break)
 * - All other tags → stripped (no output)
 *
 * Markdown inline syntax (`**bold**`, `*italic*`, `` `code` ``, etc.) in the
 * text content between tags is also handled because the result is passed to
 * `inlineRunsFromMarkdown`.
 */
function htmlCellContentToRuns(rawContent: string, opts: ResolvedOptions): TextRun[] {
  let md = '';
  let pendingLinkHref = '';

  // Single-pass: match either <tag> or a run of non-tag characters.
  const rx = /<([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(rawContent)) !== null) {
    if (m[2] !== undefined) {
      // Non-tag text: pass through as-is (markdown syntax is preserved
      // and will be parsed by inlineRunsFromMarkdown below).
      md += m[2];
    } else {
      // HTML tag: convert known inline formatting tags; strip everything else.
      const tag = m[1];
      const lower = tag.toLowerCase().trim();
      if (/^br\b/.test(lower)) {
        // <br> → GFM hard line break (backslash before newline).
        md += '\\\n';
      } else if (/^(strong|b)\b/.test(lower)) {
        md += '**';
      } else if (/^\/(strong|b)\b/.test(lower)) {
        md += '**';
      } else if (/^(em|i)\b/.test(lower)) {
        md += '*';
      } else if (/^\/(em|i)\b/.test(lower)) {
        md += '*';
      } else if (/^code\b/.test(lower)) {
        md += '`';
      } else if (/^\/code\b/.test(lower)) {
        md += '`';
      } else if (/^(del|s)\b/.test(lower)) {
        md += '~~';
      } else if (/^\/(del|s)\b/.test(lower)) {
        md += '~~';
      } else if (/^a\b/.test(lower)) {
        const hrefMatch = /\bhref\s*=\s*["']([^"']*)["']/i.exec(tag);
        if (hrefMatch) {
          pendingLinkHref = hrefMatch[1];
          md += '[';
        }
      } else if (/^\/a\b/.test(lower)) {
        if (pendingLinkHref) {
          md += `](${pendingLinkHref})`;
          pendingLinkHref = '';
        }
      }
      // All other tags are silently stripped (no output).
    }
  }

  return inlineRunsFromMarkdown(decodeEntities(md), opts);
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
      const align = parseCellAlign(attrs);
      const content = decodeEntities(
        rawContent
          .replace(/<br\s*\/?\s*>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim(),
      );
      cells.push({
        header: tag === 'th',
        content,
        rawContent,
        colSpan: colspanMatch ? parseInt(colspanMatch[1], 10) : 1,
        rowSpan: rowspanMatch ? parseInt(rowspanMatch[1], 10) : 1,
        align,
      });
    }
    rows.push(cells);
  }
  return rows;
}

/**
 * Render a raw HTML `<table>` block, including `colspan` / `rowspan`
 * merged-cell support.
 *
 * The same {@link TableStyles} as GFM tables applies — fills, borders,
 * per-column overrides, theme, and the `customize` escape hatch all
 * work — but cells are rendered as plain strings (no inline markdown
 * parsing inside HTML cells). `<br>` inside a cell becomes a newline;
 * other HTML inside cells is stripped.
 *
 * Returns `null` when the block is not a table, so the caller can fall
 * through to its default HTML handling.
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

  // Build rich cell content (inline HTML + markdown aware).
  const cellize = (c: HtmlTableCell) => {
    const runs = htmlCellContentToRuns(c.rawContent, opts);
    return {
      plain: c.content,
      runs,
      align: c.align,
      colSpan: c.colSpan,
      rowSpan: c.rowSpan,
    };
  };

  const richHead = headRows.map((r) => r.map(cellize));
  const richBody = bodyRows.map((r) => r.map(cellize));

  const richFor = (section: string, rowIdx: number, colIdx: number) => {
    if (section === 'head') return richHead[rowIdx]?.[colIdx];
    if (section === 'body') return richBody[rowIdx]?.[colIdx];
    return undefined;
  };

  const toCellDef = (c: ReturnType<typeof cellize>) => {
    const def: {
      content: string;
      colSpan: number;
      rowSpan: number;
      styles?: { halign: 'left' | 'center' | 'right' };
    } = {
      content: c.plain,
      colSpan: c.colSpan,
      rowSpan: c.rowSpan,
    };
    if (c.align) {
      def.styles = { halign: c.align };
    }
    return def;
  };

  const base = buildTableOptions(state);
  const options = finaliseTableOptions(opts, {
    ...base,
    head: richHead.map((r) => r.map(toCellDef)),
    body: richBody.map((r) => r.map(toCellDef)),
    willDrawCell: (data) => {
      const rich = richFor(data.section, data.row.index, data.column.index);
      if (rich && hasInlineStyling(rich.runs)) {
        // Suppress autoTable's default text; we draw styled runs in didDrawCell.
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

  autoTable(doc, options);

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

// ---------------------------------------------------------------------------
// Precise-layout public API
// ---------------------------------------------------------------------------

/** The current rendering cursor: page, and baseline coordinates in mm. */
export interface LayoutCursor {
  /** 1-based page number. */
  page: number;
  /** Left edge used for subsequent block rendering (mm). */
  x: number;
  /** Top edge used for subsequent block rendering (mm). */
  y: number;
}

/**
 * A rectangular region to render a markdown block into. Any omitted field
 * falls back to the layout's current cursor / page dimensions.
 */
export interface LayoutRegion {
  /** Left edge (mm). Defaults to the current cursor x. */
  x?: number;
  /** Top edge (mm). Defaults to the current cursor y. */
  y?: number;
  /** Content width (mm). Defaults to `pageWidth − x − marginRight`. */
  width?: number;
  /**
   * If set, the layout will start the region on a new page when the
   * remaining space on the current page is less than `minHeight` mm. Use
   * this to avoid orphaning a heading at the bottom of a page.
   */
  minHeight?: number;
}

/** Result returned by {@link MarkdownLayout.renderMarkdown}. */
export interface BlockRenderResult {
  /** Page the block started on (1-based). */
  startPage: number;
  /** Page the block finished on (1-based). */
  endPage: number;
  /** Y position of the cursor after the block finishes, on `endPage` (mm). */
  endY: number;
  /** Total vertical height the block consumed, flattening page breaks (mm). */
  height: number;
  /** Number of pages the block spanned (≥ 1). */
  pageCount: number;
}

/** Horizontal alignment for inline text. */
export type InlineAlign = 'left' | 'center' | 'right';

/** Options for drawing a single run of inline markdown at a specific point. */
export interface InlineRenderOptions {
  /** Left edge of the text box (mm). */
  x: number;
  /** Top edge of the first line's text box (mm). */
  y: number;
  /**
   * Wrap width (mm). Without a value the text is drawn on a single line
   * (no wrapping).
   */
  maxWidth?: number;
  /** Horizontal alignment inside `maxWidth`. Default: `'left'`. */
  align?: InlineAlign;
  /** Font size in pt. Defaults to the layout's base `fontSize`. */
  fontSize?: number;
  /**
   * Text colour as `[r,g,b]`. Defaults to `[0,0,0]`. Links always use
   * `options.linkColor` regardless of this value.
   */
  color?: RGB;
  /** If `true`, start from bold weight even for non-bold runs. Default: `false`. */
  bold?: boolean;
  /** If `true`, start from italic even for non-italic runs. Default: `false`. */
  italic?: boolean;
}

/** Result returned by {@link MarkdownLayout.renderInline}. */
export interface InlineRenderResult {
  /** Top edge of the line following the last drawn line (mm). */
  endY: number;
  /** Baseline y of the last drawn line (mm). */
  lastBaselineY: number;
  /** Number of wrapped lines actually drawn. */
  lines: number;
  /** Widest line drawn (mm). */
  width: number;
  /** Total height consumed, `lines × lineHeight` (mm). */
  height: number;
}

/** Result returned by {@link MarkdownLayout.measureMarkdown}. */
export interface MeasureResult {
  /** Total flattened height in mm, summed across the pages the content spans. */
  height: number;
  /** Number of pages the content would span. */
  pageCount: number;
  /** Final y position on the last page (mm). */
  endY: number;
}

/**
 * `MarkdownLayout` is the low-level, precise-layout API.
 *
 * It wraps a `jsPDF` instance and lets callers:
 *
 * - Render markdown blocks at arbitrary positions and widths (columns,
 *   call-out boxes, constrained regions).
 * - Render a single line of inline markdown anywhere on the page with
 *   left / center / right alignment — perfect for headers, footers, page
 *   numbers and stamps.
 * - Measure how much space markdown will occupy before drawing it.
 * - Read and move the rendering cursor, switch pages, and interleave raw
 *   `jsPDF` drawing calls between markdown renders.
 *
 * Every option from {@link MarkdownToPdfOptions} — including
 * {@link MarkdownToPdfOptions.tableStyles tableStyles} for branded
 * tables, fonts, colours, and margins — is accepted by the constructor
 * and applies to every render call made through this instance.
 *
 * For the common case — "render this markdown string into a PDF" — use
 * {@link markdownToPdf}, which is just a thin wrapper over this class.
 *
 * @example
 * ```ts
 * const doc = new jsPDF();
 * const layout = new MarkdownLayout(doc);
 *
 * // Two columns of markdown side-by-side.
 * const left = layout.renderMarkdown(leftMd, { x: 15, y: 30, width: 85 });
 * const right = layout.renderMarkdown(rightMd, { x: 110, y: 30, width: 85 });
 *
 * // Continue full-width underneath the taller column.
 * layout.setCursor({ y: Math.max(left.endY, right.endY) + 10 });
 * layout.renderMarkdown(footerMd);
 *
 * // Page-number footer on every page.
 * const pages = doc.getNumberOfPages();
 * for (let p = 1; p <= pages; p++) {
 *   doc.setPage(p);
 *   layout.renderInline(`Page **${p}** of **${pages}**`, {
 *     x: 15,
 *     y: layout.pageHeight() - 12,
 *     maxWidth: layout.contentWidth(),
 *     align: 'right',
 *     fontSize: 9,
 *   });
 * }
 * ```
 */
export class MarkdownLayout {
  /** The underlying jsPDF document. */
  readonly doc: jsPDF;
  /** Fully resolved rendering options. */
  readonly options: Readonly<ResolvedOptions>;

  private cursorX: number;
  private cursorY: number;

  constructor(doc: jsPDF, options?: MarkdownToPdfOptions) {
    this.doc = doc;
    this.options = resolveOptions(options);
    this.cursorX = this.options.marginLeft;
    this.cursorY = this.options.marginTop;
  }

  // -- Page geometry --------------------------------------------------------

  /** Width of the current page in mm. */
  pageWidth(): number {
    return this.doc.internal.pageSize.getWidth();
  }

  /** Height of the current page in mm. */
  pageHeight(): number {
    return this.doc.internal.pageSize.getHeight();
  }

  /** `pageWidth − marginLeft − marginRight` in mm. */
  contentWidth(): number {
    return this.pageWidth() - this.options.marginLeft - this.options.marginRight;
  }

  /** `pageHeight − marginTop − marginBottom` in mm. */
  contentHeight(): number {
    return this.pageHeight() - this.options.marginTop - this.options.marginBottom;
  }

  /**
   * Space remaining between the current cursor and the bottom margin, in mm.
   * Handy before calling {@link renderMarkdown} to decide whether to add a
   * page first.
   */
  remainingHeight(): number {
    return this.pageHeight() - this.options.marginBottom - this.cursorY;
  }

  // -- Cursor / page management --------------------------------------------

  /** Read the current cursor (page, x, y). */
  getCursor(): LayoutCursor {
    return {
      page: this.doc.getCurrentPageInfo().pageNumber,
      x: this.cursorX,
      y: this.cursorY,
    };
  }

  /**
   * Move the cursor and optionally switch to a different page. Any field
   * left `undefined` is kept unchanged.
   */
  setCursor(c: Partial<LayoutCursor>): this {
    if (c.page !== undefined) this.doc.setPage(c.page);
    if (c.x !== undefined) this.cursorX = c.x;
    if (c.y !== undefined) this.cursorY = c.y;
    return this;
  }

  /** Append a new page and reset the cursor to the top margin. */
  addPage(): this {
    this.doc.addPage();
    this.cursorX = this.options.marginLeft;
    this.cursorY = this.options.marginTop;
    return this;
  }

  /** Advance the cursor y by `mm` mm. */
  addSpace(mm: number): this {
    this.cursorY += mm;
    return this;
  }

  /**
   * Ensure at least `mm` mm of vertical space remain on the current page;
   * otherwise add a new page. Returns `true` if a page was added.
   */
  ensureSpace(mm: number): boolean {
    if (this.remainingHeight() < mm) {
      this.addPage();
      return true;
    }
    return false;
  }

  // -- Block rendering ------------------------------------------------------

  /**
   * Render a markdown string (block-level, multi-paragraph) into a region.
   * The region's (x, y, width) override margins for this call; subsequent
   * content wraps within `width` and breaks across pages as needed.
   */
  renderMarkdown(markdown: string, region?: LayoutRegion): BlockRenderResult {
    const x = region?.x ?? this.cursorX;
    const y = region?.y ?? this.cursorY;
    const width = region?.width ?? (this.pageWidth() - x - this.options.marginRight);

    if (region?.minHeight !== undefined && this.remainingHeight() < region.minHeight) {
      this.addPage();
    }

    const localOpts: ResolvedOptions = {
      ...this.options,
      marginLeft: x,
      marginRight: this.pageWidth() - x - width,
    };

    const startPage = this.doc.getCurrentPageInfo().pageNumber;
    const startY = y;

    let state: RenderState = {
      doc: this.doc,
      y,
      opts: localOpts,
      pageWidth: this.pageWidth(),
      contentWidth: width,
      listIndent: 0,
      textColor: [0, 0, 0],
    };

    this.doc.setFontSize(localOpts.fontSize);
    setFont(this.doc, localOpts.fontFamily, false, false);

    const tokens = lexer(markdown);
    for (const tok of tokens) {
      state = renderToken(state, tok);
    }

    const endPage = this.doc.getCurrentPageInfo().pageNumber;
    const endY = state.y;

    this.cursorX = x;
    this.cursorY = endY;

    const contentH = this.pageHeight() - this.options.marginTop - this.options.marginBottom;
    const pageCount = endPage - startPage + 1;
    const height =
      pageCount === 1
        ? Math.max(0, endY - startY)
        : (pageCount - 1) * contentH + Math.max(0, endY - this.options.marginTop) +
          Math.max(0, this.pageHeight() - this.options.marginBottom - startY);

    return { startPage, endPage, endY, pageCount, height };
  }

  /**
   * Measure a markdown block without drawing to the real document. Uses a
   * throwaway jsPDF with the same page dimensions.
   */
  measureMarkdown(markdown: string, width?: number): MeasureResult {
    const pw = this.pageWidth();
    const ph = this.pageHeight();
    const measureDoc = new jsPDF({ unit: 'mm', format: [pw, ph] });
    const measureLayout = new MarkdownLayout(measureDoc, this.options);
    const w = width ?? measureLayout.contentWidth();
    const r = measureLayout.renderMarkdown(markdown, {
      x: this.options.marginLeft,
      y: this.options.marginTop,
      width: w,
    });
    return { height: r.height, pageCount: r.pageCount, endY: r.endY };
  }

  // -- Inline rendering -----------------------------------------------------

  /**
   * Render a short markdown fragment (inline only — `**bold**`, `*italic*`,
   * `` `code` ``, `[links](…)`, `~~strike~~`, `<br>` ) as a single wrapped
   * text box anchored at (x, y). Returns measurements of what was drawn.
   */
  renderInline(markdown: string, opts: InlineRenderOptions): InlineRenderResult {
    const runs = inlineRunsFromMarkdown(markdown, this.options);
    const fontSize = opts.fontSize ?? this.options.fontSize;
    const align = opts.align ?? 'left';
    const color: RGB = opts.color ?? [0, 0, 0];

    const prevFontSize = this.doc.getFontSize();
    this.doc.setFontSize(fontSize);
    setFont(this.doc, this.options.fontFamily, !!opts.bold, !!opts.italic);

    const maxWidth =
      opts.maxWidth ?? Number.POSITIVE_INFINITY;
    const lines = layoutInlineRuns(
      this.doc,
      this.options,
      runs,
      maxWidth,
      !!opts.bold,
    );

    const lineHeightMm = ptToMm(fontSize) * this.options.lineHeight;
    const firstBaseline = opts.y + ptToMm(fontSize);
    const boxWidth = isFinite(maxWidth)
      ? maxWidth
      : Math.max(0, ...lines.map((l) => l.width));

    const endY = drawInlineLines(
      this.doc,
      this.options,
      lines,
      opts.x,
      firstBaseline,
      boxWidth,
      align,
      color,
      !!opts.bold,
    );

    this.doc.setFontSize(prevFontSize);

    const width = Math.max(0, ...lines.map((l) => l.width));
    const totalHeight = lines.length * lineHeightMm;
    return {
      endY,
      lastBaselineY: endY - lineHeightMm,
      lines: lines.length,
      width,
      height: totalHeight,
    };
  }

  /** Measure inline markdown without drawing it. */
  measureInline(
    markdown: string,
    opts?: { maxWidth?: number; fontSize?: number; bold?: boolean; italic?: boolean },
  ): { width: number; height: number; lines: number } {
    const runs = inlineRunsFromMarkdown(markdown, this.options);
    const fontSize = opts?.fontSize ?? this.options.fontSize;

    const prevFontSize = this.doc.getFontSize();
    this.doc.setFontSize(fontSize);
    setFont(this.doc, this.options.fontFamily, !!opts?.bold, !!opts?.italic);

    const maxWidth = opts?.maxWidth ?? Number.POSITIVE_INFINITY;
    const lines = layoutInlineRuns(
      this.doc,
      this.options,
      runs,
      maxWidth,
      !!opts?.bold,
    );

    setFont(this.doc, this.options.fontFamily, false, false);
    this.doc.setFontSize(prevFontSize);

    const lineHeightMm = ptToMm(fontSize) * this.options.lineHeight;
    const width = Math.max(0, ...lines.map((l) => l.width));
    return {
      width,
      height: lines.length * lineHeightMm,
      lines: lines.length,
    };
  }
}

/**
 * Parse a (possibly multi-paragraph) markdown snippet and flatten it down
 * to a list of inline runs, suitable for {@link renderInline}. Paragraph
 * breaks become newline runs so that `layoutInlineRuns` keeps them on
 * separate lines.
 */
function inlineRunsFromMarkdown(
  markdown: string,
  opts: ResolvedOptions,
): TextRun[] {
  const tokens = lexer(markdown);
  const inline: Token[] = [];
  let first = true;
  for (const t of tokens) {
    if (t.type === 'space') continue;
    if (!first) {
      inline.push({ type: 'text', raw: '\n', text: '\n' } as Tokens.Text);
    }
    first = false;
    if (t.type === 'paragraph') {
      const children = (t as Tokens.Paragraph).tokens;
      if (children) inline.push(...children);
    } else if (t.type === 'text') {
      const text = t as Tokens.Text;
      if (text.tokens) inline.push(...text.tokens);
      else inline.push(t);
    } else if (t.type === 'heading') {
      const h = t as Tokens.Heading;
      if (h.tokens) inline.push(...h.tokens);
    } else {
      inline.push(t);
    }
  }
  return collectRuns(
    inline,
    false,
    false,
    false,
    false,
    undefined,
    false,
    opts.showLinkUrls,
  );
}

// ---------------------------------------------------------------------------
// Convenience wrapper
// ---------------------------------------------------------------------------

/**
 * Parse a markdown string and render it into a jsPDF document, starting
 * at the top margin and flowing down. Internally a thin wrapper around
 * {@link MarkdownLayout}.
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
  const layout = new MarkdownLayout(doc, options);
  layout.renderMarkdown(markdown);
  return doc;
}

export default markdownToPdf;
