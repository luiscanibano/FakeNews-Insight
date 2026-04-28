/**
 * @file billing.js
 * @description Servicios para iniciar checkout Stripe y confirmar cambios de plan.
 */

const DEFAULT_BILLING_API_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_BILLING_CHECKOUT_PATH = "/billing/checkout";
const DEFAULT_BILLING_CONFIRM_PATH = "/billing/confirm";
const BILLING_REQUEST_TIMEOUT_MS = 20000;

/** Normaliza URL base para evitar dobles separadores. */
const normalizeBaseUrl = (baseUrl) => baseUrl.replace(/\/+$/, "");

/** Asegura prefijo '/' en rutas API. */
const normalizePath = (path, fallbackPath) => {
	if (!path) {
		return fallbackPath;
	}

	return path.startsWith("/") ? path : `/${path}`;
};

const BILLING_API_BASE_URL = normalizeBaseUrl(
	import.meta.env.VITE_BILLING_API_BASE_URL?.trim() ||
		import.meta.env.VITE_ANALYSIS_API_BASE_URL?.trim() ||
		DEFAULT_BILLING_API_BASE_URL
);

const BILLING_CHECKOUT_PATH = normalizePath(
	import.meta.env.VITE_BILLING_CHECKOUT_PATH?.trim(),
	DEFAULT_BILLING_CHECKOUT_PATH
);

const BILLING_CONFIRM_PATH = normalizePath(
	import.meta.env.VITE_BILLING_CONFIRM_PATH?.trim(),
	DEFAULT_BILLING_CONFIRM_PATH
);

const BILLING_CHECKOUT_ENDPOINT = `${BILLING_API_BASE_URL}${BILLING_CHECKOUT_PATH}`;
const BILLING_CONFIRM_ENDPOINT = `${BILLING_API_BASE_URL}${BILLING_CONFIRM_PATH}`;

/** Extrae mensaje de error legible desde payload HTTP. */
const getErrorMessage = async (response, fallbackMessage) => {
	try {
		const payload = await response.json();
		const detail = payload?.detail;

		if (typeof detail === "string" && detail.trim()) {
			return detail;
		}
	} catch {
		/** Ignora errores de parseo JSON y aplica fallback. */
	}

	return fallbackMessage;
};

/** Ejecuta peticion POST autenticada con timeout para evitar estados indefinidos. */
const sendBillingRequest = async ({ endpoint, body, jwtToken, fallbackMessage }) => {
	if (!jwtToken) {
		throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
	}

	const controller = new AbortController();
	const timeoutId = window.setTimeout(() => {
		controller.abort();
	}, BILLING_REQUEST_TIMEOUT_MS);

	let response;

	try {
		response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${jwtToken}`,
			},
			body: JSON.stringify(body),
			signal: controller.signal,
		});
	} catch (error) {
		if (error?.name === "AbortError") {
			throw new Error("La solicitud tardó demasiado. Revisa backend/Stripe y reintenta.");
		}

		throw new Error("No se pudo conectar con el backend de billing.");
	} finally {
		window.clearTimeout(timeoutId);
	}

	if (!response.ok) {
		const message = await getErrorMessage(response, fallbackMessage);
		throw new Error(message);
	}

	return response.json();
};

/** Inicia flujo de checkout o downgrade programado según plan objetivo. */
export const createBillingCheckout = async ({ plan, jwtToken }) => {
	if (!plan) {
		throw new Error("Debes seleccionar un plan para continuar.");
	}

	return sendBillingRequest({
		endpoint: BILLING_CHECKOUT_ENDPOINT,
		body: { plan },
		jwtToken,
		fallbackMessage: "No se pudo iniciar el flujo de facturacion.",
	});
};

/** Confirma en backend una sesión de Stripe Checkout ya completada. */
export const confirmBillingCheckout = async ({ sessionId, jwtToken }) => {
	if (!sessionId) {
		throw new Error("No se encontró session_id para confirmar el pago.");
	}

	return sendBillingRequest({
		endpoint: BILLING_CONFIRM_ENDPOINT,
		body: { session_id: sessionId },
		jwtToken,
		fallbackMessage: "No se pudo confirmar el cambio de plan.",
	});
};

/** Recupera estado de suscripcion actual del usuario para mostrar en el panel de cuenta. */
export const fetchBillingSnapshot = async ({ jwtToken }) => {
	if (!jwtToken) {
		throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
	}

	const controller = new AbortController();
	const timeoutId = window.setTimeout(() => {
		controller.abort();
	}, BILLING_REQUEST_TIMEOUT_MS);

	let response;
	try {
		response = await fetch(`${BILLING_API_BASE_URL}/billing/snapshot`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${jwtToken}`,
			},
			signal: controller.signal,
		});
	} catch (error) {
		if (error?.name === "AbortError") {
			throw new Error("La consulta tardó demasiado.");
		}
		throw new Error("No se pudo conectar con el backend de billing.");
	} finally {
		window.clearTimeout(timeoutId);
	}

	if (!response.ok) {
		const message = await getErrorMessage(
			response,
			"No se pudo obtener el estado de la suscripcion."
		);
		throw new Error(message);
	}

	return response.json();
};
