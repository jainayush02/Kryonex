import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '@/src/types';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Filter, Search, ArrowRight, LogOut, Command, Mic, Activity, Server, Play, X, Settings, Plus, Share2, Network, Heart, ExternalLink, LayoutDashboard, FileText, Github, Menu, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SettingsModal } from '@/src/components/SettingsModal';
import { SubmitProjectModal } from '@/src/components/SubmitProjectModal';
import { TechStackVisualizer } from '@/src/components/TechStackVisualizer';
import { ProjectDetailsModal } from '@/src/components/ProjectDetailsModal';
import { getProjects, getCategories, updateProject } from '@/src/lib/projects';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import logo from '../logo.png';

export default function UserPortal() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [activeModal, setActiveModal] = React.useState<Project | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = React.useState(false);
  const [visualizerProject, setVisualizerProject] = React.useState<Project | null>(null);
  const [detailsProject, setDetailsProject] = React.useState<Project | null>(null);
  const [likedProjects, setLikedProjects] = React.useState<Set<string>>(new Set());
  const [syncingProjects, setSyncingProjects] = React.useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);
  const categoryRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = () => {
    if (categoryRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  React.useEffect(() => {
    checkScroll();
    const current = categoryRef.current;
    if (current) {
      current.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (current) {
        current.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      }
    };
  }, [categories, isLoading]);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryRef.current) {
      const scrollAmount = direction === 'left' ? -500 : 500;
      categoryRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    const savedLikes = localStorage.getItem('likedProjects');
    if (savedLikes) {
      setLikedProjects(new Set(JSON.parse(savedLikes)));
    }
  }, []);

  const toggleLike = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setLikedProjects(prev => {
      const newLikes = new Set(prev);
      if (newLikes.has(projectId)) {
        newLikes.delete(projectId);
      } else {
        newLikes.add(projectId);
      }
      localStorage.setItem('likedProjects', JSON.stringify(Array.from(newLikes)));
      return newLikes;
    });
  };

  const syncGitHub = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const gh = project.features?.find(f => f.startsWith('GH:'))?.substring(3) || (project.liveUrl?.includes('github.com') ? project.liveUrl : null);
    if (!gh) {
      toast.error('No GitHub URL linked to this project');
      return;
    }

    setSyncingProjects(prev => new Set(prev).add(project.id));
    toast('Syncing with GitHub...');

    try {
      const cleanUrl = gh.trim().replace(/\/$/, "");
      const urlParts = cleanUrl.replace('https://github.com/', '').split('/');
      const owner = urlParts[urlParts.length - 2];
      const repo = urlParts[urlParts.length - 1].replace('.git', '');

      const [repoResponse, langResponse, readmeResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/languages`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
          headers: { 'Accept': 'application/vnd.github.raw' }
        })
      ]);

      if (!repoResponse.ok) throw new Error('Repository not found or private');
      const data = await repoResponse.json();

      let techStack = project.techStack || [];
      if (langResponse.ok) {
        const langs = await langResponse.json();
        techStack = Object.keys(langs);
      }

      let readmeContent = project.description;
      if (readmeResponse.ok) {
        readmeContent = await readmeResponse.text();
      }

      const updatedProject = {
        ...project,
        title: data.name || project.title,
        shortDescription: data.description || project.shortDescription,
        description: readmeContent || project.description,
        techStack: techStack.length > 0 ? techStack : (data.language ? [data.language] : project.techStack),
      };

      await updateProject(updatedProject);
      toast.success('Successfully synced with GitHub');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync');
    } finally {
      setSyncingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(project.id);
        return newSet;
      });
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [projectsData, categoriesData, { data: { session } }] = await Promise.all([
          getProjects(),
          getCategories(),
          supabase.auth.getSession()
        ]);
        setProjects(projectsData);
        setCategories(categoriesData);
        
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'ayushsancheti098@gmail.com';
        if (session?.user?.email && session.user.email.toLowerCase() === adminEmail.toLowerCase()) {
          setIsAdmin(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    const handleProjectsUpdate = async () => setProjects(await getProjects());
    const handleCategoriesUpdate = async () => setCategories(await getCategories());
    window.addEventListener('projects_updated', handleProjectsUpdate);
    window.addEventListener('categories_updated', handleCategoriesUpdate);

    // Swipe hint for mobile
    const hasShownHint = localStorage.getItem('hasShownSwipeHint');
    if (!hasShownHint && window.innerWidth < 768) {
      setTimeout(() => {
        toast('Swipe right to run demo, swipe left to share', { icon: '👆' });
        localStorage.setItem('hasShownSwipeHint', 'true');
      }, 2000);
    }

    return () => {
      window.removeEventListener('projects_updated', handleProjectsUpdate);
      window.removeEventListener('categories_updated', handleCategoriesUpdate);
    };
  }, []);

  const handleSwipe = (event: any, info: any, project: Project) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      // Swipe Right
      setActiveModal(project);
    } else if (info.offset.x < -threshold) {
      // Swipe Left
      if (navigator.share) {
        navigator.share({
          title: project.title,
          text: project.description,
          url: window.location.href,
        }).catch(console.error);
      } else {
        toast.error('Web Share API not supported on this device');
      }
    }
  };

  // Simulate AI search processing
  React.useEffect(() => {
    if (searchQuery) {
      setIsSearching(true);
      const timer = setTimeout(() => setIsSearching(false), 800);
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const filteredProjects = projects.filter((project) => {
    if (project.status !== 'approved') return false;
    const matchesCategory = selectedCategory ? project.categories?.includes(selectedCategory) : true;
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, filter: 'blur(5px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="min-h-screen bg-pearl dark:bg-obsidian text-slate-700 dark:text-slate-300 transition-colors duration-300 relative overflow-hidden"
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
          onClick={() => setIsMenuOpen(true)}
          className="p-2 text-slate-600 dark:text-slate-400 hover:text-graphite dark:hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
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
                <span className="font-anta tracking-widest text-graphite dark:text-white uppercase font-bold">Menu</span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-slate-500 hover:text-graphite dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-4 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                  onClick={() => { setIsSubmitOpen(true); setIsMenuOpen(false); }}
                >
                  <Plus size={20} />
                  <span className="font-anta tracking-wider">Add Project</span>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-4 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                  onClick={() => { setIsSettingsOpen(true); setIsMenuOpen(false); }}
                >
                  <Settings size={20} />
                  <span className="font-anta tracking-wider">Settings</span>
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-4 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                    onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}
                  >
                    <LayoutDashboard size={20} />
                    <span className="font-anta tracking-wider">Admin Portal</span>
                  </Button>
                )}
              </div>

              <div className="p-6 border-t border-slate-200/50 dark:border-graphite/50 space-y-6 flex-shrink-0 bg-white/50 dark:bg-obsidian/50 backdrop-blur-md">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-4 text-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/10"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate('/');
                  }}
                >
                  <LogOut size={20} />
                  <span className="font-anta tracking-wider">Logout</span>
                </Button>

                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                  <div className="text-[11px] font-anta tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                    © 2026 Kryonex
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Navigation (Desktop/Tablet) */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white dark:bg-obsidian border-b border-slate-200/50 dark:border-graphite/50 px-6 py-1 items-center justify-between shadow-sm transition-all duration-300">
        <div className="flex items-center gap-2">
          <div className="w-40 h-16 flex items-center justify-center overflow-hidden">
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
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="secondary" size="sm" onClick={() => setIsSubmitOpen(true)} className="hidden md:flex gap-2">
            <Plus size={16} /> Publish Project
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)} className="text-slate-500 hover:text-graphite dark:hover:text-white">
            <Settings size={20} />
          </Button>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="text-slate-500 hover:text-graphite dark:hover:text-white">
              <LayoutDashboard size={18} className="mr-2" />
              Admin Mode
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="text-slate-500 hover:text-graphite dark:hover:text-white">
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 pt-24 md:pt-40 py-12 md:py-16 pb-12">
        {/* Header */}
        <header className="mb-10 md:mb-14 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            <span className="text-[10px] font-anta tracking-[0.3em] text-slate-500 dark:text-slate-400 uppercase">
              WHERE VISION MEETS EXECUTION
            </span>
            <h1 className="text-5xl md:text-7xl font-anta tracking-tight text-graphite dark:text-white uppercase leading-none">
              Studio.
            </h1>
            <p className="text-xs md:text-sm font-mono text-slate-500 dark:text-slate-400 max-w-xl mt-1">
              A centralized hub for AI agents, tech stacks, and cutting-edge projects
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:flex flex-col gap-3 w-[360px] xl:w-[420px]"
          >
            {/* Tier 1: Core Metrics */}
            <div className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-4 rounded-xl border border-slate-200/50 dark:border-graphite shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] backdrop-blur-md relative overflow-hidden">
              <div className="flex flex-col relative z-10">
                <span className="text-[9px] font-anta tracking-widest text-slate-500 dark:text-slate-400 uppercase mb-1">Index Size</span>
                {isLoading ? (
                  <div className="h-6 w-8 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                ) : (
                  <span className="text-2xl font-mono text-graphite dark:text-white leading-none">
                    {projects.length.toString().padStart(2, '0')}
                  </span>
                )}
              </div>

              <div className="w-px h-8 bg-slate-200 dark:bg-graphite relative z-10"></div>

              <div className="flex flex-col relative z-10">
                <span className="text-[9px] font-anta tracking-widest text-slate-500 dark:text-slate-400 uppercase mb-1">Classes</span>
                {isLoading ? (
                  <div className="h-6 w-8 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
                ) : (
                  <span className="text-2xl font-mono text-graphite dark:text-white leading-none">
                    {categories.length.toString().padStart(2, '0')}
                  </span>
                )}
              </div>

              <div className="w-px h-8 bg-slate-200 dark:bg-graphite relative z-10"></div>

              <div className="flex flex-col relative z-10">
                <span className="text-[9px] font-anta tracking-widest text-slate-500 dark:text-slate-400 uppercase mb-2">Network</span>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 tracking-wider">SECURE</span>
                </div>
              </div>

              {/* Subtle grid background */}
              <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
            </div>

            {/* Tier 2: Real-time Activity Graph */}
            <div className="bg-white/40 dark:bg-white/5 p-4 rounded-xl border border-slate-200/50 dark:border-graphite shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.2)] backdrop-blur-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[9px] font-anta tracking-[0.2em] text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                  <Activity size={10} className="text-graphite dark:text-white" />
                  System Telemetry
                </span>
                <span className="text-[9px] font-mono text-graphite dark:text-white opacity-50">KV-NODE:01</span>
              </div>

              {/* Animated Equalizer Graph */}
              <div className="flex items-end gap-[2px] h-8 w-full relative z-10">
                {[...Array(32)].map((_, i) => {
                  const height = 15 + Math.random() * 85;
                  return (
                    <motion.div
                      key={i}
                      initial={{ height: '10%' }}
                      animate={{ height: [`${height}%`, `${height * (0.3 + Math.random() * 0.7)}%`, `${height}%`] }}
                      transition={{ duration: 1.5 + Math.random() * 2, repeat: Infinity, ease: 'linear' }}
                      className="flex-1 bg-graphite dark:bg-white rounded-[1px] opacity-20 dark:opacity-30"
                      style={{
                        animationDelay: `${i * 0.05}s`
                      }}
                    >
                      <div
                        className="w-full bg-graphite dark:bg-white opacity-100 rounded-[1px]"
                        style={{ height: '2px', marginTop: '-4px' }}
                      />
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </header>

        {/* Filters + Search */}
        <section className="mb-10 border-t border-slate-200/50 dark:border-graphite/50 pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative group/slider w-full md:w-auto overflow-hidden">
              <AnimatePresence>
                {canScrollLeft && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-0 top-0 bottom-2 z-20 flex items-center pr-12 bg-gradient-to-r from-pearl via-pearl/90 to-transparent dark:from-obsidian dark:via-obsidian/90 pointer-events-none"
                  >
                    <button
                      onClick={() => scrollCategories('left')}
                      className="p-1 px-1.5 rounded-r-lg bg-white/80 dark:bg-white/10 backdrop-blur-md shadow-sm border-y border-r border-slate-200 dark:border-white/10 text-graphite dark:text-white pointer-events-auto hover:bg-white dark:hover:bg-white/20 transition-all"
                    >
                      <ChevronLeft size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                ref={categoryRef}
                className="flex overflow-x-auto flex-nowrap gap-2 pb-2 scrollbar-hide -mx-1 px-1 scroll-smooth"
              >
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-1.5 text-[10px] font-anta tracking-widest uppercase whitespace-nowrap transition-all duration-200 border-b-2 ${selectedCategory === null
                    ? 'border-graphite dark:border-white text-graphite dark:text-white'
                    : 'border-transparent text-slate-400 hover:text-graphite dark:hover:text-white'
                    }`}
                >
                  All
                </button>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="h-6 w-16 bg-slate-200/50 dark:bg-white/10 rounded-full animate-pulse" />
                  ))
                ) : categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 text-[10px] font-anta tracking-widest uppercase whitespace-nowrap transition-all duration-200 border-b-2 ${selectedCategory === cat
                      ? 'border-graphite dark:border-white text-graphite dark:text-white'
                      : 'border-transparent text-slate-400 hover:text-graphite dark:hover:text-white'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {canScrollRight && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-0 top-0 bottom-2 z-20 flex items-center pl-12 bg-gradient-to-l from-pearl via-pearl/90 to-transparent dark:from-obsidian dark:via-obsidian/90 pointer-events-none"
                  >
                    <button
                      onClick={() => scrollCategories('right')}
                      className="p-1 px-1.5 rounded-l-lg bg-white/80 dark:bg-white/10 backdrop-blur-md shadow-sm border-y border-l border-slate-200 dark:border-white/10 text-graphite dark:text-white pointer-events-auto hover:bg-white dark:hover:bg-white/20 transition-all"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="relative w-full sm:w-64">
              <Command className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-transparent border border-slate-200 dark:border-graphite/50 rounded-lg text-xs focus:outline-none focus:border-graphite dark:focus:border-white/50 transition-all dark:text-white dark:placeholder:text-slate-500 font-mono"
              />
              {isSearching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-graphite dark:bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-graphite dark:bg-white"></span>
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-graphite rounded-3xl p-6 h-[450px] animate-pulse">
                <div className="w-full h-48 bg-slate-200/50 dark:bg-white/10 rounded-2xl mb-6" />
                <div className="h-4 w-3/4 bg-slate-200/50 dark:bg-white/10 rounded mb-3" />
                <div className="h-3 w-1/2 bg-slate-200/50 dark:bg-white/10 rounded mb-8" />
                <div className="space-y-3 mt-4">
                  <div className="h-3 w-full bg-slate-200/50 dark:bg-white/10 rounded" />
                  <div className="h-3 w-full bg-slate-200/50 dark:bg-white/10 rounded" />
                  <div className="h-3 w-2/3 bg-slate-200/50 dark:bg-white/10 rounded" />
                </div>
                <div className="mt-auto pt-8 flex gap-2">
                  <div className="h-9 w-24 bg-slate-200/50 dark:bg-white/10 rounded-lg" />
                  <div className="h-9 w-24 bg-slate-200/50 dark:bg-white/10 rounded-lg" />
                </div>
              </div>
            ))
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  drag={window.innerWidth < 768 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, info) => handleSwipe(e, info, project)}
                  whileDrag={{ scale: 0.95, rotate: 2 }}
                  className="h-full cursor-grab active:cursor-grabbing md:cursor-default md:active:cursor-default"
                >
                  <Card
                    className="group relative overflow-hidden border border-slate-200 bg-white/40 backdrop-blur-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] hover:scale-[1.02] transition-all duration-300 flex flex-col h-full dark:bg-white/5 dark:border-graphite dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] pointer-events-none md:pointer-events-auto"
                  >
                    {/* Icon/Logo Indicator */}
                    <div className="pt-6 px-6 flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-graphite/5 dark:bg-white/5 border border-slate-200/50 dark:border-graphite/50 text-slate-400">
                        <LayoutDashboard size={20} />
                      </div>
                      <button
                        onClick={(e) => toggleLike(e, project.id)}
                        className="p-2 rounded-full bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-graphite/50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Heart size={16} className={likedProjects.has(project.id) ? "fill-red-500 text-red-500" : ""} />
                      </button>
                    </div>
                    <CardHeader className="p-6 flex-1 pointer-events-auto">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.categories?.map(cat => (
                            <span key={cat} className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-white/10 rounded-full text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider border border-slate-200/50 dark:border-graphite/50">
                              {cat}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          {project.title === 'Aranya AI' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setIsListening(!isListening); }}
                              className={`p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/20'}`}
                            >
                              <Mic size={12} />
                            </button>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">{project.createdAt}</span>
                        </div>
                      </div>
                      <CardTitle className="text-2xl group-hover:text-graphite dark:group-hover:text-white transition-colors">
                        {project.title}
                      </CardTitle>
                      <div className="text-xs text-slate-500 mt-1 font-medium">by {project.authorName}</div>
                      <CardDescription className="mt-2 text-xs sm:text-sm min-h-[60px] line-clamp-3">
                        {project.shortDescription ||
                          project.description
                            .replace(/[#*`>]/g, '') // Strip common markdown symbols
                            .replace(/\n/g, ' ')    // Flatten newlines
                            .trim()
                            .substring(0, 150) + (project.description.length > 150 ? '...' : '')
                        }
                      </CardDescription>

                      {/* Tech DNA Section */}
                      {project.techStack && (
                        <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-graphite/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Tech DNA</span>
                            {project.performance && (
                              <div className="flex items-center gap-1">
                                <div className="w-12 h-2 bg-slate-100 dark:bg-obsidian rounded-full overflow-hidden">
                                  <div className="h-full bg-graphite dark:bg-white" style={{ width: `${project.performance}%` }} />
                                </div>
                                <span className="text-[10px] font-mono text-graphite dark:text-white">{project.performance}%</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {project.techStack?.map(tech => (
                              <span key={tech} className="text-[9px] px-1.5 py-0.5 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-graphite rounded text-slate-500 dark:text-slate-400">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardHeader>

                    {/* Bottom Actions - 2 Column Grid */}
                    <div className="px-6 pb-6 mt-auto pointer-events-auto flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-[10px] sm:text-xs gap-1.5 border border-slate-200/50 dark:border-graphite/50 hover:bg-white/50 dark:hover:bg-white/10 h-9"
                          onClick={(e) => { e.stopPropagation(); setVisualizerProject(project); }}
                        >
                          <Network size={14} /> Stack
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full gap-1.5 border border-slate-200/50 dark:border-graphite/50 text-[10px] sm:text-xs h-9 ${!project.features?.find(f => f.startsWith('GH:')) && !project.liveUrl?.includes('github.com') ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/50 dark:hover:bg-white/10'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const gh = project.features?.find(f => f.startsWith('GH:'))?.substring(3) || (project.liveUrl?.includes('github.com') ? project.liveUrl : null);
                            if (gh) window.open(gh, '_blank');
                          }}
                        >
                          <Github size={14} /> Repo
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full gap-1.5 hover:bg-slate-200 dark:hover:bg-white/20 transition-all text-[10px] sm:text-xs h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsProject(project);
                          }}
                        >
                          <FileText size={14} /> README
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className={`w-full gap-1.5 border border-graphite/10 dark:border-white/10 hover:bg-graphite hover:text-white dark:hover:bg-white dark:hover:text-obsidian transition-all group/btn text-[10px] sm:text-xs h-9 ${!project.liveUrl || project.liveUrl.includes('github.com') ? 'opacity-30 cursor-not-allowed' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (project.liveUrl && !project.liveUrl.includes('github.com')) {
                              window.open(project.liveUrl, '_blank');
                            }
                          }}
                        >
                          <ExternalLink size={14} className="group-hover/btn:translate-x-0.5 transition-transform" /> Visit
                        </Button>
                      </div>

                      {/* GitHub Sync Button */}
                      {(project.features?.find(f => f.startsWith('GH:')) || project.liveUrl?.includes('github.com')) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2 mt-2 h-9 text-[10px] sm:text-xs border-dashed border-slate-300 dark:border-graphite text-slate-500 hover:text-graphite dark:hover:text-white"
                          onClick={(e) => syncGitHub(e, project)}
                          disabled={syncingProjects.has(project.id)}
                        >
                          <RefreshCw size={14} className={syncingProjects.has(project.id) ? 'animate-spin' : ''} />
                          {syncingProjects.has(project.id) ? 'Syncing...' : 'Sync GitHub'}
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-24">
            <p className="text-slate-500 text-lg">No projects found matching your criteria.</p>
            {(selectedCategory || searchQuery) && (
              <Button variant="ghost" className="mt-4" onClick={() => { setSelectedCategory(null); setSearchQuery(''); }}>
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Voice Input Visualizer (Aranya AI) */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-white/80 dark:bg-obsidian/80 backdrop-blur-xl border border-slate-200/50 dark:border-graphite rounded-full px-6 py-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] flex items-center gap-4"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div className="flex items-center gap-1 h-6">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: ['20%', '100%', '20%'] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
                  className="w-1 bg-graphite dark:bg-white rounded-full"
                />
              ))}
            </div>
            <span className="text-xs font-mono text-slate-500">Listening...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <footer className="hidden md:flex border-t border-slate-200/50 dark:border-graphite/50 bg-white/40 dark:bg-obsidian/40 backdrop-blur-xl px-8 py-6 items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-24 h-8 flex items-center justify-center overflow-hidden opacity-50">
            <div
              className="w-full h-full bg-graphite dark:bg-white"
              style={{
                maskImage: `url(${logo})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'left',
                WebkitMaskImage: `url(${logo})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'left'
              }}
            />
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
          <span className="text-[10px] font-anta tracking-widest text-slate-400 dark:text-slate-500 uppercase">Platform Architected by</span>
          <span className="text-[10px] font-anta tracking-widest text-graphite dark:text-white uppercase font-bold">Ayush Jain</span>
        </div>

        <div className="text-[11px] font-sans tracking-widest text-slate-500 dark:text-slate-400 uppercase">
          © 2026 Kryonex by Ayush. All rights reserved.
        </div>
      </footer>


      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <SubmitProjectModal isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} />
      <TechStackVisualizer project={visualizerProject} onClose={() => setVisualizerProject(null)} />
      <ProjectDetailsModal
        project={detailsProject}
        onClose={() => setDetailsProject(null)}
        isLiked={detailsProject ? likedProjects.has(detailsProject.id) : false}
        onToggleLike={(id) => {
          // Keep the existing toggleLike logic but adapt it for the modal (which doesn't have an event object in the same way)
          setLikedProjects(prev => {
            const newLikes = new Set(prev);
            if (newLikes.has(id)) newLikes.delete(id);
            else newLikes.add(id);
            localStorage.setItem('likedProjects', JSON.stringify(Array.from(newLikes)));
            return newLikes;
          });
        }}
      />
    </motion.div>
  );
}
