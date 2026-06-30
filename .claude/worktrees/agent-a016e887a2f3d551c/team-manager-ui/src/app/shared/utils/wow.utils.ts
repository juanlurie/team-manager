export interface WowPhaseInfo { label: string; text: string; bg: string; }

export function wowPhaseInfo(status: string | undefined): WowPhaseInfo {
  switch (status) {
    case 'Nominating':  return { label: 'Nominations Open', text: '#FFD700', bg: 'rgba(255,215,0,0.15)' };
    case 'Voting':      return { label: 'Voting Open',      text: '#4caf50', bg: 'rgba(76,175,80,0.15)' };
    case 'SuddenDeath': return { label: '⚡ Tie-Breaker',   text: '#ff7043', bg: 'rgba(255,87,34,0.15)' };
    case 'Closed':      return { label: 'Closed',           text: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)' };
    default:            return { label: status ?? '',        text: '#fff',   bg: 'rgba(255,255,255,0.1)' };
  }
}

export function runTieBreakSpin(
  names: string[],
  winnerName: string,
  setName: (n: string) => void,
  setSpinning: (v: boolean) => void,
  onDone: () => void
): void {
  setSpinning(true);
  setName(names[0]);
  let elapsed = 0;
  const totalDuration = 3200;
  let idx = 0;
  const tick = () => {
    const progress = elapsed / totalDuration;
    const delay = 60 + 460 * (progress * progress);
    if (elapsed + delay >= totalDuration) {
      setName(winnerName);
      setTimeout(() => { setSpinning(false); onDone(); }, 1800);
      return;
    }
    elapsed += delay;
    idx = (idx + 1) % names.length;
    setName(names[idx]);
    setTimeout(tick, delay);
  };
  setTimeout(tick, 60);
}
