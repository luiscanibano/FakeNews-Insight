import { create } from "zustand";
import {
  deactivateAdminUser,
  getAdminUsers,
  updateAdminUserPlan,
} from "../services/admin";

// Store del dominio admin: gestiona usuarios, errores y acciones de mantenimiento.
export const useAdminStore = create((set) => ({
  users: [],
  loadingUsers: false,
  actionLoadingUserId: "",
  error: null,
  simulatedApiCallsToday: {
    web: 14,
    extension: 53,
    api: 133,
  },

  // Limpia errores del panel para evitar mensajes obsoletos.
  clearError: () => set({ error: null }),

  // Carga usuarios gestionables desde el servicio de administracion.
  loadUsers: async ({ includeAdmins = false } = {}) => {
    set({ loadingUsers: true, error: null });

    try {
      const users = await getAdminUsers({ includeAdmins });
      set({ users, loadingUsers: false });
    } catch (error) {
      set({ error: error.message, loadingUsers: false });
    }
  },

  // Asigna un plan concreto a un usuario y actualiza la lista en memoria.
  setUserPlan: async ({ targetUser, plan }) => {
    set({ actionLoadingUserId: targetUser.id, error: null });

    try {
      const updatedUser = await updateAdminUserPlan({ userId: targetUser.id, plan });
      set((state) => ({
        users: state.users.map((existingUser) =>
          existingUser.id === updatedUser.id ? updatedUser : existingUser
        ),
        actionLoadingUserId: "",
      }));
    } catch (error) {
      set({ error: error.message, actionLoadingUserId: "" });
      throw error;
    }
  },

  // Da de baja un usuario eliminando su perfil y retirandolo del listado local.
  deactivateUser: async ({ userId }) => {
    set({ actionLoadingUserId: userId, error: null });

    try {
      await deactivateAdminUser({ userId });
      set((state) => ({
        users: state.users.filter((existingUser) => existingUser.id !== userId),
        actionLoadingUserId: "",
      }));
    } catch (error) {
      set({ error: error.message, actionLoadingUserId: "" });
      throw error;
    }
  },
}));
