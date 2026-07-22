import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../store/tournamentStore';
import { Trophy, Plus, Calendar, Trash2 } from 'lucide-react';

export function HomeScreen() {
  const navigate = useNavigate();
  const [newTournamentName, setNewTournamentName] = useState('');
  const [totalCourts, setTotalCourts] = useState(1);
  const [format, setFormat] = useState<'americano' | 'mexicano'>('americano');
  const [pointsMode, setPointsMode] = useState<'total21' | 'free'>('total21');
  const { tournaments, createTournament, deleteTournament } = useTournamentStore();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTournamentName.trim()) {
      const id = await createTournament(newTournamentName.trim(), totalCourts, format, pointsMode);
      setNewTournamentName('');
      setTotalCourts(1);
      setFormat('americano');
      setPointsMode('total21');
      navigate(`/tournament/${id}`);
    }
  };

  return (
    <div className="container fade-in" style={{ maxWidth: '820px' }}>

      {/* ── Hero ── */}
      <header style={{ textAlign: 'center', marginBottom: 'var(--space-10)', paddingTop: 'var(--space-8)' }}>
        <h1 className="text-gradient" style={{ marginBottom: 'var(--space-2)' }}>
          Baper Pulang Padel
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-lg)' }}>
          Manage your tournaments dynamically
        </p>
      </header>

      {/* ── Create Tournament ── */}
      <div className="glass-card fade-in fade-in-delay-1" style={{ marginBottom: 'var(--space-8)' }}>
        <h2 className="flex items-center gap-2" style={{ marginBottom: 'var(--space-5)' }}>
          <Plus style={{ color: 'var(--accent-primary)' }} size={22} />
          Create New Tournament
        </h2>

        <form onSubmit={handleCreate}>
          {/* Name row */}
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <input
              id="tournament-name-input"
              type="text"
              className="input"
              placeholder="Tournament name, e.g. Summer Cup 2026"
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
            />
          </div>

          {/* Options row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <div>
              <label
                htmlFor="format-select"
                style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}
              >
                Format
              </label>
              <select
                id="format-select"
                className="input"
                value={format}
                onChange={(e) => setFormat(e.target.value as 'americano' | 'mexicano')}
              >
                <option value="americano">Americano</option>
                <option value="mexicano">Mexicano</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="points-select"
                style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}
              >
                Points Mode
              </label>
              <select
                id="points-select"
                className="input"
                value={pointsMode}
                onChange={(e) => setPointsMode(e.target.value as 'total21' | 'free')}
              >
                <option value="total21">Total 21</option>
                <option value="free">Free</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="courts-input"
                style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}
              >
                Courts
              </label>
              <input
                id="courts-input"
                type="number"
                className="input"
                style={{ textAlign: 'center' }}
                min="1"
                value={totalCourts}
                onChange={(e) => setTotalCourts(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          <button
            id="create-tournament-btn"
            type="submit"
            className="btn btn-primary w-full"
            disabled={!newTournamentName.trim()}
          >
            <Plus size={18} />
            Create Tournament
          </button>
        </form>
      </div>

      {/* ── Tournament List ── */}
      <div className="fade-in fade-in-delay-2">
        <h2 className="flex items-center gap-2" style={{ marginBottom: 'var(--space-5)' }}>
          <Trophy style={{ color: 'var(--accent-primary)' }} size={22} />
          Your Tournaments
        </h2>

        {tournaments.length === 0 ? (
          <div className="glass-card empty-state">
            <Trophy size={48} className="empty-state-icon" />
            <p style={{ color: 'var(--text-muted)' }}>No tournaments yet — create one above to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tournaments
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((t, i) => (
                <div
                  key={t.id}
                  className="glass-card clickable fade-in"
                  style={{ padding: 'var(--space-5)', animationDelay: `${i * 0.05}s` }}
                  onClick={() => navigate(`/tournament/${t.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/tournament/${t.id}`)}
                  aria-label={`Open tournament ${t.name}`}
                >
                  {/* Card row layout */}
                  <div className="flex justify-between items-center gap-4">
                    {/* Left: name + meta */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-3" style={{ flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                        <h3 className="truncate" style={{ fontSize: 'var(--font-size-xl)' }}>{t.name}</h3>
                        <span
                          className="flex items-center gap-1"
                          style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)', flexShrink: 0 }}
                        >
                          <Calendar size={13} />
                          {new Date(t.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                        <span className={`badge ${t.status === 'active' ? 'badge-completed' : 'badge-pending'}`}>
                          {t.status}
                        </span>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', border: '1px solid var(--border-light)', textTransform: 'capitalize' }}>
                          {t.format || 'americano'}
                        </span>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-subtle)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {t.pointsMode === 'free' ? 'Free pts' : '21 pts'}
                        </span>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
                          {t.players.filter(p => p.active).length} players
                        </span>
                      </div>
                    </div>

                    {/* Right: delete */}
                    <button
                      id={`delete-tournament-${t.id}`}
                      className="btn btn-danger btn-icon"
                      style={{ flexShrink: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this tournament? This cannot be undone.')) {
                          deleteTournament(t.id);
                        }
                      }}
                      title="Delete Tournament"
                      aria-label={`Delete tournament ${t.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
