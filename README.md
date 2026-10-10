# MDXPDF MCP Server

[![MCP](https://img.shields.io/badge/MCP-compatible-6E56CF)](https://modelcontextprotocol.io)

A [Model Context Protocol](https://modelcontextprotocol.io) server that converts Markdown into clean, modern PDF documents - with math, Mermaid diagrams and GitHub-flavored Markdown.

## Features

- **Markdown to PDF** powered by `md-to-pdf` (Puppeteer under the hood)
- **GitHub-flavored Markdown**: tables, task lists, footnotes, definition lists, emoji
- **Math**: inline `$...$` and display `$$...$$` rendered with MathJax
- **Mermaid diagrams** in fenced ` ```mermaid ` blocks
- **Custom containers**: `info` and `warning` callouts
- **Custom styling** through the bundled `style.css`
- Returns a local download link for the generated PDF

## Requirements

- Node.js 18 or higher
- pnpm (or npm)
- Puppeteer downloads a compatible Chromium build during install

## Installation (from source)

```bash
git clone https://github.com/tobioffice/MDXPDF-MCP.git
cd MDXPDF-MCP
pnpm install
pnpm run build
```

## Configuration

Add the server to your MCP client (e.g. Claude Desktop):

```json
{
  "mcpServers": {
    "mdxpdf": {
      "command": "node",
      "args": ["/absolute/path/to/MDXPDF-MCP/dist/index.js"],
      "env": {
        "SAVE_PATH": "/absolute/path/to/output/directory"
      }
    }
  }
}
```

| Environment variable | Default | Description |
| --- | --- | --- |
| `SAVE_PATH` | `/home/murali/Documents/GeneratedPDF` | Directory where the generated `.md` and `.pdf` files are saved |

Set `SAVE_PATH` to a directory that exists on your machine.

## Usage

### Tool: `create_pdf`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `file_name` | string | yes | Output file name; `.pdf` is appended automatically |
| `markdown_source` | string | yes | Markdown source code to convert into a PDF |

Example prompt:

> Create a PDF named `report` with a summary table, a Mermaid flowchart, and the equation `E = mc^2`.

The tool writes `<file_name>.md` and `<file_name>.pdf` to `SAVE_PATH` and returns:

```json
{
  "file_name": "report",
  "download_url": "http://localhost:8000/report.pdf"
}
```

To use the download link, serve the output directory over HTTP:

```bash
python -m http.server 8000 --directory "$SAVE_PATH"
```

## Development

```bash
pnpm run build   # compile TypeScript to dist/
```

Project layout:

```text
MDXPDF-MCP/
├── index.ts         # MCP server implementation
├── style.css        # print stylesheet
├── template.html    # HTML template with KaTeX hooks
├── types.d.ts       # type declarations
└── package.json
```

## License

MIT (as declared in `package.json`).
