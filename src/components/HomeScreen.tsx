import { useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { Trophy, Plus, Calendar, Trash2 } from 'lucide-react';

export function HomeScreen() {
  const [newTournamentName, setNewTournamentName] = useState('');
  const { tournaments, createTournament, setActiveTournament, deleteTournament } = useTournamentStore();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTournamentName.trim()) {
      createTournament(newTournamentName.trim());
      setNewTournamentName('');
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px', paddingTop: '20px' }}>
        <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: '8px' }}>
          Padel Americano
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
          Manage your tournaments dynamically
        </p>
      </header>

      <div className="glass-card" style={{ marginBottom: '32px' }}>
        <h2 className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
          <Plus className="text-gradient" size={24} />
          Create New Tournament
        </h2>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input 
            type="text" 
            className="input" 
            placeholder="Tournament Name (e.g. Summer Cup 2026)" 
            value={newTournamentName}
            onChange={(e) => setNewTournamentName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!newTournamentName.trim()}>
            Create
          </button>
        </form>
      </div>

      <div>
        <h2 className="flex items-center gap-2" style={{ marginBottom: '20px', paddingLeft: '8px' }}>
          <Trophy className="text-gradient" size={24} />
          Your Tournaments
        </h2>

        {tournaments.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center gap-4" style={{ padding: '60px 20px', opacity: 0.8 }}>
            <Trophy size={48} className="text-muted" style={{ opacity: 0.2 }} />
            <p style={{ color: 'var(--text-muted)' }}>No tournaments found. Create one above to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tournaments.map(t => (
              <div 
                key={t.id} 
                className="glass-card flex justify-between items-center" 
                style={{ cursor: 'pointer', padding: '20px', transition: 'all 0.2s ease' }}
                onClick={() => setActiveTournament(t.id)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{t.name}</h3>
                  <div className="flex items-center gap-4 text-muted" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`badge ${t.status === 'active' ? 'badge-completed' : 'badge-pending'}`}>
                      {t.status.toUpperCase()}
                    </span>
                    <span>{t.players.filter(p => p.active).length} Players</span>
                  </div>
                </div>

                <button 
                  className="btn btn-danger" 
                  onClick={(e) => {
                    e.stopPropagation(); // prevent opening the tournament
                    if (window.confirm('Are you sure you want to delete this tournament?')) {
                      deleteTournament(t.id);
                    }
                  }}
                  title="Delete Tournament"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
