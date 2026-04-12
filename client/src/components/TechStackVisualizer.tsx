import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Github, FileCode, Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Project } from '../types';

interface TechStackVisualizerProps {
  project: Project | null;
  onClose: () => void;
}

// GitHub Types & Utilities
interface RepoMeta {
  size: number;
  default_branch: string;
  updated_at: string;
}

interface RepoFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  children?: RepoFile[];
}

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) return { owner: match[1], repo: match[2].replace('.git', '') };
  } catch {}
  return null;
}

const FILE_ICONS: Record<string, string> = {
  '.ts': '🟦', '.tsx': '⚛️', '.js': '🟨', '.jsx': '⚛️',
  '.py': '🐍', '.rs': '🦀', '.go': '🐹', '.java': '☕',
  '.css': '🎨', '.html': '🌐', '.json': '📋', '.md': '📝',
  '.yml': '⚙️', '.yaml': '⚙️', '.toml': '⚙️', '.env': '🔐',
  '.lock': '🔒', '.svg': '🖼️', '.png': '🖼️', '.jpg': '🖼️',
};

function getFileIcon(name: string, type: string) {
  if (type === 'dir') return <Folder size={14} className="text-blue-400 shrink-0" />;
  const ext = '.' + name.split('.').pop()?.toLowerCase();
  const emoji = FILE_ICONS[ext];
  if (emoji) return <span className="text-xs shrink-0">{emoji}</span>;
  return <File size={14} className="text-slate-400 shrink-0" />;
}

function FileTreeNode({ file, depth = 0 }: { file: RepoFile; depth?: number }) {
  const [expanded, setExpanded] = React.useState(depth < 1);

  return (
    <div>
      <button
        onClick={() => file.type === 'dir' && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 py-1 px-2 text-xs font-mono rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
          file.type === 'dir' ? 'cursor-pointer text-slate-700 dark:text-slate-200' : 'cursor-default text-slate-500 dark:text-slate-400'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {file.type === 'dir' ? (
          expanded ? <ChevronDown size={12} className="text-slate-500 shrink-0" /> : <ChevronRight size={12} className="text-slate-500 shrink-0" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {getFileIcon(file.name, file.type)}
        <span className="truncate">{file.name}</span>
        {file.type === 'file' && file.size > 0 && (
          <span className="ml-auto text-[9px] text-slate-600 tabular-nums shrink-0">
            {file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`}
          </span>
        )}
      </button>
      {file.type === 'dir' && expanded && file.children && (
        <div>
          {file.children
            .sort((a, b) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === 'dir' ? -1 : 1;
            })
            .map(child => (
              <FileTreeNode key={child.path} file={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

function buildFileTree(items: any[]): RepoFile[] {
  const root: RepoFile[] = [];
  const map: Record<string, RepoFile> = {};

  // Sort: folders first, then Alphabetical
  const sortedItems = [...items].sort((a, b) => {
    if (a.type === b.type) return a.path.localeCompare(b.path);
    return a.type === 'tree' ? -1 : 1;
  });

  sortedItems.forEach(item => {
    const parts = item.path.split('/');
    const name = parts.pop();
    const parentPath = parts.join('/');
    const node: RepoFile = {
      name: name || '',
      path: item.path,
      type: item.type === 'tree' ? 'dir' : 'file',
      size: item.size || 0,
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

  return root;
}

export function TechStackVisualizer({ project, onClose }: TechStackVisualizerProps) {
  // ... (existing React Flow state)
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // GitHub State
  const ghFeature = project?.features?.find(f => f.startsWith('GH:'));
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

    // Reset previous state
    setRepoMeta(null);
    setRepoTree([]);
    setError(null);

    // Build Graph (React Flow)
    const newNodes: any[] = [];
    const newEdges: any[] = [];

    newNodes.push({
      id: 'project',
      position: { x: 400, y: 300 },
      data: { 
        label: (
          <div className="font-bold text-lg p-2">{project.title}</div>
        ) 
      },
      style: {
        background: 'var(--node-bg, rgba(255, 255, 255, 0.9))',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--node-border, rgba(0, 0, 0, 0.1))',
        borderRadius: '12px',
        color: 'var(--node-text, #1e293b)',
        boxShadow: '0 10px 30px -15px rgba(0,0,0,0.1)',
      }
    });

    if (project.techStack && project.techStack.length > 0) {
      const radius = 200;
      const angleStep = (2 * Math.PI) / project.techStack.length;

      project.techStack.forEach((tech, index) => {
        const angle = index * angleStep;
        const x = 400 + radius * Math.cos(angle);
        const y = 300 + radius * Math.sin(angle);
        const id = `tech-${index}`;

        newNodes.push({
          id,
          position: { x, y },
          data: { 
            label: (
              <div className="flex items-center gap-2 p-1">
                <img src={`https://cdn.simpleicons.org/${tech.toLowerCase().replace(/[^a-z0-9]/g, '')}`} alt={tech} className="w-4 h-4" onError={(e) => e.currentTarget.style.display = 'none'} />
                <span className="font-medium text-sm">{tech}</span>
              </div>
            ) 
          },
          style: {
            background: 'var(--node-bg-sub, rgba(255, 255, 255, 0.7))',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--node-border-sub, rgba(0, 0, 0, 0.05))',
            borderRadius: '8px',
            color: 'var(--node-text-sub, #475569)',
          }
        });

        newEdges.push({
          id: `e-project-${id}`,
          source: 'project',
          target: id,
          animated: true,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#94a3b8',
          },
        });
      });
    }
    
    setNodes(newNodes);
    setEdges(newEdges);

    // Fetch GitHub Tree (Recursive)
    if (parsed) {
      setLoading(true);
      const { owner, repo } = parsed;

      fetch(`https://api.github.com/repos/${owner}/${repo}`)
        .then(r => r.ok ? r.json() : Promise.reject('Repo not found'))
        .then(async (meta) => {
          setRepoMeta(meta);
          // Use Git Trees API with recursive=1 to get the full tree in one shot
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-7xl h-[90vh] bg-white/80 dark:bg-obsidian/95 backdrop-blur-2xl border border-slate-200 dark:border-graphite rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-slate-200/50 dark:border-graphite/50 flex justify-between items-center bg-white/40 dark:bg-obsidian/40 shrink-0">
              <div>
                <h3 className="font-bold text-graphite dark:text-white">Tech Stack & Architecture</h3>
                <p className="text-xs text-slate-500">{project.title}</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-graphite dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Split Layout: 1 Column, 2 Rows (flex-col) */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              
              {/* Row/Col 1: React Flow Graph */}
              <div className="flex-1 lg:w-2/3 h-1/2 lg:h-full relative border-b lg:border-b-0 lg:border-r border-slate-200/50 dark:border-graphite/50">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  fitView
                  className="theme-aware-flow"
                >
                  <Controls className="bg-white/80 dark:bg-obsidian/80 backdrop-blur-md border-slate-200/50 dark:border-graphite/50" />
                  <Background color="#94a3b8" gap={16} />
                </ReactFlow>
              </div>

              {/* Row/Col 2: GitHub Architecture Tree */}
              <div className="flex-1 lg:w-1/3 h-1/2 lg:h-full bg-slate-50/50 dark:bg-[#0d1117] flex flex-col overflow-hidden">
                <div className="p-3 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-100/50 dark:bg-white/5">
                  <div className="flex items-center gap-2">
                    <FileCode size={16} className="text-slate-500" />
                    <span className="text-xs font-bold text-graphite dark:text-white uppercase tracking-wider">Repository</span>
                  </div>
                  {parsed && (
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px]">
                      {parsed.owner}/{parsed.repo}
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                  {!parsed && (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
                      <Github size={32} className="mb-3 opacity-30" />
                      <p className="text-xs font-mono">No repository linked</p>
                      <p className="text-[10px] mt-1 opacity-70">Add a GitHub URL to see the file structure</p>
                    </div>
                  )}

                  {parsed && loading && (
                    <div className="h-full flex flex-col items-center justify-center space-y-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-slate-400"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">Fetching structure...</span>
                    </div>
                  )}

                  {parsed && error && (
                    <div className="p-4 text-center">
                      <p className="text-xs text-red-400 font-mono">Failed to fetch: {error}</p>
                    </div>
                  )}

                  {!loading && !error && repoTree.length > 0 && (
                    <div className="py-2">
                      {repoTree.map(file => (
                        <FileTreeNode key={file.path} file={file} />
                      ))}
                    </div>
                  )}
                </div>

                {repoMeta && (
                  <div className="p-2 border-t border-slate-200/50 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.02] flex items-center justify-between shrink-0 mt-auto">
                    <span className="text-[9px] font-mono text-slate-500">
                      {repoMeta.default_branch}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      {repoMeta.size > 1024 ? `${(repoMeta.size / 1024).toFixed(1)} MB` : `${repoMeta.size} KB`}
                    </span>
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
