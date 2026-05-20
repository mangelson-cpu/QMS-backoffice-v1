// Client API centralisé - Remplace supabaseClient.ts
// Gère automatiquement : Token JWT + Header x-filiale-id (multi-tenant)

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

// Stockage local de la filiale sélectionnée (pour le super_admin)
let selectedFilialeId: string | null = localStorage.getItem('selected_filiale_id');

export const setSelectedFiliale = (id: string) => {
  selectedFilialeId = id;
  localStorage.setItem('selected_filiale_id', id);
};

export const getSelectedFiliale = (): string | null => {
  return selectedFilialeId || localStorage.getItem('selected_filiale_id');
};

/**
 * Construit les headers HTTP avec le token JWT et le x-filiale-id
 */
const buildHeaders = (extraHeaders?: Record<string, string>): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const filialeId = getSelectedFiliale();
  if (filialeId) {
    headers['x-filiale-id'] = filialeId;
  }

  return headers;
};

/**
 * Client API générique
 */
export const apiClient = {
  get: async (endpoint: string) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: buildHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erreur ${res.status}`);
    }
    return res.json();
  },

  post: async (endpoint: string, body?: any) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erreur ${res.status}`);
    }
    return res.json();
  },

  put: async (endpoint: string, body?: any) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erreur ${res.status}`);
    }
    return res.json();
  },

  patch: async (endpoint: string, body?: any) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erreur ${res.status}`);
    }
    return res.json();
  },

  delete: async (endpoint: string) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erreur ${res.status}`);
    }
    return res.json();
  },
};
