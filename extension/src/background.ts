/**
 * Identity Firewall Background Service Worker
 * Manages policy, persona resolution, and coordinates with content scripts
 */

import {
  Persona,
  PolicyConfig,
  ResolveRequest,
  ResolveResponse,
  GetConfigRequest,
  GetConfigResponse,
  SetConfigRequest,
  SetConfigResponse,
} from "./types";

// In-memory policy (in production, would load from Rust/WASM core)
let currentConfig: PolicyConfig = {
  personas: [],
  rules: [],
};

// Map of hostname -> resolved persona (caching layer)
const personaCache = new Map<string, Persona>();

/**
 * Resolve the appropriate persona for a given hostname
 * Uses first-match rule ordering (rules assumed pre-sorted by specificity)
 */
function resolvePersona(host: string): Persona | null {
  // Check cache first
  if (personaCache.has(host)) {
    return personaCache.get(host)!;
  }

  // Iterate rules in order (should be sorted by specificity in core)
  for (const rule of currentConfig.rules) {
    if (matchesRule(host, rule.pattern)) {
      const persona = currentConfig.personas.find(
        (p) => p.id === rule.persona_id
      );
      if (persona) {
        personaCache.set(host, persona);
        return persona;
      }
    }
  }

  return null;
}

/**
 * Check if a hostname matches a rule pattern
 */
function matchesRule(
  host: string,
  pattern: {
    Exact?: string;
    Prefix?: string;
    Suffix?: string;
    Glob?: string;
  }
): boolean {
  if (pattern.Exact) {
    return host.toLowerCase() === pattern.Exact.toLowerCase();
  }
  if (pattern.Prefix) {
    return host.toLowerCase().startsWith(pattern.Prefix.toLowerCase());
  }
  if (pattern.Suffix) {
    return host.toLowerCase().endsWith(pattern.Suffix.toLowerCase());
  }
  if (pattern.Glob) {
    // Simple glob matching (convert * and ? to regex)
    const regex = new RegExp(
      "^" +
        pattern.Glob.replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".") +
        "$",
      "i"
    );
    return regex.test(host);
  }
  return false;
}

/**
 * Extract hostname from a URL
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/**
 * Handle incoming messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener(
  (
    message: ResolveRequest | GetConfigRequest | SetConfigRequest,
    sender,
    sendResponse
  ) => {
    if (message.type === "resolve_persona") {
      const req = message as ResolveRequest;
      const persona = resolvePersona(req.host);
      const response: ResolveResponse = {
        type: "persona_resolved",
        persona: persona || undefined,
      };
      sendResponse(response);
    } else if (message.type === "get_config") {
      const response: GetConfigResponse = {
        type: "config_retrieved",
        config: currentConfig,
      };
      sendResponse(response);
    } else if (message.type === "set_config") {
      const req = message as SetConfigRequest;
      currentConfig = req.config;
      personaCache.clear(); // Clear cache when config changes
      const response: SetConfigResponse = {
        type: "config_set",
        success: true,
      };
      sendResponse(response);
    }
  }
);

/**
 * Initialize extension with default config from storage
 */
async function initialize() {
  const stored = await chrome.storage.local.get("policyConfig");
  if (stored.policyConfig) {
    currentConfig = stored.policyConfig;
  } else {
    // Load default config (in production, would fetch from Rust core)
    currentConfig = await loadDefaultConfig();
    await chrome.storage.local.set({ policyConfig: currentConfig });
  }
  console.log("[Identity Firewall] Initialized with config:", currentConfig);
}

/**
 * Load default configuration (stub for now)
 * In production, would fetch from compiled Rust/WASM module or HTTP API
 */
async function loadDefaultConfig(): Promise<PolicyConfig> {
  return {
    personas: [
      {
        id: "standard",
        user_agent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept_language: "en-US,en;q=0.9",
        timezone: "America/New_York",
        screen: {
          width: 1920,
          height: 1080,
          color_depth: 24,
          pixel_ratio: 1,
        },
      },
      {
        id: "research",
        user_agent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept_language: "en,de;q=0.9",
        timezone: "Europe/Berlin",
        screen: {
          width: 2560,
          height: 1440,
          color_depth: 24,
          pixel_ratio: 1.5,
        },
      },
    ],
    rules: [
      {
        pattern: { Suffix: ".amazon.com" },
        persona_id: "standard",
      },
      {
        pattern: { Suffix: ".google.com" },
        persona_id: "research",
      },
    ],
  };
}

// Initialize on load
initialize().catch(console.error);
