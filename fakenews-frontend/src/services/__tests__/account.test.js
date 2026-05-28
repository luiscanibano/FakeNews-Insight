import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithPasswordMock, updatePasswordMock } = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
  updatePasswordMock: vi.fn(),
}));

vi.mock("../supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
    },
  }),
}));

vi.mock("../auth", () => ({
  updatePassword: updatePasswordMock,
}));

import { changeAccountPassword } from "../account";

describe("account service", () => {
  beforeEach(() => {
    vi.useRealTimers();
    signInWithPasswordMock.mockReset();
    updatePasswordMock.mockReset();
    signInWithPasswordMock.mockResolvedValue({ error: null });
    updatePasswordMock.mockResolvedValue({ user: { id: "u-1" } });
  });

  it("reauthenticates with the current password and delegates the update to auth service", async () => {
    await expect(
      changeAccountPassword({
        email: "user@test.com",
        currentPassword: "Current123",
        newPassword: "Password123",
      })
    ).resolves.toEqual({ updated: true });

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "user@test.com",
      password: "Current123",
    });
    expect(updatePasswordMock).toHaveBeenCalledWith({ password: "Password123" });
  });

  it("times out when current-password validation never resolves", async () => {
    vi.useFakeTimers();
    signInWithPasswordMock.mockImplementation(() => new Promise(() => {}));

    const changePromise = changeAccountPassword({
      email: "user@test.com",
      currentPassword: "Current123",
      newPassword: "Password123",
    });
    const changeExpectation = expect(changePromise).rejects.toThrow(
      "No se pudo validar tu contraseña actual a tiempo. Reintenta en unos segundos."
    );

    await vi.advanceTimersByTimeAsync(12000);

    await changeExpectation;
    expect(updatePasswordMock).not.toHaveBeenCalled();
  });
});