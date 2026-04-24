# jspdf-markdown

A **jspdf + jspdf-autotable** library with comprehensive markdown support. Parse any Markdown string and render it directly into a [jsPDF](https://github.com/parallax/jsPDF) document — headings, bold/italic, code blocks, tables, lists, blockquotes, links, images, and more.

## Features

| Markdown element | Support |
|---|---|
| Headings (h1–h6) | ✅ with proportional font sizes and h1/h2 underlines |
| Paragraphs | ✅ with automatic text wrapping |
| **Bold** / *italic* / ***bold-italic*** | ✅ |
| `Inline code` | ✅ monospace font |
| ~~Strikethrough~~ | ✅ |
| [Links](https://example.com) | ✅ coloured + underlined |
| Images | ✅ rendered as `[Image: alt text]` placeholder |
| Fenced code blocks | ✅ shaded background + left accent bar |
| Blockquotes | ✅ indented with left border |
| Ordered lists | ✅ with nesting |
| Unordered lists | ✅ with nesting |
| Tables | ✅ via jspdf-autotable (striped theme) |
| Horizontal rules | ✅ |
| Page break handling | ✅ automatic |

## Installation

```bash
npm install jspdf-markdown jspdf jspdf-autotable
```

## Quick Start

```typescript
import { jsPDF } from 'jspdf';
import { markdownToPdf } from 'jspdf-markdown';

const doc = new jsPDF();

const markdown = `
# Hello, jspdf-markdown!

This library renders **Markdown** directly into a PDF using [jsPDF](https://github.com/parallax/jsPDF).

## Features

- Bold, *italic*, and \`inline code\`
- Ordered and unordered lists
- Tables via jspdf-autotable
- Code blocks with syntax highlighting placeholder
- Blockquotes
- Horizontal rules

> "Simplicity is the ultimate sophistication." — Leonardo da Vinci

\`\`\`javascript
const answer = 42;
console.log(\`The answer is \${answer}\`);
\`\`\`

| Name  | Role      |
|-------|-----------|
| Alice | Developer |
| Bob   | Designer  |
`;

markdownToPdf(doc, markdown);
doc.save('output.pdf');
```

## API

### `markdownToPdf(doc, markdown, options?)`

Parses `markdown` and renders it into the provided `jsPDF` document.  
Returns the same `doc` instance for chaining.

```typescript
function markdownToPdf(
  doc: jsPDF,
  markdown: string,
  options?: MarkdownToPdfOptions,
): jsPDF;
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `marginLeft` | `number` | `15` | Left page margin in mm |
| `marginRight` | `number` | `15` | Right page margin in mm |
| `marginTop` | `number` | `20` | Top page margin in mm |
| `marginBottom` | `number` | `20` | Bottom page margin in mm |
| `fontSize` | `number` | `11` | Base font size in pt |
| `lineHeight` | `number` | `1.4` | Line height multiplier |
| `fontFamily` | `string` | `'helvetica'` | Body text font |
| `codeFontFamily` | `string` | `'courier'` | Code block font |
| `blockSpacing` | `number` | `4` | Vertical spacing between blocks in mm |
| `showLinkUrls` | `boolean` | `true` | Show link URLs in brackets after link text |
| `headingColor` | `[r,g,b]` | `[0,0,0]` | Heading text colour |
| `codeBackground` | `[r,g,b]` | `[245,245,245]` | Code block background colour |
| `blockquoteColor` | `[r,g,b]` | `[200,200,200]` | Blockquote left border colour |
| `hrColor` | `[r,g,b]` | `[180,180,180]` | Horizontal rule colour |
| `linkColor` | `[r,g,b]` | `[0,0,238]` | Hyperlink colour |

### Example with options

```typescript
markdownToPdf(doc, markdown, {
  marginLeft: 20,
  marginRight: 20,
  fontSize: 12,
  lineHeight: 1.5,
  headingColor: [0, 70, 127],
  linkColor: [0, 100, 200],
  showLinkUrls: false,
});
```

## Development

```bash
# Install dependencies
npm install

# Type-check
npm run lint

# Build
npm run build

# Run tests
npm test
```

## Dependencies

- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) — Table rendering
- [marked](https://github.com/markedjs/marked) — Markdown parsing

## License

ISC
