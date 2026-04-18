import * as React from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'motion/react';

const PHRASES = [
  { prefix: "AI TECHNOLOGY", suffix: "Orchestrating the future of autonomous intelligence" },
  { prefix: "GEN AI", suffix: "Powering creative and generative project synthesis" },
  { prefix: "AGENTIC AI", suffix: "Enabling autonomous planning and execution flows" },
  { prefix: "MACHINE LEARNING", suffix: "Optimizing discovery through predictive analytics" },
  { prefix: "DEEP LEARNING", suffix: "Visualizing the hidden architecture of neural systems" },
];

export const GeometricAIGraphics: React.FC<{ showTree?: boolean }> = ({ showTree = true }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [displayText, setDisplayText] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(true);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    // Initial check
    setIsDarkMode(document.documentElement.classList.contains('dark'));

    // Observer to detect theme changes on <html> class
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDarkMode(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const charCount = useMotionValue(0);
  
  React.useEffect(() => {
    const currentPhrase = PHRASES[currentIndex].suffix;
    
    if (isTyping) {
      // Smoothly animate from 0 to full length
      const controls = animate(charCount, currentPhrase.length, {
        duration: currentPhrase.length * 0.04, // Smooth constant speed
        ease: "linear",
        onUpdate: (latest) => {
          setDisplayText(currentPhrase.slice(0, Math.round(latest)));
        },
        onComplete: () => {
          setTimeout(() => setIsTyping(false), 3000);
        }
      });
      return () => controls.stop();
    } else {
      // Smoothly backspace
      const controls = animate(charCount, 0, {
        duration: displayText.length * 0.015, // Faster backspace
        ease: "linear",
        onUpdate: (latest) => {
          setDisplayText(currentPhrase.slice(0, Math.round(latest)));
        },
        onComplete: () => {
          setCurrentIndex((prev) => (prev + 1) % PHRASES.length);
          setIsTyping(true);
        }
      });
      return () => controls.stop();
    }
  }, [currentIndex, isTyping]);

  return (
    <div className="relative lg:absolute lg:inset-0 w-full flex flex-col items-start justify-start overflow-hidden bg-transparent">
      {/* Subtle dot matrix background with brand graphite */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07] text-graphite dark:text-white"
        style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Floating wrapper - Phrases above Tree on Mobile, Tree above Phrases on Desktop */}
      <div className="relative z-10 w-full h-full lg:h-full flex flex-col-reverse lg:flex-col items-center lg:items-start justify-start pt-0 lg:pt-[15vh] px-6 lg:pl-16 lg:pr-0 pb-2 lg:pb-16">

        {showTree && (
          <div className="w-full max-w-[950px] relative flex flex-col items-start mt-0">
            <svg viewBox="0 0 950 450" className="w-full h-auto text-graphite/40 dark:text-white/40 overflow-visible pointer-events-none relative z-0 ml-[-100px]">
              <defs>
                <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
                <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1e293b" floodOpacity="0.1" />
                </filter>
                <filter id="pathGlow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Glowing Architectural Beams (Soft Halos) - Converging at x=480 */}
              {[180, 250, 400, 550, 700].map((startX, i) => (
                <path
                  key={`halo-${i}`}
                  d={`M ${startX} 33 C ${startX} 136, 480 126, 480 276 L 480 356`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="12"
                  strokeOpacity="0.03"
                  filter="blur(8px)"
                />
              ))}

              {/* Smooth branching paths - 5 points converging at Center Root (x=480) */}
              <path d="M 180 33 C 180 136, 480 126, 480 276 L 480 356" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
              <path d="M 330 33 C 330 136, 480 126, 480 276 L 480 356" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
              <path d="M 480 33 C 480 136, 480 126, 480 276 L 480 356" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
              <path d="M 630 33 C 630 136, 480 126, 480 276 L 480 356" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
              <path d="M 780 33 C 780 136, 480 126, 480 276 L 480 356" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />

              {/* Animated Data Pulses along x=480 Centered Paths */}
              {[180, 330, 480, 630, 780].map((startX, i) => (
                <motion.path
                  key={`pulse-${i}`}
                  d={`M ${startX} 33 C ${startX} 136, 480 126, 480 276 L 480 356`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, pathOffset: 0, opacity: 0 }}
                  animate={{
                    pathLength: [0, 0.15, 0.15],
                    pathOffset: [0, 0, 1],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: i * 0.7,
                    ease: "easeInOut"
                  }}
                />
              ))}

              {/* Top Topo Nodes - Tighter Spread from x=100 */}
              {[
                { x: 180, label: "CEREBRAL" },
                { x: 330, label: "ADAPTIVE" },
                { x: 480, label: "MODULAR" },
                { x: 630, label: "FUTURIST" },
                { x: 780, label: "INTREPID" }
              ].map((node, i) => (
                <g key={i}>
                  <rect
                    x={node.x - 70}
                    y={0}
                    width={140}
                    height={36}
                    rx={18}
                    fill="none"
                    stroke={isDarkMode ? "white" : "#1e293b"}
                    strokeWidth="1.2"
                    strokeOpacity="0.25"
                  />
                  <text
                    x={node.x}
                    y={23}
                    textAnchor="middle"
                    fontSize="12"
                    fill={isDarkMode ? "white" : "#1e293b"}
                    fillOpacity={isDarkMode ? "0.8" : "0.6"}
                    fontFamily="monospace"
                    fontWeight="bold"
                    letterSpacing="2"
                  >
                    {node.label}
                  </text>
                </g>
              ))}

              {/* Bottom Root Label - THE ENGINEER (Centered x=480 Axis) */}
              <g>
                <circle cx={480} cy={356} r={4} fill="#3b82f6" fillOpacity="0.4" />
              <text
                x={480}
                y={374}
                textAnchor="middle"
                fontSize="14"
                fill={isDarkMode ? "white" : "#1e293b"}
                fillOpacity={isDarkMode ? "0.8" : "0.6"}
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="3"
              >
                ENGINEER
              </text>
              </g>
            </svg>
          </div>
        )}

        {/* Typewriter Text - Phrases in Upper position for mobile via flex-col-reverse */}
        <div className="w-full text-center lg:text-left z-50 px-0 lg:pl-0 mb-0 lg:mb-0 lg:mt-16">
          <h2
            className="text-lg lg:text-3xl font-anta font-bold tracking-[0.2em] text-graphite dark:text-white mb-0 lg:mb-3 uppercase pointer-events-auto h-7 lg:h-auto overflow-hidden flex items-start justify-center lg:justify-start"
          >
            {PHRASES[currentIndex].prefix}
          </h2>

          <div className="text-sm lg:text-xl font-mono font-medium text-graphite/80 dark:text-slate-300 leading-relaxed max-w-4xl text-center lg:text-left pointer-events-auto h-12 lg:h-auto overflow-hidden">
            <span className="whitespace-pre-wrap">
              {displayText}
              <motion.div
                animate={{
                  opacity: [1, 0.4, 1],
                  scale: [1, 1.25, 1],
                  boxShadow: [
                    '0 0 15px rgba(59,130,246,0.5)',
                    '0 0 30px rgba(59,130,246,0.8)',
                    '0 0 15px rgba(59,130,246,0.5)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block w-3 h-3 lg:w-5 lg:h-5 ml-2 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 translate-y-[1px]"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
