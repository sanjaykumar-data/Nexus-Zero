import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LandingScreen } from './components/LandingScreen';
import Workspace from './Workspace';

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {!hasEntered ? (
        <motion.div
          key="landing"
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.5 }}
        >
          <LandingScreen onEnter={() => setHasEntered(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="workspace"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Workspace />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
