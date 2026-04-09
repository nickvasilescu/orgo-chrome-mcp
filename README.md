# orgo-chrome-mcp

DOM-aware Chrome browser automation for [Orgo](https://orgo.ai) virtual machines via MCP.

Instead of pixel-based screenshot+click automation, this MCP server gives AI agents direct DOM access to Chrome inside Orgo VMs — reading accessibility trees, clicking elements by ref, executing JavaScript, monitoring network/console, and more.

## Quick Start

```bash
# Register with Claude Code
claude mcp add orgo-chrome \
  -e ORGO_API_KEY=sk_live_... \
  -e ORGO_COMPUTER_ID=your-computer-id \
  -- npx orgo-chrome-mcp
```

## How It Works

```
Your Machine                     Orgo VM
─────────────                    ────────
MCP Client (Claude Code)         orgo-chrome-bridge (Node.js)
     ↕ stdio                       ├─ HTTP API on localhost:7331
orgo-chrome-mcp                    ├─ CDP WebSocket → Chrome:9222
     ↕ Orgo REST API               ├─ Buffers: console, network
   POST /computers/{id}/bash       └─ State: element refs, tabs
   (curl localhost:7331/...)
                                 Chrome (--remote-debugging-port=9222)
```

1. **MCP Server** (your machine) — 16 tools registered via stdio
2. **In-VM Bridge** (Orgo VM) — Node.js process connecting to Chrome DevTools Protocol
3. Each tool call = `orgo_bash("curl localhost:7331/{endpoint}")`

The bridge auto-deploys on first tool call. No manual setup inside the VM.

## Tools (16)

### Navigation
| Tool | Description |
|------|-------------|
| `orgo_chrome_navigate` | Navigate to URL, go back/forward |
| `orgo_chrome_tabs` | List open tabs |
| `orgo_chrome_new_tab` | Open new tab |
| `orgo_chrome_switch_tab` | Switch to a different tab |

### Page Reading
| Tool | Description |
|------|-------------|
| `orgo_chrome_read_page` | Accessibility tree with element refs |
| `orgo_chrome_find` | Find elements by text/purpose |
| `orgo_chrome_page_text` | Extract raw page text |
| `orgo_chrome_screenshot` | Visual screenshot (PNG/JPEG) |

### Interaction
| Tool | Description |
|------|-------------|
| `orgo_chrome_click` | Click element by ref or coordinates |
| `orgo_chrome_type` | Type text or press keys |
| `orgo_chrome_form_input` | Set form field values by ref |
| `orgo_chrome_scroll` | Scroll the page |

### Debugging
| Tool | Description |
|------|-------------|
| `orgo_chrome_evaluate` | Execute JavaScript in page context |
| `orgo_chrome_console` | Read console messages (log, error, warn) |
| `orgo_chrome_network` | Read network requests (XHR, Fetch) |

### VM Management
| Tool | Description |
|------|-------------|
| `orgo_chrome_resize` | Resize browser viewport |
| `orgo_chrome_connect` | Switch to a different Orgo VM |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ORGO_API_KEY` | Yes | Your Orgo API key ([orgo.ai/workspaces](https://orgo.ai/workspaces)) |
| `ORGO_COMPUTER_ID` | Yes | ID of the Orgo VM to control |

## How Refs Work

When you call `read_page` or `find`, elements get refs like `ref_1`, `ref_2`. Use these with `click`, `form_input`, and other interaction tools. Refs are automatically cleared when the page navigates to a new URL.

## Architecture

Built on Chrome DevTools Protocol (CDP) — no Chrome extension needed. The bridge is a single zero-dependency Node.js file that uses built-in `net`, `crypto`, and `http` modules (including a minimal WebSocket client). It deploys into any Orgo VM that has Chrome and Node.js.

## Requirements

- Node.js 18+
- An Orgo account with a running computer
- Chrome and Node.js available inside the Orgo VM (default)

## License

MIT
