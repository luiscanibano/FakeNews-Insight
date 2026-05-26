/**
 * @file accountProviders.js
 * @description Helpers para resolver identidades OAuth/email mostradas en el panel de cuenta.
 */

export const PROVIDER_LABELS = {
  google: "Google",
  github: "GitHub",
  azure: "Microsoft",
  facebook: "Facebook",
  apple: "Apple",
};

export const PROVIDER_ACCOUNT_URLS = {
  google: "https://myaccount.google.com/security",
  github: "https://github.com/settings/security",
  azure: "https://account.microsoft.com/security",
  facebook: "https://www.facebook.com/settings?tab=security",
  apple: "https://appleid.apple.com/account/manage",
};

/** Normaliza la lista de identidades del usuario y deriva el proveedor OAuth principal. */
export const resolveProviderState = ({ identityProviders = [], primaryProvider = "" }) => {
  const normalizedProviders = (identityProviders || [])
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean);
  const normalizedPrimary = String(primaryProvider || "").toLowerCase();
  const hasEmailIdentity =
    normalizedProviders.includes("email") || normalizedPrimary === "email";

  const oauthProviders = normalizedProviders.filter((value) => value !== "email");
  if (
    normalizedPrimary &&
    normalizedPrimary !== "email" &&
    !oauthProviders.includes(normalizedPrimary)
  ) {
    oauthProviders.unshift(normalizedPrimary);
  }

  /**
   * Regla de producto: si la cuenta tiene cualquier proveedor OAuth asociado,
   * tratamos la contraseña como gestionada externamente y ocultamos el cambio
   * de contraseña dentro de la app.
   */
  const isOauthOnly = oauthProviders.length > 0;

  const primaryOauthProvider =
    (normalizedPrimary && normalizedPrimary !== "email" ? normalizedPrimary : null) ||
    oauthProviders[0] ||
    null;

  const primaryOauthLabel = primaryOauthProvider
    ? PROVIDER_LABELS[primaryOauthProvider] || primaryOauthProvider
    : null;

  const primaryOauthUrl = primaryOauthProvider
    ? PROVIDER_ACCOUNT_URLS[primaryOauthProvider] || null
    : null;

  return { isOauthOnly, primaryOauthLabel, primaryOauthUrl };
};
