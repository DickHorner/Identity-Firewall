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
import { normalizeHostname, validatePolicyConfig } from "./validation";

// In-memory policy (in production, would load from Rust/WASM core)
let currentConfig: PolicyConfig = {
  personas: [],
  rules: [],
};

// Map of hostname -> resolved persona (caching layer)
const personaCache = new Map<string, Persona>();

function logInfo(message: string): void {
  console.info(`[Identity Firewall] ${message}`);
}

function logWarn(message: string): void {
  console.warn(`[Identity Firewall] ${message}`);
}

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
      const host = normalizeHostname(req.host);
      if (!host) {
        sendResponse({
          type: "persona_resolved",
          error: "Invalid hostname.",
        } satisfies ResolveResponse);
        return;
      }

      const persona = resolvePersona(host);
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
      const validation = validatePolicyConfig(req.config);
      if (!validation.ok) {
        sendResponse({
          type: "config_set",
          success: false,
          error: validation.error,
        } satisfies SetConfigResponse);
        return;
      }

      currentConfig = validation.value!;
      personaCache.clear(); // Clear cache when config changes
      void chrome.storage.local
        .set({ policyConfig: currentConfig })
        .catch(() => logWarn("Failed to persist validated policy config."));
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
  const storedConfig = stored.policyConfig;
  if (storedConfig) {
    const validation = validatePolicyConfig(storedConfig);
    if (validation.ok) {
      currentConfig = validation.value!;
    } else {
      currentConfig = createDefaultConfig();
      await chrome.storage.local.set({ policyConfig: currentConfig });
      logWarn(
        `Ignored invalid policyConfig from storage and restored defaults: ${validation.error}`
      );
    }
  } else {
    // Load default config (in production, would fetch from Rust core)
    currentConfig = createDefaultConfig();
    await chrome.storage.local.set({ policyConfig: currentConfig });
  }
  logInfo(
    `Initialized with ${currentConfig.personas.length} personas and ${currentConfig.rules.length} rules.`
  );
}

// Initialize on load
initialize().catch((error: unknown) => {
  console.error(
    "[Identity Firewall] Failed to initialize background service worker.",
    error
  );
});
