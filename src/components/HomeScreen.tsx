import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../store/tournamentStore';
import { Trophy, Plus, Calendar, Trash2, ChevronDown } from 'lucide-react';
import { APP_VERSION } from '../lib/version';
import { ThemeToggle } from './ThemeToggle';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-shadow focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500';

const selectWrapCls = 'relative';
const selectCls =
  'w-full appearance-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 transition-shadow focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

const fieldLabelCls =
  'mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400';

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabelCls}>
        {label}
      </label>
      <div className={selectWrapCls}>
        <select
          id={id}
          className={selectCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

export function HomeScreen() {
  const navigate = useNavigate();
  const [newTournamentName, setNewTournamentName] = useState('');
  const [totalCourts, setTotalCourts] = useState(1);
  const [format, setFormat] = useState<'americano' | 'mexicano'>('americano');
  const [pointsMode, setPointsMode] = useState<'total21' | 'default'>('total21');
  const [partnerMode, setPartnerMode] = useState<'fixed' | 'rotating'>('rotating');
  const { tournaments, createTournament, deleteTournament, loadMoreTournaments, hasMoreTournaments, isLoadingMore } = useTournamentStore();

  useEffect(() => {
    useTournamentStore.getState().fetchTournaments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTournamentName.trim()) {
      const id = await createTournament(newTournamentName.trim(), totalCourts, format, pointsMode, partnerMode);
      setNewTournamentName('');
      setTotalCourts(1);
      setFormat('americano');
      setPointsMode('total21');
      setPartnerMode('rotating');
      navigate(`/tournament/${id}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10 fade-in">
      {/* ── Top bar: brand + version + theme toggle ── */}
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Trophy size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Baper Pulang Padel
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage your tournaments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            v{APP_VERSION}
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Create Tournament ── */}
      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Plus size={18} className="text-emerald-600" />
          Create New Tournament
        </h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <input
              id="tournament-name-input"
              type="text"
              className={inputCls}
              placeholder="Tournament name, e.g. Summer Cup 2026"
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              id="format-select"
              label="Format"
              value={format}
              onChange={(v) => setFormat(v as 'americano' | 'mexicano')}
              options={[
                { value: 'americano', label: 'Americano' },
                { value: 'mexicano', label: 'Mexicano' },
              ]}
            />
            <Select
              id="points-select"
              label="Points Mode"
              value={pointsMode}
              onChange={(v) => setPointsMode(v as 'total21' | 'default')}
              options={[
                { value: 'total21', label: 'Total 21' },
                { value: 'default', label: 'Default (Tennis)' },
              ]}
            />
            <div>
              <label htmlFor="courts-input" className={fieldLabelCls}>
                Courts
              </label>
              <input
                id="courts-input"
                type="number"
                className={`${inputCls} text-center`}
                min="1"
                value={totalCourts}
                onChange={(e) => setTotalCourts(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <Select
              id="partner-select"
              label="Partner"
              value={partnerMode}
              onChange={(v) => setPartnerMode(v as 'fixed' | 'rotating')}
              options={[
                { value: 'rotating', label: 'Rotating' },
                { value: 'fixed', label: 'Fixed' },
              ]}
            />
          </div>

          <button
            id="create-tournament-btn"
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!newTournamentName.trim()}
          >
            <Plus size={18} />
            Create Tournament
          </button>
        </form>
      </section>

      {/* ── Tournament List ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Trophy size={18} className="text-emerald-600" />
          Your Tournaments
        </h2>

        {tournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-transparent px-6 py-14 text-center dark:border-slate-700">
            <Trophy size={40} className="text-slate-300 dark:text-slate-700" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No tournaments yet — create one above to get started!
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tournaments
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((t, i) => (
                <li
                  key={t.id}
                  className="group flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => navigate(`/tournament/${t.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/tournament/${t.id}`)}
                  aria-label={`Open tournament ${t.name}`}
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-3">
                      <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                        {t.name}
                      </h3>
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                        <Calendar size={13} />
                        {new Date(t.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
                          t.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                        }`}
                      >
                        {t.status}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t.format || 'americano'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {t.pointsMode === 'default' ? 'Default pts' : '21 pts'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 font-medium capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {(t.partnerMode || 'rotating') === 'fixed' ? 'Fixed' : 'Rotating'}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">
                        {t.players.filter((p) => p.active).length} players
                      </span>
                    </div>
                  </div>

                  <button
                    id={`delete-tournament-${t.id}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-slate-500"
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
                </li>
              ))}
          </ul>
        )}

        {tournaments.length > 0 && hasMoreTournaments && (
          <div className="mt-6 text-center">
            <button
              id="load-more-tournaments-btn"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={loadMoreTournaments}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading…' : 'Load More'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
