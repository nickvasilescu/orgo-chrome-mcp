/**
 * Orgo API client — wraps REST endpoints for bash execution and computer lifecycle.
 */

const ORGO_API_BASE = "https://www.orgo.ai/api";

export class OrgoClient {
  private apiKey: string;
  private computerId: string;

  constructor(apiKey: string, computerId: string) {
    this.apiKey = apiKey;
    this.computerId = computerId;
  }

  /** Execute a bash command inside the Orgo VM and return stdout. */
  async bash(command: string): Promise<string> {
    const url = `${ORGO_API_BASE}/computers/${this.computerId}/bash`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Orgo bash failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { output?: string; stdout?: string; result?: string };
    return data.output || data.stdout || data.result || "";
  }

  /** Ensure the computer is running. */
  async ensureRunning(): Promise<void> {
    const url = `${ORGO_API_BASE}/computers/${this.computerId}/ensure-running`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to ensure computer running: ${res.status}`);
    }
  }

  /** Get computer info. */
  async getComputer(): Promise<Record<string, unknown>> {
    const url = `${ORGO_API_BASE}/computers/${this.computerId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`Failed to get computer: ${res.status}`);
    return res.json() as Promise<Record<string, unknown>>;
  }
}
