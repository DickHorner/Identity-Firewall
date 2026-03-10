/**
 * Identity Firewall Content Script
 * Injects spoofing code and rewrites request headers to match selected persona
 */

import {
  Persona,
  ResolveRequest,
  ResolveResponse,
} from "./types";
import { generateSpoofingScript } from "./spoofing";
import { normalizeHostname } from "./validation";

/**
 * Get the current hostname
 */
function getCurrentHostname(): string | null {
  return normalizeHostname(window.location.hostname);
}

/**
 * Query background script for the appropriate persona
 */
async function getPersonaForHost(host: string): Promise<Persona | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "resolve_persona", host } as ResolveRequest,
      (response?: ResolveResponse) => {
        if (chrome.runtime.lastError || !response || response.error) {
          resolve(null);
          return;
        }

        resolve(response.persona || null);
      }
    );
  });
}

/**
 * Inject spoofing code into the page context
 * Must be done before any scripts run (hence run_at: document_start)
 */
function injectSpoofingCode(persona: Persona): void {
  const script = document.createElement("script");
  script.textContent = generateSpoofingScript(persona);
  script.setAttribute("data-identity-firewall", "true");

  // Inject as early as possible
  const target = document.head || document.documentElement;
  target.prepend(script);
  script.remove();
}

/**
 * Main initialization
 */
async function initialize() {
  const hostname = getCurrentHostname();
  if (!hostname) {
    return;
  }

  const persona = await getPersonaForHost(hostname);

  if (persona) {
    // Inject spoofing code into page context
    injectSpoofingCode(persona);

    console.info(
      `[Identity Firewall] Applied persona "${persona.id}" to ${hostname}`
    );
  } else {
    console.info(`[Identity Firewall] No persona matched for ${hostname}`);
  }
}

// Run initialization
void initialize().catch((error: unknown) => {
  console.error("[Identity Firewall] Failed to initialize content script.", error);
});
