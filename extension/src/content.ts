/**
 * Identity Firewall Content Script
 * Injects spoofing code and rewrites request headers to match selected persona
 */

import {
  Persona,
  ResolveRequest,
  ResolveResponse,
} from "./types";

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
 * Generate JavaScript code that spoofs Navigator and Screen APIs
 * This runs in the page's context, not the content script context
 */
function generateSpoofingScript(persona: Persona): string {
  const nav = {
    userAgent: persona.user_agent,
    language: persona.accept_language.split(",")[0].split(";")[0],
    languages: persona.accept_language
      .split(",")
      .map((lang) => lang.split(";")[0].trim()),
  };

  const screen = {
    width: persona.screen.width,
    height: persona.screen.height,
    availWidth: persona.screen.width - 50,
    availHeight: persona.screen.height - 100,
    colorDepth: persona.screen.color_depth,
    pixelDepth: persona.screen.color_depth,
    devicePixelRatio: persona.screen.pixel_ratio || 1,
  };

  // Generate spoofing code as a self-executing function
  return `
(function() {
  'use strict';

  // Spoof Navigator properties
  const navigatorSpoof = ${JSON.stringify(nav)};
  
  Object.defineProperty(navigator, 'userAgent', {
    get: () => navigatorSpoof.userAgent,
    enumerable: true,
    configurable: true,
  });
  
  Object.defineProperty(navigator, 'language', {
    get: () => navigatorSpoof.language,
    enumerable: true,
    configurable: true,
  });
  
  Object.defineProperty(navigator, 'languages', {
    get: () => Object.freeze([...navigatorSpoof.languages]),
    enumerable: true,
    configurable: true,
  });

  // Spoof Screen properties (read-only, so we replace the object)
  const screenSpoof = ${JSON.stringify(screen)};
  
  Object.defineProperty(window, 'screen', {
    get: () => screenSpoof,
    enumerable: true,
    configurable: true,
  });

  // Spoof devicePixelRatio
  Object.defineProperty(window, 'devicePixelRatio', {
    get: () => screenSpoof.devicePixelRatio,
    enumerable: true,
    configurable: true,
  });

  // Spoof matchMedia for screen size queries
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = function(query) {
    const mediaQuery = query.toLowerCase();
    if (mediaQuery.includes('width') || mediaQuery.includes('height')) {
      // Parse and evaluate against spoofed screen
      const result = evaluateMediaQuery(query, screenSpoof);
      return {
        matches: result,
        media: query,
        onchange: null,
        addListener: function() {},
        removeListener: function() {},
        addEventListener: function() {},
        removeEventListener: function() {},
        dispatchEvent: function() { return true; },
      };
    }
    return originalMatchMedia.call(this, query);
  };

  // Helper to evaluate media queries against spoofed screen
  function evaluateMediaQuery(query, screen) {
    const numRegex = /\\d+(?:\\.\\d+)?/g;
    if (query.includes('min-width')) {
      const match = query.match(/min-width[:\\s]*(\\d+)/i);
      if (match) return screen.width >= parseInt(match[1]);
    }
    if (query.includes('max-width')) {
      const match = query.match(/max-width[:\\s]*(\\d+)/i);
      if (match) return screen.width <= parseInt(match[1]);
    }
    if (query.includes('min-height')) {
      const match = query.match(/min-height[:\\s]*(\\d+)/i);
      if (match) return screen.height >= parseInt(match[1]);
    }
    if (query.includes('max-height')) {
      const match = query.match(/max-height[:\\s]*(\\d+)/i);
      if (match) return screen.height <= parseInt(match[1]);
    }
    return false;
  }

  console.log('[Identity Firewall] Spoofing active for persona: ${persona.id}');
})();
`;
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
