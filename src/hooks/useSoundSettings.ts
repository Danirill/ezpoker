import { useCallback, useState } from 'react';
import { unlockAudio } from '../audio/sounds';

const STORAGE_KEY = 'ezpoker-sounds-enabled';

function readEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === 'true';
}

export function useSoundSettings() {
  const [soundEnabled, setSoundEnabled] = useState(readEnabled);

  const toggleSound = useCallback(() => {
    unlockAudio();
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { soundEnabled, toggleSound };
}
