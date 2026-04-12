import { motion, useScroll, useSpring } from 'motion/react';

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-graphite dark:bg-white origin-left z-[100] shadow-[0_0_10px_rgba(51,65,85,0.5)] dark:shadow-[0_0_10px_rgba(255,255,255,0.5)]"
      style={{ scaleX }}
    />
  );
}
