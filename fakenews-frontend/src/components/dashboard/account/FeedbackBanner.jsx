/**
 * @file FeedbackBanner.jsx
 * @description Banner de mensaje con tono configurable (success/error) reutilizable en formularios del panel.
 */

/** Banner de mensaje con tono configurable success/error. */
function FeedbackBanner({ message, tone }) {
  if (!message) {
    return null;
  }

  const className =
    tone === "success"
      ? "mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
      : "mt-3 rounded-xl border border-error/30 bg-error-container/40 px-3 py-2 text-sm text-error";

  return <p className={className}>{message}</p>;
}

export default FeedbackBanner;
