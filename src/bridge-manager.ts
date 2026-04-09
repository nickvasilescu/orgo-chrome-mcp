/**
 * Bridge Manager — deploys, health-checks, and auto-heals the in-VM bridge process.
 *
 * Reference: Claude-in-Chrome's setup.ts handles singleton lock cleanup, stale process
 * detection, and wrapper script versioning. We follow similar patterns adapted for
 * remote VM deployment via the Orgo bash API.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { OrgoClient } from "./orgo-client.js";

const BRIDGE_PORT = 7331;
const BRIDGE_VERSION = "0.2.0";
const BRIDGE_GITHUB_URL = "https://raw.githubusercontent.com/nickvasilescu/orgo-chrome-mcp/main/src/bridge/orgo-chrome-bridge.js";

export class BridgeManager {
  private orgo: OrgoClient;
  private deployed = false;

  constructor(orgo: OrgoClient) {
    this.orgo = orgo;
  }

  /** Update the Orgo client (used by connect tool to switch VMs). */
  setOrgoClient(orgo: OrgoClient): void {
    this.orgo = orgo;
    this.deployed = false;
  }

  /** Call a bridge endpoint via orgo_bash + curl. Returns parsed JSON. */
  async call(endpoint: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    await this.ensureBridge();

    const method = endpoint.startsWith("GET ") ? "GET" : "POST";
    const path = endpoint.replace(/^(GET|POST) /, "");

    let curlCmd: string;
    if (method === "GET") {
      curlCmd = `curl -sf http://127.0.0.1:${BRIDGE_PORT}${path}`;
    } else {
      const jsonBody = JSON.stringify(body).replace(/'/g, "'\\''");
      curlCmd = `curl -sf -X POST http://127.0.0.1:${BRIDGE_PORT}${path} -H 'Content-Type: application/json' -d '${jsonBody}'`;
    }

    const output = await this.orgo.bash(curlCmd);

    // Parse the JSON response from the bridge
    const trimmed = output.trim();
    if (!trimmed) {
      throw new Error("Bridge returned empty response");
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      // If output has non-JSON prefix (e.g. from curl verbose), find JSON
      const jsonStart = trimmed.indexOf("{");
      if (jsonStart >= 0) {
        try {
          return JSON.parse(trimmed.slice(jsonStart));
        } catch { /* fall through */ }
      }
      throw new Error(`Bridge returned non-JSON: ${trimmed.slice(0, 200)}`);
    }
  }

  /** Ensure the bridge is running inside the VM. Deploy if needed. */
  private async ensureBridge(): Promise<void> {
    // Always try health check first — bridge may already be running
    try {
      const output = await this.orgo.bash(
        `curl -sf http://127.0.0.1:${BRIDGE_PORT}/health 2>/dev/null || echo '{"status":"down"}'`
      );
      const health = JSON.parse(output.trim());
      if (health.status === "ok") {
        this.deployed = true;
        return;
      }
    } catch { /* bridge is down, deploy */ }

    await this.deploy();
  }

  /** Deploy the bridge script into the VM and start it. */
  private async deploy(): Promise<void> {
    console.error("[orgo-chrome-mcp] Deploying bridge into VM...");

    // 1. Kill any existing bridge + stale Chrome
    await this.orgo.bash(
      "pkill -f 'node /tmp/orgo-chrome-bridge' 2>/dev/null || true"
    );

    // 2. Clean up Chrome singleton locks (ref: Claude-in-Chrome setup.ts)
    await this.orgo.bash(
      "rm -f /tmp/chrome-cdp-profile/SingletonLock /tmp/chrome-cdp-profile/SingletonSocket 2>/dev/null || true"
    );

    // 3. Download bridge from GitHub (proven reliable in v0.1 testing)
    let downloaded = false;
    try {
      const dlOutput = await this.orgo.bash(
        `curl -sfL ${BRIDGE_GITHUB_URL} -o /tmp/orgo-chrome-bridge.js && wc -c /tmp/orgo-chrome-bridge.js`
      );
      const sizeMatch = dlOutput.match(/(\d+)/);
      if (sizeMatch && parseInt(sizeMatch[1]) > 10000) {
        downloaded = true;
        console.error("[orgo-chrome-mcp] Bridge downloaded from GitHub.");
      }
    } catch { /* download failed, fall back to heredoc */ }

    // 4. Fallback: upload via heredoc from local file
    if (!downloaded) {
      console.error("[orgo-chrome-mcp] GitHub download failed, using heredoc upload...");
      const __dirname = dirname(fileURLToPath(import.meta.url));
      let bridgeScript: string;
      try {
        bridgeScript = readFileSync(join(__dirname, "bridge", "orgo-chrome-bridge.js"), "utf-8");
      } catch {
        bridgeScript = readFileSync(join(__dirname, "..", "src", "bridge", "orgo-chrome-bridge.js"), "utf-8");
      }
      await this.orgo.bash(
        `cat > /tmp/orgo-chrome-bridge.js << 'ORGO_BRIDGE_EOF'\n${bridgeScript}\nORGO_BRIDGE_EOF`
      );
    }

    // 5. Launch the bridge (it handles Chrome startup internally)
    await this.orgo.bash(
      "DISPLAY=:99 nohup node /tmp/orgo-chrome-bridge.js > /tmp/orgo-chrome-bridge.log 2>&1 &"
    );

    // 6. Wait for bridge to become ready (up to 15s)
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        const output = await this.orgo.bash(
          `curl -sf http://127.0.0.1:${BRIDGE_PORT}/health 2>/dev/null || echo '{}'`
        );
        const health = JSON.parse(output.trim());
        if (health.status === "ok") {
          console.error("[orgo-chrome-mcp] Bridge deployed and healthy.");
          this.deployed = true;
          return;
        }
      } catch { /* not ready yet */ }
    }

    // 7. If failed, show the log for debugging
    const log = await this.orgo.bash("tail -30 /tmp/orgo-chrome-bridge.log 2>/dev/null || echo 'no log'");
    throw new Error(`Bridge failed to start. Log:\n${log}`);
  }
}
