import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOAuthMock = vi.fn();
const signUpMock = vi.fn();
const signOutMock = vi.fn();
const getSessionMock = vi.fn();
const getUserMock = vi.fn();
const setSessionMock = vi.fn();
const updateUserMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const unsubscribeMock = vi.fn();

vi.mock("../supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithOAuth: signInWithOAuthMock,
      signUp: signUpMock,
      signOut: signOutMock,
      getSession: getSessionMock,
      getUser: getUserMock,
      setSession: setSessionMock,
      updateUser: updateUserMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  }),
}));

vi.mock("../../lib/authRedirect", () => ({
  buildAuthRedirectUrl: vi.fn((routePath) => `https://app.test/${routePath}`),
}));

import { buildAuthRedirectUrl } from "../../lib/authRedirect";
import {
  getCurrentUser,
  logout,
  onAuthStateChange,
  register,
  setRecoverySession,
  signInWithGoogle,
  updatePassword,
} from "../auth";

describe("auth service redirects", () => {
  beforeEach(() => {
    vi.useRealTimers();
    signInWithOAuthMock.mockReset();
    signUpMock.mockReset();
    signOutMock.mockReset();
    getSessionMock.mockReset();
    getUserMock.mockReset();
    setSessionMock.mockReset();
    updateUserMock.mockReset();
    onAuthStateChangeMock.mockReset();
    unsubscribeMock.mockReset();
    signInWithOAuthMock.mockResolvedValue({ data: { provider: "google" }, error: null });
    signUpMock.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    signOutMock.mockResolvedValue({ error: null });
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    setSessionMock.mockResolvedValue({ data: { session: { user: { id: "u-1" } } }, error: null });
    updateUserMock.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    onAuthStateChangeMock.mockImplementation((callback) => ({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
      callback,
    }));
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

  it("hydrates the current user with canonical provider data for Google accounts", async () => {
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "u-google",
            email: "user@test.com",
            app_metadata: {},
          },
        },
      },
      error: null,
    });
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "u-google",
          email: "user@test.com",
          app_metadata: { provider: "google", providers: ["google"] },
          identities: [{ provider: "google" }],
        },
      },
      error: null,
    });

    await expect(getCurrentUser()).resolves.toMatchObject({
      id: "u-google",
      app_metadata: { provider: "google", providers: ["google"] },
      identities: [{ provider: "google" }],
    });
  });

  it("enriches auth state change callbacks with canonical provider data", async () => {
    let authCallback;
    onAuthStateChangeMock.mockImplementation((callback) => {
      authCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      };
    });
    getUserMock.mockResolvedValue({
      data: {
        user: {
          id: "u-google",
          email: "user@test.com",
          app_metadata: { provider: "google", providers: ["google"] },
          identities: [{ provider: "google" }],
        },
      },
      error: null,
    });

    const callback = vi.fn();
    const unsubscribe = onAuthStateChange(callback);

    await authCallback("SIGNED_IN", {
      user: {
        id: "u-google",
        email: "user@test.com",
        app_metadata: {},
      },
    });

    expect(callback).toHaveBeenCalledWith(
      "SIGNED_IN",
      expect.objectContaining({
        app_metadata: expect.objectContaining({ provider: "google" }),
        identities: [{ provider: "google" }],
      })
    );

    unsubscribe();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to local sign-out when global sign-out times out", async () => {
    vi.useFakeTimers();
    signOutMock.mockImplementation(({ scope }) => {
      if (scope === "global") {
        return new Promise(() => {});
      }

      return Promise.resolve({ error: null });
    });

    const logoutPromise = logout();

    await vi.advanceTimersByTimeAsync(4000);

    await expect(logoutPromise).resolves.toBeUndefined();
    expect(signOutMock).toHaveBeenNthCalledWith(1, { scope: "global" });
    expect(signOutMock).toHaveBeenNthCalledWith(2, { scope: "local" });
  });

  it("times out recovery session validation when Supabase never responds", async () => {
    vi.useFakeTimers();
    setSessionMock.mockImplementation(() => new Promise(() => {}));

    const recoveryPromise = setRecoverySession({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    const recoveryExpectation = expect(recoveryPromise).rejects.toThrow(
      "La verificación del enlace de recuperación tardó demasiado. Solicita uno nuevo o inténtalo otra vez."
    );

    await vi.advanceTimersByTimeAsync(10000);

    await recoveryExpectation;
    expect(setSessionMock).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
  });

  it("times out password updates when Supabase never responds", async () => {
    vi.useFakeTimers();
    updateUserMock.mockImplementation(() => new Promise(() => {}));

    const updatePromise = updatePassword({ password: "Password123" });
    const updateExpectation = expect(updatePromise).rejects.toThrow(
      "No hemos podido guardar la nueva contraseña a tiempo. Inténtalo de nuevo."
    );

    await vi.advanceTimersByTimeAsync(10000);

    await updateExpectation;
    expect(updateUserMock).toHaveBeenCalledWith({ password: "Password123" });
  });

});