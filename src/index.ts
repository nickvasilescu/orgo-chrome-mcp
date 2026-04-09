#!/usr/bin/env node
/**
 * orgo-chrome-mcp v0.2 — MCP server for DOM-aware Chrome automation inside Orgo VMs.
 *
 * Architecture: Two-process design.
 * - This MCP server runs on your machine (stdio transport)
 * - An in-VM bridge (Node.js) connects to Chrome via DevTools Protocol
 * - Each tool call = orgo_bash("curl localhost:7331/{endpoint}")
 *
 * Reference: Modeled after Anthropic's Claude-in-Chrome MCP extension,
 * adapted for remote Orgo VM access via the Orgo REST API.
 *
 * Usage:
 *   ORGO_API_KEY=sk_live_... ORGO_COMPUTER_ID=abc123 npx orgo-chrome-mcp
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OrgoClient } from "./orgo-client.js";
import { BridgeManager } from "./bridge-manager.js";
import { ORGO_CHROME_SYSTEM_PROMPT } from "./system-prompt.js";

// Tools
import { registerNavigateTool } from "./tools/navigate.js";
import { registerComputerTools } from "./tools/computer.js";
import { registerReadPageTool } from "./tools/readPage.js";
import { registerFindTool } from "./tools/find.js";
import { registerJavaScriptTool } from "./tools/javascriptTool.js";
import { registerTabTools } from "./tools/tabs.js";
import { registerGetPageTextTool } from "./tools/getPageText.js";
import { registerFormInputTool } from "./tools/formInput.js";
import { registerConsoleLogsTool } from "./tools/consoleLogs.js";
import { registerNetworkRequestsTool } from "./tools/networkRequests.js";
import { registerResizeWindowTool } from "./tools/resizeWindow.js";
import { registerConnectTool } from "./tools/connect.js";

// ============================================================================
// Configuration
// ============================================================================

const ORGO_API_KEY = process.env.ORGO_API_KEY;
const ORGO_COMPUTER_ID = process.env.ORGO_COMPUTER_ID;

if (!ORGO_API_KEY) {
  console.error("Error: ORGO_API_KEY environment variable is required.");
  console.error("Get your key at https://orgo.ai/workspaces");
  process.exit(1);
}

if (!ORGO_COMPUTER_ID) {
  console.error("Error: ORGO_COMPUTER_ID environment variable is required.");
  console.error("Create a computer at https://orgo.ai or via the API.");
  process.exit(1);
}

// ============================================================================
// Initialize
// ============================================================================

const orgo = new OrgoClient(ORGO_API_KEY, ORGO_COMPUTER_ID);
const bridge = new BridgeManager(orgo);

const server = new McpServer({
  name: "orgo-chrome-mcp",
  version: "0.2.0",
});

// Register system prompt as an MCP prompt resource
server.prompt(
  "orgo-chrome-guide",
  "How to use the Orgo Chrome browser automation tools effectively",
  () => ({
    messages: [{
      role: "user",
      content: { type: "text", text: ORGO_CHROME_SYSTEM_PROMPT },
    }],
  })
);

// ============================================================================
// Register Tools (16 total)
// ============================================================================

// Navigation & Tabs
registerNavigateTool(server, bridge);
registerTabTools(server, bridge);            // tabs, new_tab, switch_tab

// Page Reading
registerReadPageTool(server, bridge);
registerFindTool(server, bridge);
registerGetPageTextTool(server, bridge);

// Interaction
registerComputerTools(server, bridge);       // screenshot, click, type, scroll
registerFormInputTool(server, bridge);

// Debugging
registerJavaScriptTool(server, bridge);
registerConsoleLogsTool(server, bridge);
registerNetworkRequestsTool(server, bridge);

// Window
registerResizeWindowTool(server, bridge);

// VM Management
registerConnectTool(server, bridge, () => ORGO_API_KEY!);

// ============================================================================
// Start Server
// ============================================================================

process.on("unhandledRejection", (err) => {
  console.error("[orgo-chrome-mcp] Unhandled rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("[orgo-chrome-mcp] Uncaught exception:", err);
});

async function main() {
  console.error("[orgo-chrome-mcp] v0.2.0 starting...");
  console.error(`[orgo-chrome-mcp] Computer: ${ORGO_COMPUTER_ID}`);
  console.error(`[orgo-chrome-mcp] 16 tools registered.`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[orgo-chrome-mcp] Ready.");
}

main().catch((err) => {
  console.error("[orgo-chrome-mcp] Fatal:", err);
  process.exit(1);
});
