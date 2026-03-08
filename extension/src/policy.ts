import { Persona, PolicyConfig, RulePattern } from "./types";

export function matchesRule(host: string, pattern: RulePattern): boolean {
  if ("Exact" in pattern) {
    return host.toLowerCase() === pattern.Exact.toLowerCase();
  }

  if ("Prefix" in pattern) {
    return host.toLowerCase().startsWith(pattern.Prefix.toLowerCase());
  }

  if ("Suffix" in pattern) {
    return host.toLowerCase().endsWith(pattern.Suffix.toLowerCase());
  }

  if ("Glob" in pattern) {
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

export function resolvePersonaForHost(
  config: PolicyConfig,
  host: string,
  cache?: Map<string, Persona>
): Persona | null {
  const cachedPersona = cache?.get(host);
  if (cachedPersona) {
    return cachedPersona;
  }

  for (const rule of config.rules) {
    if (!matchesRule(host, rule.pattern)) {
      continue;
    }

    const persona = config.personas.find(
      (candidate) => candidate.id === rule.persona_id
    );
    if (persona) {
      cache?.set(host, persona);
      return persona;
    }
  }

  return null;
}

export function getHostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function createDefaultConfig(): PolicyConfig {
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
