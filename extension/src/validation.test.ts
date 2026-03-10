import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHostname, validatePolicyConfig } from "./validation";

test("normalizes hostnames and rejects invalid host inputs", () => {
  assert.equal(normalizeHostname(" Example.COM. "), "example.com");
  assert.equal(normalizeHostname("LOCALHOST"), "localhost");
  assert.equal(normalizeHostname("192.168.0.10"), "192.168.0.10");
  assert.equal(normalizeHostname("bad host"), null);
  assert.equal(normalizeHostname("example.com/path"), null);
  assert.equal(normalizeHostname("-example.com"), null);
  assert.equal(normalizeHostname("256.0.0.1"), null);
});

test("accepts well-formed policy config objects", () => {
  const result = validatePolicyConfig({
    personas: [
      {
        id: "standard",
        user_agent: "Mozilla/5.0 Example Browser",
        accept_language: "en-US,en;q=0.9",
        timezone: "Europe/Berlin",
        screen: {
          width: 1920,
          height: 1080,
          color_depth: 24,
          pixel_ratio: 1.25,
        },
      },
    ],
    rules: [{ pattern: { Exact: "example.com" }, persona_id: "standard" }],
  });

  assert.equal(result.ok, true);
  assert.equal(result.value?.personas[0]?.id, "standard");
  assert.equal(result.value?.rules[0]?.persona_id, "standard");
});

test("rejects malformed policy config objects", () => {
  const duplicateIds = validatePolicyConfig({
    personas: [
      {
        id: "dup",
        user_agent: "Mozilla/5.0 A",
        accept_language: "en-US",
        timezone: "UTC",
        screen: { width: 1, height: 1, color_depth: 24 },
      },
      {
        id: "dup",
        user_agent: "Mozilla/5.0 B",
        accept_language: "en-US",
        timezone: "UTC",
        screen: { width: 1, height: 1, color_depth: 24 },
      },
    ],
    rules: [],
  });

  const unknownPersonaRule = validatePolicyConfig({
    personas: [
      {
        id: "standard",
        user_agent: "Mozilla/5.0 Example Browser",
        accept_language: "en-US",
        timezone: "UTC",
        screen: { width: 1920, height: 1080, color_depth: 24 },
      },
    ],
    rules: [{ pattern: { Exact: "example.com" }, persona_id: "missing" }],
  });

  const invalidScreen = validatePolicyConfig({
    personas: [
      {
        id: "standard",
        user_agent: "Mozilla/5.0 Example Browser",
        accept_language: "en-US",
        timezone: "UTC",
        screen: { width: 0, height: 1080, color_depth: 24 },
      },
    ],
    rules: [],
  });

  assert.equal(duplicateIds.ok, false);
  assert.match(duplicateIds.error ?? "", /Duplicate persona id/);
  assert.equal(unknownPersonaRule.ok, false);
  assert.match(unknownPersonaRule.error ?? "", /unknown persona_id/);
  assert.equal(invalidScreen.ok, false);
  assert.match(invalidScreen.error ?? "", /screen dimensions/);
});
