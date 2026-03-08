import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultConfig,
  getHostnameFromUrl,
  matchesRule,
  resolvePersonaForHost,
} from "./policy";
import { PolicyConfig } from "./types";

test("matches exact, prefix, suffix, and glob patterns case-insensitively", () => {
  assert.equal(matchesRule("Example.com", { Exact: "example.com" }), true);
  assert.equal(matchesRule("shop.example.com", { Prefix: "shop." }), true);
  assert.equal(matchesRule("shop.example.com", { Suffix: ".example.com" }), true);
  assert.equal(matchesRule("api.example.com", { Glob: "*.example.com" }), true);
  assert.equal(matchesRule("example.org", { Suffix: ".example.com" }), false);
});

test("resolves and caches personas for matching hosts", () => {
  const config = createDefaultConfig();
  const cache = new Map();

  const persona = resolvePersonaForHost(config, "www.google.com", cache);

  assert.equal(persona?.id, "research");
  assert.equal(cache.get("www.google.com")?.id, "research");
});

test("returns null when no persona matches the host", () => {
  const config: PolicyConfig = {
    personas: [{ ...createDefaultConfig().personas[0] }],
    rules: [{ pattern: { Exact: "example.com" }, persona_id: "standard" }],
  };

  assert.equal(resolvePersonaForHost(config, "unknown.test"), null);
});

test("extracts hostnames from valid URLs and rejects invalid ones", () => {
  assert.equal(getHostnameFromUrl("https://shop.example.com/path"), "shop.example.com");
  assert.equal(getHostnameFromUrl("not a url"), "");
});
