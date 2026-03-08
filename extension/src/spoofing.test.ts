import assert from "node:assert/strict";
import test from "node:test";

import { createSpoofingSnapshot, generateSpoofingScript } from "./spoofing";
import { Persona } from "./types";

const persona: Persona = {
  id: "standard",
  user_agent: "Mozilla/5.0 Example Browser",
  accept_language: "en-US,en;q=0.9,de;q=0.8",
  timezone: "America/New_York",
  screen: {
    width: 1920,
    height: 1080,
    color_depth: 24,
    pixel_ratio: 1.25,
  },
};

test("derives navigator and screen spoofing values from a persona", () => {
  const snapshot = createSpoofingSnapshot(persona);

  assert.deepEqual(snapshot.navigator.languages, ["en-US", "en", "de"]);
  assert.equal(snapshot.navigator.language, "en-US");
  assert.equal(snapshot.screen.availWidth, 1870);
  assert.equal(snapshot.screen.availHeight, 980);
  assert.equal(snapshot.screen.devicePixelRatio, 1.25);
});

test("generates a script that embeds the spoofed persona values", () => {
  const script = generateSpoofingScript(persona);

  assert.match(script, /navigatorSpoof/);
  assert.match(script, /screenSpoof/);
  assert.match(script, /Mozilla\/5\.0 Example Browser/);
  assert.match(script, /Identity Firewall/);
});
