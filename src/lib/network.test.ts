import { describe, expect, it } from "vitest";
import { isNetworkError } from "./network";

describe("isNetworkError", () => {
  it("reconnaît un serveur injoignable", () => {
    expect(isNetworkError(new TypeError("fetch failed"))).toBe(true);
    expect(isNetworkError(new Error("login_lock_seconds : TypeError: fetch failed"))).toBe(true);
    expect(isNetworkError({ name: "AuthRetryableFetchError", message: "" })).toBe(true);
    expect(isNetworkError({ message: "x", cause: { code: "ECONNRESET" } })).toBe(true);
    expect(isNetworkError({ message: "x", cause: { code: "UND_ERR_CONNECT_TIMEOUT" } })).toBe(true);
  });

  it("ne confond pas avec une réponse du serveur", () => {
    expect(isNetworkError({ name: "AuthApiError", message: "Invalid login credentials" })).toBe(false);
    expect(isNetworkError(new Error("not_owner"))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError("fetch failed")).toBe(false);
  });
});
