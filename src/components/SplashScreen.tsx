import { useApp } from '@/contexts/AppContext';

export default function SplashScreen() {
  const { config, configLoaded } = useApp();

  if (!configLoaded) {
    return (
      <div className="pa-splash">
        <div className="pa-splash-logo">
          <div className="pa-splash-mark" style={{ background: 'var(--pa-acc)' }}>
            <svg viewBox="0 0 36 36" fill="none" width={36} height={36}>
              <rect x="6" y="14" width="24" height="16" rx="3" stroke="#fff" strokeWidth="2.5" />
              <path d="M10 14V10a8 8 0 0116 0v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="18" cy="22" r="2.5" fill="#fff" />
              <path d="M18 24.5V27" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <div className="pa-splash-loader" />
      </div>
    );
  }

  return (
    <div className="pa-splash">
      <div className="pa-splash-logo">
        <div className="pa-splash-mark" style={{ background: 'var(--pa-acc)' }}>
          {config.logo ? (
            <img src={config.logo} style={{ width: 50, height: 50, objectFit: 'contain' }} alt="Logo" />
          ) : (
            <svg viewBox="0 0 36 36" fill="none" width={36} height={36}>
              <rect x="6" y="14" width="24" height="16" rx="3" stroke="#fff" strokeWidth="2.5" />
              <path d="M10 14V10a8 8 0 0116 0v4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="18" cy="22" r="2.5" fill="#fff" />
              <path d="M18 24.5V27" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div className="pa-splash-name">{config.appName}</div>
        <div className="pa-splash-sub">{config.subdiv}</div>
      </div>
      <div className="pa-splash-loader" />
    </div>
  );
}
