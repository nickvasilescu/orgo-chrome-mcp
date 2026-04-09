#!/usr/bin/env node
/**
 * orgo-chrome-mcp — MCP server for DOM-aware Chrome automation inside Orgo VMs.
 *
 * Uses Chrome DevTools Protocol via an in-VM bridge process to provide
 * accessibility tree reading, element interaction, JS execution, and more.
 *
 * Usage:
 *   ORGO_API_KEY=sk_live_... ORGO_COMPUTER_ID=abc123 npx orgo-chrome-mcp
 *
 * Or register with Claude Code:
 *   claude mcp add orgo-chrome -e ORGO_API_KEY=sk_live_... -e ORGO_COMPUTER_ID=abc123 -- npx orgo-chrome-mcp
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OrgoClient } from "./orgo-client.js";
import { BridgeManager } from "./bridge-manager.js";
import { registerNavigateTool } from "./tools/navigate.js";
import { registerComputerTools } from "./tools/computer.js";
import { registerReadPageTool } from "./tools/readPage.js";
import { registerFindTool } from "./tools/find.js";
import { registerJavaScriptTool } from "./tools/javascriptTool.js";
import { registerTabTools } from "./tools/tabs.js";
import { registerGetPageTextTool } from "./tools/getPageText.js";
import { registerFormInputTool } from "./tools/formInput.js";

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
  version: "0.1.0",
});

// ============================================================================
// Register Tools
// ============================================================================

registerNavigateTool(server, bridge);
registerComputerTools(server, bridge);
registerReadPageTool(server, bridge);
registerFindTool(server, bridge);
registerJavaScriptTool(server, bridge);
registerTabTools(server, bridge);
registerGetPageTextTool(server, bridge);
registerFormInputTool(server, bridge);

// ============================================================================
// Start Server
// ============================================================================

// Prevent unhandled rejections from crashing the process
process.on("unhandledRejection", (err) => {
  console.error("[orgo-chrome-mcp] Unhandled rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("[orgo-chrome-mcp] Uncaught exception:", err);
});

async function main() {
  console.error("[orgo-chrome-mcp] Starting MCP server...");
  console.error(`[orgo-chrome-mcp] Computer: ${ORGO_COMPUTER_ID}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[orgo-chrome-mcp] MCP server connected via stdio. Ready for tool calls.");
}

main().catch((err) => {
  console.error("[orgo-chrome-mcp] Fatal error:", err);
  process.exit(1);
});
