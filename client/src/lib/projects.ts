import { Project } from '../types';
import { supabase } from './supabase';

const API_URL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : (import.meta.env.VITE_API_URL || '/api');

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const ssoToken = localStorage.getItem('sso_token');
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token || ssoToken || ''}`
  };
};

export const getProjects = async (): Promise<Project[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/projects?t=${Date.now()}`, {
      headers,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    const data = await response.json();
    const projects = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
    
    // Migration for older projects that had 'category' instead of 'categories'
    return projects.map((p: any) => {
      if (p.category && !p.categories) {
        return { ...p, categories: [p.category] };
      }
      return p;
    });
  } catch (error) {
    console.error('Fetch failed:', error);
    return [];
  }
};

export const createProject = async (project: Project): Promise<Project> => {
  try {
    const response = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('Failed to create project');
    const saved = await response.json();
    window.dispatchEvent(new Event('projects_updated'));
    return saved;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

export const updateProject = async (project: Project): Promise<Project> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/projects/${project.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(project),
    });
    if (!response.ok) throw new Error('Failed to update project');
    const saved = await response.json();
    window.dispatchEvent(new Event('projects_updated'));
    return saved;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to delete project');
    }
    window.dispatchEvent(new Event('projects_updated'));
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

export const saveProjects = async (projects: Project[]) => {
  try {
    const orderData = projects.map(p => ({ id: p.id, display_order: p.display_order }));
    const response = await fetch(`${API_URL}/projects/reorder`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to save project order');
    window.dispatchEvent(new Event('projects_updated'));
  } catch (error) {
    console.error('Error saving projects:', error);
  }
};

export const getCategories = async (): Promise<string[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/categories`, { headers });
    if (!response.ok) throw new Error('Failed to fetch categories');
    return await response.json();
  } catch (error) {
    return [];
  }
};

export const addCategory = async (name: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error('Failed to add category');
    window.dispatchEvent(new Event('categories_updated'));
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const deleteCategoryApi = async (name: string): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/categories/${name}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete category');
    window.dispatchEvent(new Event('categories_updated'));
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const saveCategories = (categories: string[]) => {
  // Broadcasting local update event
  window.dispatchEvent(new Event('categories_updated'));
};

export interface SiteSettings {
  allow_publish: boolean;
}

export interface VaultItem {
  id: string;
  name: string;
  username?: string;
  key: string;
  description?: string;
  createdAt: string;
}

export const getSettings = async (): Promise<SiteSettings> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/settings`, { headers });
    if (!response.ok) throw new Error('Failed to fetch settings');
    return await response.json();
  } catch (error) {
    return { allow_publish: true };
  }
};

export const updateSettings = async (settings: SiteSettings): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/settings`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error('Failed to update settings');
    window.dispatchEvent(new Event('settings_updated'));
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

export const getVault = async (): Promise<VaultItem[]> => {
  try {
    const response = await fetch(`${API_URL}/admin/vault`, {
      headers: await getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch vault');
    return await response.json();
  } catch (error) {
    console.error('Error fetching vault:', error);
    return [];
  }
};

export const updateVault = async (vault: VaultItem[]): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/admin/vault`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(vault),
    });
    if (!response.ok) throw new Error('Failed to update vault');
  } catch (error) {
    console.error('Error updating vault:', error);
    throw error;
  }
};
