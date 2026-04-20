import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Github, FileCode, Folder, File, ChevronRight, ChevronDown, Terminal, Cpu, Box, Code2, Layers, Database, Globe, Zap, Bot, Server, Palette } from 'lucide-react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Mapping for tech data
// Mapping for tech data
const TECH_MAP: Record<string, { slug: string; color: string; icon: any; devicon?: string }> = {
  'react': { slug: 'react', color: '#61DAFB', icon: Layers, devicon: 'react/react-original.svg' },
  'nodejs': { slug: 'nodedotjs', color: '#339933', icon: Cpu, devicon: 'nodejs/nodejs-original.svg' },
  'node.js': { slug: 'nodedotjs', color: '#339933', icon: Cpu, devicon: 'nodejs/nodejs-original.svg' },
  'node': { slug: 'nodedotjs', color: '#339933', icon: Cpu, devicon: 'nodejs/nodejs-original.svg' },
  'python': { slug: 'python', color: '#3776AB', icon: FileCode, devicon: 'python/python-original.svg' },
  'html': { slug: 'html5', color: '#E34F26', icon: Code2, devicon: 'html5/html5-original.svg' },
  'html5': { slug: 'html5', color: '#E34F26', icon: Code2, devicon: 'html5/html5-original.svg' },
  'css': { slug: 'css3', color: '#1572B6', icon: Palette, devicon: 'css3/css3-original.svg' },
  'css3': { slug: 'css3', color: '#1572B6', icon: Palette, devicon: 'css3/css3-original.svg' },
  'javascript': { slug: 'javascript', color: '#F7DF1E', icon: Code2, devicon: 'javascript/javascript-original.svg' },
  'js': { slug: 'javascript', color: '#F7DF1E', icon: Code2, devicon: 'javascript/javascript-original.svg' },
  'typescript': { slug: 'typescript', color: '#3178C6', icon: Code2, devicon: 'typescript/typescript-original.svg' },
  'ts': { slug: 'typescript', color: '#3178C6', icon: Code2, devicon: 'typescript/typescript-original.svg' },
  'powershell': { slug: 'powershell', color: '#5391FE', icon: Terminal, devicon: 'powershell/powershell-original.svg' },
  'ps1': { slug: 'powershell', color: '#5391FE', icon: Terminal, devicon: 'powershell/powershell-original.svg' },
  'shell': { slug: 'gnubash', color: '#4EAA25', icon: Terminal, devicon: 'bash/bash-original.svg' },
  'bash': { slug: 'gnubash', color: '#4EAA25', icon: Terminal, devicon: 'bash/bash-original.svg' },
  'tailwind': { slug: 'tailwindcss', color: '#00BCFF', icon: Box, devicon: 'tailwindcss/tailwindcss-original.svg' },
  'tailwindcss': { slug: 'tailwindcss', color: '#00BCFF', icon: Box, devicon: 'tailwindcss/tailwindcss-original.svg' },
  'nextjs': { slug: 'nextdotjs', color: '#000000', icon: Globe },
  'next.js': { slug: 'nextdotjs', color: '#000000', icon: Globe },
  'supabase': { slug: 'supabase', color: '#3ECF8E', icon: Database, devicon: 'supabase/supabase-original.svg' },
  'framer motion': { slug: 'framer', color: '#0055FF', icon: Zap, devicon: 'framermotion/framermotion-original.svg' },
  'mongodb': { slug: 'mongodb', color: '#47A248', icon: Database, devicon: 'mongodb/mongodb-original.svg' },
  'postgresql': { slug: 'postgresql', color: '#4169E1', icon: Database, devicon: 'postgresql/postgresql-original.svg' },
  'express': { slug: 'express', color: '#000000', icon: Server },
  'langchain': { slug: 'langchain', color: '#121212', icon: Bot },
  'chromadb': { slug: 'chromadb', color: '#000000', icon: Database },
  'vector db': { slug: 'chromadb', color: '#000000', icon: Database },
  'github': { slug: 'github', color: '#181717', icon: Github },
};

const DEFAULT_TECH = { slug: 'code', color: '#94a3b8', icon: Code2 };

function getTechInfo(tech: string) {
  const lowTech = tech.toLowerCase().trim();
  return TECH_MAP[lowTech] || { ...DEFAULT_TECH, slug: lowTech.replace(/[^a-z0-9]/g, '') };
}

interface TechStackVisualizerProps {
  project: any;
  onClose: () => void;
}

interface RepoFile {
  path: string;
  type: 'tree' | 'blob';
  size?: number;
  children?: RepoFile[];
}

interface RepoMeta {
  default_branch: string;
  size: number;
}

function parseGithubUrl(url: string) {
  const regex = /github\.com\/([^/]+)\/([^/]+)/;
  const match = url.match(regex);
  if (match) return { owner: match[1], repo: match[2].replace('.git', '') };
  return null;
}

function buildFileTree(files: any[]): RepoFile[] {
  const root: RepoFile[] = [];
  const map: Record<string, RepoFile> = {};

  // Sort files to ensure stable mapping
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  sortedFiles.forEach(item => {
    const parts = item.path.split('/');
    const parentPath = parts.slice(0, -1).join('/');

    const node: RepoFile = {
      path: item.path,
      type: item.type === 'tree' ? 'tree' : 'blob',
      size: item.size,
      children: item.type === 'tree' ? [] : undefined
    };

    map[item.path] = node;

    if (parentPath === '') {
      root.push(node);
    } else {
      const parent = map[parentPath];
      if (parent && parent.children) {
        parent.children.push(node);
      }
    }
  });

  // Recursive sort: Folders first, then Files, both Alpha
  const sortNodes = (nodes: RepoFile[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'tree' ? -1 : 1;
      }
      return a.path.localeCompare(b.path);
    });
    nodes.forEach(node => {
      if (node.children) sortNodes(node.children);
    });
  };

  sortNodes(root);
  return root;
}

const getFileIcon = (filename: string) => {
  const lowFile = filename.toLowerCase();
  if (lowFile === 'package-lock.json') return { slug: 'npm', color: '#CB3837', fallback: Box, devicon: 'npm/npm-original-wordmark.svg' };
  if (lowFile === 'package.json') return { slug: 'npm', color: '#CB3837', fallback: Box, devicon: 'npm/npm-original-wordmark.svg' };
  if (lowFile === 'vercel.json') return { slug: 'vercel', color: '#000000', fallback: Globe };
  if (lowFile.endsWith('.sh')) return { slug: 'gnubash', color: '#4EAA25', fallback: Terminal, devicon: 'bash/bash-original.svg' };
  if (lowFile.endsWith('.ps1')) return { slug: 'powershell', color: '#5391FE', fallback: Terminal, devicon: 'powershell/powershell-original.svg' };
  if (lowFile.includes('.png') || lowFile.includes('.jpg')) return { slug: '', color: '', fallback: Palette };

  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py': return { slug: 'python', color: '#3776AB', fallback: FileCode, devicon: 'python/python-original.svg' };
    case 'js':
    case 'jsx': return { slug: 'javascript', color: '#F7DF1E', fallback: Code2, devicon: 'javascript/javascript-original.svg' };
    case 'ts':
    case 'tsx': return { slug: 'typescript', color: '#3178C6', fallback: Code2, devicon: 'typescript/typescript-original.svg' };
    case 'json': return { slug: 'json', color: '#000000', fallback: Code2 };
    case 'md': return { slug: 'markdown', color: '#000000', fallback: FileCode, devicon: 'markdown/markdown-original.svg' };
    case 'css': return { slug: 'css3', color: '#1572B6', fallback: Palette, devicon: 'css3/css3-original.svg' };
    case 'html': return { slug: 'html5', color: '#E34F26', fallback: Globe, devicon: 'html5/html5-original.svg' };
    case 'env': return { slug: 'dotenv', color: '#ECD53F', fallback: Zap };
    case 'yml':
    case 'yaml': return { slug: 'yaml', color: '#CB171E', fallback: FileCode };
    default: return { slug: '', color: '', fallback: File };
  }
};

function formatSize(bytes?: number) {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

const FileTreeNode = ({ file, depth = 0 }: { file: RepoFile; depth?: number }) => {
  const [isOpen, setIsOpen] = React.useState(depth < 1);
  const hasChildren = file.children && file.children.length > 0;

  const fileName = file.path.split('/').pop() || '';
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));

  React.useEffect(() => {
    const handleThemeChange = (e: any) => setIsDark(e.detail.isDark);
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const { slug, color, fallback: FallbackIcon, devicon } = getFileIcon(fileName);

  const getIconUrl = (slug: string, color: string, devicon?: string) => {
    if (devicon) return `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${devicon}`;

    let finalColor = color.replace('#', '');
    // If the icon is naturally black/dark and we are in dark mode, make it white
    const isActuallyBlack = finalColor === '000000' || finalColor === '000' || finalColor === '121212' || finalColor === '181717' || slug === 'vercel' || slug === 'github' || slug === 'nextdotjs';

    if (isDark && isActuallyBlack) {
      finalColor = 'ffffff';
    }
    return `https://cdn.simpleicons.org/${slug}/${finalColor}`;
  };

  const iconUrl = getIconUrl(slug, color, devicon);

  return (
    <div className="select-none">
      <div
        className={`flex items-center group py-1 px-2 rounded-md transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 
          ${depth === 0 ? 'mt-1' : ''}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-slate-400 w-4 h-4 flex items-center justify-center shrink-0">
          {hasChildren ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : null}
        </span>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            <Folder size={14} className={isOpen ? 'text-blue-400 fill-blue-400/20' : 'text-blue-400 opacity-70'} />
          ) : (
            <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0">
              {slug ? (
                <img
                  src={iconUrl}
                  alt={ext}
                  className="w-full h-full object-contain drop-shadow-sm transition-all duration-300"
                  style={{
                    filter: isDark && (slug === 'vercel' || slug === 'github' || slug === 'nextdotjs' || slug === 'markdown' || slug === 'json' || color === '#000000' || devicon?.includes('bash'))
                      ? 'brightness(1.5) invert(1)'
                      : 'none'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.sidebar-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`sidebar-fallback ${slug ? 'hidden' : ''}`}>
                <FallbackIcon size={14} className="text-slate-400" />
              </div>
            </div>
          )}
          <span className={`text-[11px] font-medium truncate ${hasChildren ? 'text-slate-700 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>
            {fileName}
          </span>
        </div>
        {!hasChildren && file.size !== undefined && (
          <span className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
            {formatSize(file.size)}
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {file.children!.map(child => (
            <FileTreeNode key={child.path} file={child} depth={depth + 1} />
          ))}
        </motion.div>
      )}
    </div>
  );
};

export function TechStackVisualizer({ project, onClose }: TechStackVisualizerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));

  React.useEffect(() => {
    const handleThemeChange = (e: any) => setIsDark(e.detail.isDark);
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  // GitHub State
  const ghFeature = project?.features?.find((f: string) => f.startsWith('GH:'));
  const ghFromFeature = ghFeature ? ghFeature.substring(3) : null;
  const ghFromLiveUrl = project?.liveUrl?.includes('github.com') ? project.liveUrl : null;
  const githubUrl = ghFromFeature || ghFromLiveUrl || null;
  const parsed = githubUrl ? parseGithubUrl(githubUrl) : null;

  const [repoMeta, setRepoMeta] = React.useState<RepoMeta | null>(null);
  const [repoTree, setRepoTree] = React.useState<RepoFile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!project) return;

    setRepoMeta(null);
    setRepoTree([]);
    setError(null);

    const newNodes: any[] = [];
    const newEdges: any[] = [];

    // Core Project Node
    newNodes.push({
      id: 'project',
      position: { x: 0, y: 0 },
      type: 'default',
      data: {
        label: (
          <div className="flex flex-col items-center p-2">
            <div className="font-anta text-xl font-bold tracking-tight text-graphite dark:text-white uppercase transition-all duration-300">
              {project.title}
            </div>
          </div>
        )
      },
      style: {
        background: 'var(--node-bg, rgba(255, 255, 255, 0.9))',
        backdropFilter: 'blur(30px)',
        border: '2px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '24px',
        color: 'var(--node-text, #1e293b)',
        padding: '12px 20px',
        boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25), 0 0 20px rgba(16,185,129,0.05)',
        width: 'auto',
        minWidth: 180,
      }
    });

    if (project.techStack && project.techStack.length > 0) {
      // Dynamic radius to prevent overlap based on node count
      const radius = Math.max(350, project.techStack.length * 60);
      const angleStep = (2 * Math.PI) / project.techStack.length;

      project.techStack.forEach((tech: string, index: number) => {
        const info = getTechInfo(tech);
        const FallbackIcon = info.icon;

        let finalColor = info.color.replace('#', '');
        // Theme aware color for simpleicons if devicon is not used
        const isActuallyBlack = finalColor === '000000' || finalColor === '000' || finalColor === '121212' || finalColor === '181717' || info.slug === 'vercel' || info.slug === 'github' || info.slug === 'nextdotjs';

        if (!info.devicon && isDark && isActuallyBlack) {
          finalColor = 'ffffff';
        }

        const iconUrl = info.devicon
          ? `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${info.devicon}`
          : `https://cdn.simpleicons.org/${info.slug}/${finalColor}`;

        const angle = index * angleStep - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const id = `tech-${index}`;

        newNodes.push({
          id,
          position: { x, y },
          data: {
            label: (
              <div className="flex items-center gap-3 p-1.5 pr-4 group/node">
                <div
                  className="p-2 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 flex items-center justify-center transition-all duration-300 group-hover/node:scale-110 shadow-sm"
                  style={{ color: info.color }}
                >
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <img
                      src={iconUrl}
                      alt={tech}
                      className="w-full h-full object-contain relative z-10 drop-shadow-md transition-all duration-300"
                      style={{
                        filter: isDark && (info.slug === 'vercel' || info.slug === 'github' || info.slug === 'nextdotjs' || info.slug === 'markdown' || info.slug === 'json' || info.color === '#000000' || info.devicon?.includes('bash'))
                          ? 'brightness(1.5) invert(1)'
                          : 'none'
                      }}
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        const fallback = img.parentElement?.querySelector('.fallback-icon');
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                    <div className="fallback-icon hidden absolute inset-0 m-auto flex items-center justify-center">
                      <FallbackIcon size={20} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-anta font-bold tracking-widest uppercase text-slate-700 dark:text-slate-200">
                    {tech}
                  </span>
                  <div
                    className="h-0.5 w-0 group-hover/node:w-full transition-all duration-300 rounded-full mt-0.5"
                    style={{ background: info.color }}
                  />
                </div>
              </div>
            )
          },
          style: {
            background: 'var(--node-bg-sub, rgba(255, 255, 255, 0.75))',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${info.color}33`,
            borderRadius: '16px',
            color: 'var(--node-text-sub, #475569)',
            width: 180,
            boxShadow: `0 8px 24px -10px ${info.color}33`,
          }
        });

        newEdges.push({
          id: `e-project-${id}`,
          source: 'project',
          target: id,
          type: 'default',
          animated: true,
          style: {
            stroke: info.color,
            strokeWidth: 2,
            opacity: 0.6,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: info.color,
            width: 12,
            height: 12,
          },
        });
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);

    if (parsed) {
      setLoading(true);
      const { owner, repo } = parsed;

      fetch(`https://api.github.com/repos/${owner}/${repo}`)
        .then(r => r.ok ? r.json() : Promise.reject('Repo not found'))
        .then(async (meta) => {
          setRepoMeta(meta);
          const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${meta.default_branch}?recursive=1`);
          if (treeRes.ok) {
            const treeData = await treeRes.json();
            const nestedTree = buildFileTree(treeData.tree);
            setRepoTree(nestedTree);
          }
        })
        .catch(err => {
          console.error('GitHub Fetch Error:', err);
          setError(String(err));
        })
        .finally(() => setLoading(false));
    }
  }, [project]);

  return (
    <AnimatePresence>
      {project && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="perfect-center w-full max-w-7xl h-[85vh] bg-white/80 dark:bg-obsidian/95 backdrop-blur-2xl border border-slate-200 dark:border-graphite rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-slate-200/50 dark:border-graphite/50 flex justify-between items-center bg-white/40 dark:bg-obsidian/40 shrink-0">
              <div>
                <h3 className="font-anta font-bold tracking-widest text-graphite dark:text-white uppercase text-xs sm:text-sm">System Topology</h3>
                <p className="text-[8px] sm:text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-0.5">{project.title}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-graphite dark:hover:text-white transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 lg:w-2/3 h-1/2 lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-200/50 dark:border-graphite/50 group/flow">
                {/* Overlay Gradient for depth */}
                <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-white/20 dark:to-obsidian/20 pointer-events-none z-10" />

                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  fitView
                  fitViewOptions={{ padding: 0.15 }}
                  className="theme-aware-flow"
                  proOptions={{ hideAttribution: true }}
                >
                  <Controls className="!bg-white/80 dark:!bg-obsidian/80 !backdrop-blur-md !border-slate-200/50 dark:!border-graphite/50 !shadow-xl !rounded-lg !overflow-hidden" />
                  <Background
                    color="currentColor"
                    className="text-slate-200/50 dark:text-white/5"
                    gap={24}
                    size={2}
                    variant={BackgroundVariant.Cross}
                  />
                </ReactFlow>

                <div className="absolute top-4 right-4 z-20 pointer-events-none">
                  {/* Status Badge in Graphite as requested */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-graphite/10 dark:bg-white/5 border border-graphite/20 dark:border-white/10 backdrop-blur-md shadow-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-graphite dark:bg-white animate-pulse" />
                    <span className="text-[9px] font-anta font-bold tracking-[0.2em] text-graphite dark:text-white uppercase leading-none px-1">Topology operational</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 lg:w-1/3 h-1/2 lg:h-full bg-slate-50/50 dark:bg-[#0d1117]/50 flex flex-col overflow-hidden backdrop-blur-sm">
                <div className="p-3 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-100/50 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <FileCode size={16} className="text-slate-500 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-[10px] font-anta font-bold text-graphite dark:text-white uppercase tracking-[0.2em]">Source Architecture</span>
                  </div>
                  {parsed && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-300/50 dark:border-white/10">
                      <Github size={10} className="text-slate-400" />
                      <span className="text-[8px] font-mono text-slate-500 truncate max-w-[120px]">
                        {parsed.owner}/{parsed.repo}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 scroll-smooth overscroll-contain custom-scrollbar">
                  {!parsed && (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
                        <Github size={32} className="opacity-20 translate-y-1" />
                      </div>
                      <p className="text-xs font-anta font-bold uppercase tracking-widest text-slate-500">No repository uplink</p>
                      <p className="text-[10px] mt-2 opacity-50 font-mono italic max-w-[200px]">Link a GitHub repository to visualize the architectural depth of this build.</p>
                    </div>
                  )}

                  {parsed && loading && (
                    <div className="h-full flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-b-2 border-emerald-500 animate-spin" />
                        <FileCode size={16} className="absolute inset-0 m-auto text-emerald-500 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-anta font-bold tracking-[0.2em] text-slate-500 uppercase">Analyzing Structure</span>
                    </div>
                  )}

                  {parsed && error && (
                    <div className="p-6 text-center bg-red-500/5 rounded-xl border border-red-500/10 m-2">
                      <p className="text-[10px] text-red-400 font-mono font-bold uppercase tracking-[0.1em]">Uplink Failure</p>
                      <p className="text-[9px] text-red-400/70 mt-1 font-mono">{error}</p>
                    </div>
                  )}

                  {!loading && !error && repoTree.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="py-2"
                    >
                      {repoTree.map(file => (
                        <FileTreeNode key={file.path} file={file} />
                      ))}
                    </motion.div>
                  )}
                </div>

                {repoMeta && (
                  <div className="p-3 border-t border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.02] flex items-center justify-between shrink-0 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-mono text-slate-400 uppercase tracking-widest">Branch</span>
                      <span className="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-400">
                        {repoMeta.default_branch}
                      </span>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <span className="text-[7px] font-mono text-slate-400 uppercase tracking-widest">Payload Size</span>
                      <span className="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-400">
                        {repoMeta.size > 1024 ? `${(repoMeta.size / 1024).toFixed(1)} MB` : `${repoMeta.size} KB`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
