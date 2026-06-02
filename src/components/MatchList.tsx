import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Swords, Check, Shuffle, Play } from 'lucide-react';

export function MatchList() {
  const { tournaments, activeTournamentId, updateScore, randomizePendingMatches, swapMatchPlayer, generateSingleMatch } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;
  const { matches, players, status } = activeTournament;

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  // Compute play count per player across completed matches only
  const playCount = matches.filter(m => m.status === 'completed').reduce((acc, match) => {
    [...match.team1, ...match.team2].forEach(pid => {
      acc[pid] = (acc[pid] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const getPlayerLabel = (id: string) => {
    const name = getPlayerName(id);
    const count = playCount[id] || 0;
    return `${name} (${count}x)`;
  };

  const pendingMatches = matches.filter(m => m.status === 'pending');
  const completedMatches = matches.filter(m => m.status === 'completed');

  // Build partnership history from completed matches
  const partnerships = new Set<string>();
  completedMatches.forEach(m => {
    const key1 = [m.team1[0], m.team1[1]].sort().join('|');
    const key2 = [m.team2[0], m.team2[1]].sort().join('|');
    partnerships.add(key1);
    partnerships.add(key2);
  });

  const hasPartneredBefore = (a: string, b: string) =>
    partnerships.has([a, b].sort().join('|'));

  // Group pending matches by round
  const pendingByRound = pendingMatches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof matches>);

  const pendingRounds = Object.keys(pendingByRound).map(Number).sort((a, b) => a - b); // oldest/first rounds first

  // Group completed matches by round
  const completedByRound = completedMatches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof matches>);

  const completedRounds = Object.keys(completedByRound).map(Number).sort((a, b) => b - a); // newest rounds first

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card">
        <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
          <h2 className="flex items-center gap-2">
            <Swords className="text-gradient" size={24} />
            Pending Matches
          </h2>

          <div className="flex gap-2">
            {status === 'active' && (
              <button className="btn btn-primary" onClick={generateSingleMatch} title="Generate a single new match">
                <Play size={16} />
                <span>Generate Match</span>
              </button>
            )}
            {pendingMatches.length > 0 && status === 'active' && (
              <button className="btn btn-outline" onClick={randomizePendingMatches} title="Randomize players in pending matches">
                <Shuffle size={16} />
                <span className="hidden md:inline">Randomize</span>
              </button>
            )}
          </div>
        </div>

        {pendingMatches.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            {status === 'active' ? 'All matches in the tournament are completed.' : 'Start the tournament to generate matches.'}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {pendingRounds.map(roundNum => (
              <div key={roundNum}>
                <h3 className="text-muted" style={{ marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Round {roundNum}
                </h3>
                <div className="grid gap-4">
                  {pendingByRound[roundNum].map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      players={players.filter(p => p.active)}
                      getPlayerName={getPlayerName}
                      getPlayerLabel={getPlayerLabel}
                      hasPartneredBefore={hasPartneredBefore}
                      onSave={(s1: number, s2: number) => updateScore(match.id, s1, s2)}
                      onSwap={swapMatchPlayer}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {completedRounds.length > 0 && (
        <div className="glass-card" style={{ opacity: 0.8 }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Completed Matches</h2>
          <div className="flex flex-col gap-8">
            {completedRounds.map(roundNum => (
              <div key={roundNum}>
                <h3 className="text-muted" style={{ marginBottom: '12px', marginTop: '16px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Round {roundNum}
                </h3>
                <div className="grid gap-4">
                  {completedByRound[roundNum].map(match => (
                    <div key={match.id} style={{
                      background: 'rgba(0,0,0,0.2)',
                      padding: '16px',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: '1px solid var(--border-light)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: match.score1! > match.score2! ? 600 : 400, color: match.score1! > match.score2! ? 'var(--accent-primary)' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          {getPlayerName(match.team1[0])}
                          <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 400 }}>({playCount[match.team1[0]] || 0}x)</span>
                          {' & '}
                          {getPlayerName(match.team1[1])}
                          <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 400 }}>({playCount[match.team1[1]] || 0}x)</span>
                        </div>
                        <div style={{ fontWeight: match.score2! > match.score1! ? 600 : 400, color: match.score2! > match.score1! ? 'var(--accent-primary)' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {getPlayerName(match.team2[0])}
                          <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 400 }}>({playCount[match.team2[0]] || 0}x)</span>
                          {' & '}
                          {getPlayerName(match.team2[1])}
                          <span style={{ fontSize: '0.75rem', opacity: 0.5, fontWeight: 400 }}>({playCount[match.team2[1]] || 0}x)</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '2px', display: 'flex', gap: '12px' }}>
                        <span style={{ color: match.score1! > match.score2! ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{match.score1}</span>
                        <span style={{ color: 'var(--border-light)' }}>-</span>
                        <span style={{ color: match.score2! > match.score1! ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{match.score2}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchCard({ match, players, getPlayerLabel, hasPartneredBefore, onSave, onSwap }: any) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');

  const handleSave = () => {
    const num1 = parseInt(s1, 10);
    const num2 = parseInt(s2, 10);
    if (!isNaN(num1) && !isNaN(num2)) {
      onSave(num1, num2);
    }
  };

  const handleS1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setS1(val);
    if (val !== '') {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0 && num <= 21) {
        setS2((21 - num).toString());
      }
    } else {
      setS2('');
    }
  };

  const handleS2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setS2(val);
    if (val !== '') {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0 && num <= 21) {
        setS1((21 - num).toString());
      }
    } else {
      setS1('');
    }
  };

  const renderPlayerSelect = (playerId: string, align: 'left' | 'right') => {
    return (
      <select
        value={playerId}
        onChange={(e) => onSwap(match.id, playerId, e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          borderBottom: '1px dashed rgba(255,255,255,0.2)',
          color: 'inherit',
          fontSize: '1.1rem',
          fontWeight: 500,
          outline: 'none',
          cursor: 'pointer',
          textAlign: align,
          width: '100%',
          padding: '2px 0',
          appearance: 'none',
          direction: align === 'right' ? 'rtl' : 'ltr'
        }}
        title="Click to swap player"
      >
        {players.map((p: any) => (
          <option key={p.id} value={p.id} style={{ color: '#000', direction: 'ltr' }}>
            {getPlayerLabel(p.id)}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border-light)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div className="flex justify-between items-center text-muted" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
        <span>Round {match.round}</span>
        <span className="badge badge-pending">Pending</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Team 1 */}
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div>{renderPlayerSelect(match.team1[0], 'right')}</div>
          <div style={{ marginTop: '8px' }}>{renderPlayerSelect(match.team1[1], 'right')}</div>
          {hasPartneredBefore(match.team1[0], match.team1[1]) && (
            <div style={{ marginTop: '6px', textAlign: 'right' }}>
              <span title="These players have been partners before" style={{ fontSize: '0.7rem', background: 'rgba(255,180,0,0.15)', color: '#f0a500', border: '1px solid rgba(255,180,0,0.3)', borderRadius: '4px', padding: '2px 6px', fontWeight: 600 }}>🔁</span>
            </div>
          )}
        </div>

        {/* Scores */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input"
            style={{ width: '60px', textAlign: 'center', fontSize: '1.2rem', padding: '8px' }}
            value={s1}
            onChange={handleS1Change}
            min="0"
            max="21"
          />
          <span style={{ color: 'var(--text-muted)' }}>-</span>
          <input
            type="number"
            className="input"
            style={{ width: '60px', textAlign: 'center', fontSize: '1.2rem', padding: '8px' }}
            value={s2}
            onChange={handleS2Change}
            min="0"
            max="21"
          />
        </div>

        {/* Team 2 */}
        <div style={{ flex: 1 }}>
          <div>{renderPlayerSelect(match.team2[0], 'left')}</div>
          <div style={{ marginTop: '8px' }}>{renderPlayerSelect(match.team2[1], 'left')}</div>
          {hasPartneredBefore(match.team2[0], match.team2[1]) && (
            <div style={{ marginTop: '6px' }}>
              <span title="These players have been partners before" style={{ fontSize: '0.7rem', background: 'rgba(255,180,0,0.15)', color: '#f0a500', border: '1px solid rgba(255,180,0,0.3)', borderRadius: '4px', padding: '2px 6px', fontWeight: 600 }}>🔁</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center" style={{ marginTop: '8px' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={s1 === '' || s2 === ''}
          style={{ width: '100%', maxWidth: '200px' }}
        >
          <Check size={18} />
          Save Score
        </button>
      </div>
    </div>
  );
}
