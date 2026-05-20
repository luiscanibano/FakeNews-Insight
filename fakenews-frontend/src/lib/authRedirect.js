const isValidHttpUrl = (value) => {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeBasePath = (basePath) => {
  if (!basePath) {
    return "/";
  }

  return basePath.endsWith("/") ? basePath : `${basePath}/`;
};

const normalizeRoutePath = (routePath) => routePath.replace(/^\/+/, "");

export const resolveAuthRedirectBaseUrl = () => {
  const envSiteUrl = import.meta.env.VITE_AUTH_SITE_URL?.trim();

  if (envSiteUrl) {
    if (!isValidHttpUrl(envSiteUrl)) {
      throw new Error(
        "Invalid VITE_AUTH_SITE_URL. It must be a valid HTTP or HTTPS URL."
      );
    }

    return normalizeBasePath(envSiteUrl);
  }

  if (typeof window === "undefined") {
    throw new Error(
      "Unable to resolve auth redirect base URL outside the browser without VITE_AUTH_SITE_URL."
    );
  }

  return new URL(normalizeBasePath(import.meta.env.BASE_URL), window.location.origin).toString();
};

export const buildAuthRedirectUrl = (routePath) =>
  new URL(normalizeRoutePath(routePath), resolveAuthRedirectBaseUrl()).toString();