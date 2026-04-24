import { jsPDF } from 'jspdf';
import { markdownToPdf } from '../src/index';

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
