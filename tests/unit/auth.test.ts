import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { GET as handleAuthCallback } from "@/app/auth/callback/route";

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

  it("redirects unauthenticated user requesting /account to /login?next=/account", async () => {
    const request = new NextRequest("http://localhost:3000/account");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login?next=%2Faccount");
  });

  it("allows unauthenticated user to access public routes like / or /library", async () => {
    const request = new NextRequest("http://localhost:3000/library");
    const response = await middleware(request);

    expect(response.status).toBe(200);
  });

  it("auth callback exchanges code and redirects to next parameter", async () => {
    const request = new Request("http://localhost:3000/auth/callback?code=test-code&next=/my-documents");
    const response = await handleAuthCallback(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBe("http://localhost:3000/my-documents");
  });
});
