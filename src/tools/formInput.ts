import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerFormInputTool(server: McpServer, bridge: BridgeManager) {
  server.tool(
    "orgo_chrome_form_input",
    "Set a form field value using an element ref from read_page or find. For checkboxes use boolean, for selects use option value, for text inputs use string.",
    {
      ref: z.string().describe("Element ref from read_page or find (e.g., 'ref_3')"),
      value: z.union([z.string(), z.boolean(), z.number()]).describe("Value to set"),
    },
    async (args) => {
      const result = await bridge.call("/form_input", args);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
}
