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
    tone === "success" ? "dash-feedback dash-feedback-success" : "dash-feedback dash-feedback-error";

  return <p className={className}>{message}</p>;
}

export default FeedbackBanner;
