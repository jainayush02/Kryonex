import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '@/src/types';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Plus, Trash2, Edit2, LayoutDashboard, LogOut, Image as ImageIcon, Github, Activity, Loader2, Settings, Inbox, Check, X, Tags, GripVertical, Upload, ChevronLeft, ChevronRight, Menu, ExternalLink, Key, Eye, EyeOff, Lock, ShieldCheck, Copy, User, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettingsModal } from '@/src/components/SettingsModal';
import { getProjects, saveProjects, getCategories, saveCategories, createProject, updateProject, deleteProject, addCategory, deleteCategoryApi, getSettings, updateSettings, SiteSettings, getVault, updateVault, VaultItem } from '@/src/lib/projects';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import logo from '../logo.png';

export default function AdminPortal() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [vault, setVault] = React.useState<VaultItem[]>([]);
  const [activeTab, setActiveTabState] = React.useState<'projects' | 'requests' | 'categories' | 'platform' | 'vault'>('projects');

  // Sync activeTab with URL hash to persist across reloads
  React.useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (['projects', 'requests', 'categories', 'platform', 'vault'].includes(hash)) {
      setActiveTabState(hash as any);
    }
  }, []);

  const setActiveTab = (tab: typeof activeTab) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };
  const [isAdding, setIsAdding] = React.useState(false);
  const [githubUrl, setGithubUrl] = React.useState('');
  const [isFetching, setIsFetching] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [siteSettings, setSiteSettings] = React.useState<SiteSettings>({ allow_publish: true });
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [projectsData, categoriesData, settingsData, vaultData] = await Promise.all([
          getProjects(),
          getCategories(),
          getSettings(),
          getVault()
        ]);
        setProjects(projectsData);
        setCategories(categoriesData);
        setSiteSettings(settingsData);
        setVault(vaultData);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    const handleProjectsUpdate = async () => setProjects(await getProjects());
    const handleCategoriesUpdate = async () => setCategories(await getCategories());
    window.addEventListener('projects_updated', handleProjectsUpdate);
    window.addEventListener('categories_updated', handleCategoriesUpdate);

    // Live Supabase Sync for Admin
    const channel = supabase
      .channel('admin-ui-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects_v2' }, () => {
        handleProjectsUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        handleCategoriesUpdate();
      })
      .subscribe();

    // Polling Fallback (Safety Sync every 15s)
    const pollInterval = setInterval(() => {
      handleProjectsUpdate();
    }, 15000);

    return () => {
      window.removeEventListener('projects_updated', handleProjectsUpdate);
      window.removeEventListener('categories_updated', handleCategoriesUpdate);
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, []);

  // Form state
  const [newProject, setNewProject] = React.useState<Partial<Project>>({
    title: '',
    shortDescription: '',
    description: '',
    categories: [],
    features: [],
    techStack: [],
  });

  const [newVaultItem, setNewVaultItem] = React.useState<Partial<VaultItem>>({
    name: '',
    username: '',
    key: '',
    description: ''
  });

  const [visibleKeys, setVisibleKeys] = React.useState<Set<string>>(new Set());

  const toggleCategory = (cat: string) => {
    const current = newProject.categories || [];
    if (current.includes(cat)) {
      setNewProject({ ...newProject, categories: current.filter(c => c !== cat) });
    } else {
      setNewProject({ ...newProject, categories: [...current, cat] });
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawFeatures = newProject.features || [];
    // Remove old GH entry if it exists
    const finalFeatures = rawFeatures.filter(f => !f.startsWith('GH:'));
    if (githubUrl.trim()) {
      finalFeatures.push(`GH:${githubUrl.trim()}`);
    }

    if (newProject.id) {
      // Logic for Update
      try {
        const updatedProject = {
          ...newProject,
          features: finalFeatures,
          techStack: typeof newProject.techStack === 'string'
            ? (newProject.techStack as string).split(',').map(s => s.trim()).filter(Boolean)
            : (newProject.techStack || []),
        } as Project;

        await updateProject(updatedProject);
        setProjects(projects.map(p => p.id === newProject.id ? updatedProject : p));
        toast.success('Project updated successfully');
        setIsAdding(false);
        setNewProject({ title: '', shortDescription: '', description: '', categories: [], features: [], liveUrl: '', authorName: '', techStack: [] });
        setGithubUrl('');
      } catch (error) {
        toast.error('Failed to update project');
      }
      return;
    }

    const currentUserStr = localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : { name: 'Admin' };

    // Use a proper UUID-like format for better database compatibility
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const project: Project = {
      id: generateUUID(),
      title: newProject.title || 'Untitled Project',
      shortDescription: newProject.shortDescription || '',
      description: newProject.description || '',
      categories: newProject.categories?.length ? newProject.categories : ['Generative AI'],
      features: finalFeatures,
      liveUrl: newProject.liveUrl || '',
      createdAt: new Date().toISOString().split('T')[0],
      authorName: newProject.authorName || currentUser.name,
      status: 'approved',
      techStack: typeof newProject.techStack === 'string'
        ? (newProject.techStack as string).split(',').map(s => s.trim()).filter(Boolean)
        : (newProject.techStack || []),
    };

    try {
      await createProject(project);
      toast.success('Project added successfully');
      setProjects([project, ...projects]);
      setIsAdding(false);
      setNewProject({ title: '', shortDescription: '', description: '', categories: [], features: [], liveUrl: '', authorName: '', techStack: [] });
      setGithubUrl('');
    } catch (error) {
      toast.error('Failed to add project');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      toast.success('Project deleted');
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  const handleApprove = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    const updatedProject = { ...project, status: 'approved' as const };
    try {
      await updateProject(updatedProject);
      setProjects(projects.map(p => p.id === id ? updatedProject : p));
      toast.success('Project approved');
    } catch (error) {
      toast.error('Failed to approve project');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      toast.success('Request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  const pendingCount = projects.filter(p => p.status === 'pending').length;
  const displayProjects = projects.filter(p => p.status === (activeTab === 'projects' ? 'approved' : 'pending'));

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name || categories.includes(name)) return;

    try {
      await addCategory(name);
      setCategories([...categories, name]);
      setNewCategoryName('');
      toast.success('Category added');
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleDeleteCategory = async (catToDelete: string) => {
    try {
      await deleteCategoryApi(catToDelete);
      setCategories(categories.filter(cat => cat !== catToDelete));
      toast.success('Category deleted');
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const handleTogglePublish = async () => {
    const newSettings = { ...siteSettings, allow_publish: !siteSettings.allow_publish };
    try {
      await updateSettings(newSettings);
      setSiteSettings(newSettings);
      toast.success(`Publishing ${newSettings.allow_publish ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleFetchMetadata = async () => {
    if (!githubUrl) return;
    setIsFetching(true);

    try {
      const cleanUrl = githubUrl.trim().replace(/\/$/, "");
      const urlParts = cleanUrl.replace('https://github.com/', '').split('/');
      if (urlParts.length < 2) throw new Error('Invalid GitHub URL. Use format: https://github.com/owner/repo');

      const owner = urlParts[0];
      const repo = urlParts[1].replace('.git', '');

      // Fetch repo metadata, languages, and README
      const [repoResponse, langResponse, readmeResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/languages`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
          headers: { 'Accept': 'application/vnd.github.raw' }
        })
      ]);

      if (!repoResponse.ok) throw new Error('Repository not found or private');
      const data = await repoResponse.json();

      let techStack = [];
      if (langResponse.ok) {
        const langs = await langResponse.json();
        techStack = Object.keys(langs);
      }

      let readmeContent = '';
      if (readmeResponse.ok) {
        readmeContent = await readmeResponse.text();
      }

      setNewProject({
        ...newProject,
        title: data.name || repo,
        shortDescription: data.description || '',
        description: readmeContent || '',
        techStack: techStack.length > 0 ? techStack : (data.language ? [data.language] : []),
        features: [`Stars: ${data.stargazers_count}`, `Forks: ${data.forks_count}`],
      });
      toast.success('Successfully imported from GitHub');
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch metadata');
    } finally {
      setIsFetching(false);
    }
  };



  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    // Only allow reordering in projects tab
    if (activeTab !== 'projects') return;

    const items = Array.from(displayProjects);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all items
    const updatedItems = items.map((item: any, index) => ({
      ...item,
      display_order: index
    }));

    // Merge back into main projects list
    const otherProjects = projects.filter(p => p.status !== 'approved');
    const newProjects = [...updatedItems, ...otherProjects];

    setProjects(newProjects);
    saveProjects(newProjects);

    toast.success('Project order saved');
  };

  // Sort display projects by display_order if available
  const sortedDisplayProjects = [...displayProjects].sort((a, b) => {
    if (a.display_order !== undefined && b.display_order !== undefined) {
      return a.display_order - b.display_order;
    }
    return 0;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(5px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-pearl dark:bg-obsidian flex transition-colors duration-300"
    >
      {/* Mobile Top Header */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-obsidian/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-graphite/50 px-6 py-4 flex items-center justify-between transition-all duration-300">
        <div className="w-8 h-8 opacity-0">{/* Placeholder for balance */}</div>
        <div className="w-32 h-8 flex items-center justify-center overflow-hidden">
          <div 
            className="w-full h-full bg-graphite dark:bg-white" 
            style={{ 
              maskImage: `url(${logo})`, 
              maskSize: 'contain', 
              maskRepeat: 'no-repeat', 
              maskPosition: 'center',
              WebkitMaskImage: `url(${logo})`,
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center'
            }} 
          />
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-slate-600 dark:text-slate-400 hover:text-graphite dark:hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-obsidian/40 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.4 }}
              className="fixed top-0 right-0 h-[100dvh] w-72 bg-white dark:bg-obsidian z-[70] md:hidden shadow-2xl flex flex-col border-l border-slate-200/50 dark:border-graphite/50 will-change-transform"
            >
              <div className="p-6 border-b border-slate-200/50 dark:border-graphite/50 flex items-center justify-between flex-shrink-0">
                <span className="font-anta tracking-widest text-graphite dark:text-white uppercase font-bold">Admin Menu</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-slate-500 hover:text-graphite dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
                <Button 
                  variant={activeTab === 'projects' ? 'secondary' : 'ghost'} 
                  className="w-full justify-start gap-4"
                  onClick={() => { setActiveTab('projects'); setIsMobileMenuOpen(false); }}
                >
                  <LayoutDashboard size={20} />
                  <span className="font-anta tracking-wider">Projects</span>
                </Button>
                <Button 
                  variant={activeTab === 'requests' ? 'secondary' : 'ghost'} 
                  className="w-full justify-start gap-4 relative"
                  onClick={() => { setActiveTab('requests'); setIsMobileMenuOpen(false); }}
                >
                  <Inbox size={20} />
                  <span className="font-anta tracking-wider">Requests</span>
                  {pendingCount > 0 && (
                    <span className="ml-auto bg-graphite text-white dark:bg-white dark:text-obsidian text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {pendingCount}
                    </span>
                  )}
                </Button>
                <Button 
                  variant={activeTab === 'categories' ? 'secondary' : 'ghost'} 
                  className="w-full justify-start gap-4"
                  onClick={() => { setActiveTab('categories'); setIsMobileMenuOpen(false); }}
                >
                  <Tags size={20} />
                  <span className="font-anta tracking-wider">Categories</span>
                </Button>
                <Button 
                  variant={activeTab === 'platform' ? 'secondary' : 'ghost'} 
                  className="w-full justify-start gap-4"
                  onClick={() => { setActiveTab('platform'); setIsMobileMenuOpen(false); }}
                >
                  <Settings size={20} />
                  <span className="font-anta tracking-wider">Platform</span>
                </Button>
                <Button 
                  variant={activeTab === 'vault' ? 'secondary' : 'ghost'} 
                  className="w-full justify-start gap-4 text-purple-600 dark:text-purple-400"
                  onClick={() => { setActiveTab('vault'); setIsMobileMenuOpen(false); }}
                >
                  <Lock size={20} />
                  <span className="font-anta tracking-wider font-bold">Admin Vault</span>
                </Button>
              </div>

              <div className="p-6 border-t border-slate-200/50 dark:border-graphite/50 space-y-4 flex-shrink-0 bg-white/50 dark:bg-obsidian/50 backdrop-blur-md">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-4 text-slate-600 dark:text-slate-400"
                  onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }}
                >
                  <Settings size={20} />
                  <span className="font-anta tracking-wider">Settings</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-4 text-slate-600 dark:text-slate-400"
                  onClick={() => { navigate('/portal'); setIsMobileMenuOpen(false); }}
                >
                  <ExternalLink size={20} />
                  <span className="font-anta tracking-wider">User Portal</span>
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-4 text-red-500"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/');
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <LogOut size={20} />
                  <span className="font-anta tracking-wider">Logout</span>
                </Button>

                <div className="pt-4 border-t border-slate-200/50 dark:border-graphite/50">
                  <div className="text-[11px] font-anta tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    © 2026 Kryonex
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar (Desktop/Tablet) */}
      <aside className="w-20 lg:w-64 h-screen sticky top-0 bg-white/40 dark:bg-obsidian/40 backdrop-blur-xl border-r border-slate-200/50 dark:border-graphite/50 hidden md:flex flex-col transition-all duration-300">
        <div className="p-6 border-b border-slate-200/50 dark:border-graphite/50 flex justify-center lg:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-48 h-20 flex items-center justify-center overflow-hidden">
              <div
                className="w-full h-full bg-graphite dark:bg-white"
                style={{
                  maskImage: `url(${logo})`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: `url(${logo})`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center'
                }}
              />
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Button variant={activeTab === 'projects' ? 'secondary' : 'ghost'} onClick={() => { setActiveTab('projects'); setIsAdding(false); }} className="w-full justify-center lg:justify-start gap-3 bg-white/60 dark:bg-white/10 text-graphite dark:text-white border-graphite/10 dark:border-white/10">
            <LayoutDashboard size={18} />
            <span className="hidden lg:block font-anta tracking-wider">Projects</span>
          </Button>
          <Button variant={activeTab === 'requests' ? 'secondary' : 'ghost'} onClick={() => { setActiveTab('requests'); setIsAdding(false); }} className="w-full justify-center lg:justify-start gap-3 bg-white/60 dark:bg-white/10 text-graphite dark:text-white border-graphite/10 dark:border-white/10 relative">
            <Inbox size={18} />
            <span className="hidden lg:block font-anta tracking-wider">Requests</span>
            {pendingCount > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-graphite text-white dark:bg-white dark:text-obsidian text-[10px] px-2 py-0.5 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button variant={activeTab === 'categories' ? 'secondary' : 'ghost'} onClick={() => { setActiveTab('categories'); setIsAdding(false); }} className="w-full justify-center lg:justify-start gap-3 bg-white/60 dark:bg-white/10 text-graphite dark:text-white border-graphite/10 dark:border-white/10">
            <Tags size={18} />
            <span className="hidden lg:block font-anta tracking-wider">Categories</span>
          </Button>
          <Button variant={activeTab === 'platform' ? 'secondary' : 'ghost'} onClick={() => { setActiveTab('platform'); setIsAdding(false); }} className="w-full justify-center lg:justify-start gap-3 bg-white/60 dark:bg-white/10 text-graphite dark:text-white border-graphite/10 dark:border-white/10">
            <Settings size={18} />
            <span className="hidden lg:block font-anta tracking-wider">Platform</span>
          </Button>
          <Button variant={activeTab === 'vault' ? 'secondary' : 'ghost'} onClick={() => { setActiveTab('vault'); setIsAdding(false); }} className="w-full justify-center lg:justify-start gap-3 bg-white/60 dark:bg-white/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30">
            <Lock size={18} />
            <span className="hidden lg:block font-anta tracking-wider font-bold">Admin Vault</span>
          </Button>
        </nav>
        <div className="p-4 border-t border-slate-200/50 dark:border-graphite/50 flex flex-col gap-4 items-center lg:items-stretch">
          <Button variant="ghost" className="w-full justify-center lg:justify-start gap-3 text-slate-500 hover:text-graphite dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={18} />
            <span className="hidden lg:block font-anta tracking-wider">Settings</span>
          </Button>
          <Button variant="ghost" className="w-full justify-center lg:justify-start gap-3 text-slate-500 hover:text-graphite dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10" onClick={() => navigate('/portal')}>
            <ExternalLink size={18} />
            <span className="hidden lg:block font-anta tracking-wider">User Portal</span>
          </Button>
          <Button variant="ghost" className="w-full justify-center lg:justify-start gap-3 text-slate-500 hover:text-graphite dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10" onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}>
            <LogOut size={18} />
            <span className="hidden lg:block font-anta tracking-wider">Logout</span>
          </Button>
        </div>

        {/* Sidebar Branding (Bottom) */}
        <div className="mt-auto p-4 lg:p-6 border-t border-slate-200/50 dark:border-graphite/50 hidden lg:flex flex-col gap-4">
          <div className="text-[9px] font-sans tracking-widest text-slate-500 dark:text-slate-400 uppercase leading-relaxed">
            © 2026 Kryonex by Ayush.<br />All rights reserved.
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 pt-20 md:p-8 md:pt-8 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-[1800px] mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
            <div>
              <h1 className="text-xl md:text-2xl font-anta tracking-tight text-graphite dark:text-white uppercase">
                {activeTab === 'projects' && 'Project Management'}
                {activeTab === 'requests' && 'Pending Requests'}
                {activeTab === 'categories' && 'Category Management'}
                {activeTab === 'platform' && 'Platform Settings'}
                {activeTab === 'vault' && 'Admin Vault'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                {activeTab === 'projects' && 'Manage your portfolio works and categories.'}
                {activeTab === 'requests' && 'Review and approve projects submitted by users.'}
                {activeTab === 'categories' && 'Add or remove project categories.'}
                {activeTab === 'platform' && 'Control global functional visibility and system behavior.'}
                {activeTab === 'vault' && 'Securely store and manage your personal API keys and credentials.'}
              </p>
            </div>
            {activeTab === 'projects' && (
              <Button onClick={() => {
                setNewProject({ title: '', shortDescription: '', description: '', categories: [], features: [], liveUrl: '', authorName: '', techStack: [] });
                setGithubUrl('');
                setIsAdding(true);
              }} className="gap-2">
                <Plus size={18} />
                Add Project
              </Button>
            )}
          </header>

          {activeTab === 'projects' && isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="font-anta uppercase tracking-wider">New Project</CardTitle>
                </CardHeader>
                <CardContent className="relative min-h-[400px]">
                  {isFetching && (
                    <div className="absolute inset-0 z-50 bg-white/60 dark:bg-obsidian/60 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-graphite/10 dark:border-white/10 border-t-graphite dark:border-t-white rounded-full animate-spin" />
                        <Github className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-graphite dark:text-white" size={24} />
                      </div>
                      <p className="mt-4 text-sm font-medium text-graphite dark:text-white animate-pulse text-center">Syncing README and Metadata...</p>
                    </div>
                  )}
                  <form onSubmit={handleAddProject} className="space-y-6">
                    {/* Fetch Metadata Section */}
                    <div className="p-4 bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-graphite/50 rounded-xl">
                      <label className="text-sm font-medium text-graphite dark:text-slate-300 mb-2 block">Auto-Populate from GitHub</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <Input
                            placeholder="https://github.com/username/repo"
                            value={githubUrl}
                            onChange={e => setGithubUrl(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Button type="button" variant="secondary" onClick={handleFetchMetadata} disabled={isFetching || !githubUrl}>
                          {isFetching ? <Loader2 size={16} className="animate-spin" /> : 'Fetch Metadata'}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-graphite dark:text-slate-300">Project Title</label>
                        <Input
                          placeholder="e.g. Minimalist Dashboard"
                          value={newProject.title}
                          onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-graphite dark:text-slate-300">Author Name</label>
                        <Input
                          placeholder="Author name"
                          value={newProject.authorName}
                          onChange={e => setNewProject({ ...newProject, authorName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-graphite dark:text-slate-300">Live Project URL</label>
                        <Input
                          placeholder="https://your-live-site.com"
                          value={newProject.liveUrl}
                          onChange={e => setNewProject({ ...newProject, liveUrl: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-graphite dark:text-slate-300">GitHub Repository URL</label>
                        <Input
                          placeholder="https://github.com/owner/repo"
                          value={githubUrl}
                          onChange={e => setGithubUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-graphite dark:text-slate-300">Tech Stack</label>
                        <Input
                          placeholder="e.g. React, TypeScript, TensorFlow (comma separated)"
                          value={Array.isArray(newProject.techStack) ? newProject.techStack.join(', ') : newProject.techStack || ''}
                          onChange={e => setNewProject({ ...newProject, techStack: e.target.value as any })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-graphite dark:text-slate-300">Categories</label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => toggleCategory(cat)}
                            className={`px-3 py-1 rounded-full text-xs border transition-colors ${newProject.categories?.includes(cat)
                              ? 'bg-graphite text-white border-graphite dark:bg-white dark:text-obsidian dark:border-white'
                              : 'bg-transparent text-slate-500 border-slate-200/50 dark:border-graphite/50 hover:border-graphite/30 dark:hover:border-white/30'
                              }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-graphite dark:text-slate-300">Short Description</label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-xl border border-slate-200/50 bg-white/40 backdrop-blur-xl px-3 py-2 text-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-graphite/20 transition-all duration-300 dark:bg-white/5 dark:border-graphite dark:text-slate-200 dark:focus:ring-white/20 resize-none"
                        placeholder="Brief 1-2 sentence overview of the project..."
                        value={newProject.shortDescription}
                        onChange={e => setNewProject({ ...newProject, shortDescription: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-graphite dark:text-slate-300">README (Markdown Supported)</label>
                      <textarea
                        className="flex min-h-[500px] w-full rounded-xl border border-slate-200/50 bg-white/40 backdrop-blur-xl px-3 py-2 text-sm shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus:outline-none focus:ring-2 focus:ring-graphite/20 transition-all duration-300 dark:bg-white/5 dark:border-graphite dark:text-slate-200 dark:focus:ring-white/20 font-mono"
                        placeholder="# Project Title&#10;&#10;Use standard Markdown for your README..."
                        value={newProject.description}
                        onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                      <Button type="submit">Create Project</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-8">
              <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-graphite shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)]">
                <CardHeader>
                  <CardTitle>Add New Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCategory} className="flex gap-4">
                    <Input
                      placeholder="e.g. Reinforcement Learning"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      className="max-w-md"
                    />
                    <Button type="submit" disabled={!newCategoryName.trim()}>Add Category</Button>
                  </form>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <Card key={i} className="p-4 h-14 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-graphite animate-pulse" />
                  ))
                ) : categories.map(cat => (
                  <Card key={cat} className="p-4 flex justify-between items-center bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-graphite shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)]">
                    <span className="font-medium text-graphite dark:text-white">{cat}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/10 h-8 w-8 p-0"
                      onClick={() => handleDeleteCategory(cat)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'platform' && (
            <div className="space-y-6 max-w-2xl">
              <Card className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-graphite shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)]">
                <CardHeader>
                  <CardTitle className="text-lg font-anta tracking-wider uppercase">User Portal Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-200/50 dark:border-graphite/50">
                    <div>
                      <div className="font-bold text-graphite dark:text-white">Allow Project Publishing</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">Controls visibility of "Publish Project" button in User Portal</div>
                    </div>
                    <button 
                      onClick={handleTogglePublish}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${siteSettings.allow_publish ? 'bg-graphite dark:bg-white' : 'bg-slate-200 dark:bg-graphite'}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-obsidian transition-transform ${siteSettings.allow_publish ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-graphite/50 text-center">
                    <p className="text-xs text-slate-500 font-mono italic">More system controls will be available in the next core update.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'vault' && (
            <div className="space-y-8 w-full max-w-5xl">
              <Card className="bg-white/20 dark:bg-obsidian/10 backdrop-blur-2xl border-purple-500/10 dark:border-purple-500/10 shadow-[0_20px_40px_-15px_rgba(147,51,234,0.05)]">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-7">
                  <div>
                    <CardTitle className="text-xl font-anta tracking-widest uppercase flex items-center gap-3 text-purple-600 dark:text-purple-400 opacity-80">
                      <ShieldCheck size={24} />
                      Credential Vault
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1 uppercase tracking-tighter font-mono opacity-60">End-to-end Local Persistence Engine</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 sm:p-6 rounded-2xl bg-purple-50/20 dark:bg-purple-900/5 border border-purple-100/20 dark:border-purple-900/20">
                    <div className="space-y-2">
                      <label className="text-[10px] font-anta uppercase tracking-widest text-purple-600/70 dark:text-purple-400/70">Service Name</label>
                      <Input 
                        placeholder="e.g. Groq / OpenAI" 
                        value={newVaultItem.name}
                        onChange={e => setNewVaultItem({ ...newVaultItem, name: e.target.value })}
                        className="bg-white dark:bg-obsidian border-purple-200/50 dark:border-purple-900/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-anta uppercase tracking-widest text-purple-600/70 dark:text-purple-400/70">Username / Email</label>
                      <div className="relative">
                        <Input 
                          placeholder="admin@kryonex.com" 
                          value={newVaultItem.username}
                          onChange={e => setNewVaultItem({ ...newVaultItem, username: e.target.value })}
                          className="bg-white dark:bg-obsidian border-purple-200/50 dark:border-purple-900/50 pl-9"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-anta uppercase tracking-widest text-purple-600/70 dark:text-purple-400/70">API Key / Credential</label>
                      <div className="relative">
                        <Input 
                          type="password"
                          placeholder="••••••••••••••••" 
                          value={newVaultItem.key}
                          onChange={e => setNewVaultItem({ ...newVaultItem, key: e.target.value })}
                          className="bg-white dark:bg-obsidian border-purple-200/50 dark:border-purple-900/50 pl-9"
                        />
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2 flex items-end sm:col-span-2 lg:col-span-1 pt-2 sm:pt-0">
                      <Button 
                        onClick={async () => {
                          if (!newVaultItem.name || !newVaultItem.key) return;
                          const newItem: VaultItem = {
                            id: crypto.randomUUID(),
                            name: newVaultItem.name,
                            username: newVaultItem.username,
                            key: newVaultItem.key,
                            description: newVaultItem.description,
                            createdAt: new Date().toISOString()
                          };
                          const newVault = [newItem, ...vault];
                          await updateVault(newVault);
                          setVault(newVault);
                          setNewVaultItem({ name: '', username: '', key: '', description: '' });
                          toast.success('Key encrypted and stored');
                        }}
                        className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-600/20 dark:hover:bg-purple-600/30 dark:text-purple-400 font-bold tracking-wider uppercase border border-purple-500/20 transition-all font-anta"
                      >
                        <Save size={16} className="mr-2" />
                        Save Item
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-anta uppercase tracking-widest text-slate-400 px-1">Secured Items ({vault.length})</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {vault.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-graphite/30 rounded-2xl">
                          <Lock className="mx-auto text-slate-300 dark:text-graphite mb-3" size={32} />
                          <p className="text-sm font-anta text-slate-400 uppercase tracking-wider">Vault is Empty</p>
                        </div>
                      ) : vault.map((item) => (
                        <div key={item.id} className="group relative flex flex-col sm:grid sm:grid-cols-[40px_160px_minmax(120px,280px)_1fr_auto] items-start sm:items-center gap-3 sm:gap-6 p-4 sm:p-3.5 rounded-xl bg-white/5 dark:bg-white-[0.01] border border-slate-200/20 dark:border-graphite/10 hover:border-purple-500/20 transition-all duration-300 backdrop-blur-sm w-full">
                          <div className="flex items-center gap-3 w-full sm:w-auto sm:contents">
                            <div className="w-9 h-9 rounded-lg bg-purple-100/30 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                              <Key size={18} />
                            </div>
                            <div className="flex flex-col sm:contents min-w-0">
                              <div className="text-sm font-bold text-graphite dark:text-white uppercase tracking-wider truncate sm:px-1">
                                {item.name}
                              </div>
                              <div className="text-xs sm:text-sm font-mono text-purple-500/60 dark:text-purple-400/60 italic truncate sm:px-1">
                                {item.username || "—"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto sm:contents">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:pr-4">
                              <code className="text-xs sm:text-sm font-mono text-slate-400/80 dark:text-slate-500/80 bg-slate-100/30 dark:bg-obsidian/50 px-3 sm:px-4 py-1.5 rounded truncate flex-1 shadow-inner border border-slate-200/10 dark:border-graphite/10 min-w-0 w-full">
                                {visibleKeys.has(item.id) ? item.key : "••••••••••••••••••••••••"}
                              </code>
                              
                              <div className="flex items-center gap-1 shrink-0 ml-1">
                                <button 
                                  onClick={() => {
                                    const next = new Set(visibleKeys);
                                    if (next.has(item.id)) next.delete(item.id);
                                    else next.add(item.id);
                                    setVisibleKeys(next);
                                  }}
                                  className="text-slate-400 hover:text-purple-500 transition-colors p-1.5 hover:bg-purple-500/5 rounded-md flex-shrink-0"
                                >
                                  {visibleKeys.has(item.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.key);
                                    toast.success('Key copied');
                                  }}
                                  className="text-slate-400 hover:text-purple-500 transition-colors p-1.5 hover:bg-purple-500/5 rounded-md flex-shrink-0"
                                >
                                  <Copy size={16} />
                                </button>
                              </div>
                            </div>
  
                            <div className="flex items-center justify-end shrink-0 sm:min-w-[40px]">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-slate-400 hover:text-red-500 hover:bg-red-500/5 transition-colors h-9 w-9 p-0 flex-shrink-0"
                                onClick={async () => {
                                  const newVault = vault.filter(v => v.id !== item.id);
                                  await updateVault(newVault);
                                  setVault(newVault);
                                  toast.info('Credential purged');
                                }}
                              >
                                <Trash2 size={18} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {(activeTab === 'projects' || activeTab === 'requests') && (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="projects-list">
                {(provided) => (
                  <div
                    className="space-y-4"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-6 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-graphite rounded-xl animate-pulse">
                          <div className="w-10 h-10 rounded-lg bg-slate-200/50 dark:bg-white/10" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-1/4 bg-slate-200/50 dark:bg-white/10 rounded" />
                            <div className="h-3 w-1/6 bg-slate-200/50 dark:bg-white/10 rounded" />
                          </div>
                          <div className="flex gap-2">
                            <div className="h-8 w-8 rounded bg-slate-200/50 dark:bg-white/10" />
                            <div className="h-8 w-8 rounded bg-slate-200/50 dark:bg-white/10" />
                          </div>
                        </div>
                      ))
                    ) : sortedDisplayProjects.map((project, index) => (
                      <React.Fragment key={project.id}>
                        <Draggable
                          draggableId={project.id}
                          index={index}
                          isDragDisabled={activeTab !== 'projects'}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                opacity: snapshot.isDragging ? 0.8 : 1,
                              }}
                            >
                              <Card className={`flex flex-col sm:flex-row items-start sm:items-center p-4 gap-6 bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-graphite transition-all duration-300 ${snapshot.isDragging ? 'shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] scale-[1.02]' : 'shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)]'}`}>
                                {activeTab === 'projects' && (
                                  <div
                                    {...provided.dragHandleProps}
                                    className="hidden sm:flex items-center justify-center text-slate-400 hover:text-graphite dark:hover:text-white cursor-grab active:cursor-grabbing p-2"
                                  >
                                    <GripVertical size={20} />
                                  </div>
                                )}
                                <div className="w-10 h-10 rounded-lg bg-slate-100/50 dark:bg-white/10 flex items-center justify-center text-slate-400 flex-shrink-0">
                                  <LayoutDashboard size={20} />
                                </div>
                                <div className="flex-1 min-w-0 w-full">
                                  <h3 className="font-bold text-lg truncate text-graphite dark:text-white">{project.title}</h3>
                                  {project.shortDescription && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">{project.shortDescription}</p>
                                  )}
                                  <div className="text-xs text-slate-500 mt-0.5 font-medium">by {project.authorName}</div>
                                  <div className="flex items-center gap-3 mt-2">
                                    <div className="flex flex-wrap gap-1">
                                      {project.categories?.map(cat => (
                                        <span key={cat} className="text-[10px] px-2 py-0.5 bg-slate-100/50 dark:bg-white/10 rounded-full text-graphite dark:text-slate-300 font-medium border border-slate-200/50 dark:border-graphite/50">
                                          {cat}
                                        </span>
                                      ))}
                                    </div>
                                    <span className="text-xs text-slate-400">{project.createdAt}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center">
                                  {activeTab === 'projects' ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-graphite dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10"
                                        onClick={() => {
                                          setNewProject(project);
                                          setIsAdding(true);
                                          // Extract GitHub URL from features if present
                                          const gh = project.features?.find(f => f.startsWith('GH:'))?.substring(3) || '';
                                          setGithubUrl(gh);
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                      >
                                        <Edit2 size={18} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/10"
                                        onClick={() => handleDelete(project.id)}
                                      >
                                        <Trash2 size={18} />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-green-500 hover:bg-green-50/50 dark:hover:bg-green-500/10"
                                        onClick={() => handleApprove(project.id)}
                                      >
                                        <Check size={18} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/10"
                                        onClick={() => handleReject(project.id)}
                                      >
                                        <X size={18} />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      </React.Fragment>
                    ))}
                    {provided.placeholder}
                    {displayProjects.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-slate-500">No {activeTab === 'projects' ? 'projects' : 'pending requests'} found.</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </main>


      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </motion.div>
  );
}
