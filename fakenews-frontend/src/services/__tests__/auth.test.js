import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOAuthMock = vi.fn();
const signUpMock = vi.fn();

vi.mock("../supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithOAuth: signInWithOAuthMock,
      signUp: signUpMock,
    },
  }),
}));

vi.mock("../../lib/authRedirect", () => ({
  buildAuthRedirectUrl: vi.fn((routePath) => `https://app.test/${routePath}`),
}));

import { buildAuthRedirectUrl } from "../../lib/authRedirect";
import { register, signInWithGoogle } from "../auth";

describe("auth service redirects", () => {
  beforeEach(() => {
    signInWithOAuthMock.mockReset();
    signUpMock.mockReset();
    signInWithOAuthMock.mockResolvedValue({ data: { provider: "google" }, error: null });
    signUpMock.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    buildAuthRedirectUrl.mockClear();
  });

  it("uses the landing page as email confirmation redirect for register", async () => {
    await register({ email: "nuevo@test.com", password: "Password123" });

    expect(buildAuthRedirectUrl).toHaveBeenCalledWith("");
    expect(signUpMock).toHaveBeenCalledWith({
      email: "nuevo@test.com",
      password: "Password123",
      options: {
        redirectTo: "https://app.test/",
        data: {
          role: "user",
          plan: "free",
        },
      },
    });
  });

  it("keeps Google OAuth returning to the dashboard", async () => {
    await signInWithGoogle();

    expect(buildAuthRedirectUrl).toHaveBeenCalledWith("dashboard");
    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://app.test/dashboard" },
    });
  });
});