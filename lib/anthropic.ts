import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    _client = new Anthropic({
      apiKey,
      // Default max retries on transient errors
      maxRetries: 3,
      timeout: 60_000, // 60s — medical AI decisions may take time
    });
  }
  return _client;
}

// Shared model constants — update here to change across all agents
export const CLAUDE_MODEL = "claude-opus-4-6" as const;
export const CLAUDE_HAIKU = "claude-haiku-4-5-20251001" as const; // Fast/cheap for classification
