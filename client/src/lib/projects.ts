import { Project } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const getProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch(`${API_URL}/projects`);
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
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch(`${API_URL}/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch(`${API_URL}/categories`);
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
      headers: { 'Content-Type': 'application/json' },
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
