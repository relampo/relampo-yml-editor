import { useEffect, useState } from 'react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const MIN_SUPPORTED_WIDTH = 768;
const QUERY = `(max-width: ${MIN_SUPPORTED_WIDTH - 1}px)`;

function getInitialMatch(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(QUERY).matches;
}

function getInitialWidth(): number {
  if (typeof window === 'undefined') return MIN_SUPPORTED_WIDTH;
  return window.innerWidth;
}

export function MobileBlockOverlay() {
  const { t } = useLanguage();
  const [tooSmall, setTooSmall] = useState(getInitialMatch);
  const [width, setWidth] = useState(getInitialWidth);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setTooSmall(e.matches);
    const onResize = () => setWidth(window.innerWidth);
    mql.addEventListener('change', onChange);
    window.addEventListener('resize', onResize);
    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  if (!tooSmall) return null;

  const currentWidth = t('mobileBlock.currentWidth').replace('{width}', String(width));

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="mobile-block-title"
      className="fixed inset-0 z-2147483647 flex items-center justify-center overflow-hidden bg-[#0a0a0a] px-6 py-10"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(250,204,21,0.18),transparent_55%),radial-gradient(circle_at_75%_80%,rgba(244,63,94,0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)]" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111111]/95 p-8 text-center shadow-2xl shadow-black/60 backdrop-blur-sm animate-[fadeInUp_400ms_ease-out]">
        <div className="mx-auto mb-6 flex items-center justify-center gap-3">
          <DeviceTile icon={<Smartphone className="h-6 w-6" />} disabled label="Phone" />
          <span className="text-white/30">→</span>
          <DeviceTile icon={<Tablet className="h-7 w-7" />} highlight label="iPad" />
          <span className="text-white/30">→</span>
          <DeviceTile icon={<Monitor className="h-7 w-7" />} highlight label="Desktop" />
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-yellow-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-300" />
          </span>
          {t('mobileBlock.eyebrow')}
        </div>

        <h2 id="mobile-block-title" className="mb-3 text-xl font-bold leading-tight text-white sm:text-2xl">
          {t('mobileBlock.title')}
        </h2>

        <p className="mb-4 text-sm leading-relaxed text-white/70">{t('mobileBlock.description')}</p>

        <p className="mb-5 text-sm font-medium text-white/85">{t('mobileBlock.requirement')}</p>

        <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 font-mono text-xs text-white/60">
          <div className="mb-1 flex items-center justify-between">
            <span>{currentWidth}</span>
            <span className="text-yellow-300/80">/ {MIN_SUPPORTED_WIDTH}px</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-linear-to-r from-rose-500 via-amber-400 to-yellow-300 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, (width / MIN_SUPPORTED_WIDTH) * 100)}%` }}
            />
          </div>
        </div>

        <p className="mt-5 text-xs text-white/45">{t('mobileBlock.rotateHint')}</p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

interface DeviceTileProps {
  icon: React.ReactNode;
  label: string;
  highlight?: boolean;
  disabled?: boolean;
}

function DeviceTile({ icon, label, highlight, disabled }: DeviceTileProps) {
  const base =
    'flex h-14 w-14 flex-col items-center justify-center rounded-xl border transition-colors';
  const classes = disabled
    ? `${base} border-rose-500/40 bg-rose-500/10 text-rose-300/70`
    : highlight
      ? `${base} border-yellow-300/40 bg-yellow-300/10 text-yellow-200 shadow-[0_0_24px_rgba(250,204,21,0.18)]`
      : `${base} border-white/10 bg-white/5 text-white/60`;
  return (
    <div className={classes} aria-label={label}>
      {icon}
    </div>
  );
}
