import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Github, Heart, Layers, Star, GitFork, Eye, Code2, FileText, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Project } from '../types';
import { Button } from './ui/Button';

interface ProjectDetailsModalProps {
  project: Project | null;
  onClose: () => void;
  isLiked?: boolean;
  onToggleLike?: (projectId: string) => void;
}

interface RepoMeta {
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string;
  default_branch: string;
  html_url: string;
  topics: string[];
  size: number;
  created_at: string;
  updated_at: string;
}

interface RepoLanguages {
  [key: string]: number;
}

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) return { owner: match[1], repo: match[2].replace('.git', '') };
  } catch { }
  return null;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Rust: '#dea584', Go: '#00ADD8', Java: '#b07219', CSS: '#563d7c',
  HTML: '#e34c26', Shell: '#89e051', Dockerfile: '#384d54',
  Ruby: '#701516', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
};

export function ProjectDetailsModal({ project, onClose, isLiked, onToggleLike }: ProjectDetailsModalProps) {
  const [repoMeta, setRepoMeta] = React.useState<RepoMeta | null>(null);
  const [repoLangs, setRepoLangs] = React.useState<RepoLanguages>({});
  const [loading, setLoading] = React.useState(false);

  const ghFeature = project?.features?.find(f => f.startsWith('GH:'));
  const ghFromFeature = ghFeature ? ghFeature.substring(3) : null;
  const ghFromLiveUrl = project?.liveUrl?.includes('github.com') ? project.liveUrl : null;
  const githubUrl = ghFromFeature || ghFromLiveUrl || null;

  React.useEffect(() => {
    if (!githubUrl) {
      setRepoMeta(null);
      setRepoLangs({});
      return;
    }

    const parsed = parseGithubUrl(githubUrl);
    if (parsed) {
      setLoading(true);
      const { owner, repo } = parsed;

      Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`).then(r => r.ok ? r.json() : null),
        fetch(`https://api.github.com/repos/${owner}/${repo}/languages`).then(r => r.ok ? r.json() : {}),
      ]).then(([meta, langs]) => {
        setRepoMeta(meta);
        setRepoLangs(langs);
      }).finally(() => setLoading(false));
    }
  }, [githubUrl]);

  const totalLangBytes = Object.values(repoLangs).reduce((a, b) => a + b, 0);

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
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl bg-white/80 dark:bg-obsidian/80 backdrop-blur-2xl border border-slate-200 dark:border-graphite rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header Actions */}
            <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
              {onToggleLike && (
                <button
                  onClick={() => onToggleLike(project.id)}
                  className={`p-2.5 rounded-full transition-all ${isLiked
                      ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10'
                      : 'bg-white/50 dark:bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                    }`}
                >
                  <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2.5 bg-white/50 dark:bg-white/5 text-slate-400 hover:text-graphite dark:hover:text-white rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="mb-6 pr-12">
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.categories?.map(cat => (
                    <span key={cat} className="text-[10px] sm:text-xs px-2.5 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-slate-600 dark:text-slate-300 font-medium border border-slate-200/50 dark:border-graphite/50">
                      {cat}
                    </span>
                  ))}
                </div>
                <h2 className="text-3xl sm:text-5xl font-bold text-graphite dark:text-white mb-2 tracking-tight">{project.title}</h2>
                {project.shortDescription && (
                  <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mb-3 leading-tight">{project.shortDescription}</p>
                )}
                <p className="text-xs text-slate-400 font-mono mt-1">by {project.authorName}</p>
              </div>

              <div className="max-w-4xl">

                {/* About / Report Section */}
                <div className="space-y-6">
                  <section>
                    <h3 className="text-sm font-bold text-graphite dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
                      <FileText size={16} className="text-slate-400" />
                      README
                    </h3>
                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-5 border border-slate-100 dark:border-white/10 overflow-hidden">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-xl font-bold mb-4 text-graphite dark:text-white">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-bold mb-3 text-graphite dark:text-white">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-md font-bold mb-2 text-graphite dark:text-white">{children}</h3>,
                            p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            code: ({ children }) => <code className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-slate-900 dark:text-slate-200">{children}</code>,
                            pre: ({ children }) => (
                              <pre className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 p-4 rounded-lg overflow-x-auto mb-4 font-mono text-[11px] leading-relaxed shadow-sm dark:shadow-lg transition-colors">
                                {children}
                              </pre>
                            ),
                            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{children}</a>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-slate-300 dark:border-graphite pl-4 italic mb-4 text-slate-500 dark:text-slate-400">{children}</blockquote>,
                          }}
                        >
                          {project.description}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </section>

                  {/* GitHub Repo Stats */}
                  <section>
                    <h3 className="text-sm font-bold text-graphite dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
                      <Github size={16} className="text-slate-400" />
                      Repository Intel
                    </h3>
                    {loading ? (
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10 flex flex-col items-center justify-center h-24 animate-pulse">
                            <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-white/10 mb-2" />
                            <div className="h-6 w-12 bg-slate-200 dark:bg-white/10 rounded" />
                          </div>
                        ))}
                      </div>
                    ) : repoMeta ? (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10 text-center">
                          <Star size={16} className="text-amber-400 mx-auto mb-1" />
                          <div className="text-xl font-mono font-bold text-graphite dark:text-white">{repoMeta.stargazers_count}</div>
                          <div className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">Stars</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10 text-center">
                          <GitFork size={16} className="text-blue-400 mx-auto mb-1" />
                          <div className="text-xl font-mono font-bold text-graphite dark:text-white">{repoMeta.forks_count}</div>
                          <div className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">Forks</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10 text-center">
                          <Eye size={16} className="text-emerald-400 mx-auto mb-1" />
                          <div className="text-xl font-mono font-bold text-graphite dark:text-white">{repoMeta.watchers_count}</div>
                          <div className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">Watchers</div>
                        </div>
                      </div>
                    ) : (
                      <div className="hidden" />
                    )}
                  </section>

                  {/* Language Breakdown */}
                  {totalLangBytes > 0 && (
                    <section>
                      <h3 className="text-sm font-bold text-graphite dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <Code2 size={16} className="text-slate-400" />
                        Language Breakdown
                      </h3>
                      <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-5 border border-slate-100 dark:border-white/10">
                        {/* Color bar */}
                        <div className="flex h-2.5 rounded-full overflow-hidden mb-4">
                          {Object.entries(repoLangs).map(([lang, bytes]) => (
                            <div
                              key={lang}
                              style={{
                                width: `${(bytes / totalLangBytes) * 100}%`,
                                backgroundColor: LANG_COLORS[lang] || '#6e7681',
                              }}
                              title={`${lang}: ${((bytes / totalLangBytes) * 100).toFixed(1)}%`}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {Object.entries(repoLangs).map(([lang, bytes]) => (
                            <div key={lang} className="flex items-center gap-1.5 text-xs">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: LANG_COLORS[lang] || '#6e7681' }}
                              />
                              <span className="text-slate-600 dark:text-slate-300">{lang}</span>
                              <span className="text-slate-400 font-mono text-[10px]">{((bytes / totalLangBytes) * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </div>

              {/* Actions Toolbar */}
              {githubUrl && (
                <div className="flex flex-wrap items-center gap-4 pt-8 mt-8 border-t border-slate-200/50 dark:border-graphite/50">
                  <Button
                    className="gap-2 px-6"
                    onClick={() => window.open(githubUrl, '_blank')}
                  >
                    <Github size={16} /> View on GitHub
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
