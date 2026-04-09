import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerResizeWindowTool(server: McpServer, bridge: BridgeManager) {
  server.tool(
    "orgo_chrome_resize",
    "Resize the Chrome browser viewport to specific dimensions. Useful for testing responsive designs or capturing full-width screenshots.",
    {
      width: z.number().describe("Viewport width in pixels"),
      height: z.number().describe("Viewport height in pixels"),
    },
    async (args) => {
      const result = await bridge.call("/resize", args);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
}
