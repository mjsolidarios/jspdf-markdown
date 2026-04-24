# jspdf-markdown

Render any Markdown string directly into a
[jsPDF](https://github.com/parallax/jsPDF) document. Built on
[`marked`](https://github.com/markedjs/marked) for parsing and
[`jspdf-autotable`](https://github.com/simonbengtsson/jsPDF-AutoTable) for
tables.

One function call, no DOM, no headless browser — works in Node.js and in
the browser.

```ts
import { jsPDF } from 'jspdf';
import { markdownToPdf } from 'jspdf-markdown';

const doc = new jsPDF();
markdownToPdf(doc, '# Hello\n\nThis is **bold** text.');
doc.save('output.pdf');
```

---

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Quick start](#quick-start)
- [API reference](#api-reference)
  - [`markdownToPdf`](#markdowntopdfdoc-markdown-options)
  - [`MarkdownToPdfOptions`](#markdowntopdfoptions)
- [Supported Markdown](#supported-markdown)
  - [Headings](#headings)
  - [Paragraphs and inline formatting](#paragraphs-and-inline-formatting)
  - [Links](#links)
  - [Images](#images)
  - [Blockquotes](#blockquotes)
  - [Lists](#lists)
  - [Code](#code)
  - [Horizontal rules](#horizontal-rules)
  - [Tables](#tables)
- [Styling recipes](#styling-recipes)
- [Advanced usage](#advanced-usage)
  - [Appending to an existing document](#appending-to-an-existing-document)
  - [Custom page sizes and orientation](#custom-page-sizes-and-orientation)
  - [Using custom fonts](#using-custom-fonts)
- [Limitations](#limitations)
- [How it works](#how-it-works)
- [Development](#development)
- [Dependencies](#dependencies)
- [License](#license)

---

## Features

| Markdown element | Support |
| --- | --- |
| Headings (h1–h6) | ✅ proportional font sizes, underlined h1/h2 |
| Paragraphs with word wrap | ✅ |
| **Bold**, *italic*, ***bold-italic*** | ✅ |
| `Inline code` | ✅ monospace font |
| ~~Strikethrough~~ | ✅ |
| [Links](https://example.com) | ✅ coloured + underlined, optional URL suffix |
| Images | ✅ rendered as `[Image: alt]` placeholder |
| Fenced / indented code blocks | ✅ shaded background, left accent bar, page-break-aware |
| Blockquotes | ✅ indented, muted grey text, left border (multi-page aware) |
| Ordered / unordered lists | ✅ with arbitrary nesting |
| Tables (GFM pipe syntax) | ✅ column alignment, inline formatting inside cells, `<br>` line breaks |
| Merged-cell tables | ✅ via raw `<table>` with `colspan` / `rowspan` |
| Horizontal rules | ✅ |
| Page break handling | ✅ automatic, including mid-paragraph and mid-code-block |
| HTML entities (`&amp;`, `&quot;`, …) | ✅ decoded |

---

## Installation

```bash
npm install jspdf-markdown jspdf jspdf-autotable
```

`jspdf` and `jspdf-autotable` are peer-compatible dependencies; install them
explicitly so you control their versions.

---

## Quick start

### Node.js

```ts
import { writeFileSync } from 'fs';
import { jsPDF } from 'jspdf';
import { markdownToPdf } from 'jspdf-markdown';

const doc = new jsPDF({ unit: 'mm', format: 'a4' });

markdownToPdf(
  doc,
  `# Welcome

This library renders **Markdown** directly into a PDF using [jsPDF](https://github.com/parallax/jsPDF).

## Features

- Bold, *italic*, and \`inline code\`
- Ordered and unordered lists
- Tables via jspdf-autotable
- Blockquotes and horizontal rules

> "Simplicity is the ultimate sophistication." — Leonardo da Vinci

\`\`\`ts
const answer: number = 42;
console.log(\`The answer is \${answer}\`);
\`\`\`

| Name  | Role      |
|-------|-----------|
| Alice | Developer |
| Bob   | Designer  |
`,
);

writeFileSync('output.pdf', Buffer.from(doc.output('arraybuffer')));
```

### Browser

```ts
import { jsPDF } from 'jspdf';
import { markdownToPdf } from 'jspdf-markdown';

const doc = new jsPDF();
markdownToPdf(doc, markdownString);
doc.save('output.pdf'); // triggers a download
```

---

## API reference

### `markdownToPdf(doc, markdown, options?)`

```ts
function markdownToPdf(
  doc: jsPDF,
  markdown: string,
  options?: MarkdownToPdfOptions,
): jsPDF;
```

Parses `markdown` and renders it into the provided `jsPDF` instance,
starting at `marginTop` on the current page. Returns the same `doc` so
calls can be chained.

- The function **mutates** `doc` (adds pages, draws text, etc.). It does
  not create a new document.
- Rendering begins at `(marginLeft, marginTop)` on whatever page the
  cursor is currently on. You can therefore call `markdownToPdf` multiple
  times, or mix it with your own `doc.text()` / `doc.addImage()` calls.
- New pages are added automatically when content overflows the bottom
  margin, including mid-paragraph and mid-code-block.

### `MarkdownToPdfOptions`

Every option is optional. Colours are `[r, g, b]` triples in the 0–255
range.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `marginLeft` | `number` | `15` | Left page margin, mm. |
| `marginRight` | `number` | `15` | Right page margin, mm. |
| `marginTop` | `number` | `20` | Top page margin, mm. |
| `marginBottom` | `number` | `20` | Bottom page margin, mm. |
| `fontSize` | `number` | `11` | Body font size, pt. Headings are scaled from this. |
| `lineHeight` | `number` | `1.4` | Line-height multiplier. |
| `fontFamily` | `string` | `'helvetica'` | Body text font. Any font registered with jsPDF (including custom ones) works. |
| `codeFontFamily` | `string` | `'courier'` | Font for inline and block code. |
| `blockSpacing` | `number` | `4` | Vertical gap between blocks, mm. |
| `showLinkUrls` | `boolean` | `true` | If `true`, append `(href)` in body text after each link. Set to `false` for a cleaner look. |
| `headingColor` | `[r,g,b]` | `[0, 0, 0]` | Text colour for all headings. |
| `codeBackground` | `[r,g,b]` | `[245, 245, 245]` | Fill colour behind fenced code blocks. |
| `blockquoteColor` | `[r,g,b]` | `[200, 200, 200]` | Colour of the blockquote's left bar. |
| `hrColor` | `[r,g,b]` | `[180, 180, 180]` | Colour of horizontal rules. |
| `linkColor` | `[r,g,b]` | `[0, 0, 238]` | Colour of link text and its underline. |

Both a named export and a default export are provided:

```ts
import { markdownToPdf } from 'jspdf-markdown';
// or
import markdownToPdf from 'jspdf-markdown';

import type { MarkdownToPdfOptions } from 'jspdf-markdown';
```

---

## Supported Markdown

### Headings

```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
```

`h1` and `h2` render with an underline rule matching `headingColor`. All
six levels are scaled proportionally from `fontSize` (h1 is largest, h6
equals the body size). Whitespace above and below is tighter for smaller
headings so consecutive `h3`/`h4` blocks don't float apart.

### Paragraphs and inline formatting

```markdown
A paragraph with **bold**, *italic*, ***bold-italic***,
`inline code`, and ~~strikethrough~~ all mixed together.
```

Paragraphs are word-wrapped within `(pageWidth - marginLeft - marginRight)`
and break across pages automatically. Inline spans keep their correct
spacing around punctuation — `**bold**,` renders as `bold,` with no
phantom space.

### Links

```markdown
[Home page](https://example.com)

Visit <https://example.com> for more.
```

Links render in `linkColor` with an underline. When
`showLinkUrls: true` (the default), the URL is appended in parentheses:

> Home page (https://example.com)

Autolinks like `<https://example.com>` are not duplicated — the URL
already is the visible text.

### Images

```markdown
![Alt text](https://example.com/pic.png)
```

Images are rendered as an italicised placeholder: `[Image: Alt text]`.
Actual bitmap embedding is **not** performed — see
[Limitations](#limitations).

### Blockquotes

```markdown
> "Simplicity is the ultimate sophistication."
> — Leonardo da Vinci
>
> Multi-paragraph blockquotes work too, with **inline formatting**
> and [links](https://example.com).
```

Blockquotes render in a muted grey, indented, with a coloured left
border bar. The bar is correctly redrawn on each page when a blockquote
spans a page break.

### Lists

```markdown
- First item
- Second item with **bold** text
  - Nested child
  - Another child with `code`
    - Deeply nested
- Third item

1. Step one
2. Step two
   1. Sub-step A
   2. Sub-step B
3. Step three
```

- Unordered lists use `•` bullets.
- Ordered lists use decimal numbering and honour an explicit starting
  number (e.g. `3. First`).
- Nesting is supported to arbitrary depth.
- Inline formatting works inside list items.

### Code

Fenced and indented code blocks both render the same way — a shaded
rectangle the full content width with a grey left accent bar, using the
monospace font:

````markdown
```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```
````

Lines that exceed the content width are wrapped, and the block's
background continues correctly onto a new page if it overflows.

### Horizontal rules

```markdown
---
```

Draws a thin horizontal line in `hrColor`.

### Tables

GFM pipe tables are fully supported, including column alignment, rich
inline formatting inside cells, and `<br>` line breaks:

```markdown
| Name                         | Qty | Price  |
|:-----------------------------|:---:|-------:|
| **Apple**                    |  1  |  €1.20 |
| `banana`                     |  2  |  €0.80 |
| [kiwi](https://kiwi.example) |  3  | €12.99 |
| multi-line<br>cell           |  –  |      – |
```

- `|:---|` — left-aligned column.
- `|:---:|` — centered column.
- `|---:|` — right-aligned column.
- `|---|` — default (left).

All inline markdown works inside cells: `**bold**`, `*italic*`,
`` `code` ``, `~~strike~~`, `[links](…)`, combinations such as
`***bold-italic***`, and `<br>` hard line breaks.

#### Merged cells

GFM has no syntax for merged cells. For `colspan` / `rowspan`, write a
raw HTML table in the Markdown:

```html
<table>
  <tr>
    <th colspan="2">Merged header</th>
    <th>Plain</th>
  </tr>
  <tr>
    <td rowspan="2">Merged left</td>
    <td>B1</td>
    <td>C1</td>
  </tr>
  <tr>
    <td>B2</td>
    <td>C2</td>
  </tr>
</table>
```

Inside HTML table cells, `<br>` becomes a line break and HTML entities
(`&amp;`, `&quot;`, `&lt;`, `&gt;`, `&nbsp;`, …) are decoded. Other
inline HTML inside cells is stripped (use GFM pipe tables for inline
styling).

---

## Styling recipes

### Branded colour palette

```ts
markdownToPdf(doc, markdown, {
  headingColor: [0, 70, 127],      // navy
  linkColor: [0, 128, 0],          // green
  blockquoteColor: [255, 140, 0],  // orange bar
  codeBackground: [245, 245, 250],
  hrColor: [0, 70, 127],
});
```

### Tighter body text

```ts
markdownToPdf(doc, markdown, {
  fontSize: 10,
  lineHeight: 1.25,
  blockSpacing: 2,
  marginLeft: 20,
  marginRight: 20,
});
```

### Plain links (no URL suffix)

```ts
markdownToPdf(doc, markdown, { showLinkUrls: false });
```

---

## Advanced usage

### Appending to an existing document

Because `markdownToPdf` never creates a document and starts at the
current cursor position, you can freely mix it with manual jsPDF calls:

```ts
const doc = new jsPDF();

// 1. A cover page drawn manually.
doc.setFontSize(36);
doc.text('My Report', 20, 40);
doc.addPage();

// 2. Body from Markdown.
markdownToPdf(doc, markdownBody);

// 3. Headers / page numbers on every page.
const total = doc.getNumberOfPages();
for (let p = 1; p <= total; p++) {
  doc.setPage(p);
  doc.setFontSize(9);
  doc.text(`Page ${p} / ${total}`, 190, 287, { align: 'right' });
}

doc.save('report.pdf');
```

### Custom page sizes and orientation

Configure jsPDF as usual; `markdownToPdf` reads the page dimensions at
render time:

```ts
const doc = new jsPDF({ orientation: 'landscape', format: 'letter', unit: 'mm' });
markdownToPdf(doc, markdown);
```

### Using custom fonts

jsPDF's custom-font API works unchanged. Register the font, then pass
its family name via `fontFamily`:

```ts
import { jsPDF } from 'jspdf';
import { markdownToPdf } from 'jspdf-markdown';

const doc = new jsPDF();
doc.addFileToVFS('Inter-Regular.ttf', interRegularBase64);
doc.addFileToVFS('Inter-Bold.ttf', interBoldBase64);
doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');
doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');

markdownToPdf(doc, markdown, { fontFamily: 'Inter' });
```

To get **bold**, *italic*, and ***bold-italic*** rendering, register the
corresponding `bold`, `italic`, and `bolditalic` styles for your family.
If a style isn't registered, the library falls back to `normal`
gracefully (no error thrown).

---

## Limitations

Things jspdf-markdown intentionally does **not** do:

- **Image embedding.** `![alt](url)` renders an `[Image: alt]`
  placeholder; the image is not fetched or drawn. Fetching remote
  resources from a PDF library would be surprising and break offline use.
  Add images manually with `doc.addImage()` after rendering.
- **Syntax highlighting.** Fenced code blocks render in a single colour;
  the language tag is accepted but ignored.
- **Inline HTML styling.** Only `<br>` and a handful of HTML entities
  are interpreted. Tags such as `<b>`, `<span style="…">`, `<u>`, etc.
  inside paragraphs or table cells are stripped. Use Markdown syntax for
  styling.
- **Math / LaTeX.** `$...$` and `$$...$$` are not parsed.
- **Footnotes, task lists, definition lists.** Not part of the core
  GFM support currently.
- **Merged cells in pipe tables.** Markdown spec limitation — use a raw
  `<table>` block (supported).

---

## How it works

1. **Parsing.** `marked.lexer(markdown)` produces a token stream.
2. **Dispatch.** Each top-level token is routed to a dedicated renderer
   (`renderHeading`, `renderParagraph`, `renderTable`, …).
3. **Inline layout.** Inline tokens (`strong`, `em`, `codespan`, `link`,
   `del`, inline `<br>`, …) are flattened into a list of styled `TextRun`
   pieces, split into atomic word / space / newline fragments, and
   greedily flowed onto lines. Spaces are represented as positional
   gaps, not rendered glyphs, so adjacent styled runs don't pick up
   phantom spaces before punctuation.
4. **Tables.** Pipe tables go through `jspdf-autotable`. Cells with any
   inline styling are re-drawn by the library inside autoTable's
   `willDrawCell` / `didDrawCell` hooks so bold / italic / code / links
   are preserved. Raw `<table>` blocks are parsed separately and fed to
   `jspdf-autotable` as cell definitions with `colSpan` / `rowSpan`.
5. **Pagination.** A helper `ensureSpace(state, neededMm)` adds a new
   page whenever the cursor would cross the bottom margin. Long
   paragraphs and code blocks are checked on every line advance.

The whole library is a single ~1 000-line TypeScript file with no
external state.

---

## Development

```bash
# Install dependencies
npm install

# Type-check without emitting
npm run lint

# Build to dist/
npm run build

# Run the test suite (Jest + ts-jest)
npm test
```

The tests render real PDFs in memory and assert on the resulting
content stream (entity decoding, inline-run ordering, link URL
suffixes, table content, alignment, merged cells, …), not just
"did not throw".

---

## Dependencies

- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) — table rendering
- [marked](https://github.com/markedjs/marked) — Markdown parsing

---

## License

MIT
