# Identity Firewall – Threat Model

## Overview

The Identity Firewall protects users against profiling, tracking, and discriminatory pricing by controlling which digital identity signals websites receive. This document outlines the adversaries, protected assets, attack surfaces, and defense strategies.

---

## Adversaries

### Primary Adversaries

1. **E-commerce platforms & price engines**
   - Perform differential pricing based on user profiles
   - Use device fingerprints, location, browsing history to vary prices
   - Examples: airlines, hotels, online retailers

2. **Tracking & advertising networks**
   - Build persistent user profiles across sites
   - Leverage identity signals for cross-site correlation
   - Monetize behavioral data

3. **Fingerprinting services**
   - Generate unique device/browser signatures
   - Use canvas, WebGL, audio, fonts, screen parameters
   - Sell fingerprinting-as-a-service to third parties

### Capabilities

- **Passive observation**: Read HTTP headers, JavaScript properties, timing channels
- **Active probing**: Execute scripts to extract additional identity signals
- **Cross-site correlation**: Link users across domains via consistent fingerprints
- **Behavioral analysis**: Track patterns over time to re-identify users

---

## Protected Assets

### User Privacy Attributes

1. **Device identity**
   - User-Agent string
   - Screen resolution, color depth, pixel ratio
   - Platform, CPU architecture

2. **Locale & preferences**
   - Accept-Language headers
   - Timezone (Intl API)
   - navigator.languages array

3. **Behavioral consistency**
   - Stable fingerprint across sessions
   - Reduced unique entropy

4. **Price fairness**
   - Ability to receive non-discriminatory pricing
   - Transparent comparison of offers across personas

---

## Attack Surfaces

### 1. HTTP Headers
**Vectors:**
- User-Agent, Accept-Language, Accept-Encoding
- Client Hints (Sec-CH-UA, Sec-CH-UA-Platform, etc.)
- Custom tracking headers

**Defense:**
- Rewrite outgoing headers per persona
- Normalize or strip client hints

### 2. JavaScript Navigator & Screen APIs
**Vectors:**
- `navigator.userAgent`, `navigator.platform`
- `navigator.languages`, `navigator.hardwareConcurrency`
- `screen.width`, `screen.height`, `screen.colorDepth`
- `Intl.DateTimeFormat().resolvedOptions()`

**Defense:**
- Inject content scripts at `document_start`
- Override properties with persona-defined values
- Ensure consistency between HTTP and JS signals

### 3. Canvas, WebGL, Audio Fingerprinting
**Vectors:**
- Render canvases and hash pixel output
- Query WebGL parameters (renderer, vendor)
- Analyze audio synthesis variations

**Defense (future):**
- Normalize canvas rendering (requires deeper instrumentation)
- Block or spoof WebGL properties
- Current scope: not addressed in MVP

### 4. Timing Channels
**Vectors:**
- Performance API, high-resolution timers
- CPU/GPU benchmarks

**Defense:**
- Out of scope for v1
- Consider timer resolution reduction in future

---

## Defense Strategy

### 1. Identity Normalization via Personas

**Approach:**
- Define stable, common persona profiles
- Avoid exotic configurations that increase uniqueness
- Base personas on real-world distributions (e.g., most common screen resolutions, browsers)

**Benefits:**
- Blend into the crowd
- Reduce entropy of fingerprint
- Maintain site compatibility

### 2. Policy-Driven Per-Domain Mapping

**Approach:**
- Rules map domains → personas
- First matching rule wins (order matters)
- Support exact, suffix, prefix, glob patterns

**Benefits:**
- Granular control (different persona for shopping vs. research)
- Experiment mode: test multiple personas against same site

### 3. Transparency & Logging

**Approach:**
- Log which persona was applied
- Record identity signals requested/rewritten
- Privacy-aware: no plaintext sensitive user data

**Benefits:**
- Auditability
- Research data for surveillance pricing studies
- User awareness of tracking attempts

### 4. Defense-in-Depth

**Layers:**
1. **HTTP layer**: Header rewriting (extension or proxy)
2. **JavaScript layer**: Content script overrides
3. **Configuration layer**: User-controlled persona definitions
4. **Logging layer**: Transparent activity records

**Limitations:**
- Cannot defend against all fingerprinting (canvas, WebGL require deep browser modifications)
- Trade-off between protection and site breakage
- Not a substitute for Tor or full anonymity systems

---

## Non-Goals

1. **Complete anonymity**
   - Not a Tor replacement
   - Focus is on reducing profiling, not achieving unlinkability

2. **Zero site breakage**
   - Some sites may detect inconsistencies
   - Users can adjust personas for compatibility

3. **Protection against legal/ISP surveillance**
   - Does not hide IP address
   - No encryption beyond standard HTTPS

4. **Enterprise/compliance features**
   - Not designed for corporate policy enforcement
   - Activist/researcher tool, not enterprise product

---

## Evaluation Criteria

### Success Metrics

1. **Entropy reduction**: Decrease in uniquely identifying signal combinations
2. **Price variance detection**: Ability to measure price differences across personas
3. **Site compatibility**: Percentage of sites functioning normally
4. **User control**: Ease of creating and testing personas

### Failure Modes

1. **Detection avoidance failure**: Sites block or flag persona usage
2. **Increased uniqueness**: Poor persona design makes user *more* identifiable
3. **Consistency breaks**: Mismatched HTTP and JS signals reveal spoofing

---

## Future Improvements

- **Canvas fingerprint defense**: Normalize rendering outputs
- **WebGL spoofing**: Override vendor/renderer strings
- **Font enumeration blocking**: Limit exposed font list
- **Client Hints management**: Comprehensive Sec-CH-* header control
- **Automated persona optimization**: ML-based selection from common configurations
- **Experiment automation**: Parallel multi-persona testing with diff analysis

---

## References

- [AmIUnique](https://amiunique.org/) – Browser fingerprinting database
- [Cover Your Tracks (EFF)](https://coveryourtracks.eff.org/) – Fingerprint testing tool
- [Surveillance Pricing research](https://www.consumerreports.org/electronics-computers/privacy/online-shopping-and-dynamic-pricing-a0605881058/) – Consumer Reports
