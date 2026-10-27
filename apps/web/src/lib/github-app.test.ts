import { afterEach, describe, expect, it } from "vitest";
import crypto from "crypto";
import {
  clearInstallationTokenCache,
  createAppJwt,
  isGithubAppConfigured,
} from "./github-app";

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

function configure() {
  process.env.GITHUB_APP_ID = "123456";
  process.env.GITHUB_APP_PRIVATE_KEY = privateKey;
}

afterEach(() => {
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;
  clearInstallationTokenCache();
});

describe("GitHub App JWT", () => {
  it("is dormant without credentials", () => {
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    expect(isGithubAppConfigured()).toBe(false);
    expect(() => createAppJwt()).toThrow(/not configured/);
  });

  it("creates a verifiable RS256 JWT", () => {
    configure();
    expect(isGithubAppConfigured()).toBe(true);

    const jwt = createAppJwt();
    const [header, payload, signature] = jwt.split(".");
    expect(header && payload && signature).toBeTruthy();

    const decodedHeader = JSON.parse(Buffer.from(header, "base64url").toString());
    expect(decodedHeader).toEqual({ alg: "RS256", typ: "JWT" });

    const decodedPayload = JSON.parse(Buffer.from(payload, "base64url").toString());
    expect(decodedPayload.iss).toBe(123456);
    expect(decodedPayload.exp - decodedPayload.iat).toBe(600);

    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(`${header}.${payload}`);
    expect(verifier.verify(publicKey, Buffer.from(signature, "base64url"))).toBe(true);
  });

  it("accepts private keys with escaped newlines", () => {
    process.env.GITHUB_APP_ID = "1";
    process.env.GITHUB_APP_PRIVATE_KEY = privateKey.replace(/\n/g, "\\n");
    expect(() => createAppJwt()).not.toThrow();
  });
});
