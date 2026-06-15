import { unlockAudio } from './audio/sounds';
import { PokerTable } from './components/PokerTable';
import { useGameSounds } from './hooks/useGameSounds';
import { usePokerGame } from './hooks/usePokerGame';
import { useSoundSettings } from './hooks/useSoundSettings';
import './App.css';

export default function App() {
  const {
    state,
    playerCount,
    setPlayerCount,
    dispatch,
    handleNewHand,
    isHumanTurn,
    animatingPot,
    canStartHand,
  } = usePokerGame();
  const { soundEnabled, toggleSound } = useSoundSettings();

  useGameSounds(state, soundEnabled);

  return (
    <PokerTable
      state={state}
      playerCount={playerCount}
      onPlayerCountChange={setPlayerCount}
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
  );
}
