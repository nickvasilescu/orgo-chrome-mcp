import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeManager } from "../bridge-manager.js";

export function registerComputerTools(server: McpServer, bridge: BridgeManager) {
  // Screenshot
  server.tool(
    "orgo_chrome_screenshot",
    "Take a screenshot of the current Chrome page in the Orgo VM. Returns a base64-encoded PNG image.",
    {
      format: z.enum(["png", "jpeg"]).optional().describe("Image format (default: png)"),
      quality: z.number().optional().describe("JPEG quality 0-100 (default: 80)"),
    },
    async (args) => {
      const result = await bridge.call("/screenshot", args) as { image: string };
      return {
        content: [{
          type: "image",
          data: result.image,
          mimeType: args.format === "jpeg" ? "image/jpeg" : "image/png",
        }],
      };
    }
  );

  // Click
  server.tool(
    "orgo_chrome_click",
    "Click an element on the page. Provide either a ref from read_page/find, or x,y coordinates.",
    {
      ref: z.string().optional().describe("Element ref from read_page or find (e.g., 'ref_1')"),
      x: z.number().optional().describe("X coordinate (pixels from left)"),
      y: z.number().optional().describe("Y coordinate (pixels from top)"),
      button: z.enum(["left", "right", "middle"]).optional().describe("Mouse button (default: left)"),
      double: z.boolean().optional().describe("Double-click (default: false)"),
    },
    async (args) => {
      const result = await bridge.call("/click", args);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  // Type text
  server.tool(
    "orgo_chrome_type",
    "Type text into the currently focused element, or press keyboard keys/shortcuts.",
    {
      text: z.string().optional().describe("Text to type into the focused element"),
      key: z.string().optional().describe("Key or shortcut to press (e.g., 'Enter', 'ctrl+a', 'Backspace')"),
    },
    async (args) => {
      if (args.key) {
        const result = await bridge.call("/key", { key: args.key });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      if (args.text) {
        const result = await bridge.call("/type", { text: args.text });
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      return { content: [{ type: "text", text: '{"error": "Provide text or key"}' }] };
    }
  );

  // Scroll
  server.tool(
    "orgo_chrome_scroll",
    "Scroll the page in a given direction.",
    {
      direction: z.enum(["up", "down", "left", "right"]).describe("Scroll direction"),
      amount: z.number().optional().describe("Number of scroll ticks (default: 3)"),
      x: z.number().optional().describe("X coordinate to scroll at"),
      y: z.number().optional().describe("Y coordinate to scroll at"),
    },
    async (args) => {
      const result = await bridge.call("/scroll", args);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
}
