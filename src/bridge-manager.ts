/**
 * Bridge Manager — deploys, health-checks, and auto-heals the in-VM bridge process.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { OrgoClient } from "./orgo-client.js";

const BRIDGE_PORT = 7331;

export class BridgeManager {
  private orgo: OrgoClient;
  private deployed = false;

  constructor(orgo: OrgoClient) {
    this.orgo = orgo;
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

    try {
      // The output may contain the bridge's JSON response.
      // Strip any leading/trailing whitespace and try to find JSON.
      const trimmed = output.trim();
      if (!trimmed || trimmed === "") {
        throw new Error("Bridge returned empty response");
      }
      return JSON.parse(trimmed);
    } catch (e) {
      // If the output contains non-JSON prefix (e.g. from curl), try to find JSON
      const jsonStart = output.indexOf("{");
      if (jsonStart >= 0) {
        try {
          return JSON.parse(output.slice(jsonStart));
        } catch { /* fall through */ }
      }
      throw new Error(`Bridge returned non-JSON: ${output.slice(0, 200)}`);
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

    // Read the bridge script from the package
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const bridgePath = join(__dirname, "bridge", "orgo-chrome-bridge.js");
    let bridgeScript: string;
    try {
      bridgeScript = readFileSync(bridgePath, "utf-8");
    } catch {
      // In dist/, bridge is one level up from tools
      const altPath = join(__dirname, "..", "src", "bridge", "orgo-chrome-bridge.js");
      bridgeScript = readFileSync(altPath, "utf-8");
    }

    // Kill any existing bridge
    await this.orgo.bash("pkill -f 'node /tmp/orgo-chrome-bridge' 2>/dev/null || true");

    // Check if Node.js is available, install ws if needed
    await this.orgo.bash("which node || (apt-get update -qq && apt-get install -y -qq nodejs npm)");
    await this.orgo.bash("cd /tmp && npm list ws 2>/dev/null || npm init -y --silent && npm install --silent ws 2>/dev/null || true");

    // Write the bridge script
    // Escape the script for heredoc — replace backslashes and backticks
    const escaped = bridgeScript
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$/g, "\\$");

    await this.orgo.bash(`cat > /tmp/orgo-chrome-bridge.js << 'ORGO_BRIDGE_EOF'\n${bridgeScript}\nORGO_BRIDGE_EOF`);

    // Launch the bridge in the background
    await this.orgo.bash(
      "cd /tmp && NODE_PATH=/tmp/node_modules nohup node /tmp/orgo-chrome-bridge.js > /tmp/orgo-chrome-bridge.log 2>&1 &"
    );

    // Wait for bridge to become ready
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

    // If we get here, print the log for debugging
    const log = await this.orgo.bash("tail -30 /tmp/orgo-chrome-bridge.log 2>/dev/null || echo 'no log'");
    throw new Error(`Bridge failed to start. Log:\n${log}`);
  }
}
