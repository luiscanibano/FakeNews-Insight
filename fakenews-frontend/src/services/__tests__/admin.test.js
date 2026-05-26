import { beforeEach, describe, expect, it, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("../supabase", () => ({
  getSupabaseClient: () => ({
    from: fromMock,
  }),
}));

import { getAdminRequestKpis } from "../admin";

describe("getAdminRequestKpis", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("separa las peticiones del día entre web y extensión", async () => {
    const queryBuilder = {
      gte: vi
        .fn()
        .mockResolvedValueOnce({ count: 18, error: null })
        .mockResolvedValueOnce({ count: 5, error: null }),
      eq: vi.fn(),
    };
    queryBuilder.eq.mockImplementation(() => queryBuilder);

    fromMock.mockReturnValue({
      select: vi.fn().mockImplementation(() => queryBuilder),
    });

    await expect(getAdminRequestKpis()).resolves.toEqual({
      web: 13,
      extension: 5,
    });
  });
});