import { useEffect, useState } from 'react';
import { unlockAudio } from './audio/sounds';
import { PokerTable } from './components/PokerTable';
import { useGameSounds } from './hooks/useGameSounds';
import { usePokerGame } from './hooks/usePokerGame';
import type { Locale } from './i18n';
import { useSoundSettings } from './hooks/useSoundSettings';
import './App.css';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru';
  const stored = window.localStorage.getItem('ezpoker_locale');
  if (stored === 'ru' || stored === 'en') return stored;
  const nav = window.navigator.language.toLowerCase();
  if (nav.startsWith('ru')) return 'ru';
  return 'en';
}

export default function App() {
  const {
    state,
    gameConfig,
    playerCount,
    setPlayerCount,
    setGameConfig,
    setBotStrategy,
    dispatch,
    handleNewHand,
    isHumanTurn,
    animatingPot,
    canStartHand,
  } = usePokerGame();
  const { soundEnabled, toggleSound } = useSoundSettings();

  const [locale, setLocale] = useState<Locale>(() => getInitialLocale());

  useEffect(() => {
    try {
      window.localStorage.setItem('ezpoker_locale', locale);
    } catch {
      // ignore storage errors
    }
  }, [locale]);

  useGameSounds(state, soundEnabled);

  const isRu = locale === 'ru';

  return (
    <>
      <PokerTable
        state={state}
        locale={locale}
        onLocaleToggle={() => setLocale((prev) => (prev === 'ru' ? 'en' : 'ru'))}
        gameConfig={gameConfig}
        playerCount={playerCount}
        onPlayerCountChange={setPlayerCount}
        onGameConfigChange={setGameConfig}
        onBotStrategyChange={setBotStrategy}
        isHumanTurn={isHumanTurn}
        animatingPot={animatingPot}
        canStartHand={canStartHand}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onAction={(action, amount) => {
          unlockAudio();
          dispatch('human', { action, amount });
        }}
        onNewHand={() => {
          unlockAudio();
          handleNewHand();
        }}
      />

      <div className="rotate-device" role="status" aria-live="polite">
        <div className="rotate-device__phone" aria-hidden="true" />
        <h2 className="rotate-device__title">
          {isRu ? 'Переверните телефон' : 'Rotate your phone'}
        </h2>
        <p className="rotate-device__text">
          {isRu
            ? 'Для игры используйте горизонтальный режим (landscape).'
            : 'Please play in horizontal (landscape) orientation.'}
        </p>
      </div>
    </>
  );
}
