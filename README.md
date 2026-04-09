# orgo-chrome-mcp

DOM-aware Chrome browser automation for [Orgo](https://orgo.ai) virtual machines via MCP (Model Context Protocol).

Instead of pixel-based screenshot+click automation, this MCP server gives AI agents direct access to the Chrome DOM inside Orgo VMs — reading accessibility trees, clicking elements by ref, executing JavaScript, monitoring network/console, and more.

## Quick Start

```bash
# Install and register with Claude Code
claude mcp add orgo-chrome \
  -e ORGO_API_KEY=sk_live_... \
  -e ORGO_COMPUTER_ID=your-computer-id \
  -- npx orgo-chrome-mcp
```

Or run directly:

```bash
ORGO_API_KEY=sk_live_... ORGO_COMPUTER_ID=abc123 npx orgo-chrome-mcp
```

## How It Works

```
Your Machine                     Orgo VM
─────────────                    ────────
MCP Client (Claude Code)         orgo-chrome-bridge (Node.js)
     ↕ stdio                       ├─ HTTP API on localhost:7331
orgo-chrome-mcp                    ├─ CDP WebSocket → Chrome:9222
     ↕ Orgo REST API               └─ State: refs, console, network
   POST /computers/{id}/bash
   (curl localhost:7331/...)     Chrome (--remote-debugging-port=9222)
```

1. **MCP Server** (your machine) — registers tools with any MCP client
2. **In-VM Bridge** (Orgo VM) — a Node.js process that connects to Chrome's DevTools Protocol
3. Each tool call = `orgo_bash("curl localhost:7331/{endpoint}")` — simple and debuggable

The bridge auto-deploys on first tool call. No manual setup inside the VM.

## Tools

| Tool | Description |
|------|-------------|
| `orgo_chrome_navigate` | Navigate to URL, go back/forward |
| `orgo_chrome_screenshot` | Capture page as image |
| `orgo_chrome_read_page` | Get accessibility tree with element refs |
| `orgo_chrome_find` | Find elements by text/purpose ("search bar") |
| `orgo_chrome_click` | Click element by ref or coordinates |
| `orgo_chrome_type` | Type text or press keyboard keys |
| `orgo_chrome_evaluate` | Execute JavaScript in page context |
| `orgo_chrome_tabs` | List open tabs |
| `orgo_chrome_new_tab` | Open new tab |
| `orgo_chrome_switch_tab` | Switch to a different tab |
| `orgo_chrome_page_text` | Extract raw page text |
| `orgo_chrome_form_input` | Set form field values by ref |
| `orgo_chrome_scroll` | Scroll the page |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ORGO_API_KEY` | Yes | Your Orgo API key (get at orgo.ai/workspaces) |
| `ORGO_COMPUTER_ID` | Yes | ID of the Orgo VM to control |

## Requirements

- Node.js 18+
- An Orgo account with an active computer
- Chrome and Node.js available inside the Orgo VM (default on Orgo VMs)

## License

MIT
