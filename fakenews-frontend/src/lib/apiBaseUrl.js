const LOCAL_DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

const isDev = import.meta.env.DEV;

const normalizeBaseUrl = (baseUrl) => baseUrl.replace(/\/+$/, "");

export const resolveApiBaseUrl = (envBaseUrl) => {
  const normalizedEnvBaseUrl = envBaseUrl?.trim();

  if (normalizedEnvBaseUrl) {
    return normalizeBaseUrl(normalizedEnvBaseUrl);
  }

  if (isDev) {
    return LOCAL_DEFAULT_API_BASE_URL;
  }

  throw new Error(
    "Missing VITE_ANALYSIS_API_BASE_URL in production build. Configure the public backend URL before deploying."
  );
};