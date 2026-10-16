import { describe, expect, it } from "vitest";
import { isTrustedGLifeMessage, parseGLifeContextMessage } from "./glife-context";

describe("GLIFE_CONTEXT display adapter", () => {
  it("normalizes only user-profile fields and omits publicMediaToken", () => {
    expect(parseGLifeContextMessage({ type: "GLIFE_CONTEXT", payload: { userId: " u-1 ", teslaId: "t-1", name: "Name", email: "name@example.com", publicMediaToken: "secret" } })).toEqual({
      displayName: "Name", avatarUrl: null, email: "name@example.com", enterpriseUserId: "u-1", employeeId: "t-1", department: null, title: null,
    });
  });
  it("rejects bad envelope and payload shape", () => {
    expect(parseGLifeContextMessage({ type: "OTHER", payload: {} })).toBeNull();
    expect(parseGLifeContextMessage({ type: "GLIFE_CONTEXT", payload: { email: 3 } })).toBeNull();
    expect(parseGLifeContextMessage({ type: "GLIFE_CONTEXT", payload: { email: "a", role: "admin" } })).toBeNull();
  });
  it("requires the exact configured parent origin and source", () => {
    const parent = {} as MessageEventSource;
    expect(isTrustedGLifeMessage({ origin: "https://host.example", source: parent }, "https://host.example", parent)).toBe(true);
    expect(isTrustedGLifeMessage({ origin: "https://evil.example", source: parent }, "https://host.example", parent)).toBe(false);
    expect(isTrustedGLifeMessage({ origin: "https://host.example", source: {} as MessageEventSource }, "https://host.example", parent)).toBe(false);
    expect(isTrustedGLifeMessage({ origin: "https://host.example", source: parent }, "", parent)).toBe(false);
  });
});
