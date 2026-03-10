import { Persona, PolicyConfig, Rule, RulePattern } from "./types";

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

function success<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

function failure<T>(error: string): ValidationResult<T> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isPositiveNumber(value) && Number.isInteger(value);
}

export function normalizeHostname(host: string): string | null {
  const normalized = host.trim().toLowerCase().replace(/\.+$/, "");

  if (!normalized || normalized.length > 253) {
    return null;
  }

  if (/[\s/\\?#\u0000]/.test(normalized)) {
    return null;
  }

  if (normalized === "localhost") {
    return normalized;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) {
    const octets = normalized.split(".").map(Number);
    return octets.every((octet) => octet >= 0 && octet <= 255)
      ? normalized
      : null;
  }

  const labels = normalized.split(".");
  if (labels.some((label) => label.length === 0 || label.length > 63)) {
    return null;
  }

  if (
    labels.some(
      (label) =>
        !/^[a-z0-9-]+$/.test(label) ||
        label.startsWith("-") ||
        label.endsWith("-")
    )
  ) {
    return null;
  }

  return normalized;
}

function validateRulePattern(candidate: unknown): ValidationResult<RulePattern> {
  if (!isRecord(candidate)) {
    return failure("Rule pattern must be an object.");
  }

  const patternKeys = ["Exact", "Prefix", "Suffix", "Glob"].filter((key) =>
    isNonEmptyString(candidate[key])
  );

  if (patternKeys.length !== 1) {
    return failure("Rule pattern must contain exactly one non-empty matcher.");
  }

  const key = patternKeys[0] as keyof RulePattern;
  const value = (candidate[key] as string).trim();
  return success({ [key]: value } as RulePattern);
}

function validatePersona(candidate: unknown, index: number): ValidationResult<Persona> {
  if (!isRecord(candidate)) {
    return failure(`Persona ${index + 1} must be an object.`);
  }

  const { id, user_agent, accept_language, timezone, screen } = candidate;

  if (!isNonEmptyString(id)) {
    return failure(`Persona ${index + 1} is missing a valid id.`);
  }

  if (!isNonEmptyString(user_agent)) {
    return failure(`Persona "${id}" is missing a valid user_agent.`);
  }

  if (!isNonEmptyString(accept_language)) {
    return failure(`Persona "${id}" is missing a valid accept_language.`);
  }

  if (!isNonEmptyString(timezone)) {
    return failure(`Persona "${id}" is missing a valid timezone.`);
  }

  if (!isRecord(screen)) {
    return failure(`Persona "${id}" is missing a valid screen definition.`);
  }

  if (!isPositiveInteger(screen.width) || !isPositiveInteger(screen.height)) {
    return failure(`Persona "${id}" must use positive integer screen dimensions.`);
  }

  if (!isPositiveInteger(screen.color_depth)) {
    return failure(`Persona "${id}" must use a positive integer color depth.`);
  }

  if (
    screen.pixel_ratio !== undefined &&
    !isPositiveNumber(screen.pixel_ratio)
  ) {
    return failure(`Persona "${id}" must use a positive pixel ratio when provided.`);
  }

  return success({
    id: id.trim(),
    user_agent: user_agent.trim(),
    accept_language: accept_language.trim(),
    timezone: timezone.trim(),
    screen: {
      width: screen.width,
      height: screen.height,
      color_depth: screen.color_depth,
      pixel_ratio: screen.pixel_ratio,
    },
  });
}

function validateRule(
  candidate: unknown,
  index: number,
  personaIds: Set<string>
): ValidationResult<Rule> {
  if (!isRecord(candidate)) {
    return failure(`Rule ${index + 1} must be an object.`);
  }

  if (!isNonEmptyString(candidate.persona_id)) {
    return failure(`Rule ${index + 1} is missing a valid persona_id.`);
  }

  const pattern = validateRulePattern(candidate.pattern);
  if (!pattern.ok) {
    return failure(`Rule ${index + 1}: ${pattern.error}`);
  }

  const personaId = candidate.persona_id.trim();
  if (!personaIds.has(personaId)) {
    return failure(`Rule ${index + 1} references unknown persona_id "${personaId}".`);
  }

  return success({
    pattern: pattern.value!,
    persona_id: personaId,
  });
}

export function validatePolicyConfig(
  candidate: unknown
): ValidationResult<PolicyConfig> {
  if (!isRecord(candidate)) {
    return failure("Policy config must be an object.");
  }

  if (!Array.isArray(candidate.personas) || !Array.isArray(candidate.rules)) {
    return failure("Policy config must define personas and rules arrays.");
  }

  try {
    const personas: Persona[] = [];
    const personaIds = new Set<string>();

    candidate.personas.forEach((personaCandidate, index) => {
      const validation = validatePersona(personaCandidate, index);
      if (!validation.ok) {
        throw new Error(validation.error);
      }

      const persona = validation.value!;
      if (personaIds.has(persona.id)) {
        throw new Error(`Duplicate persona id "${persona.id}".`);
      }

      personaIds.add(persona.id);
      personas.push(persona);
    });

    const rules = candidate.rules.map((ruleCandidate, index) => {
      const validation = validateRule(ruleCandidate, index, personaIds);
      if (!validation.ok) {
        throw new Error(validation.error);
      }

      return validation.value!;
    });

    return success({ personas, rules });
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Policy config validation failed."
    );
  }
}
