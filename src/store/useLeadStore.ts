import { create } from 'zustand';

interface Lead {
  id: string;
  customerName: string;
  phoneNumber: string;
  email: string | null;
  serviceInterest: string | null;
  source: string | null;
  status: string;
  conversionScore: number | null;
  sentiment: string | null;
  agentName: string;
  assignedAgentId: string | null;
  createdAt: string;
  nextFollowup?: string | null;
}

interface LeadStore {
  leads: Lead[];
  activeLead: Lead | null;
  isLoading: boolean;
  setLeads: (leads: Lead[]) => void;
  setActiveLead: (lead: Lead | null) => void;
  claimLead: (leadId: string, agentId: string) => Promise<boolean>;

  fetchLeads: (token: string, query?: string) => Promise<void>;
  updateLeadStatus: (leadId: string, status: string, notes: string, token: string) => Promise<void>;
  addLead: (leadData: Partial<Lead>, token: string) => Promise<boolean>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL 
  ? (process.env.NEXT_PUBLIC_API_URL.endsWith('/') ? process.env.NEXT_PUBLIC_API_URL.slice(0, -1) : process.env.NEXT_PUBLIC_API_URL)
  : 'https://crm-backend-production-a511.up.railway.app';

export const useLeadStore = create<LeadStore>((set, get) => ({
  leads: [],
  activeLead: null,
  isLoading: false,
  setLeads: (leads) => set({ leads }),
  setActiveLead: (lead) => set({ activeLead: lead }),

  fetchLeads: async (token, query = '') => {
    set({ isLoading: true });
    try {
      const activeToken = token || localStorage.getItem('paramantra_access_token') || '';
      const res = await fetch(`${API_URL}/leads${query}`, {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      set({ leads: data, isLoading: false });
    } catch (error) {
      console.error(error);
      set({ isLoading: false });
    }
  },

  claimLead: async (leadId: string, agentId: string) => {
    try {
      const token = localStorage.getItem('paramantra_access_token') || '';
      const res = await fetch(`${API_URL}/leads/${leadId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ agentId })
      });
      if (res.ok) {
        const lead = await res.json();
        // Update local state
        set((state) => ({
          leads: state.leads.map(l => l.id === leadId ? { ...l, ...lead, agentName: 'You' } : l)
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  updateLeadStatus: async (leadId: string, status: string, notes: string, token?: string) => {
    try {
      const activeToken = token || localStorage.getItem('paramantra_access_token') || '';
      const res = await fetch(`${API_URL}/leads/${leadId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
        set((state) => ({
          leads: state.leads.map(l => l.id === leadId ? { ...l, status } : l)
        }));
      }
    } catch (error) {
      console.error(error);
    }
  },

  addLead: async (leadData, token?: string) => {
    try {
      const activeToken = token || localStorage.getItem('paramantra_access_token') || '';
      const res = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(leadData)
      });
      if (res.ok) {
        const { lead } = await res.json();
        set((state) => ({
          leads: [lead, ...state.leads]
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}));
