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
import { createDefaultConfig, resolvePersonaForHost } from "./policy";

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
  return resolvePersonaForHost(currentConfig, host, personaCache);
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
    currentConfig = createDefaultConfig();
    await chrome.storage.local.set({ policyConfig: currentConfig });
  }
  console.log("[Identity Firewall] Initialized with config:", currentConfig);
}

// Initialize on load
initialize().catch(console.error);
