/**
 * @file identityProviders.js
 * @description Helper para extraer y normalizar los proveedores OAuth asociados a un usuario Supabase.
 */

/**
 * Devuelve la lista deduplicada de proveedores asociados al usuario.
 * Combina `app_metadata.providers`, `app_metadata.provider` e `identities[].provider`.
 * `app_metadata.providers` puede incluir `email` para cuentas OAuth aunque no exista
 * password local, por lo que solo confiamos en ese origen para proveedores OAuth.
 */
export const collectIdentityProviders = (user) => {
  const providers = new Set();

  const appProviders = user?.app_metadata?.providers;
  if (Array.isArray(appProviders)) {
    appProviders.forEach((value) => {
      const normalized = String(value || "").toLowerCase();
      if (normalized && normalized !== "email") {
        providers.add(normalized);
      }
    });
  }

  const primaryProvider = String(user?.app_metadata?.provider || "").toLowerCase();
  if (primaryProvider) {
    providers.add(primaryProvider);
  }

  if (Array.isArray(user?.identities)) {
    user.identities.forEach((identity) => {
      const normalized = String(identity?.provider || "").toLowerCase();
      if (normalized) {
        providers.add(normalized);
      }
    });
  }

  return Array.from(providers);
};
