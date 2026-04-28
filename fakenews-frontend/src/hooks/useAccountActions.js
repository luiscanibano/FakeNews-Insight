/**
 * @file useAccountActions.js
 * @description Hook que agrupa las acciones de cuenta (cambio de contraseña, baja RGPD)
 * con sus respectivos timeouts para evitar UI bloqueada.
 */

import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { getAccessToken } from "../services/auth";
import { changeAccountPassword, deleteAccount } from "../services/account";
import { withTimeout } from "../lib/promiseTimeout";
import {
  ACCOUNT_REQUEST_TIMEOUT_MS,
  AUTH_REQUEST_TIMEOUT_MS,
} from "../lib/constants";

/** Devuelve handlers para acciones criticas de cuenta del usuario autenticado. */
export const useAccountActions = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  /** Cambia la contraseña reautenticando con la actual. */
  const handleChangeAccountPassword = async ({ currentPassword, newPassword }) => {
    const email = user?.email;
    if (!email) {
      throw new Error("No se pudo obtener el email del usuario actual.");
    }

    return changeAccountPassword({ email, currentPassword, newPassword });
  };

  /** Elimina la cuenta tras confirmacion explicita y cierra sesión. */
  const handleDeleteAccount = async ({ confirmation }) => {
    const jwtToken = await withTimeout(
      getAccessToken(),
      AUTH_REQUEST_TIMEOUT_MS,
      "No se pudo validar tu sesión a tiempo. Vuelve a iniciar sesión."
    );

    await withTimeout(
      deleteAccount({ jwtToken, confirmation }),
      ACCOUNT_REQUEST_TIMEOUT_MS,
      "La eliminación de la cuenta tardó demasiado. Reintenta en unos segundos."
    );

    try {
      await logout();
    } catch {
      /** Logout fallback gestionado por el store. */
    }

    navigate("/", { replace: true });
  };

  return {
    handleChangeAccountPassword,
    handleDeleteAccount,
  };
};
