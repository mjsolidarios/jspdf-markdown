# jspdf-markdown

Render any Markdown string directly into a
[jsPDF](https://github.com/parallax/jsPDF) document. Built on
[`marked`](https://github.com/markedjs/marked) for parsing and
[`jspdf-autotable`](https://github.com/simonbengtsson/jsPDF-AutoTable) for
tables.

One function call, no DOM, no headless browser — works in Node.js and in
the browser. And when you need more than "a Markdown string in, a PDF
out", the same engine is exposed as a precise-layout API:
`MarkdownLayout` lets you render markdown into arbitrary regions (two
columns, call-out boxes, footers), measure content before drawing it,
and draw single lines of inline markdown anywhere on the page with
left / center / right alignment.

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
- [Precise-layout API — `MarkdownLayout`](#precise-layout-api--markdownlayout)
  - [When to use it](#when-to-use-it)
  - [Constructor and cursor](#constructor-and-cursor)
  - [`renderMarkdown` — block rendering in a region](#rendermarkdown--block-rendering-in-a-region)
  - [`renderInline` — positional, aligned inline markdown](#renderinline--positional-aligned-inline-markdown)
  - [`measureMarkdown` / `measureInline`](#measuremarkdown--measureinline)
  - [Recipes](#recipes)
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
- [Custom table styling](#custom-table-styling)
  - [`TableStyles` reference](#tablestyles-reference)
  - [Table recipes](#table-recipes)
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
| Custom table styling | ✅ fills, text colours, borders, padding, fonts, themes, per-column overrides + escape hatch ([`tableStyles`](#custom-table-styling)) |
| Horizontal rules | ✅ |
| Page break handling | ✅ automatic, including mid-paragraph and mid-code-block |
| HTML entities (`&amp;`, `&quot;`, …) | ✅ decoded |

### Layout features

| Layout feature | Support |
| --- | --- |
| Render a markdown string at any `(x, y, width)` region | ✅ `MarkdownLayout.renderMarkdown` |
| Render a single line of inline markdown with left/center/right alignment | ✅ `MarkdownLayout.renderInline` |
| Measure markdown height/width without drawing | ✅ `MarkdownLayout.measureMarkdown` / `measureInline` |
| Two-column (or N-column) layouts | ✅ independent region renders |
| Header / footer on every page | ✅ `renderInline` + `doc.setPage()` |
| Move / read the block cursor | ✅ `getCursor` / `setCursor` / `addSpace` / `addPage` |
| Page-break guard (`minHeight`) | ✅ avoid orphan headings at page bottom |

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

### With custom table styling

`tableStyles` is the one-stop option for branding every markdown table
in the document — fills, borders, padding, fonts, per-column overrides,
and a `customize` escape hatch for anything autoTable supports. See
[custom table styling](#custom-table-styling) for the full reference.

```ts
markdownToPdf(doc, markdown, {
  tableStyles: {
    theme: 'grid',
    headStyles: { fillColor: [25, 55, 120], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 245, 255] },
    columnStyles: { 2: { halign: 'right', fontStyle: 'bold' } },
  },
});
```

### With precise positional layout

For columns, headers / footers, call-out boxes, or measuring content
before drawing, use [`MarkdownLayout`](#precise-layout-api--markdownlayout):

```ts
import { MarkdownLayout } from 'jspdf-markdown';

const layout = new MarkdownLayout(doc);
const left = layout.renderMarkdown(leftColumn, { x: 15, y: 30, width: 85 });
const right = layout.renderMarkdown(rightColumn, { x: 110, y: 30, width: 85 });
layout.setCursor({ x: 15, y: Math.max(left.endY, right.endY) + 10 });
layout.renderMarkdown('---\n\n_Thanks for reading._');
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
| `tableStyles` | [`TableStyles`](#custom-table-styling) | `{}` | Custom table styling applied to both GFM pipe tables and raw HTML `<table>` blocks. |

Both a named export and a default export are provided:

```ts
import { markdownToPdf } from 'jspdf-markdown';
// or
import markdownToPdf from 'jspdf-markdown';

import type {
  MarkdownToPdfOptions,
  TableStyles,
  TableCellStyles,
} from 'jspdf-markdown';
```

---

## Precise-layout API — `MarkdownLayout`

`markdownToPdf` is intentionally all-in-one: "give me a PDF of this
markdown". When you need more control — columns, headers, footers,
call-out boxes, or measuring content before drawing it — use the
lower-level `MarkdownLayout` class. It wraps the same rendering engine
but exposes cursor control, region rendering, measurement, and inline
drawing.

```ts
import { jsPDF } from 'jspdf';
import { MarkdownLayout } from 'jspdf-markdown';

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const layout = new MarkdownLayout(doc);

// Two markdown columns side-by-side.
const left = layout.renderMarkdown(leftMd,  { x:  15, y: 30, width: 85 });
const right = layout.renderMarkdown(rightMd, { x: 110, y: 30, width: 85 });

// Continue full-width beneath the taller column.
layout.setCursor({ x: 15, y: Math.max(left.endY, right.endY) + 10 });
layout.renderMarkdown(footerMd);

doc.save('output.pdf');
```

### When to use it

| You want to… | Use |
| --- | --- |
| Render a whole markdown document top-to-bottom | `markdownToPdf(doc, md)` |
| Render markdown into a specific `(x, y, width)` region | `layout.renderMarkdown(md, region)` |
| Draw one aligned line of inline markdown (headers, footers, stamps) | `layout.renderInline(md, { x, y, align })` |
| Know how tall a markdown block will be before drawing | `layout.measureMarkdown(md, width)` |
| Know how wide a short inline snippet will be | `layout.measureInline(md, { fontSize })` |
| Interleave markdown and raw `doc.text()` / `doc.addImage()` calls | Any mix of the above |

### Constructor and cursor

```ts
const layout = new MarkdownLayout(doc, options?);
```

All options from [`MarkdownToPdfOptions`](#markdowntopdfoptions) are
accepted and become the default for every render call on this instance
— including [`tableStyles`](#custom-table-styling), so branded tables,
fonts, colours, and margins all flow through to `renderMarkdown` calls
in custom regions.

`MarkdownLayout` keeps an internal **block cursor** — the `(page, x, y)`
where the next non-positional `renderMarkdown` call will start. The
cursor begins at `(1, marginLeft, marginTop)` and advances after each
`renderMarkdown` call.

| Method | Description |
| --- | --- |
| `getCursor()` | Returns `{ page, x, y }` in mm (1-based page). |
| `setCursor({ page?, x?, y? })` | Move the cursor and/or switch pages. |
| `addPage()` | Append a new page and reset cursor to `(marginLeft, marginTop)`. |
| `addSpace(mm)` | Advance the cursor `y` by `mm`. |
| `ensureSpace(mm)` | Add a new page if remaining height < `mm`. Returns `true` if a page was added. |
| `pageWidth()` / `pageHeight()` | Current page dimensions, mm. |
| `contentWidth()` / `contentHeight()` | Page minus configured margins, mm. |
| `remainingHeight()` | Space from cursor `y` to the bottom margin, mm. |

`renderInline` is **positional** — it does not move the block cursor.
`renderMarkdown` **does** update the cursor to the end of its region.

### `renderMarkdown` — block rendering in a region

```ts
renderMarkdown(
  markdown: string,
  region?: {
    x?: number;       // default: current cursor x
    y?: number;       // default: current cursor y
    width?: number;   // default: pageWidth − x − marginRight
    minHeight?: number; // if set, start on a new page when remainingHeight < minHeight
  },
): {
  startPage: number;
  endPage: number;
  endY: number;
  height: number;   // total height consumed, flattening page breaks (mm)
  pageCount: number;
};
```

- With **no region**, it behaves exactly like `markdownToPdf` and flows
  from the current cursor at full content width.
- With an `x` and `width`, it uses those as the left and right bounds
  for this call only. Subsequent block renders continue from the end of
  this region by default.
- Content wider than `width` wraps; content taller than the remaining
  page height automatically breaks onto new pages.
- `minHeight` is a convenience for "don't orphan this block at the bottom
  of a page": the layout moves to a new page first if the remaining
  space is too small.

### `renderInline` — positional, aligned inline markdown

```ts
renderInline(
  markdown: string,
  opts: {
    x: number;                    // left edge of the text box (mm)
    y: number;                    // top edge of the first line (mm)
    maxWidth?: number;            // wrap width; omitted ⇒ single line
    align?: 'left' | 'center' | 'right';
    fontSize?: number;            // pt; defaults to options.fontSize
    color?: [number, number, number];
    bold?: boolean;               // force-bold even for non-strong runs
    italic?: boolean;
  },
): {
  endY: number;
  lastBaselineY: number;
  lines: number;
  width: number;
  height: number;
};
```

- Interprets inline markdown only: `**bold**`, `*italic*`, `` `code` ``,
  `[link](url)`, `~~strike~~`, literal `<br>`. Block tokens (headings,
  lists, code fences, tables) are rendered as plain inline text.
- `y` is the **top** of the first line's text box, not the baseline —
  matching CSS-style intuition.
- With `maxWidth`, alignment is interpreted inside that width. Without
  `maxWidth` the text is drawn on a single line with no wrapping.
- Fills in its own font size / colour and restores afterwards, so
  subsequent drawing is unaffected.
- Does **not** touch the block cursor. Use it for anything positional:
  page headers, footers, watermarks, stamps on tables, aligned labels.

### `measureMarkdown` / `measureInline`

```ts
measureMarkdown(markdown: string, width?: number): {
  height: number;       // total mm flattened across pages
  pageCount: number;
  endY: number;
};

measureInline(markdown: string, opts?: {
  maxWidth?: number;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
}): {
  width: number;
  height: number;
  lines: number;
};
```

Both measurements run the real renderer against a throwaway jsPDF with
the same page dimensions, so the numbers match what `renderMarkdown` /
`renderInline` would produce. The real document is untouched.

Use `measureMarkdown` to decide whether a block fits in a box, or to
centre a block vertically. Use `measureInline` to size UI chrome around
a dynamic title.

### Recipes

#### Page-number footer on every page

```ts
import { MarkdownLayout } from 'jspdf-markdown';

const doc = new jsPDF();
const layout = new MarkdownLayout(doc);

layout.renderMarkdown(longMarkdown);

const pages = doc.getNumberOfPages();
for (let p = 1; p <= pages; p++) {
  doc.setPage(p);
  layout.renderInline(`Page **${p}** of **${pages}**`, {
    x: layout.options.marginLeft,
    y: layout.pageHeight() - 12,
    maxWidth: layout.contentWidth(),
    align: 'right',
    fontSize: 9,
    color: [120, 120, 120],
  });
}
```

#### Two-column article with a full-width footer

```ts
const layout = new MarkdownLayout(doc);

layout.renderMarkdown('# Monthly digest\n\nIntroductory paragraph…');

const topY = layout.getCursor().y + 4;
const colWidth = 85;
const left = layout.renderMarkdown(leftArticle, {
  x: 15, y: topY, width: colWidth,
});
const right = layout.renderMarkdown(rightArticle, {
  x: 110, y: topY, width: colWidth,
});

layout.setCursor({ x: 15, y: Math.max(left.endY, right.endY) + 10 });
layout.renderMarkdown('---\n\n_Thanks for reading._');
```

#### Don't orphan a heading at the bottom of a page

```ts
layout.renderMarkdown('## Section 3\n\nBody…', { minHeight: 30 });
```

#### Fit content inside a fixed box by measuring first

```ts
const boxWidth = 100;
const maxBoxHeight = 60;

const { height } = layout.measureMarkdown(cardMarkdown, boxWidth);

if (height <= maxBoxHeight) {
  layout.renderMarkdown(cardMarkdown, { x: 15, y: 20, width: boxWidth });
} else {
  layout.renderInline('_Content too long — see attached page._', {
    x: 15, y: 20, maxWidth: boxWidth, italic: true,
  });
}
```

#### A simple running header

```ts
function drawHeader(layout: MarkdownLayout, title: string) {
  const { doc } = layout;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(15, 14, layout.pageWidth() - 15, 14);
  layout.renderInline(`**${title}**`, {
    x: 15, y: 7, maxWidth: layout.contentWidth(), fontSize: 9, align: 'left',
  });
  layout.renderInline('_jspdf-markdown_', {
    x: 15, y: 7, maxWidth: layout.contentWidth(), fontSize: 9, align: 'right',
  });
}
```

#### A branded, styled table rendered into a narrow column

`tableStyles` flows through from the `MarkdownLayout` options, so any
markdown table — GFM or raw HTML — inside a region render picks up the
configured styling automatically:

```ts
const layout = new MarkdownLayout(doc, {
  tableStyles: {
    theme: 'grid',
    headStyles: { fillColor: [25, 55, 120], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 245, 255] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  },
});

const pricing = `
| SKU    | Price   |
|--------|--------:|
| A-100  | €19.99  |
| A-200  | €49.99  |
| A-300  | €249.99 |
`;

layout.renderMarkdown(pricing, { x: 15, y: 40, width: 85 });
layout.renderMarkdown('Notes:\n\n- Prices exclude VAT.', {
  x: 110, y: 40, width: 85,
});
```

See the [custom table styling](#custom-table-styling) section for the
full reference and more recipes.

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

## Custom table styling

Both GFM pipe tables and raw `<table>` blocks are rendered through
[`jspdf-autotable`](https://github.com/simonbengtsson/jsPDF-AutoTable).
The library ships with a sensible default theme — dark-grey header,
white bold header text, striped body rows, 2 mm cell padding — but
every part is customisable through the `tableStyles` option.

```ts
import { markdownToPdf, type TableStyles } from 'jspdf-markdown';

const tableStyles: TableStyles = {
  theme: 'grid',
  styles: {
    fontSize: 10,
    cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    lineColor: [210, 210, 210],
    lineWidth: 0.2,
  },
  headStyles: {
    fillColor: [30, 80, 160],
    textColor: [255, 255, 255],
    fontStyle: 'bold',
    halign: 'center',
  },
  bodyStyles: {
    textColor: [40, 40, 40],
  },
  alternateRowStyles: {
    fillColor: [245, 248, 255],
  },
  columnStyles: {
    0: { fontStyle: 'bold' },
    1: { halign: 'right' },
  },
};

markdownToPdf(doc, markdown, { tableStyles });
```

The same `tableStyles` is applied to every table rendered in that
`markdownToPdf` / `MarkdownLayout.renderMarkdown` call — including raw
HTML tables with `colspan` / `rowspan`.

### `TableStyles` reference

Every field is optional.

| Field | Type | Description |
| --- | --- | --- |
| `theme` | `'striped' \| 'grid' \| 'plain'` | autoTable theme. Default: `'striped'`. `'plain'` and `'grid'` also turn off the default zebra stripe. |
| `styles` | `TableCellStyles` | Base styles inherited by every section. |
| `headStyles` | `TableCellStyles` | Overrides for header rows. |
| `bodyStyles` | `TableCellStyles` | Overrides for body rows. |
| `alternateRowStyles` | `TableCellStyles` | Overrides for striped body rows (only applied when `theme === 'striped'`). Pass `fillColor: false` to drop just the stripe. |
| `columnStyles` | `Record<string \| number, TableCellStyles>` | Per-column overrides keyed by the zero-based column index. User entries here win over GFM column alignment (`:---:`). |
| `customize` | `(options) => options` | Escape hatch: receives the fully composed autoTable options (with head/body already populated) and returns the options that will actually be passed to `autoTable`. |

`TableCellStyles` mirrors autoTable's
[`Styles`](https://github.com/simonbengtsson/jsPDF-AutoTable#styling)
type, so any field autoTable supports is available. The most common
ones are:

| Field | Type | Notes |
| --- | --- | --- |
| `fillColor` | `[r,g,b] \| false` | Pass `false` to disable the default fill for that section. |
| `textColor` | `[r,g,b]` | Also used as the default colour for inline-styled (bold/italic/etc.) cells. |
| `font` | `string` | Font family for this section. Falls back to `options.fontFamily`. |
| `fontStyle` | `'normal' \| 'bold' \| 'italic' \| 'bolditalic'` | Applied by autoTable for plain-text cells. |
| `fontSize` | `number` | Point size. Defaults to `options.fontSize * 0.9`. |
| `cellPadding` | `number \| { top?, right?, bottom?, left? }` | mm. Default: `2`. |
| `lineColor` | `[r,g,b]` | Border colour. |
| `lineWidth` | `number \| { top?, right?, bottom?, left? }` | Border width in pt. |
| `halign` | `'left' \| 'center' \| 'right'` | Horizontal alignment. For GFM tables the column alignment (`:---:`) is applied first, then any user `columnStyles` wins. |
| `valign` | `'top' \| 'middle' \| 'bottom'` | Vertical alignment. Default: `'middle'`. |
| `minCellHeight` | `number` | mm. Useful for fixed-height rows. |

Inline formatting inside cells (`**bold**`, `*italic*`, `` `code` ``,
`[links](…)`, `~~strike~~`, `<br>`) is drawn by jspdf-markdown after
autoTable paints the cell background. The effective font family and
font size for those rich runs are taken from the per-cell autoTable
styles, so `tableStyles.headStyles.fontSize = 14` really does make
header text render at 14 pt even inside bolded cells.

### Table recipes

#### Minimal lines, compact rows

```ts
markdownToPdf(doc, markdown, {
  tableStyles: {
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 1.2, right: 2, bottom: 1.2, left: 2 },
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: false, // no fill
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      lineWidth: { bottom: 0.4 },
    },
  },
});
```

#### Brand-coloured header, subtle zebra

```ts
markdownToPdf(doc, markdown, {
  tableStyles: {
    headStyles: {
      fillColor: [25, 55, 120],
      textColor: [255, 255, 255],
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [240, 245, 255],
    },
  },
});
```

#### Per-column formatting in a pricing table

```ts
const md = `
| SKU      | Description            |      Price |
|----------|------------------------|-----------:|
| A-100    | Standard widget        |     $19.99 |
| A-200    | Premium widget         |     $49.99 |
| A-300    | Enterprise widget pack |    $249.99 |
`;

markdownToPdf(doc, md, {
  tableStyles: {
    theme: 'grid',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 25 },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', textColor: [20, 100, 40], fontStyle: 'bold' },
    },
  },
});
```

#### Drop-in escape hatch for every autoTable feature

`TableStyles.customize` receives the fully merged autoTable options
(including the populated `head`, `body`, and any rich-cell hooks) and
must return the options to pass to `autoTable`. Spread the argument to
preserve the defaults:

```ts
markdownToPdf(doc, markdown, {
  tableStyles: {
    customize: (opts) => ({
      ...opts,
      rowPageBreak: 'avoid',
      showFoot: 'lastPage',
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.text(`Page ${data.pageNumber}`, data.settings.margin.left, 10);
      },
    }),
  },
});
```

#### Cell-level conditional styling

Use autoTable's `didParseCell` hook through `customize` to style cells
based on their content:

```ts
markdownToPdf(doc, markdown, {
  tableStyles: {
    customize: (opts) => ({
      ...opts,
      didParseCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 2) return;
        const text = Array.isArray(data.cell.text)
          ? data.cell.text.join('')
          : String(data.cell.text ?? '');
        const value = Number(text.replace(/[^0-9.-]/g, ''));
        if (value > 100) {
          data.cell.styles.textColor = [180, 30, 30];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    }),
  },
});
```

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

For anything more structured — running headers, two-column layouts,
measuring content before you draw it — prefer the
[precise-layout API](#precise-layout-api--markdownlayout).

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
   Both paths share a single `buildTableOptions` helper that merges the
   library's defaults with [`options.tableStyles`](#custom-table-styling)
   (including per-column overrides and a `customize` escape hatch) and
   honours per-cell `font` / `fontSize` / `textColor` from autoTable
   when drawing rich cells.
5. **Pagination.** A helper `ensureSpace(state, neededMm)` adds a new
   page whenever the cursor would cross the bottom margin. Long
   paragraphs and code blocks are checked on every line advance.
6. **Precise layout.** `MarkdownLayout` wraps the same engine but
   exposes region-based rendering (`renderMarkdown` with `{x, y, width}`
   overrides the margins locally), positional inline rendering
   (`renderInline` reuses the inline layout used for table cells), and
   throwaway-doc measurement (`measureMarkdown` / `measureInline`).

The whole library is a single TypeScript file with no external state
beyond the `jsPDF` document it mutates.

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
suffixes, table content, alignment, merged cells, **positional layout
of region and inline renders**, **measurement accuracy**, …), not just
"did not throw".

---

## Dependencies

- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) — table rendering
- [marked](https://github.com/markedjs/marked) — Markdown parsing

---

## License

MIT
