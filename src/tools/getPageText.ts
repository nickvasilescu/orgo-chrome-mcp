import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerGetPageTextTool(server: McpServer, bridge: BridgeManager) {
  server.tool(
    "orgo_chrome_page_text",
    "Extract the raw text content from the current Chrome page. Good for reading articles, blog posts, or text-heavy pages.",
    {},
    async () => {
      const result = await bridge.call("/page_text") as { text: string };
      return { content: [{ type: "text", text: result.text || "" }] };
    }
  );
}
