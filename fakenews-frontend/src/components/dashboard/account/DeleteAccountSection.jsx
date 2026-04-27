/**
 * @file DeleteAccountSection.jsx
 * @description Seccion de baja RGPD con confirmacion explicita por escrito.
 */

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FeedbackBanner from "./FeedbackBanner";

const SECTION_BASE_CLASSES =
  "rounded-2xl border border-outline-variant/25 bg-surface/40 p-5";

/** Formulario de baja de cuenta que exige escribir ELIMINAR para confirmar. */
function DeleteAccountSection({ onDeleteAccount, onSubmittingChange }) {
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
      setDeleteMessage("Escribe ELIMINAR en el campo para confirmar la baja.");
      return;
    }

    updateSubmitting(true);

    try {
      await onDeleteAccount({ confirmation: deleteConfirmation.trim().toUpperCase() });
    } catch (error) {
      setDeleteMessage(error.message || "No se pudo eliminar la cuenta.");
      updateSubmitting(false);
    }
  };

  return (
    <div className={`${SECTION_BASE_CLASSES} border-error/40 bg-error-container/15`}>
      <div className="mb-3 flex items-center gap-2 text-error">
        <AlertTriangle className="size-4" />
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">
          Eliminar cuenta (RGPD)
        </h3>
      </div>
      <p className="text-sm text-on-surface-variant">
        Esta accion es irreversible. Eliminaremos tu cuenta y datos asociados. Para
        confirmar, escribe{" "}
        <span className="font-semibold text-on-surface">ELIMINAR</span> en el campo de abajo.
      </p>

      <form onSubmit={handleSubmitDelete} className="mt-4 grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="account-delete-confirmation">Confirmacion</Label>
          <Input
            id="account-delete-confirmation"
            type="text"
            value={deleteConfirmation}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder="Escribe ELIMINAR"
            disabled={isDeleting}
            required
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="destructive" disabled={isDeleting}>
            <Trash2 className="size-3.5" />
            {isDeleting ? "Eliminando..." : "Eliminar mi cuenta"}
          </Button>
        </div>
        <FeedbackBanner message={deleteMessage} tone={deleteTone} />
      </form>
    </div>
  );
}

export default DeleteAccountSection;
