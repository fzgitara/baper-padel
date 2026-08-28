import { useRegisterSW } from 'virtual:pwa-register/react';
import { APP_VERSION } from '../lib/version';
import { RefreshCw } from 'lucide-react';

/**
 * Menampilkan banner saat versi baru tersedia pada Service Worker (PWA),
 * dengan tombol "Hard Reload" yang mengaktifkan SW yang menunggu lalu me-reload
 * ke aset baru. Tidak mengubah logika aplikasi apa pun.
 */
export function VersionGate() {
  const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW();

  const hasNewVersion = needRefresh[0];
  const isOfflineReady = offlineReady[0];

  const hardReload = () => {
    // true → skipWaiting + reload ke versi terbaru
    updateServiceWorker(true);
  };

  if (!hasNewVersion && !isOfflineReady) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-lg">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {hasNewVersion
            ? `Versi baru tersedia (v${APP_VERSION})`
            : 'Siap dipakai offline'}
        </span>
        {hasNewVersion && (
          <button
            onClick={hardReload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            <RefreshCw size={14} />
            Hard Reload
          </button>
        )}
      </div>
    </div>
  );
}
