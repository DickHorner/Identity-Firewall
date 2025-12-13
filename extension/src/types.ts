/**
 * Shared TypeScript types for the Identity Firewall extension
 */

export interface Persona {
  id: string;
  user_agent: string;
  accept_language: string;
  timezone: string;
  screen: {
    width: number;
    height: number;
    color_depth: number;
    pixel_ratio?: number;
  };
}

export interface Rule {
  pattern: RulePattern;
  persona_id: string;
}

export type RulePattern =
  | { Exact: string }
  | { Prefix: string }
  | { Suffix: string }
  | { Glob: string };

export interface Policy {
  personas: Record<string, Persona>;
  rules: Rule[];
}

export interface PolicyConfig {
  personas: Persona[];
  rules: Array<{
    pattern: RulePattern;
    persona_id: string;
  }>;
}

export interface ExtensionMessage {
  type: string;
  payload?: unknown;
}

export interface ResolveRequest {
  type: "resolve_persona";
  host: string;
}

export interface ResolveResponse {
  type: "persona_resolved";
  persona?: Persona;
  error?: string;
}

export interface GetConfigRequest {
  type: "get_config";
}

export interface GetConfigResponse {
  type: "config_retrieved";
  config: PolicyConfig;
}

export interface SetConfigRequest {
  type: "set_config";
  config: PolicyConfig;
}

export interface SetConfigResponse {
  type: "config_set";
  success: boolean;
  error?: string;
}

// DOM Spoofing Interfaces

export interface NavigatorSpoof {
  userAgent: string;
  language: string;
  languages: string[];
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints?: number;
}

export interface ScreenSpoof {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
}

export interface HeaderRewrite {
  [key: string]: string;
}

export interface FingerprintingVector {
  name: string;
  spoofed: boolean;
  value: string;
}
