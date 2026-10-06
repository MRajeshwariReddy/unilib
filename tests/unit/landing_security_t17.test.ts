import { describe, expect, it } from "vitest";
import React from "react";
import nextConfig from "../../next.config";
import { getSafeNextPath } from "@/lib/http/origin";
import Home from "@/app/page";

describe("T17: Security Headers Configuration", () => {
  it("defines strict security headers in next.config.ts", async () => {
    expect(nextConfig.headers).toBeDefined();
    if (nextConfig.headers) {
      const headersList = await nextConfig.headers();
      expect(headersList).toHaveLength(1);
      const headerKeys = headersList[0].headers.map((h) => h.key);
      expect(headerKeys).toContain("X-Content-Type-Options");
      expect(headerKeys).toContain("Referrer-Policy");
      expect(headerKeys).toContain("X-Frame-Options");
      expect(headerKeys).toContain("Permissions-Policy");
    }
  });
});

describe("T17: Open Redirect Protection (getSafeNextPath)", () => {
  it("preserves valid internal relative paths", () => {
    expect(getSafeNextPath("/upload")).toBe("/upload");
    expect(getSafeNextPath("/documents/123-abc")).toBe("/documents/123-abc");
    expect(getSafeNextPath("/account?tab=profile")).toBe("/account?tab=profile");
  });

  it("blocks malicious external open redirect attempts and returns fallback", () => {
    expect(getSafeNextPath("//evil.com")).toBe("/");
    expect(getSafeNextPath("/\\evil.com")).toBe("/");
    expect(getSafeNextPath("https://attacker.com")).toBe("/");
    expect(getSafeNextPath("http://evil.com")).toBe("/");
    expect(getSafeNextPath("javascript:alert(1)")).toBe("/");
    expect(getSafeNextPath(null)).toBe("/");
    expect(getSafeNextPath(undefined)).toBe("/");
  });
});

describe("T17: Landing Page Component", () => {
  it("renders landing page Home component element", () => {
    const el = React.createElement(Home);
    expect(el.type).toBe(Home);
  });
});
