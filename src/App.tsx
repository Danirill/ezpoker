import { unlockAudio } from './audio/sounds';
import { PokerTable } from './components/PokerTable';
import { useGameSounds } from './hooks/useGameSounds';
import { usePokerGame } from './hooks/usePokerGame';
import { useSoundSettings } from './hooks/useSoundSettings';
import './App.css';

export default function App() {
  const {
    state,
    gameConfig,
    playerCount,
    setPlayerCount,
    setGameConfig,
    dispatch,
    handleNewHand,
    isHumanTurn,
    animatingPot,
    canStartHand,
  } = usePokerGame();
  const { soundEnabled, toggleSound } = useSoundSettings();

  useGameSounds(state, soundEnabled);

  return (
    <>
      <PokerTable
        state={state}
        gameConfig={gameConfig}
        playerCount={playerCount}
        onPlayerCountChange={setPlayerCount}
        onGameConfigChange={setGameConfig}
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
        <h2 className="rotate-device__title">Переверните телефон</h2>
        <p className="rotate-device__text">Для игры используйте горизонтальный режим (landscape).</p>
      </div>
    </>
  );
}
