const SERVICE_NAMES = ["ollama", "caveman", "carina"];

export const RECOVERY_MESSAGES = Object.freeze({
  ollama: "Start Ollama, then confirm its API is reachable and try again.",
  caveman: "Start Caveman, verify its health endpoint, and try again.",
  carina: "Start Carina, verify its health endpoint, and try again.",
  unauthorized: "The bridge rejected the token. Update the bridge token and reconnect.",
});

function cleanBaseUrl(value, service) {
  if (!value) throw new TypeError(`${service} URL is required`);
  return String(value).replace(/\/+$/, "");
}

function result(service, online, detail, checkedAt = new Date().toISOString()) {
  return {
    service,
    status: online ? "online" : "offline",
    online,
    detail,
    checkedAt,
  };
}

function isHealthyPayload(service, payload) {
  if (!payload || typeof payload !== "object") return false;
  if (service === "ollama") return Array.isArray(payload.models);

  const status = String(payload.status ?? "").toLowerCase();
  const namedService = String(payload.service ?? service).toLowerCase();
  return (status === "ok" || status === "healthy") && namedService === service;
}

/** Build the same Authorization header consumed by validateBridgeToken. */
export function createBridgeHeaders(token) {
  const value = String(token ?? "").trim();
  return value ? { Authorization: `Bearer ${value}` } : {};
}

function readHeader(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name);
  const key = Object.keys(headers ?? {}).find((candidate) => candidate.toLowerCase() === name);
  return key ? headers[key] : null;
}

/** Validate the Bearer credential used by the bridge server. */
export function validateBridgeToken(headers, expectedToken) {
  const expected = String(expectedToken ?? "").trim();
  if (!expected) return false;
  const authorization = String(readHeader(headers, "authorization") ?? "");
  const match = authorization.match(/^Bearer ([^\s]+)$/i);
  if (!match || match[1].length !== expected.length) return false;

  // Constant-time comparison without a Node-only dependency, so this can also
  // be reused by edge bridge handlers.
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ match[1].charCodeAt(index);
  }
  return difference === 0;
}

export async function checkService(service, options = {}) {
  if (!SERVICE_NAMES.includes(service)) throw new TypeError(`Unknown service: ${service}`);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new TypeError("fetch implementation is required");

  const baseUrl = cleanBaseUrl(options.url, service);
  const path = service === "ollama" ? "/api/tags" : "/health";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 3000);

  try {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: "GET",
      cache: "no-store",
      headers: service === "ollama" ? { Accept: "application/json" } : {
        Accept: "application/json",
        ...createBridgeHeaders(options.bridgeToken),
      },
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return result(service, false, RECOVERY_MESSAGES.unauthorized);
    }
    if (!response.ok) {
      return result(service, false, `${service} returned HTTP ${response.status}. ${RECOVERY_MESSAGES[service]}`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      return result(service, false, `${service} returned an invalid health response. ${RECOVERY_MESSAGES[service]}`);
    }
    if (!isHealthyPayload(service, payload)) {
      return result(service, false, `${service} did not confirm that it is healthy. ${RECOVERY_MESSAGES[service]}`);
    }
    return result(service, true, `${service} health check verified.`);
  } catch (error) {
    const reason = error?.name === "AbortError" ? "Health check timed out." : "Health check could not connect.";
    return result(service, false, `${reason} ${RECOVERY_MESSAGES[service]}`);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Check every CodexAMOAurora dependency. A service has no optimistic or cached
 * success path: only a successful, structurally valid health response is online.
 */
export async function checkCodexAMOAuroraServices(options = {}) {
  const urls = options.urls ?? {};
  const checks = SERVICE_NAMES.map((service) => checkService(service, {
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    bridgeToken: options.bridgeToken,
    url: urls[service],
  }));
  const statuses = await Promise.all(checks);
  return Object.fromEntries(statuses.map((status) => [status.service, status]));
}
