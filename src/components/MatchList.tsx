import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Swords, Check, Play } from 'lucide-react';

export function MatchList() {
  const { tournaments, activeTournamentId, updateScore, generateNextRound } = useTournamentStore();
  const activeTournament = tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament) return null;
  const { matches, players, status } = activeTournament;

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unknown';

  const pendingMatches = matches.filter(m => m.status === 'pending');
  const completedMatches = [...matches].filter(m => m.status === 'completed').reverse(); // show newest first

  const allPendingCompleted = pendingMatches.length === 0 && matches.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card">
        <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
          <h2 className="flex items-center gap-2">
            <Swords className="text-gradient" size={24} />
            Pending Matches
          </h2>
          
          {allPendingCompleted && status === 'active' && (
            <button className="btn btn-primary" onClick={generateNextRound}>
              <Play size={16} />
              Generate Next Round
            </button>
          )}
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
                getPlayerName={getPlayerName} 
                onSave={(s1: number, s2: number) => updateScore(match.id, s1, s2)} 
              />
            ))}
          </div>
        )}
      </div>

      {completedMatches.length > 0 && (
        <div className="glass-card" style={{ opacity: 0.8 }}>
          <h2 style={{ marginBottom: '20px', fontSize: '1.2rem' }}>Completed Matches</h2>
          <div className="grid gap-4">
            {completedMatches.map(match => (
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
      )}
    </div>
  );
}

function MatchCard({ match, getPlayerName, onSave }: any) {
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');

  const handleSave = () => {
    const num1 = parseInt(s1, 10);
    const num2 = parseInt(s2, 10);
    if (!isNaN(num1) && !isNaN(num2)) {
      onSave(num1, num2);
    }
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
          <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{getPlayerName(match.team1[0])}</div>
          <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{getPlayerName(match.team1[1])}</div>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-2">
          <input 
            type="number" 
            className="input" 
            style={{ width: '60px', textAlign: 'center', fontSize: '1.2rem', padding: '8px' }}
            value={s1}
            onChange={e => setS1(e.target.value)}
            min="0"
          />
          <span style={{ color: 'var(--text-muted)' }}>-</span>
          <input 
            type="number" 
            className="input" 
            style={{ width: '60px', textAlign: 'center', fontSize: '1.2rem', padding: '8px' }}
            value={s2}
            onChange={e => setS2(e.target.value)}
            min="0"
          />
        </div>

        {/* Team 2 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{getPlayerName(match.team2[0])}</div>
          <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{getPlayerName(match.team2[1])}</div>
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
