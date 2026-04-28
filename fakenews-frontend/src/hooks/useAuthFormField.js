/**
 * @file useAuthFormField.js
 * @description Hook mínimo para campos de formulario que limpian un error global al editar.
 */

import { useState } from "react";

/**
 * Devuelve `[value, handleChange, setValue]` donde `handleChange`:
 *  - limpia el error global mediante `clearError` si existe.
 *  - opcionalmente ejecuta `onBeforeChange` para limpieza local (mensajes, etc.).
 */
export const useAuthFormField = ({ initialValue = "", error, clearError, onBeforeChange } = {}) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = (event) => {
    if (error && typeof clearError === "function") {
      clearError();
    }

    if (typeof onBeforeChange === "function") {
      onBeforeChange();
    }

    setValue(event.target.value);
  };

  return [value, handleChange, setValue];
};
