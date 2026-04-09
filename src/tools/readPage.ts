import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerReadPageTool(server: McpServer, bridge: BridgeManager) {
  server.tool(
    "orgo_chrome_read_page",
    'Get an accessibility tree representation of the Chrome page. Returns elements with roles, labels, and refs (e.g., ref_1) that can be used with click/form_input. Use filter: "interactive" for just buttons/links/inputs.',
    {
      filter: z.enum(["all", "interactive"]).optional().describe('Filter: "all" for all elements, "interactive" for buttons/links/inputs only (default: all)'),
      depth: z.number().optional().describe("Max tree depth (default: 15). Use smaller if output is too large."),
      max_chars: z.number().optional().describe("Max output characters (default: 50000)"),
      ref_id: z.string().optional().describe("Focus on a specific element subtree by ref"),
    },
    async (args) => {
      const result = await bridge.call("/read_page", {
        filter: args.filter,
        depth: args.depth,
        max_chars: args.max_chars,
        ref_id: args.ref_id,
      });
      const data = result as { pageContent?: string; error?: string; viewport?: unknown };
      if (data.error) {
        return { content: [{ type: "text", text: `Error: ${data.error}` }] };
      }
      let text = data.pageContent || "";
      if (data.viewport) {
        text += `\n\nViewport: ${JSON.stringify(data.viewport)}`;
      }
      return { content: [{ type: "text", text }] };
    }
  );
}
