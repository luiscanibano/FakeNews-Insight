/**
 * @file adminStore.js
 * @description Store global con Zustand para centralizar estado, acciones y sincronizacion entre vistas.
 */

import { create } from "zustand";
import {
  deactivateAdminUser,
  getAdminUserKpis,
  getAdminUsers,
  updateAdminUserPlan,
} from "../services/admin";

const emptyUserKpis = { total: 0, free: 0, pro: 0, ultra: 0 };

const decrementPlanCounter = (kpis, plan) => {
  if (plan === "pro") {
    return { ...kpis, pro: Math.max(0, kpis.pro - 1) };
  }

  if (plan === "ultra") {
    return { ...kpis, ultra: Math.max(0, kpis.ultra - 1) };
  }

  return { ...kpis, free: Math.max(0, kpis.free - 1) };
};

const incrementPlanCounter = (kpis, plan) => {
  if (plan === "pro") {
    return { ...kpis, pro: kpis.pro + 1 };
  }

  if (plan === "ultra") {
    return { ...kpis, ultra: kpis.ultra + 1 };
  }

  return { ...kpis, free: kpis.free + 1 };
};

/** Store del dominio admin: gestiona usuarios, errores y acciones de mantenimiento. */
export const useAdminStore = create((set) => ({
  users: [],
  totalUsersCount: 0,
  usersPage: 1,
  usersPageSize: 10,
  usersSearchTerm: "",
  loadingUsers: false,
  loadingUserKpis: false,
  actionLoadingUserId: "",
  error: null,
  userKpis: emptyUserKpis,
  simulatedApiCallsToday: {
    web: 14,
    extension: 53,
    api: 133,
  },

  /** Limpia errores del panel para evitar mensajes obsoletos. */
  clearError: () => set({ error: null }),

  /** Carga usuarios gestionables desde el servicio con paginacion y busqueda. */
  loadUsers: async ({
    includeAdmins = false,
    page = 1,
    pageSize = 10,
    searchTerm = "",
  } = {}) => {
    set({ loadingUsers: true, error: null });

    try {
      const result = await getAdminUsers({ includeAdmins, page, pageSize, searchTerm });
      set({
        users: result.users,
        totalUsersCount: result.totalCount,
        usersPage: result.page,
        usersPageSize: result.pageSize,
        usersSearchTerm: searchTerm,
        loadingUsers: false,
      });
    } catch (error) {
      set({ error: error.message, loadingUsers: false });
    }
  },

  /** Carga contadores globales por plan para los KPIs del panel. */
  loadUserKpis: async ({ includeAdmins = false } = {}) => {
    set({ loadingUserKpis: true, error: null });

    try {
      const userKpis = await getAdminUserKpis({ includeAdmins });
      set({ userKpis, loadingUserKpis: false });
    } catch (error) {
      set({ error: error.message, loadingUserKpis: false });
    }
  },

  /** Asigna un plan concreto a un usuario y actualiza la lista en memoria. */
  setUserPlan: async ({ targetUser, plan }) => {
    set({ actionLoadingUserId: targetUser.id, error: null });

    try {
      const updatedUser = await updateAdminUserPlan({ userId: targetUser.id, plan });
      set((state) => ({
        users: state.users.map((existingUser) =>
          existingUser.id === updatedUser.id ? updatedUser : existingUser
        ),
        userKpis:
          targetUser.plan === updatedUser.plan
            ? state.userKpis
            : incrementPlanCounter(
                decrementPlanCounter(state.userKpis, targetUser.plan || "free"),
                updatedUser.plan || "free"
              ),
        actionLoadingUserId: "",
      }));
    } catch (error) {
      set({ error: error.message, actionLoadingUserId: "" });
      throw error;
    }
  },

  /** Da de baja un usuario eliminando su perfil y retirandolo del listado local. */
  deactivateUser: async ({ userId }) => {
    set({ actionLoadingUserId: userId, error: null });

    try {
      await deactivateAdminUser({ userId });
      set((state) => {
        const deletedUser = state.users.find((existingUser) => existingUser.id === userId);
        const nextKpis = deletedUser
          ? decrementPlanCounter(state.userKpis, deletedUser.plan || "free")
          : state.userKpis;

        return {
          users: state.users.filter((existingUser) => existingUser.id !== userId),
          totalUsersCount: Math.max(0, state.totalUsersCount - 1),
          userKpis: {
            ...nextKpis,
            total: Math.max(0, state.userKpis.total - 1),
          },
          actionLoadingUserId: "",
        };
      });
    } catch (error) {
      set({ error: error.message, actionLoadingUserId: "" });
      throw error;
    }
  },
}));
