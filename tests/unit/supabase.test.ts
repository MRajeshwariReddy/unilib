import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { updateSession } from "@/lib/supabase/middleware";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}));

describe("Supabase Helpers", () => {
  it("initializes browser client with anon key", () => {
    const client = createBrowserClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("initializes server client with cookie store", async () => {
    const client = await createServerClient();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("updateSession processes NextRequest and returns NextResponse", async () => {
    const request = new NextRequest("http://localhost:3000/");
    const response = await updateSession(request);
    expect(response).toBeDefined();
    expect(response.headers).toBeDefined();
  });
});
