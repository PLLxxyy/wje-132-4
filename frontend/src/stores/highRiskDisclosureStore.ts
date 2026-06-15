import { create } from 'zustand';
import { highRiskDisclosureApi } from '../api/highRiskDisclosure';
import type { DisclosureQuery, HighRiskDisclosure } from '../types';

interface DisclosureState {
  disclosures: HighRiskDisclosure[];
  selectedDisclosure?: HighRiskDisclosure;
  total: number;
  loading: boolean;
  loadDisclosures: (query?: DisclosureQuery) => Promise<void>;
  selectDisclosure: (id: number) => Promise<void>;
  createDisclosure: (payload: Partial<HighRiskDisclosure> | FormData) => Promise<void>;
}

export const useHighRiskDisclosureStore = create<DisclosureState>((set) => ({
  disclosures: [],
  total: 0,
  loading: false,
  async loadDisclosures(query) {
    set({ loading: true });
    try {
      const result = await highRiskDisclosureApi.list(query);
      set({ disclosures: result.items, total: result.total });
    } finally {
      set({ loading: false });
    }
  },
  async selectDisclosure(id) {
    set({ selectedDisclosure: await highRiskDisclosureApi.detail(id) });
  },
  async createDisclosure(payload) {
    await highRiskDisclosureApi.create(payload);
    const result = await highRiskDisclosureApi.list();
    set({ disclosures: result.items, total: result.total });
  },
}));
