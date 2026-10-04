import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns status ok and configuration flags", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toHaveProperty("status", "ok");
    expect(json).toHaveProperty("aiConfigured");
    expect(json).toHaveProperty("openAlexConfigured");
    expect(typeof json.aiConfigured).toBe("boolean");
    expect(typeof json.openAlexConfigured).toBe("boolean");
  });
});
