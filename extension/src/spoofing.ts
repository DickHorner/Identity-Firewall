import { NavigatorSpoof, Persona, ScreenSpoof } from "./types";

export interface SpoofingSnapshot {
  navigator: NavigatorSpoof;
  screen: ScreenSpoof;
}

export function createSpoofingSnapshot(persona: Persona): SpoofingSnapshot {
  return {
    navigator: {
      userAgent: persona.user_agent,
      language: persona.accept_language.split(",")[0].split(";")[0],
      languages: persona.accept_language
        .split(",")
        .map((lang) => lang.split(";")[0].trim()),
    },
    screen: {
      width: persona.screen.width,
      height: persona.screen.height,
      availWidth: persona.screen.width - 50,
      availHeight: persona.screen.height - 100,
      colorDepth: persona.screen.color_depth,
      pixelDepth: persona.screen.color_depth,
      devicePixelRatio: persona.screen.pixel_ratio || 1,
    },
  };
}

export function generateSpoofingScript(persona: Persona): string {
  const snapshot = createSpoofingSnapshot(persona);

  return `
(function() {
  'use strict';

  const navigatorSpoof = ${JSON.stringify(snapshot.navigator)};

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

  const screenSpoof = ${JSON.stringify(snapshot.screen)};

  Object.defineProperty(window, 'screen', {
    get: () => screenSpoof,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(window, 'devicePixelRatio', {
    get: () => screenSpoof.devicePixelRatio,
    enumerable: true,
    configurable: true,
  });

  const originalMatchMedia = window.matchMedia;
  window.matchMedia = function(query) {
    const mediaQuery = query.toLowerCase();
    if (mediaQuery.includes('width') || mediaQuery.includes('height')) {
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

  function evaluateMediaQuery(query, screen) {
    if (query.includes('min-width')) {
      const match = query.match(/min-width[:\\s]*(\\d+)/i);
      if (match) return screen.width >= parseInt(match[1], 10);
    }
    if (query.includes('max-width')) {
      const match = query.match(/max-width[:\\s]*(\\d+)/i);
      if (match) return screen.width <= parseInt(match[1], 10);
    }
    if (query.includes('min-height')) {
      const match = query.match(/min-height[:\\s]*(\\d+)/i);
      if (match) return screen.height >= parseInt(match[1], 10);
    }
    if (query.includes('max-height')) {
      const match = query.match(/max-height[:\\s]*(\\d+)/i);
      if (match) return screen.height <= parseInt(match[1], 10);
    }
    return false;
  }

  console.log('[Identity Firewall] Spoofing active for persona: ${persona.id}');
})();
`;
}
