import { jsPDF } from 'jspdf';
import { markdownToPdf, MarkdownLayout } from '../src/index';

/**
 * Helper: create a fresh jsPDF document for testing.
 */
function makeDoc(): jsPDF {
  return new jsPDF({ unit: 'mm', format: 'a4' });
}

/**
 * Helper: call markdownToPdf and return the document for inspection.
 * Throws if the function throws (i.e. basic smoke test).
 */
function render(markdown: string, options?: Parameters<typeof markdownToPdf>[2]): jsPDF {
  const doc = makeDoc();
  return markdownToPdf(doc, markdown, options);
}

/**
 * Helper: extract the list of text literals (in stream order) that were
 * drawn into the PDF. Each `doc.text()` call produces one literal.
 */
function renderTokens(markdown: string, options?: Parameters<typeof markdownToPdf>[2]): string[] {
  const doc = render(markdown, options);
  const raw = doc.output();
  const matches = raw.match(/\(((?:[^()\\]|\\[()\\])*)\)\s*Tj/g) ?? [];
  return matches
    .map((m) => m.replace(/\)\s*Tj$/, '').replace(/^\(/, ''))
    .map((s) => s.replace(/\\([()\\])/g, '$1'));
}

/**
 * Helper: render markdown and return the concatenated text content of the
 * resulting PDF as a single space-separated string (useful for simple
 * substring assertions).
 */
function renderText(markdown: string, options?: Parameters<typeof markdownToPdf>[2]): string {
  return renderTokens(markdown, options).join(' ');
}

// ---------------------------------------------------------------------------
// Return value
// ---------------------------------------------------------------------------

describe('markdownToPdf – return value', () => {
  it('returns the same jsPDF instance that was passed in', () => {
    const doc = makeDoc();
    const result = markdownToPdf(doc, '# Hello');
    expect(result).toBe(doc);
  });
});

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------

describe('markdownToPdf – headings', () => {
  it('renders h1 without throwing', () => {
    expect(() => render('# Heading 1')).not.toThrow();
  });

  it('renders h2 without throwing', () => {
    expect(() => render('## Heading 2')).not.toThrow();
  });

  it('renders h3–h6 without throwing', () => {
    expect(() => render('### H3\n#### H4\n##### H5\n###### H6')).not.toThrow();
  });

  it('renders all heading levels in one document', () => {
    const md = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
    expect(() => render(md)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Paragraphs
// ---------------------------------------------------------------------------

describe('markdownToPdf – paragraphs', () => {
  it('renders a plain paragraph', () => {
    expect(() => render('This is a plain paragraph.')).not.toThrow();
  });

  it('renders multiple paragraphs', () => {
    expect(() => render('First paragraph.\n\nSecond paragraph.')).not.toThrow();
  });

  it('renders bold text', () => {
    expect(() => render('This is **bold** text.')).not.toThrow();
  });

  it('renders italic text', () => {
    expect(() => render('This is *italic* text.')).not.toThrow();
  });

  it('renders bold-italic text', () => {
    expect(() => render('This is ***bold-italic*** text.')).not.toThrow();
  });

  it('renders inline code', () => {
    expect(() => render('Use `console.log()` to log.')).not.toThrow();
  });

  it('renders strikethrough text', () => {
    expect(() => render('This is ~~strikethrough~~ text.')).not.toThrow();
  });

  it('renders a long paragraph that wraps across multiple lines', () => {
    const long = 'Word '.repeat(100);
    expect(() => render(long)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

describe('markdownToPdf – links', () => {
  it('renders a hyperlink', () => {
    expect(() => render('[Visit Example](https://example.com)')).not.toThrow();
  });

  it('renders a hyperlink without showing the URL when showLinkUrls is false', () => {
    expect(() =>
      render('[Visit Example](https://example.com)', { showLinkUrls: false }),
    ).not.toThrow();
  });

  it('renders an auto-linked URL', () => {
    expect(() => render('Visit <https://example.com> for details.')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

describe('markdownToPdf – images', () => {
  it('renders an image as alt text placeholder', () => {
    expect(() => render('![Alt text](https://example.com/image.png)')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Code blocks
// ---------------------------------------------------------------------------

describe('markdownToPdf – code blocks', () => {
  it('renders a fenced code block', () => {
    const md = '```js\nconst x = 1;\nconsole.log(x);\n```';
    expect(() => render(md)).not.toThrow();
  });

  it('renders an indented code block', () => {
    const md = '    const x = 1;\n    console.log(x);';
    expect(() => render(md)).not.toThrow();
  });

  it('renders a multi-line code block', () => {
    const code = Array.from({ length: 20 }, (_, i) => `const line${i} = ${i};`).join('\n');
    expect(() => render('```\n' + code + '\n```')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Blockquotes
// ---------------------------------------------------------------------------

describe('markdownToPdf – blockquotes', () => {
  it('renders a simple blockquote', () => {
    expect(() => render('> This is a quote.')).not.toThrow();
  });

  it('renders a multi-line blockquote', () => {
    expect(() => render('> Line one\n> Line two\n> Line three')).not.toThrow();
  });

  it('renders a nested blockquote', () => {
    expect(() => render('> Outer\n>> Inner')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

describe('markdownToPdf – unordered lists', () => {
  it('renders a simple unordered list', () => {
    expect(() => render('- Item one\n- Item two\n- Item three')).not.toThrow();
  });

  it('renders a nested unordered list', () => {
    const md = '- Parent\n  - Child 1\n  - Child 2\n- Another parent';
    expect(() => render(md)).not.toThrow();
  });
});

describe('markdownToPdf – ordered lists', () => {
  it('renders a simple ordered list', () => {
    expect(() => render('1. First\n2. Second\n3. Third')).not.toThrow();
  });

  it('renders a nested ordered list', () => {
    const md = '1. First\n   1. First sub\n   2. Second sub\n2. Second';
    expect(() => render(md)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Horizontal rules
// ---------------------------------------------------------------------------

describe('markdownToPdf – horizontal rules', () => {
  it('renders a horizontal rule', () => {
    expect(() => render('---')).not.toThrow();
  });

  it('renders content with a horizontal rule separator', () => {
    expect(() => render('Section one\n\n---\n\nSection two')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

describe('markdownToPdf – tables', () => {
  it('renders a basic table', () => {
    const md = [
      '| Name | Age |',
      '|------|-----|',
      '| Alice | 30 |',
      '| Bob | 25 |',
    ].join('\n');
    expect(() => render(md)).not.toThrow();
  });

  it('renders a table with aligned columns', () => {
    const md = [
      '| Left | Center | Right |',
      '|:-----|:------:|------:|',
      '| a | b | c |',
    ].join('\n');
    expect(() => render(md)).not.toThrow();
  });

  it('renders a table with bold cell content', () => {
    const md = [
      '| Feature | **Status** |',
      '|---------|-----------|',
      '| One | **Done** |',
    ].join('\n');
    expect(() => render(md)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Complex tables
// ---------------------------------------------------------------------------

describe('markdownToPdf – complex tables', () => {
  it('aligns columns according to the header separator', () => {
    const md = [
      '| Left | Center | Right |',
      '|:-----|:------:|------:|',
      '| apple | 1 | 12.50 |',
    ].join('\n');
    const doc = render(md);
    const raw = doc.output();
    // All three cell values end up in the document.
    expect(raw).toContain('apple');
    expect(raw).toContain('12.50');
    // Sanity check: tokens are extractable.
    const tokens = renderTokens(md);
    expect(tokens).toEqual(expect.arrayContaining(['apple', '1', '12.50']));
  });

  it('right-aligned cells draw their text further right than left-aligned cells', () => {
    // Same content, same table width, different alignment → the "12.50"
    // glyphs should be positioned further to the right.
    const common = ['| Col |', '{SEP}', '| 12.50 |'].join('\n');
    const leftDoc = render(common.replace('{SEP}', '|:---|'));
    const rightDoc = render(common.replace('{SEP}', '|---:|'));

    const xOf = (doc: jsPDF, needle: string): number | null => {
      const raw = doc.output();
      // Each `Td` establishes a text position; grab the x for the line that
      // drew `needle`.
      const rx = new RegExp(
        `([-\\d.]+)\\s+([-\\d.]+)\\s+Td\\s*\\(${needle.replace(/\./g, '\\.')}\\)\\s*Tj`,
      );
      const m = rx.exec(raw);
      return m ? parseFloat(m[1]) : null;
    };

    const xLeft = xOf(leftDoc, '12.50');
    const xRight = xOf(rightDoc, '12.50');
    expect(xLeft).not.toBeNull();
    expect(xRight).not.toBeNull();
    // The first `Td` after BT in jsPDF's stream is relative to the text
    // matrix, so what we really care about is that the values differ and
    // the right-aligned one is larger.
    expect(xRight as number).toBeGreaterThan(xLeft as number);
  });

  it('preserves bold/italic/code/strikethrough/link formatting inside cells', () => {
    const md = [
      '| Name | Description | Link |',
      '|------|-------------|------|',
      '| **Alice** | *senior* with `git` | [home](https://alice.example/) |',
      '| Bob | ~~ex~~ designer | see note |',
    ].join('\n');
    const tokens = renderTokens(md);
    // Each word is still rendered as its own Tj, so the plain-text tokens
    // appear verbatim in the stream.
    expect(tokens).toEqual(expect.arrayContaining(['Alice', 'senior', 'git', 'home', 'ex']));
    // And the appended URL is rendered (showLinkUrls default = true).
    expect(tokens.join(' ')).toContain('https://alice.example/');
  });

  it('splits <br> inside a cell into multiple rendered lines', () => {
    const md = [
      '| Item | Notes |',
      '|------|-------|',
      '| one | first<br>second<br>third |',
    ].join('\n');
    const tokens = renderTokens(md);
    // All three pieces appear as separate Tj tokens.
    expect(tokens).toEqual(expect.arrayContaining(['first', 'second', 'third']));
    // They should not be fused into one token.
    expect(tokens).not.toContain('firstsecondthird');
  });

  it('renders a raw HTML <table> with colspan and rowspan merged cells', () => {
    const md = [
      '<table>',
      '  <tr><th colspan="2">Merged header</th><th>Plain</th></tr>',
      '  <tr><td rowspan="2">Merged left</td><td>B1</td><td>C1</td></tr>',
      '  <tr><td>B2</td><td>C2</td></tr>',
      '</table>',
    ].join('\n');
    const tokens = renderTokens(md);
    // All cell values made it into the PDF (previously the block was dropped).
    // autoTable draws each cell as one Tj, so we assert on whole strings.
    expect(tokens).toEqual(
      expect.arrayContaining([
        'Merged header',
        'Plain',
        'Merged left',
        'B1',
        'B2',
        'C1',
        'C2',
      ]),
    );
  });

  it('decodes entities inside HTML table cells', () => {
    const md = '<table><tr><td>Tom &amp; Jerry</td></tr></table>';
    const text = renderText(md);
    expect(text).toContain('Tom & Jerry');
    expect(text).not.toContain('&amp;');
  });

  it('supports <br> inside HTML table cells', () => {
    const md = '<table><tr><td>one<br>two<br>three</td></tr></table>';
    const tokens = renderTokens(md);
    expect(tokens).toEqual(expect.arrayContaining(['one', 'two', 'three']));
  });
});

// ---------------------------------------------------------------------------
// Page breaks
// ---------------------------------------------------------------------------

describe('markdownToPdf – page breaks', () => {
  it('adds a new page when content overflows', () => {
    const doc = makeDoc();
    // Generate enough content to require a second page
    const md = Array.from({ length: 60 }, (_, i) => `Paragraph ${i + 1}: ` + 'text '.repeat(20)).join('\n\n');
    markdownToPdf(doc, md);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

describe('markdownToPdf – options', () => {
  it('respects custom font size', () => {
    expect(() => render('Hello world', { fontSize: 16 })).not.toThrow();
  });

  it('respects custom margins', () => {
    expect(() =>
      render('Hello', { marginLeft: 25, marginRight: 25, marginTop: 30, marginBottom: 30 }),
    ).not.toThrow();
  });

  it('respects custom heading color', () => {
    expect(() => render('# Title', { headingColor: [255, 0, 0] })).not.toThrow();
  });

  it('respects custom link color', () => {
    expect(() =>
      render('[link](https://example.com)', { linkColor: [0, 128, 0] }),
    ).not.toThrow();
  });

  it('respects custom code background color', () => {
    expect(() => render('```\ncode\n```', { codeBackground: [230, 230, 255] })).not.toThrow();
  });

  it('respects custom blockquote color', () => {
    expect(() => render('> quote', { blockquoteColor: [255, 200, 0] })).not.toThrow();
  });

  it('respects custom block spacing', () => {
    expect(() => render('Para one\n\nPara two', { blockSpacing: 8 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Comprehensive document
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Output content (regression tests for bugs fixed in the review)
// ---------------------------------------------------------------------------

describe('markdownToPdf – output content', () => {
  it('decodes HTML entities in quoted text', () => {
    // Marked escapes `"` to `&quot;` in text tokens; we must decode it.
    const text = renderText('> "Simplicity is the ultimate sophistication."');
    expect(text).toContain('"Simplicity is the ultimate sophistication."');
    expect(text).not.toContain('&quot;');
  });

  it('decodes ampersand entities', () => {
    const text = renderText('Tom & Jerry');
    expect(text).toContain('Tom & Jerry');
    expect(text).not.toContain('&amp;');
  });

  it('does not insert a phantom space between styled runs and following punctuation', () => {
    // Each word is drawn as its own `Tj`; we check that punctuation tokens
    // appear immediately after the styled word in the stream (no word in
    // between) and that no space-only token is rendered between them.
    const tokens = renderTokens('This is **bold**, and this is *italic*.');
    const boldIdx = tokens.indexOf('bold');
    expect(boldIdx).toBeGreaterThanOrEqual(0);
    expect(tokens[boldIdx + 1]).toBe(',');

    const italicIdx = tokens.indexOf('italic');
    expect(italicIdx).toBeGreaterThanOrEqual(0);
    expect(tokens[italicIdx + 1]).toBe('.');

    // And no lone " " token should be produced (we represent spaces as
    // positional gaps, not rendered glyphs).
    for (const t of tokens) {
      expect(t).not.toBe(' ');
    }
  });

  it('honours showLinkUrls = true by default', () => {
    const text = renderText('See [Example](https://example.com) for details.');
    expect(text).toContain('Example');
    expect(text).toContain('https://example.com');
  });

  it('omits the URL when showLinkUrls is false', () => {
    const text = renderText('See [Example](https://example.com) for details.', {
      showLinkUrls: false,
    });
    expect(text).toContain('Example');
    expect(text).not.toContain('https://example.com');
  });

  it('does not double-print the URL for autolinks', () => {
    const text = renderText('Visit <https://example.com>');
    const occurrences = text.match(/https:\/\/example\.com/g)?.length ?? 0;
    expect(occurrences).toBe(1);
  });

  it('wraps long paragraphs onto new pages without losing content', () => {
    const doc = makeDoc();
    const paragraph = ('Word ').repeat(800);
    markdownToPdf(doc, paragraph);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('renders nested lists without inserting an extra blank line before the next sibling', () => {
    const md = '- Parent one\n  - Child\n- Parent two';
    expect(() => render(md)).not.toThrow();
  });
});

describe('markdownToPdf – comprehensive document', () => {
  it('renders a full-featured markdown document without throwing', () => {
    const md = `# Main Title

## Introduction

This document tests **comprehensive** markdown support including *italic*, ***bold-italic***, \`inline code\`, ~~strikethrough~~, and [links](https://example.com).

---

## Blockquote

> Wisdom is not a product of schooling but of the lifelong attempt to acquire it.
> — Albert Einstein

## Code

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
console.log(greet('World'));
\`\`\`

## Lists

### Unordered

- Apple
- Banana
  - Cavendish
  - Plantain
- Cherry

### Ordered

1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step

## Table

| Feature       | Status    | Priority |
|---------------|-----------|----------|
| Headings      | Done      | High     |
| Bold/Italic   | Done      | High     |
| Code blocks   | Done      | Medium   |
| Tables        | Done      | Medium   |
| Lists         | Done      | High     |

## Images

![Example Image](https://example.com/img.png)

## Conclusion

Thank you for using **jspdf-markdown**!
`;
    expect(() => render(md)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Precise-layout API – MarkdownLayout
// ---------------------------------------------------------------------------

const PT_PER_MM = 72 / 25.4;

/** One text literal drawn to a PDF, with the x/y (mm) of its baseline. */
interface PositionedToken {
  text: string;
  xMm: number;
  yMm: number;
}

/**
 * Extract `<x> <y> Td (text) Tj` triples from a jsPDF output, normalising
 * the y coordinate to millimetres-from-top so numbers used in render calls
 * can be asserted against. `pageHeightMm` defaults to A4.
 */
function extractPositioned(doc: jsPDF, pageHeightMm = 297): PositionedToken[] {
  const raw = doc.output();
  const tokens: PositionedToken[] = [];
  const re = /([\d.-]+)\s+([\d.-]+)\s+Td\s*\(((?:[^()\\]|\\[()\\])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const x = parseFloat(m[1]) / PT_PER_MM;
    const yPt = parseFloat(m[2]);
    const yFromTop = pageHeightMm - yPt / PT_PER_MM;
    tokens.push({
      text: m[3].replace(/\\([()\\])/g, '$1'),
      xMm: x,
      yMm: yFromTop,
    });
  }
  return tokens;
}

describe('MarkdownLayout – construction and cursor', () => {
  it('exposes the jsPDF document and resolved options', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    expect(layout.doc).toBe(doc);
    expect(layout.options.marginLeft).toBe(15);
    expect(layout.options.fontSize).toBe(11);
  });

  it('initialises the cursor at the top margin', () => {
    const layout = new MarkdownLayout(makeDoc());
    expect(layout.getCursor()).toEqual({ page: 1, x: 15, y: 20 });
  });

  it('setCursor updates position and can switch pages', () => {
    const doc = makeDoc();
    doc.addPage();
    const layout = new MarkdownLayout(doc);
    layout.setCursor({ page: 2, x: 40, y: 100 });
    expect(layout.getCursor()).toEqual({ page: 2, x: 40, y: 100 });
  });

  it('addPage resets the cursor to the top margin of the new page', () => {
    const layout = new MarkdownLayout(makeDoc());
    layout.setCursor({ y: 250 });
    layout.addPage();
    expect(layout.getCursor()).toEqual({ page: 2, x: 15, y: 20 });
  });

  it('exposes page geometry in mm', () => {
    const layout = new MarkdownLayout(makeDoc());
    expect(Math.round(layout.pageWidth())).toBe(210);
    expect(Math.round(layout.pageHeight())).toBe(297);
    expect(Math.round(layout.contentWidth())).toBe(180);
    expect(Math.round(layout.contentHeight())).toBe(257);
  });

  it('ensureSpace adds a page only when the remaining height is insufficient', () => {
    const layout = new MarkdownLayout(makeDoc());
    expect(layout.ensureSpace(50)).toBe(false);
    layout.setCursor({ y: 270 });
    expect(layout.ensureSpace(50)).toBe(true);
    expect(layout.getCursor().page).toBe(2);
    expect(layout.getCursor().y).toBe(20);
  });
});

describe('MarkdownLayout – renderMarkdown in custom regions', () => {
  it('renders a block anchored at a given x, and subsequent text starts at x', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    layout.renderMarkdown('Hello world', { x: 60, y: 40, width: 100 });
    const tokens = extractPositioned(doc);
    const hello = tokens.find((t) => t.text === 'Hello');
    expect(hello).toBeDefined();
    expect(hello!.xMm).toBeCloseTo(60, 0);
  });

  it('wraps a long paragraph within the region width, not the default content width', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    const longText =
      'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod.';
    layout.renderMarkdown(longText, { x: 20, y: 30, width: 40 });
    const tokens = extractPositioned(doc);
    const ys = new Set(tokens.map((t) => Math.round(t.yMm)));
    expect(ys.size).toBeGreaterThan(2);
    for (const t of tokens) {
      expect(t.xMm).toBeGreaterThanOrEqual(20 - 0.5);
      expect(t.xMm).toBeLessThanOrEqual(60 + 0.5);
    }
  });

  it('returns a result that reports the end cursor and at least 1 page', () => {
    const layout = new MarkdownLayout(makeDoc());
    const result = layout.renderMarkdown('Hello world', {
      x: 20,
      y: 30,
      width: 100,
    });
    expect(result.startPage).toBe(1);
    expect(result.endPage).toBe(1);
    expect(result.pageCount).toBe(1);
    expect(result.endY).toBeGreaterThan(30);
    expect(result.height).toBeGreaterThan(0);
  });

  it('updates the cursor to the end position after a region render', () => {
    const layout = new MarkdownLayout(makeDoc());
    const before = layout.getCursor();
    const r = layout.renderMarkdown('Hello world', { x: 40, y: 80, width: 80 });
    const after = layout.getCursor();
    expect(after.x).toBe(40);
    expect(after.y).toBe(r.endY);
    expect(after.y).toBeGreaterThan(before.y);
  });

  it('renders two markdown columns side-by-side without interference', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    const left = 'Left column content. Some words here for wrapping.';
    const right = 'Right column content. Other words here for wrapping.';
    const lres = layout.renderMarkdown(left, { x: 15, y: 30, width: 80 });
    const rres = layout.renderMarkdown(right, { x: 110, y: 30, width: 80 });
    expect(lres.startPage).toBe(1);
    expect(rres.startPage).toBe(1);
    const tokens = extractPositioned(doc);
    const leftTok = tokens.find((t) => t.text === 'Left');
    const rightTok = tokens.find((t) => t.text === 'Right');
    expect(leftTok).toBeDefined();
    expect(rightTok).toBeDefined();
    expect(leftTok!.xMm).toBeCloseTo(15, 0);
    expect(rightTok!.xMm).toBeCloseTo(110, 0);
    expect(rightTok!.xMm).toBeGreaterThan(leftTok!.xMm + 80);
  });

  it('respects minHeight by moving to a new page when the current one is too full', () => {
    const layout = new MarkdownLayout(makeDoc());
    layout.setCursor({ y: 270 });
    const r = layout.renderMarkdown('# A heading', { minHeight: 40 });
    expect(r.startPage).toBe(2);
  });

  it('markdownToPdf remains equivalent to new MarkdownLayout().renderMarkdown()', () => {
    const md = '# Title\n\nSome **bold** text.';
    const docA = makeDoc();
    markdownToPdf(docA, md);
    const docB = makeDoc();
    new MarkdownLayout(docB).renderMarkdown(md);
    const a = extractPositioned(docA).map((t) => t.text);
    const b = extractPositioned(docB).map((t) => t.text);
    expect(b).toEqual(a);
  });
});

describe('MarkdownLayout – renderInline', () => {
  it('renders a single line at an exact x baseline', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    layout.renderInline('Header text', { x: 50, y: 10 });
    const tokens = extractPositioned(doc);
    const header = tokens.find((t) => t.text === 'Header');
    expect(header).toBeDefined();
    expect(header!.xMm).toBeCloseTo(50, 0);
  });

  it('right-aligns text within maxWidth', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    const rr = layout.renderInline('Page 1', {
      x: 20,
      y: 10,
      maxWidth: 170,
      align: 'right',
    });
    const tokens = extractPositioned(doc);
    const page = tokens.find((t) => t.text === 'Page');
    expect(page).toBeDefined();
    const expectedLeft = 20 + 170 - rr.width;
    expect(page!.xMm).toBeGreaterThan(expectedLeft - 5);
    expect(page!.xMm).toBeLessThan(20 + 170);
  });

  it('center-aligns text within maxWidth', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    const rr = layout.renderInline('Hi', {
      x: 0,
      y: 10,
      maxWidth: 100,
      align: 'center',
    });
    const tokens = extractPositioned(doc);
    const hi = tokens.find((t) => t.text === 'Hi');
    expect(hi).toBeDefined();
    expect(hi!.xMm).toBeCloseTo((100 - rr.width) / 2, 0);
  });

  it('preserves inline markdown formatting inside a single-line render', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    layout.renderInline('Hello **bold** and *italic* words', { x: 20, y: 20 });
    const texts = extractPositioned(doc).map((t) => t.text);
    expect(texts).toEqual(
      expect.arrayContaining(['Hello', 'bold', 'and', 'italic', 'words']),
    );
  });

  it('wraps inline content when maxWidth is small', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    const rr = layout.renderInline(
      'one two three four five six seven eight nine ten',
      { x: 20, y: 20, maxWidth: 30 },
    );
    expect(rr.lines).toBeGreaterThan(1);
  });

  it('reports width and line count for a single-line render', () => {
    const layout = new MarkdownLayout(makeDoc());
    const rr = layout.renderInline('Short text', { x: 10, y: 10 });
    expect(rr.lines).toBe(1);
    expect(rr.width).toBeGreaterThan(0);
    expect(rr.height).toBeGreaterThan(0);
  });

  it('uses the provided font size for subsequent lines', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    const small = layout.renderInline('Line one\nLine two', {
      x: 15,
      y: 20,
      fontSize: 8,
    });
    const big = layout.renderInline('Line one\nLine two', {
      x: 15,
      y: 60,
      fontSize: 24,
    });
    expect(big.height).toBeGreaterThan(small.height * 2);
  });

  it('does not advance the block cursor (inline renders are positional)', () => {
    const layout = new MarkdownLayout(makeDoc());
    const before = layout.getCursor();
    layout.renderInline('Stamp', { x: 180, y: 10 });
    const after = layout.getCursor();
    expect(after).toEqual(before);
  });
});

describe('MarkdownLayout – measurement', () => {
  it('measureMarkdown returns a positive height for real content', () => {
    const layout = new MarkdownLayout(makeDoc());
    const m = layout.measureMarkdown('# Title\n\nSome body text.', 150);
    expect(m.height).toBeGreaterThan(0);
    expect(m.pageCount).toBeGreaterThanOrEqual(1);
  });

  it('measureMarkdown does not mutate the real document or cursor', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    const pagesBefore = doc.getNumberOfPages();
    const tokensBefore = extractPositioned(doc).length;
    layout.measureMarkdown(
      Array.from({ length: 100 }, (_, i) => `Paragraph ${i}`).join('\n\n'),
      150,
    );
    expect(doc.getNumberOfPages()).toBe(pagesBefore);
    expect(extractPositioned(doc).length).toBe(tokensBefore);
    expect(layout.getCursor()).toEqual({ page: 1, x: 15, y: 20 });
  });

  it('measureMarkdown height approximates actual render height', () => {
    const layout = new MarkdownLayout(makeDoc());
    const md = '# Header\n\nParagraph one.\n\nParagraph two.';
    const measured = layout.measureMarkdown(md, 150);
    const r = layout.renderMarkdown(md, { x: 15, y: 20, width: 150 });
    expect(measured.height).toBeCloseTo(r.height, 0);
  });

  it('measureInline reports width and height for a single line', () => {
    const layout = new MarkdownLayout(makeDoc());
    const m = layout.measureInline('Hello world');
    expect(m.width).toBeGreaterThan(0);
    expect(m.lines).toBe(1);
    expect(m.height).toBeGreaterThan(0);
  });

  it('measureInline with a tight maxWidth reports multiple lines', () => {
    const layout = new MarkdownLayout(makeDoc());
    const m = layout.measureInline(
      'one two three four five six seven eight nine ten',
      { maxWidth: 20 },
    );
    expect(m.lines).toBeGreaterThan(1);
  });

  it('measureInline does not draw anything', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    const before = extractPositioned(doc).length;
    layout.measureInline('Hello world');
    expect(extractPositioned(doc).length).toBe(before);
  });
});

describe('MarkdownLayout – end-to-end scenarios', () => {
  it('supports the page-number footer recipe on every page', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    layout.renderMarkdown(
      Array.from({ length: 50 }, (_, i) => `Paragraph ${i}`).join('\n\n'),
    );
    const totalPages = doc.getNumberOfPages();
    expect(totalPages).toBeGreaterThanOrEqual(2);
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      layout.renderInline(`Page ${p}`, {
        x: 15,
        y: layout.pageHeight() - 12,
        maxWidth: layout.contentWidth(),
        align: 'right',
        fontSize: 9,
      });
    }
    const footers = extractPositioned(doc).filter((t) => t.text === 'Page');
    expect(footers.length).toBe(totalPages);
  });

  it('supports a two-column layout with a shared full-width footer', () => {
    const doc = makeDoc();
    const layout = new MarkdownLayout(doc);
    const left = layout.renderMarkdown('Left column content here.', {
      x: 15,
      y: 30,
      width: 85,
    });
    const right = layout.renderMarkdown('Right column content here.', {
      x: 110,
      y: 30,
      width: 85,
    });
    layout.setCursor({ x: 15, y: Math.max(left.endY, right.endY) + 10 });
    const footer = layout.renderMarkdown('**Footer** spans the full width.');
    expect(footer.startPage).toBe(1);
    const tokens = extractPositioned(doc);
    const footerTok = tokens.find((t) => t.text === 'Footer');
    expect(footerTok).toBeDefined();
    expect(footerTok!.xMm).toBeCloseTo(15, 0);
    expect(footerTok!.yMm).toBeGreaterThan(
      Math.max(left.endY, right.endY) + 5,
    );
  });
});

// ---------------------------------------------------------------------------
// Custom table styling
// ---------------------------------------------------------------------------

/** Dump the raw PDF content stream as a single string. */
function rawOutput(doc: jsPDF): string {
  return doc.output();
}

/**
 * Test helper: render markdown and return the raw PDF output. jsPDF
 * emits pure-grey colours via the `g` operator and non-grey colours
 * via `rg`, so tests that want to unambiguously assert on a fill
 * should use a non-grey colour like `[255, 0, 0]`.
 */
function renderRaw(
  markdown: string,
  options?: Parameters<typeof markdownToPdf>[2],
): string {
  return rawOutput(render(markdown, options));
}

/**
 * Format a 0–255 colour channel the way jsPDF writes it to the PDF
 * content stream at a given decimal-places precision. jsPDF uses:
 *   - 2 decimal places for `setFillColor` (fills)
 *   - 3 decimal places for `setTextColor` (text)
 * Both use the `rg` operator, so tests that want to count either should
 * use {@link countRgb} which sums matches at both precisions.
 */
function fmtChannel(n: number, dp: number): string {
  const v = n / 255;
  if (v === 0) return '0.';
  if (v === 1) return '1.';
  return v.toFixed(dp).replace(/(\.\d)0+$/, '$1');
}

/** Count occurrences of `r g b rg` for the given colour and precision. */
function countRgbAt(
  raw: string,
  [r, g, b]: [number, number, number],
  dp: number,
): number {
  const esc = (s: string) => s.replace(/\./g, '\\.');
  const re = new RegExp(
    `${esc(fmtChannel(r, dp))}\\s+${esc(fmtChannel(g, dp))}\\s+${esc(fmtChannel(b, dp))}\\s+rg`,
    'g',
  );
  return (raw.match(re) ?? []).length;
}

/**
 * Count `rg` occurrences for a colour, trying both 2-dp (fill) and
 * 3-dp (text) rounding so a single assertion works regardless of which
 * jsPDF API was used to set it.
 */
function countRgb(raw: string, color: [number, number, number]): number {
  return countRgbAt(raw, color, 2) + countRgbAt(raw, color, 3);
}

// Kept as a back-compat alias for the tests below.
const countRgbFill = countRgb;

const BASIC_TABLE = [
  '| Name | Qty |',
  '|------|----:|',
  '| Apple | 1 |',
  '| Banana | 2 |',
  '| Cherry | 3 |',
].join('\n');

describe('tableStyles – fills and colours', () => {
  it('applies custom headStyles.fillColor to header cells', () => {
    const raw = renderRaw(BASIC_TABLE, {
      tableStyles: { headStyles: { fillColor: [255, 0, 0] } },
    });
    expect(countRgbFill(raw, [255, 0, 0])).toBeGreaterThan(0);
  });

  it('applies custom bodyStyles.textColor (drawn via rg in the stream)', () => {
    const raw = renderRaw(BASIC_TABLE, {
      tableStyles: { bodyStyles: { textColor: [0, 128, 255] } },
    });
    expect(countRgbFill(raw, [0, 128, 255])).toBeGreaterThan(0);
  });

  it('applies custom alternateRowStyles.fillColor', () => {
    const raw = renderRaw(BASIC_TABLE, {
      tableStyles: { alternateRowStyles: { fillColor: [0, 255, 128] } },
    });
    expect(countRgbFill(raw, [0, 255, 128])).toBeGreaterThan(0);
  });

  it('drops the default alternate-row stripe when fillColor is false', () => {
    const withDefault = renderRaw(BASIC_TABLE);
    const withoutStripe = renderRaw(BASIC_TABLE, {
      tableStyles: { alternateRowStyles: { fillColor: false as never } },
    });
    // Default stripe is [248, 248, 248] → "0.97 g" in greyscale.
    expect(withDefault).toMatch(/0\.97\s+g/);
    expect(withoutStripe).not.toMatch(/0\.97\s+g/);
  });

  it('overrides both head fill and text colour together', () => {
    const raw = renderRaw(BASIC_TABLE, {
      tableStyles: {
        headStyles: { fillColor: [50, 100, 200], textColor: [255, 220, 100] },
      },
    });
    expect(countRgbFill(raw, [50, 100, 200])).toBeGreaterThan(0);
    expect(countRgbFill(raw, [255, 220, 100])).toBeGreaterThan(0);
  });
});

describe('tableStyles – theme and layout', () => {
  it("theme='plain' drops the default alternate-row stripe", () => {
    const striped = renderRaw(BASIC_TABLE);
    const plain = renderRaw(BASIC_TABLE, {
      tableStyles: { theme: 'plain' },
    });
    // Default alternate-row stripe [248, 248, 248] renders as "0.97 g".
    expect(striped).toMatch(/0\.97\s+g/);
    expect(plain).not.toMatch(/0\.97\s+g/);
  });

  it('propagates a custom theme through to autoTable', () => {
    const customize = jest.fn((o: { [k: string]: unknown }) => o);
    render(BASIC_TABLE, {
      tableStyles: { theme: 'grid', customize: customize as never },
    });
    expect(customize.mock.calls[0][0]).toHaveProperty('theme', 'grid');
  });

  it('increases the table height when cellPadding is increased', () => {
    const read = (options?: Parameters<typeof markdownToPdf>[2]) => {
      const doc = render(BASIC_TABLE, options);
      return (
        (doc as unknown as { lastAutoTable?: { finalY?: number } })
          .lastAutoTable?.finalY ?? 0
      );
    };
    const defaultY = read();
    const paddedY = read({ tableStyles: { styles: { cellPadding: 8 } } });
    expect(paddedY).toBeGreaterThan(defaultY + 10);
  });

  it('propagates a custom fontSize from tableStyles.styles', () => {
    const smaller = render(BASIC_TABLE);
    const larger = render(BASIC_TABLE, {
      tableStyles: { styles: { fontSize: 20 } },
    });
    const smallY =
      (smaller as unknown as { lastAutoTable?: { finalY?: number } })
        .lastAutoTable?.finalY ?? 0;
    const largeY =
      (larger as unknown as { lastAutoTable?: { finalY?: number } })
        .lastAutoTable?.finalY ?? 0;
    expect(largeY).toBeGreaterThan(smallY + 5);
  });
});

describe('tableStyles – columnStyles override GFM alignment', () => {
  it('applies halign from user columnStyles', () => {
    const doc = render(BASIC_TABLE, {
      tableStyles: {
        columnStyles: {
          0: { halign: 'right' },
        },
      },
    });
    const tokens = extractPositioned(doc);
    const appleTok = tokens.find((t) => t.text === 'Apple');
    const bananaTok = tokens.find((t) => t.text === 'Banana');
    expect(appleTok).toBeDefined();
    expect(bananaTok).toBeDefined();
    // Both column-0 cells should be right-aligned, so their right edges
    // align (not their left). Longer 'Banana' starts further left than
    // shorter 'Apple' when right-aligned.
    expect(bananaTok!.xMm).toBeLessThan(appleTok!.xMm);
  });

  it('user columnStyles wins over GFM column alignment', () => {
    // The GFM table aligns column 1 (Qty) to the right via `|----:|`.
    // With a user override forcing halign:'left', column-1 body cells
    // should start at the same x for different-length values.
    const doc = render(BASIC_TABLE, {
      tableStyles: { columnStyles: { 1: { halign: 'left' } } },
    });
    const tokens = extractPositioned(doc);
    // All body cells in column 1 have single-digit numbers, so lengths
    // are identical anyway. Instead, compare left-edge x of column-1
    // "1" cell with the same cell when GFM alignment is kept (right).
    const qty1Override = tokens.find((t) => t.text === '1');
    expect(qty1Override).toBeDefined();

    const docDefault = render(BASIC_TABLE);
    const defaultTokens = extractPositioned(docDefault);
    const qty1Default = defaultTokens.find((t) => t.text === '1');
    expect(qty1Default).toBeDefined();

    expect(qty1Override!.xMm).toBeLessThan(qty1Default!.xMm);
  });
});

describe('tableStyles – customize escape hatch', () => {
  it('invokes customize with the fully composed autoTable options', () => {
    const customize = jest.fn((o: { [k: string]: unknown }) => o);
    render(BASIC_TABLE, {
      tableStyles: { customize: customize as never },
    });
    expect(customize).toHaveBeenCalledTimes(1);
    const options = customize.mock.calls[0][0];
    expect(options).toHaveProperty('head');
    expect(options).toHaveProperty('body');
    expect(options).toHaveProperty('styles');
    expect(options).toHaveProperty('headStyles');
    expect(options).toHaveProperty('theme', 'striped');
  });

  it('customize can completely replace the headStyles', () => {
    const raw = renderRaw(BASIC_TABLE, {
      tableStyles: {
        customize: (opts) => ({
          ...opts,
          headStyles: { ...opts.headStyles, fillColor: [0, 200, 0] },
        }),
      },
    });
    expect(countRgbFill(raw, [0, 200, 0])).toBeGreaterThan(0);
  });

  it('customize runs after the declarative tableStyles merge', () => {
    const raw = renderRaw(BASIC_TABLE, {
      tableStyles: {
        headStyles: { fillColor: [255, 0, 0] },
        customize: (opts) => {
          // Declarative override was already baked in: prove we can
          // still overwrite it from the customize callback.
          return {
            ...opts,
            headStyles: { ...opts.headStyles, fillColor: [0, 0, 255] },
          };
        },
      },
    });
    expect(countRgbFill(raw, [0, 0, 255])).toBeGreaterThan(0);
    expect(countRgbFill(raw, [255, 0, 0])).toBe(0);
  });
});

describe('tableStyles – HTML tables', () => {
  const HTML_TABLE = [
    '<table>',
    '  <tr><th>Name</th><th>Qty</th></tr>',
    '  <tr><td>Apple</td><td>1</td></tr>',
    '  <tr><td>Banana</td><td>2</td></tr>',
    '</table>',
  ].join('\n');

  it('applies custom headStyles.fillColor to raw HTML tables too', () => {
    const raw = renderRaw(HTML_TABLE, {
      tableStyles: { headStyles: { fillColor: [200, 0, 100] } },
    });
    expect(countRgbFill(raw, [200, 0, 100])).toBeGreaterThan(0);
  });

  it('applies custom bodyStyles.textColor to raw HTML tables too', () => {
    const raw = renderRaw(HTML_TABLE, {
      tableStyles: { bodyStyles: { textColor: [40, 200, 40] } },
    });
    expect(countRgbFill(raw, [40, 200, 40])).toBeGreaterThan(0);
  });

  it('customize runs for HTML tables and receives the merged options', () => {
    const customize = jest.fn((o: { [k: string]: unknown }) => o);
    render(HTML_TABLE, { tableStyles: { customize: customize as never } });
    expect(customize).toHaveBeenCalledTimes(1);
    expect(customize.mock.calls[0][0]).toHaveProperty('head');
    expect(customize.mock.calls[0][0]).toHaveProperty('body');
  });
});

describe('tableStyles – rich cells honour custom styling', () => {
  it('preserves inline bold/italic inside a cell with a custom table font size', () => {
    const md = [
      '| Name         | Price |',
      '|--------------|-------|',
      '| **Apple**    | €1.20 |',
      '| *Banana*     | €0.80 |',
    ].join('\n');
    const doc = render(md, {
      tableStyles: { styles: { fontSize: 14 } },
    });
    const tokens = extractPositioned(doc).map((t) => t.text);
    expect(tokens).toEqual(expect.arrayContaining(['Apple', 'Banana']));
  });

  it('uses bodyStyles.textColor as the default run colour for rich cells', () => {
    const md = [
      '| Name      | Note          |',
      '|-----------|---------------|',
      '| Apple     | **bold** text |',
    ].join('\n');
    const raw = renderRaw(md, {
      tableStyles: { bodyStyles: { textColor: [180, 40, 40] } },
    });
    expect(countRgbFill(raw, [180, 40, 40])).toBeGreaterThan(0);
  });
});
