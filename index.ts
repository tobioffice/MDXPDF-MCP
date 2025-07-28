import { mdToPdf } from 'md-to-pdf';
import { writeFile } from "fs/promises";
import * as markdownItEmoji from 'markdown-it-emoji';
import * as markdownItCheckbox from 'markdown-it-checkbox';
import * as markdownItFootnote from 'markdown-it-footnote';
import * as markdownItDeflist from 'markdown-it-deflist';
import * as markdownItContainer from 'markdown-it-container';

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Use a static version string that will be updated by the version script
const packageVersion = "0.5.0";

const CREATE_PDF_TOOL: Tool = {
  name: "create_pdf",
  description:
    "Creates a PDF document from the provided Markdown source code. Supports modern Markdown features including tables, checkboxes, emojis, GitHub-flavored syntax, Mermaid diagrams, and inline/display math using $ and $$.",
  inputSchema: {
    type: "object",
    properties: {
      file_name: {
        type: "string",
        description: "The name of the output PDF file (extension will be added automatically)",
      },
      markdown_source: {
        type: "string",
        description: "The Markdown source code to convert into a PDF document. Use $ for inline math and $$ for display math.",
      },
    },
    required: ["file_name", "markdown_source"],
  },
};


// Server implementation
const server = new Server(
  {
    name: "tobioffice/mdxpdf-mcp",
    version: packageVersion,
  },
  {
    capabilities: {
      resources: {},
      tools: {
        create_pdf: {
          description: CREATE_PDF_TOOL.description,
          schema: CREATE_PDF_TOOL.inputSchema,
        },
      },
    },
  }
);

interface CreatePDFResult {
  file_name: string;
  download_url: string;
}

function isCreatePDFArgs(args: unknown): args is {
  file_name: string;
  markdown_source: string;
} {
  return (
    typeof args === "object" &&
    args !== null &&
    "file_name" in args &&
    typeof (args as { file_name: string }).file_name === "string" &&
    "markdown_source" in args &&
    typeof (args as { markdown_source: string }).markdown_source === "string"
  );
}

async function performCreatePDF(
  file_name: string,
  markdown_source: string
) {

  const save_path = process.env.SAVE_PATH || '/home/murali/Documents/GeneratedPDF';

  // Convert Mermaid code blocks to HTML divs that Mermaid can render
  const processedMarkdown = markdown_source.replace(
    /```mermaid\n([\s\S]*?)\n```/g,
    (_, code) => {
      const cleanCode = code.trim();
      return `<div class="mermaid">\n${cleanCode}\n</div>`;
    }
  );

  const math_script = `<style>
/* Override Mermaid font styles to use Computer Modern */
.mermaid text,
.mermaid .node text,
.mermaid .edgeLabel text,
.mermaid .label text,
.mermaid .labelText,
.mermaid .actor,
.mermaid .messageText,
.mermaid .noteText,
.mermaid .loopText {
  font-family: "CMU Serif", "Computer Modern", serif !important;
  font-size: 14px !important;
}

.mermaid .node rect,
.mermaid .node circle,
.mermaid .node ellipse,
.mermaid .node polygon {
  stroke: #333 !important;
}

.mermaid .edgePath path {
  stroke: #333 !important;
}
</style>
<script>
window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
    displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
  }
};
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({ 
    startOnLoad: true,
    theme: 'default',
    themeVariables: {
      primaryColor: '#f4f4f4',
      primaryTextColor: '#1f2937',
      primaryBorderColor: '#333',
      lineColor: '#333',
      sectionBkgColor: '#f4f4f4',
      altSectionBkgColor: '#fff',
      fontFamily: '"CMU Serif", "Computer Modern", serif',
      fontSize: '14px'
    },
    fontFamily: '"CMU Serif", "Computer Modern", serif'
  });
</script>
`

  await writeFile(`${save_path}/${file_name}.md`, math_script + processedMarkdown);

  await mdToPdf({ path: `${save_path}/${file_name}.md` }, {
    dest: `${save_path}/${file_name}.pdf`,
    stylesheet: ['/home/murali/Documents/MCP Servers/MDXPDF-MCP/style.css'],  // optional
    body_class: ['markdown-body'],
    pdf_options: {
      format: 'A4',
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      timeout: 30000
    }
    ,
    marked_options: {
      // This part is crucial
      markdownIt: undefined,
      markdownItPlugins: [
        [markdownItEmoji],
        [markdownItCheckbox],
        [markdownItFootnote],
        [markdownItDeflist],
        [markdownItContainer, 'warning'],
        [markdownItContainer, 'info'],
      ],
    }
  });

  const downloadUrl = `http://localhost:8000/${file_name}.pdf`;
  const result: CreatePDFResult = {
    file_name: file_name,
    download_url: downloadUrl,
  }

  return result;
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [CREATE_PDF_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("No arguments provided");
    }

    if (name === "create_pdf") {
      if (!isCreatePDFArgs(args)) {
        throw new Error("Invalid arguments for create_pdf");
      }
      const {
        file_name,
        markdown_source
      } = args;
      const results = await performCreatePDF(
        file_name,
        markdown_source
      );
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        isError: false,
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)
            }`,
        },
      ],
      isError: true,
    };
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
