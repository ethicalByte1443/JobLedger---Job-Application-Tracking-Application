import { create } from 'zustand';
import type { ApplicationFromAPI } from '../api';
import { fetchApplications } from '../api';

interface AppState {
  applications: ApplicationFromAPI[];
  loading: boolean;
  error: string | null;
  darkMode: boolean;
  setApplications: (apps: ApplicationFromAPI[]) => void;
  loadApplications: () => Promise<void>;
  removeApplication: (id: string) => void;
  updateApplicationInStore: (updated: ApplicationFromAPI) => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  applications: [],
  loading: false,
  error: null,
  darkMode: typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false,

  setApplications: (applications: ApplicationFromAPI[]) => set({ applications }),

  loadApplications: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchApplications();
      set({ applications: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Error fetching applications', loading: false });
    }
  },

  removeApplication: (id: string) =>
    set((state: AppState) => ({
      applications: state.applications.filter((a: ApplicationFromAPI) => a.id !== id),
    })),

  updateApplicationInStore: (updated: ApplicationFromAPI) =>
    set((state: AppState) => ({
      applications: state.applications.map((a: ApplicationFromAPI) =>
        a.id === updated.id ? updated : a
      ),
    })),

  toggleDarkMode: () => {
    const next = !get().darkMode;
    set({ darkMode: next });
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next);
    }
  },
}));
