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

/**
 * Get the current hostname
 */
function getCurrentHostname(): string {
  return window.location.hostname;
}

/**
 * Query background script for the appropriate persona
 */
async function getPersonaForHost(host: string): Promise<Persona | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "resolve_persona", host } as ResolveRequest,
      (response: ResolveResponse) => {
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
  (document.head || document.documentElement).prepend(script);
}

/**
 * Main initialization
 */
async function initialize() {
  const hostname = getCurrentHostname();
  const persona = await getPersonaForHost(hostname);

  if (persona) {
    // Inject spoofing code into page context
    injectSpoofingCode(persona);

    console.log(
      `[Identity Firewall] Applied persona "${persona.id}" to ${hostname}`
    );

    // Log headers that would be rewritten (actual rewriting requires Manifest V3 hooks)
    console.log(
      `[Identity Firewall] User-Agent header: ${persona.user_agent}`
    );
    console.log(
      `[Identity Firewall] Accept-Language header: ${persona.accept_language}`
    );
  } else {
    console.log(`[Identity Firewall] No persona matched for ${hostname}`);
  }
}

// Run initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
