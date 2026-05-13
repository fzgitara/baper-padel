import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Swords, Check, Play, Shuffle } from 'lucide-react';

export function MatchList() {
  const { tournaments, activeTournamentId, updateScore, generateNextRound, randomizePendingMatches, swapMatchPlayer } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;
  const { matches, players, status } = activeTournament;

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  const pendingMatches = matches.filter(m => m.status === 'pending');
  const completedMatches = matches.filter(m => m.status === 'completed');

  // Group completed matches by round
  const completedByRound = completedMatches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof matches>);

  const completedRounds = Object.keys(completedByRound).map(Number).sort((a, b) => b - a); // newest rounds first

  const allPendingCompleted = pendingMatches.length === 0 && matches.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card">
        <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
          <h2 className="flex items-center gap-2">
            <Swords className="text-gradient" size={24} />
            Pending Matches
          </h2>

          <div className="flex gap-2">
            {pendingMatches.length > 0 && status === 'active' && (
              <button className="btn btn-outline" onClick={randomizePendingMatches} title="Randomize players in pending matches">
                <Shuffle size={16} />
                <span className="hidden md:inline">Randomize</span>
              </button>
            )}
            {allPendingCompleted && status === 'active' && (
              <button className="btn btn-primary" onClick={generateNextRound}>
                <Play size={16} />
                Generate Next Round
              </button>
            )}
          </div>
        </div>

        {pendingMatches.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            {status === 'active' ? 'All matches in current round are completed.' : 'Start the tournament to generate matches.'}
          </p>
        ) : (
          <div className="grid gap-4">
            {pendingMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                players={players.filter(p => p.active)}
                getPlayerName={getPlayerName}
                onSave={(s1: number, s2: number) => updateScore(match.id, s1, s2)}
                onSwap={swapMatchPlayer}
              />
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
                        <div style={{ fontWeight: match.score1! > match.score2! ? 600 : 400, color: match.score1! > match.score2! ? 'var(--accent-primary)' : 'inherit' }}>
                          {getPlayerName(match.team1[0])} & {getPlayerName(match.team1[1])}
                        </div>
                        <div style={{ fontWeight: match.score2! > match.score1! ? 600 : 400, color: match.score2! > match.score1! ? 'var(--accent-primary)' : 'inherit' }}>
                          {getPlayerName(match.team2[0])} & {getPlayerName(match.team2[1])}
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

function MatchCard({ match, players, onSave, onSwap }: any) {
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
            {p.name}
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
