import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';

const PHRASES = [
  { prefix: "AI TECHNOLOGY", suffix: "Orchestrating the future of autonomous intelligence" },
  { prefix: "GEN AI", suffix: "Powering creative and generative project synthesis" },
  { prefix: "AGENTIC AI", suffix: "Enabling autonomous planning and execution flows" },
  { prefix: "MACHINE LEARNING", suffix: "Optimizing discovery through predictive analytics" },
  { prefix: "DEEP LEARNING", suffix: "Visualizing the hidden architecture of neural systems" },
];

export const GeometricAIGraphics: React.FC = () => {
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

  React.useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentPhrase = PHRASES[currentIndex].suffix;

    if (isTyping) {
      if (displayText.length < currentPhrase.length) {
        timeout = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length + 1));
        }, 15 + Math.random() * 25); // Faster typing speed
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 3000); // 3 seconds stay
      }
    } else {
      if (displayText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayText(currentPhrase.slice(0, displayText.length - 1));
        }, 10); // Faster delete speed
      } else {
        setCurrentIndex((prev) => (prev + 1) % PHRASES.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [displayText, isTyping, currentIndex]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-transparent">
      {/* Subtle dot matrix background with brand graphite */}
      <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.07] text-graphite dark:text-white"
        style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Floating wrapper shifted UP for better visual balance */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 lg:p-16 transform -translate-y-[8%]">

        {/* Tree Graphic - Clean version without background noise */}
        <div className="w-full max-w-[850px] pointer-events-none mb-6 lg:mb-12 flex-shrink-0 relative">
          <svg viewBox="0 0 800 400" className="w-full h-auto text-graphite/40 dark:text-white/40 overflow-visible">
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

            {/* Glowing Architectural Beams (Soft Halos) */}
            {[80, 240, 400, 560, 720].map((startX, i) => (
              <path
                key={`halo-${i}`}
                d={`M ${startX} 57 C ${startX} 160, 400 150, 400 300 L 400 380`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="12"
                strokeOpacity="0.03"
                filter="blur(8px)"
              />
            ))}

            {/* Smooth branching paths - 5 points */}
            <path d="M 80 57 C 80 160, 400 150, 400 300 L 400 380" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
            <path d="M 240 57 C 240 160, 400 150, 400 300 L 400 380" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
            <path d="M 400 57 C 400 160, 400 150, 400 300 L 400 380" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
            <path d="M 560 57 C 560 160, 400 150, 400 300 L 400 380" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
            <path d="M 720 57 C 720 160, 400 150, 400 300 L 400 380" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />

            {/* Animated Data Pulses along Paths */}
            {[80, 240, 400, 560, 720].map((startX, i) => (
              <motion.path
                key={`pulse-${i}`}
                d={`M ${startX} 57 C ${startX} 160, 400 150, 400 300 L 400 380`}
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
                  delay: i * 0.8,
                  ease: "easeInOut"
                }}
              />
            ))}

            {/* Top Topo Nodes - Transparent Theme Architecture */}
            {[
              { x: 80, label: "CEREBRAL" },
              { x: 240, label: "ADAPTIVE" },
              { x: 400, label: "MODULAR" },
              { x: 560, label: "FUTURIST" },
              { x: 720, label: "INTREPID" }
            ].map((node, i) => (
              <g key={i}>
                <rect
                  x={node.x - 70}
                  y={24}
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
                  y={47}
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

            {/* Bottom Root Label - THE ENGINEER */}
            <g>
              <circle cx={400} cy={380} r={4} fill="#3b82f6" fillOpacity="0.4" />
              <text
                x={400}
                y={398}
                textAnchor="middle"
                fontSize="11"
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

        {/* Typewriter Text - Anchored and Balanced */}
        <div className="absolute bottom-[10%] left-12 right-12 text-left z-50">
          <AnimatePresence mode="wait">
            <motion.h2
              key={`prefix-${currentIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.3 }}
              className="text-2xl md:text-3xl font-anta font-bold tracking-[0.2em] text-graphite dark:text-white mb-3 uppercase"
            >
              {PHRASES[currentIndex].prefix}
            </motion.h2>
          </AnimatePresence>

          <div className="text-lg md:text-xl font-mono font-medium text-graphite/80 dark:text-slate-300 leading-relaxed max-w-4xl flex items-center">
            <span className="flex-shrink-0">{displayText}</span>
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
              className="inline-block w-5 h-5 ml-2 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex-shrink-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
