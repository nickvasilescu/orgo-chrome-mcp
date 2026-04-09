import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OrgoClient } from "../orgo-client.js";
import type { BridgeManager } from "../bridge-manager.js";

/**
 * Connect tool — switch the MCP server to a different Orgo VM.
 * Reference: Claude-in-Chrome's switch_browser tool broadcasts a connection
 * request. Our version re-initializes the OrgoClient for a new computer_id.
 */
export function registerConnectTool(
  server: McpServer,
  bridge: BridgeManager,
  getApiKey: () => string,
) {
  server.tool(
    "orgo_chrome_connect",
    "Connect to a different Orgo VM. All subsequent browser tools will operate on the new computer. The bridge will auto-deploy if needed.",
    {
      computer_id: z.string().describe("ID of the Orgo computer to connect to"),
    },
    async ({ computer_id }) => {
      const newOrgo = new OrgoClient(getApiKey(), computer_id);

      // Verify the computer is reachable
      try {
        await newOrgo.bash("echo 'orgo-chrome-mcp connected'");
      } catch (e) {
        return { content: [{ type: "text", text: `Failed to connect to ${computer_id}: ${(e as Error).message}` }] };
      }

      bridge.setOrgoClient(newOrgo);
      return { content: [{ type: "text", text: `Connected to computer ${computer_id}. Bridge will deploy on next tool call.` }] };
    }
  );
}
