import { spawnSync } from "node:child_process";
import { accessSync, constants, readdirSync } from "node:fs";
import { dirname, delimiter, join } from "node:path";

const [, , ...cargoArgs] = process.argv;

if (cargoArgs.length === 0) {
  console.error("Usage: node scripts/run-rust.mjs <cargo-args...>");
  process.exit(1);
}

function isExecutable(filePath) {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveCargoExecutable() {
  const rustupToolchainsRoot =
    process.platform === "win32"
      ? join(process.env.USERPROFILE ?? "", ".rustup", "toolchains")
      : join(process.env.HOME ?? "", ".rustup", "toolchains");
  const toolchainCandidates = [];

  try {
    for (const entry of readdirSync(rustupToolchainsRoot, {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) {
        continue;
      }

      toolchainCandidates.push(
        join(
          rustupToolchainsRoot,
          entry.name,
          "bin",
          process.platform === "win32" ? "cargo.exe" : "cargo"
        )
      );
    }
  } catch {
    // Ignore missing rustup directories and continue with other candidates.
  }

  const candidates = [
    process.env.CARGO,
    process.platform === "win32"
      ? join(process.env.USERPROFILE ?? "", ".cargo", "bin", "cargo.exe")
      : join(process.env.HOME ?? "", ".cargo", "bin", "cargo"),
    ...toolchainCandidates,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }

  return "cargo";
}

const cargo = resolveCargoExecutable();

if (!cargo) {
  console.error(
    "Cargo is not installed or not available on PATH. Install Rust with rustup, then rerun the workspace checks."
  );
  process.exit(1);
}

const result = spawnSync(cargo, cargoArgs, {
  env: {
    ...process.env,
    PATH: `${dirname(cargo)}${delimiter}${process.env.PATH ?? ""}`,
  },
  stdio: "inherit",
  shell: process.platform === "win32" && cargo === "cargo",
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
