/**
 * Popup UI Controller
 * Manages persona selection and configuration in the extension popup
 */

import {
  Persona,
  PolicyConfig,
  GetConfigRequest,
  GetConfigResponse,
  ResolveRequest,
  ResolveResponse,
} from "../src/types";

/**
 * Get current tab hostname
 */
async function getCurrentHostname(): Promise<string> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab.url) return "unknown";

  try {
    return new URL(tab.url).hostname;
  } catch {
    return "unknown";
  }
}

/**
 * Request config from background script
 */
async function getConfig(): Promise<PolicyConfig> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "get_config" } as GetConfigRequest,
      (response?: GetConfigResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response) {
          reject(new Error("Background script did not return configuration."));
          return;
        }

        resolve(response.config);
      }
    );
  });
}

/**
 * Request persona resolution from background script
 */
async function resolvePersona(host: string): Promise<Persona | null> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "resolve_persona", host } as ResolveRequest,
      (response?: ResolveResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve(response?.persona ?? null);
      }
    );
  });
}

/**
 * Render persona options
 */
function renderPersonas(personas: Persona[], currentPersona: Persona | null): void {
  const container = document.getElementById("persona-list")!;
  container.innerHTML = "";

  personas.forEach((persona) => {
    const div = document.createElement("div");
    div.className = "persona-option";
    if (currentPersona && currentPersona.id === persona.id) {
      div.classList.add("active");
    }

    const radio = document.createElement("div");
    radio.className = "persona-radio";

    const nameWrapper = document.createElement("div");
    nameWrapper.className = "persona-name";

    const name = document.createElement("strong");
    name.textContent = persona.id;

    const summary = document.createElement("small");
    summary.textContent = `${persona.user_agent.substring(0, 50)}...`;

    nameWrapper.appendChild(name);
    nameWrapper.appendChild(summary);
    div.appendChild(radio);
    div.appendChild(nameWrapper);

    div.addEventListener("click", () => {
      // Visual feedback only (actual persona tracking per-site would require more storage)
      document
        .querySelectorAll<HTMLElement>(".persona-option")
        .forEach((el) => el.classList.remove("active"));
      div.classList.add("active");
    });

    container.appendChild(div);
  });
}

/**
 * Initialize popup
 */
async function initialize() {
  const hostname = await getCurrentHostname();
  const config = await getConfig();
  const persona = await resolvePersona(hostname);

  // Update hostname display
  document.getElementById("current-hostname")!.textContent =
    hostname || "unknown";

  // Update status
  const statusEl = document.getElementById("status")!;
  if (persona) {
    statusEl.textContent = `Persona: "${persona.id}" (matched)`;
    statusEl.style.color = "#9fff9f";
  } else {
    statusEl.textContent = "No matching persona found";
    statusEl.style.color = "#ffb3b3";
  }

  // Update stats
  document.getElementById("personas-count")!.textContent =
    config.personas.length.toString();
  document.getElementById("rules-count")!.textContent =
    config.rules.length.toString();

  // Render personas
  renderPersonas(config.personas, persona);

  // Show content, hide loading
  document.getElementById("loading")!.style.display = "none";
  document.getElementById("content")!.style.display = "block";

  // Set up button handlers
  document.getElementById("reset-btn")!.addEventListener("click", () => {
    // Reset would clear local persona overrides if they existed
    alert("Reset clicked - would clear persona overrides");
  });

  document.getElementById("settings-btn")!.addEventListener("click", () => {
    // Open settings page
    chrome.runtime.openOptionsPage();
  });
}

// Initialize on load
initialize().catch(console.error);
