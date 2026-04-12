import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Github, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Project } from '../types';
import { createProject, getCategories } from '../lib/projects';
import { toast } from 'sonner';

interface SubmitProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const generateUUID = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export function SubmitProjectModal({ isOpen, onClose }: SubmitProjectModalProps) {
  const [form, setForm] = React.useState({
    title: '',
    shortDescription: '',
    description: '',
    liveUrl: '',
    githubUrl: '',
    features: '',
    authorName: '',
    techStack: '',
    categories: [] as string[],
  });
  const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [autoPopulateUrl, setAutoPopulateUrl] = React.useState('');
  const [isFetchingMeta, setIsFetchingMeta] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      getCategories().then(setAvailableCategories);
      setForm({
        title: '',
        shortDescription: '',
        description: '',
        liveUrl: '',
        githubUrl: '',
        features: '',
        authorName: '',
        techStack: '',
        categories: []
      });
      setAutoPopulateUrl('');
    }
  }, [isOpen]);

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleFetchMetadata = async () => {
    if (!autoPopulateUrl) return;

    try {
      setIsFetchingMeta(true);
      const match = autoPopulateUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        toast.error('Invalid GitHub URL format. Use https://github.com/username/repo');
        return;
      }

      const [, owner, repo] = match;
      const cleanRepo = repo.replace('.git', '');

      // Fetch repo metadata and languages
      const [repoResponse, langResponse, readmeResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`),
        fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/languages`),
        fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/readme`, {
          headers: { 'Accept': 'application/vnd.github.raw' }
        })
      ]);

      if (!repoResponse.ok) throw new Error('Repository not found');
      const data = await repoResponse.json();

      let techStack = '';
      if (langResponse.ok) {
        const langs = await langResponse.json();
        techStack = Object.keys(langs).join(', ');
      }

      let readmeContent = '';
      if (readmeResponse.ok) {
        readmeContent = await readmeResponse.text();
      }

      setForm((prev) => ({
        ...prev,
        title: prev.title || data.name.replace(/[-_]/g, ' ').replace(/\w\S*/g, (w: string) => w.replace(/^\w/, (c) => c.toUpperCase())),
        shortDescription: data.description || '',
        description: readmeContent || '',
        githubUrl: autoPopulateUrl,
        liveUrl: prev.liveUrl || data.homepage || '',
        techStack: prev.techStack || techStack,
      }));

      toast.success('Project metadata and README fetched successfully');
    } catch (error) {
      toast.error('Failed to fetch repository details');
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    setIsSubmitting(true);
    const rawFeatures = form.features ? form.features.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (form.githubUrl) {
      rawFeatures.push(`GH:${form.githubUrl}`);
    }

    const project: Project = {
      id: generateUUID(),
      title: form.title,
      shortDescription: form.shortDescription,
      description: form.description,
      categories: form.categories,
      features: rawFeatures,
      techStack: form.techStack ? form.techStack.split(',').map(s => s.trim()).filter(Boolean) : [],
      liveUrl: form.liveUrl || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      authorName: form.authorName || 'Anonymous',
      status: 'pending',
    };

    try {
      await createProject(project);
      toast.success('Project submitted! An admin will review it shortly.');
      setForm({ title: '', shortDescription: '', description: '', liveUrl: '', githubUrl: '', features: '', authorName: '', techStack: '', categories: [] });
      setAutoPopulateUrl('');
      onClose();
    } catch {
      toast.error('Failed to submit project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 dark:bg-obsidian/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl bg-white/90 dark:bg-[#1a1c23]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/5 rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-8 py-6 border-b border-slate-200/50 dark:border-white/5 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-black text-graphite dark:text-white tracking-widest uppercase font-anta">NEW PROJECT</h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full text-slate-400 hover:text-graphite hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative p-8 overflow-y-auto custom-scrollbar flex-1">
              {isFetchingMeta && (
                <div className="absolute inset-0 z-50 bg-white/60 dark:bg-obsidian/60 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-graphite/10 dark:border-white/10 border-t-graphite dark:border-t-white rounded-full animate-spin" />
                    <Github className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-graphite dark:text-white" size={24} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-graphite dark:text-white animate-pulse">Syncing README and Metadata...</p>
                </div>
              )}
              {/* Auto-Populate Section */}
              <div className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5 rounded-xl p-5 mb-8">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-3">Auto-Populate from GitHub</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <Input
                      placeholder="https://github.com/username/repo"
                      className="pl-11 bg-white dark:bg-obsidian/50 border-slate-200/50 dark:border-white/10 focus:border-graphite dark:focus:border-white/30 h-11"
                      value={autoPopulateUrl}
                      onChange={(e) => setAutoPopulateUrl(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleFetchMetadata}
                    disabled={isFetchingMeta}
                    className="h-11 px-6 bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-graphite dark:text-white whitespace-nowrap"
                  >
                    {isFetchingMeta ? 'Fetching...' : 'Fetch Metadata'}
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-graphite dark:text-slate-300">Project Title</label>
                    <Input
                      placeholder="e.g. Minimalist Dashboard"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                      className="h-11 bg-white dark:bg-obsidian/50 border-slate-200/50 dark:border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-graphite dark:text-slate-300">Author Name</label>
                    <Input
                      placeholder="e.g. John Doe"
                      value={form.authorName}
                      onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                      required
                      className="h-11 bg-white dark:bg-obsidian/50 border-slate-200/50 dark:border-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-graphite dark:text-slate-300">Live Project URL</label>
                    <Input
                      placeholder="https://your-live-site.com"
                      value={form.liveUrl}
                      onChange={(e) => setForm({ ...form, liveUrl: e.target.value })}
                      className="h-11 bg-white dark:bg-obsidian/50 border-slate-200/50 dark:border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-graphite dark:text-slate-300">GitHub Repository URL</label>
                    <Input
                      placeholder="https://github.com/owner/repo"
                      value={form.githubUrl}
                      onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                      className="h-11 bg-white dark:bg-obsidian/50 border-slate-200/50 dark:border-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-graphite dark:text-slate-300">Tech Stack</label>
                  <Input
                    placeholder="e.g. React, TypeScript, TensorFlow (comma separated)"
                    value={form.techStack}
                    onChange={(e) => setForm({ ...form, techStack: e.target.value })}
                    className="h-11 bg-white dark:bg-obsidian/50 border-slate-200/50 dark:border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-graphite dark:text-slate-300">Short Description</label>
                  <textarea
                    placeholder="Brief 1-2 sentence overview of the project..."
                    value={form.shortDescription || ''}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    required
                    className="flex min-h-[80px] w-full rounded-xl border border-slate-200/50 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-graphite/20 transition-all duration-300 dark:bg-obsidian/50 dark:border-white/10 dark:text-slate-200 dark:focus:ring-white/20 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-graphite dark:text-slate-300">Categories</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {availableCategories.map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs border transition-colors ${form.categories.includes(cat)
                          ? 'bg-graphite text-white border-graphite dark:bg-white dark:text-obsidian dark:border-white'
                          : 'bg-white/50 dark:bg-transparent text-slate-500 border-slate-200/50 dark:border-white/10 hover:border-graphite/30 dark:hover:border-white/30'
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-semibold text-graphite dark:text-slate-300">README (Markdown Supported)</label>
                  <textarea
                    className="flex min-h-[500px] w-full rounded-xl border border-slate-200/50 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-graphite/20 transition-all duration-300 dark:bg-obsidian/50 dark:border-white/10 dark:text-slate-200 dark:focus:ring-white/20 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                    placeholder="# Project Title&#10;&#10;Use standard Markdown for your README. Include:&#10;- Project purpose&#10;- Key features&#10;- Detailed installation/usage guides..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-8 pb-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="h-11 px-6 border-transparent bg-transparent hover:bg-slate-100 dark:hover:bg-white/5">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="h-11 px-8 bg-graphite hover:bg-obsidian text-white dark:bg-white dark:text-obsidian dark:hover:bg-slate-200 font-medium rounded-lg">
                    {isSubmitting ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
