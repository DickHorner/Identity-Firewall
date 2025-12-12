# Identity Firewall

## Kurzbeschreibung

Die **Identity Firewall** ist eine Schicht zwischen Nutzer:in und Web, die steuert, **welche "digitale Identität" Websites zu sehen bekommen**.

Statt dass jede Seite dein echtes Setup ausliest (User-Agent, Bildschirmgröße, Sprache, Zeitzone, Fingerprinting-Signale), erzwingt die Identity Firewall **vordefinierte Personas**:

- Für Shops, Flüge, Hotels: ein **normiertes, langweiliges Standardprofil**, um personalisierte Preise / Surveillance Pricing zu erschweren.
- Für Research & Aktivismus: mehrere Personas, um **Preisunterschiede systematisch zu messen**.

Das Projekt richtet sich an Hacker:innen / Aktivist:innen, die Profiling, Fingerprinting und personalisierte Preisdiskriminierung **technisch untersuchen und abschwächen** wollen.

---

## Ziele

1. **Policy Engine für Identitäten**  
   - Definierbare *Personas* (Identity-Profile) mit:
     - User-Agent
     - Accept-Language / navigator.languages
     - Zeitzone
     - Screen-Parameter
     - weitere Fingerprinting-relevante Merkmale (wo sinnvoll und machbar)
   - Definierbare *Rules*, die pro Domain/Host festlegen, welche Persona verwendet wird.

2. **Spoofing / Normierung von Identitätssignalen**
   - Auf HTTP-Ebene:
     - Überschreiben relevanter Header (User-Agent, Accept-Language, ggf. Sec-CH-*).
   - Auf JS-Ebene im Browser:
     - Spoofing von `navigator.*`, `screen.*`, `Intl.DateTimeFormat().resolvedOptions()`, etc.
   - Ziel: **Profilierbarkeit minimieren**, ohne Seiten unnötig kaputt zu machen.

3. **Transparenz & Logging**
   - Pro Anfrage sehen:
     - welche Persona angewendet wurde,
     - welche Identity-Felder angefragt / überschrieben wurden.
   - Logs sollen **privacy-aware** sein (kein Klartext echter Nutzerdaten).

4. **Experiment- und Research-Modus**
   - Mehrere Personas gegen die **gleiche URL** laufen lassen.
   - Preis-/Antwortunterschiede erkennen und (später) exportierbar machen.
   - Basis für Aktivismus, Talks, Papers.

---

## Nicht-Ziele (v1)

- Kein vollwertiger Unternehmens-Proxy, kein Enterprise-Produkt.
- Keine vollständige Anti-Fingerprinting-Magic (wir reduzieren Angriffsfläche, aber lösen das Problem nicht final).
- Kein Angriffstool. Ziel ist **Schutz + Aufklärung**, nicht Exploits / Betrug.

---

## Architekturüberblick

Das Projekt besteht aus mehreren Komponenten.

### 1. `core/` – Rust Policy Engine (und optional Proxy)

**Zweck:**  
Zentrale Logik für Personas, Regeln und (optional) HTTP(S)-Proxy.

**Sprache / Tech:**
- Rust (Edition 2021+)
- Async-Stack: `tokio`
- HTTP: z. B. `hyper` / `reqwest` (für Proxy-Teil)
- TLS: `rustls` (falls MITM-Proxy implementiert wird)
- Config / Serialization: `serde`, `serde_json` bzw. `toml`

**Aufgaben:**
- Datenmodelle:
  - `Persona`: Identity-Profil mit o. g. Feldern.
  - `Rule`: Zuordnung Domain/Pattern → Persona.
- Policy-Engine:
  - API: `resolve_persona(RequestContext) -> Persona`.
- Logging:
  - Strukturierte Logs (z. B. JSON-Lines) mit:
    - Timestamp
    - Domain / Host
    - angewendeter Persona-ID
    - relevante Flags (z. B. "headers_rewritten", "navigator_spoofed").
- Optional: HTTP(S)-Proxy:
  - HTTP-Requests entgegennehmen.
  - Policy anwenden.
  - Header rewriten.
  - an Ziel weiterleiten.

**Wichtige Anforderungen:**
- Saubere Fehlerbehandlung (`thiserror` o.ä.).
- Unit-Tests für:
  - Config-Laden,
  - Pattern-Matching bei Rules,
  - Persona-Resolution.

---

### 2. `extension/` – Browser-Erweiterung (Firefox zuerst)

**Zweck:**  
Konkrete Integration in den Browser, um **Header + JS-Umgebung** zu spoofen.

**Sprache / Tech:**
- TypeScript (bevorzugt) oder JavaScript
- WebExtension-API (Firefox als erste Zielplattform)
- Build-Tool: z. B. `npm`/`pnpm` + `esbuild` oder `vite`

**Komponenten:**
- `manifest.json`
- `background`-Script:
  - Hook in `webRequest` (oder `declarativeNetRequest`), um:
    - Persona für Domain zu ermitteln (zunächst aus lokaler Config, später optional via Native Messaging / Core).
    - HTTP-Header umzuschreiben.
- `content scripts` (mit `run_at: "document_start"`):
  - JS-Shims, die:
    - `navigator.userAgent`, `navigator.languages`, `screen.width/height`, `Intl.DateTimeFormat().resolvedOptions()` etc. überschreiben.
  - Ziel: möglichst früh und möglichst unauffällig.

**Hinweise für Implementierung:**
- Spoofing **nicht** exotisch machen:
  - Personas sollen auf häufigen Konfigurationen basieren (z. B. gängige Auflösungen, Browser/OS).
- Logging:
  - Extension kann (Debug-Modus) anzeigen:
    - Welche Persona gerade aktiv ist.
    - Welche Properties überschrieben wurden.

---

### 3. `gui/` – Optional: Tauri Desktop-App

**Zweck:**  
Human-freundliche Oberfläche, um:

- Personas anzulegen / zu editieren.
- Domain-Regeln zu definieren.
- Logs aus `core` zu sichten.
- ggf. Experimente (Mehr-Persona-Tests) anzustoßen.

**Tech:**
- Tauri (Rust + Web-UI)
- Frontend: einfache Web-UI (z. B. Svelte/React/Vue – Detail ist sekundär).
- Kommunikation mit `core`:
  - Direkt über Rust-Crate oder
  - über eine kleine lokale HTTP/IPC-API.

**Nice-to-have, kein Muss für MVP.**

---

## Projektstruktur (Vorschlag)

```text
identity-firewall/
├─ core/
│  ├─ src/
│  │  ├─ lib.rs
│  │  ├─ persona.rs
│  │  ├─ rules.rs
│  │  ├─ policy.rs
│  │  ├─ logging.rs
│  │  └─ proxy.rs      # optional
│  ├─ Cargo.toml
│  └─ tests/
├─ extension/
│  ├─ src/
│  │  ├─ background.ts
│  │  ├─ content.ts
│  │  └─ types.ts
│  ├─ manifest.json
│  ├─ package.json
│  └─ tsconfig.json
├─ gui/                 # optional (Tauri)
│  ├─ src/
│  ├─ src-tauri/
│  └─ package.json
├─ docs/
│  ├─ THREAT_MODEL.md
│  ├─ ARCHITECTURE.md
│  └─ USAGE.md
└─ Cargo.toml           # Workspace-Root
```
## Threat Model (Kurzfassung für Implementierung)
**Gegner:**
* Webseiten/Plattformen, die:
  * Fingerprinting durchführen,
  * Tracking betreiben,
  * Preise und Angebote anhand von Identitätsmerkmalen variieren.
**Schutzgüter:**
  * Reduktion der Profilierbarkeit.
  * Erschwerung von personalisierter Preisdiskriminierung.
  * Transparenz, welche Identitätssignale abgefragt werden.
**Strategie:**
  * Identity-Signale normieren oder vereinheitlichen (Personas).
  * Möglichst in der „Masse“ verschwinden (keine Exotenwerte).
  * Logging und Experiment-Modi, um Muster aufzudecken.

## Coding-Guidelines (für Menschen & Copilot)
**Rust (core/)**
  * Edition 2021, #![forbid(unsafe_code)] wenn möglich.
  * Fehlerbehandlung über Result<T, Error> mit eigener Error-Typ-Hierarchie (z. B. thiserror).
  * Unit-Tests für alle zentralen Funktionen (Policy-Resolution, Config-Laden).
  * Konfigurationsdateien:
    * JSON oder TOML, klar typisiert.
  * Keine unnötigen Abhängigkeiten:
  * Bevorzugt Standardbibliothek + wenige, etablierte Crates.

**TypeScript (extension/)**
  * Nutze TypeScript (keine lose any-Typen).
  * Strikte Trennung:
    * background-Logik (Netzwerk / Header).
    * content-Logik (JS-Spoofing im DOM).
    * types.ts für gemeinsame Typen (Persona, Rule, Messages).
* Baue einfache Scripts für:
  * build (Extension bundlen),
  * lint (falls vorhanden),
  * test (später).

**Allgemein**
* Dokumentation:
  * kurze, präzise Kommentare bei allen öffentlichen APIs.
  * Markdown-Dokumente in docs/ für Threat Model & Architektur.
* Logging:
  Logging so gestalten, dass keine echten sensiblen Daten geloggt werden,
  sondern nur:
    * Host/Domäne,
    * angewendete Persona-ID,
    * technische Flags.
  ---
## Minimal Viable Product (MVP) Definition

Für den ersten lauffähigen Stand:
1. Rust-Core mit Personas + Rules + JSON-Config
2. Firefox-Extension, die:
   * eine einfache, statische Config mit Personas/Rules lädt,
   * pro Domain:
     * User-Agent + Accept-Language umschreibt,
     * navigator.userAgent + navigator.language(s) spoofen kann.

3. Minimal-Logging:
   * Ausgabe auf der Konsole oder in eine einfache Logdatei:
     * timestamp, host, persona_id.

Alles Weitere (Proxy, Tauri-GUI, komplexeres Fingerprinting-Hardening, Experiment-UI) kann in Iterationen folgen.