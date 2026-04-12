export type Category = 'Generative AI' | 'Computer Vision' | 'NLP' | 'Predictive Analytics' | 'Robotics' | 'Agentic AI';

export interface Project {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  categories: string[];
  features: string[];
  imageUrl?: string;
  createdAt: string;
  techStack?: string[];
  performance?: number;
  authorName: string;
  status: 'pending' | 'approved';
  display_order?: number;
  liveUrl?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name: string;
}
