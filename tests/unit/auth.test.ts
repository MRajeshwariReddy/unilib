import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { GET as handleAuthCallback } from "@/app/auth/callback/route";
import { getSafeNextPath } from "@/lib/http/origin";

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}));

describe("getSafeNextPath URL sanitization", () => {
  it("allows valid internal relative paths", () => {
    expect(getSafeNextPath("/library")).toBe("/library");
    expect(getSafeNextPath("/upload")).toBe("/upload");
    expect(getSafeNextPath("/my-documents")).toBe("/my-documents");
    expect(getSafeNextPath("/account?tab=profile")).toBe("/account?tab=profile");
  });

  it("rejects external absolute URLs and falls back to /", () => {
    expect(getSafeNextPath("https://example.com")).toBe("/");
    expect(getSafeNextPath("http://attacker.org/stolen")).toBe("/");
    expect(getSafeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("rejects protocol-relative URLs and falls back to /", () => {
    expect(getSafeNextPath("//example.com")).toBe("/");
    expect(getSafeNextPath("/\\example.com")).toBe("/");
    expect(getSafeNextPath("//attacker.com/login")).toBe("/");
  });

  it("falls back to / for null, empty, or invalid inputs", () => {
    expect(getSafeNextPath(null)).toBe("/");
    expect(getSafeNextPath(undefined)).toBe("/");
    expect(getSafeNextPath("")).toBe("/");
    expect(getSafeNextPath("   ")).toBe("/");
  });
});

describe("Authentication & Session Middleware Unit Tests", () => {
  it("redirects unauthenticated user requesting /upload to /login?next=/upload", async () => {
    const request = new NextRequest("http://localhost:3000/upload");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login?next=%2Fupload");
  });

  it("redirects unauthenticated user requesting /my-documents to /login?next=/my-documents", async () => {
    const request = new NextRequest("http://localhost:3000/my-documents");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login?next=%2Fmy-documents");
  });

  it("allows unauthenticated user to access public routes like / or /library", async () => {
    const request = new NextRequest("http://localhost:3000/library");
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("auth callback redirects to safe internal path when next is valid", async () => {
    const request = new Request("http://localhost:3000/auth/callback?code=test-code&next=/my-documents");
    const response = await handleAuthCallback(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/my-documents");
  });

  it("auth callback falls back to / when next is an external absolute URL", async () => {
    const request = new Request("http://localhost:3000/auth/callback?code=test-code&next=https://example.com");
    const response = await handleAuthCallback(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/");
  });
});
