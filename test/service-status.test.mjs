import test from "node:test";
import assert from "node:assert/strict";
import {
  checkCodexAMOAuroraServices,
  checkService,
  createBridgeHeaders,
  validateBridgeToken,
} from "../src/services/service-status.mjs";

const response = (status, payload, json = true) => ({
  ok: status >= 200 && status < 300,
  status,
  json: json ? async () => payload : async () => { throw new SyntaxError("bad JSON"); },
});

test("only verified Ollama tag responses are online", async () => {
  const online = await checkService("ollama", {
    url: "http://ollama.test/",
    fetchImpl: async (url) => {
      assert.equal(url, "http://ollama.test/api/tags");
      return response(200, { models: [] });
    },
  });
  assert.equal(online.status, "online");

  const misleadingSuccess = await checkService("ollama", {
    url: "http://ollama.test",
    fetchImpl: async () => response(200, { status: "ok" }),
  });
  assert.equal(misleadingSuccess.status, "offline");
  assert.match(misleadingSuccess.detail, /did not confirm/);
});

test("Caveman and Carina require named healthy payloads", async () => {
  for (const service of ["caveman", "carina"]) {
    assert.equal((await checkService(service, {
      url: `http://${service}.test`,
      bridgeToken: "bridge-secret",
      fetchImpl: async (_url, init) => {
        assert.equal(init.headers.Authorization, "Bearer bridge-secret");
        return response(200, { status: "healthy", service });
      },
    })).online, true);

    assert.equal((await checkService(service, {
      url: `http://${service}.test`,
      fetchImpl: async () => response(200, { status: "healthy", service: "some-other-service" }),
    })).online, false);
  }
});

test("bridge client and server use the same strict Bearer token format", () => {
  assert.deepEqual(createBridgeHeaders(" secret "), { Authorization: "Bearer secret" });
  assert.equal(validateBridgeToken({ authorization: "Bearer secret" }, "secret"), true);
  assert.equal(validateBridgeToken(new Headers({ Authorization: "Bearer secret" }), "secret"), true);
  assert.equal(validateBridgeToken({ "x-bridge-token": "secret" }, "secret"), false);
  assert.equal(validateBridgeToken({ authorization: "Bearer wrong" }, "secret"), false);
  assert.equal(validateBridgeToken({ authorization: "Bearer secret" }, ""), false);
});

test("failures remain offline and include actionable recovery messages", async () => {
  const unauthorized = await checkService("carina", {
    url: "http://carina.test",
    fetchImpl: async () => response(401, {}),
  });
  assert.equal(unauthorized.online, false);
  assert.match(unauthorized.detail, /Update the bridge token/);

  const invalid = await checkService("caveman", {
    url: "http://caveman.test",
    fetchImpl: async () => response(200, null, false),
  });
  assert.equal(invalid.online, false);
  assert.match(invalid.detail, /Start Caveman/);

  const unavailable = await checkCodexAMOAuroraServices({
    urls: { ollama: "http://o", caveman: "http://v", carina: "http://c" },
    fetchImpl: async () => { throw new TypeError("connection refused"); },
  });
  assert.deepEqual(Object.values(unavailable).map(({ status }) => status), ["offline", "offline", "offline"]);
  assert.match(unavailable.ollama.detail, /Start Ollama/);
  assert.match(unavailable.carina.detail, /Start Carina/);
});
