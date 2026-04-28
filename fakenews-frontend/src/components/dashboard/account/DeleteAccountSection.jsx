/**
 * @file DeleteAccountSection.jsx
 * @description Sección de baja RGPD con confirmación explícita por escrito.
 */

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import FeedbackBanner from "./FeedbackBanner";

/** Formulario de baja de cuenta que exige escribir ELIMINAR para confirmar. */
function DeleteAccountSection({ onDeleteAccount, onSubmittingChange }) {
  const { t } = useTranslation("dashboard");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleteTone, setDeleteTone] = useState("error");
  const [isDeleting, setIsDeleting] = useState(false);

  const updateSubmitting = (value) => {
    setIsDeleting(value);
    if (typeof onSubmittingChange === "function") {
      onSubmittingChange(value);
    }
  };

  const handleSubmitDelete = async (event) => {
    event.preventDefault();
    setDeleteMessage("");
    setDeleteTone("error");

    if (deleteConfirmation.trim().toUpperCase() !== "ELIMINAR") {
      setDeleteMessage(t("delete.errorPattern"));
      return;
    }

    updateSubmitting(true);

    try {
      await onDeleteAccount({ confirmation: deleteConfirmation.trim().toUpperCase() });
    } catch (error) {
      setDeleteMessage(error.message || t("delete.fallbackError"));
      updateSubmitting(false);
    }
  };

  return (
    <div className="dash-section dash-section-danger">
      <div className="dash-section-head" style={{ color: "rgb(255 180 180)" }}>
        <AlertTriangle className="size-4" aria-hidden="true" />
        <h3 className="dash-section-title-sm" style={{ color: "rgb(255 200 200)" }}>
          {t("delete.title")}
        </h3>
      </div>
      <p className="dash-section-text">
        {t("delete.intro")}{" "}
        <span style={{ color: "var(--on-surface)", fontWeight: 600 }}>ELIMINAR</span>.
      </p>

      <form onSubmit={handleSubmitDelete} className="dash-form-grid mt-4">
        <div className="dash-form-grid">
          <label htmlFor="account-delete-confirmation" className="dash-form-label">
            {t("delete.confirmation")}
          </label>
          <input
            id="account-delete-confirmation"
            type="text"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder={t("delete.confirmPlaceholder")}
            disabled={isDeleting}
            required
            className="dash-input"
          />
        </div>
        <div className="dash-form-actions">
          <button type="submit" className="dash-btn dash-btn-danger" disabled={isDeleting}>
            <Trash2 className="size-3.5" />
            {isDeleting ? t("delete.submitting") : t("delete.submit")}
          </button>
        </div>
        <FeedbackBanner message={deleteMessage} tone={deleteTone} />
      </form>
    </div>
  );
}

export default DeleteAccountSection;
