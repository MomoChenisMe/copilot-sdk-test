import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from 'lucide-react';

interface LoginPageProps {
  onLogin: (password: string) => Promise<void>;
  error?: string | null;
}

export function LoginPage({ onLogin, error }: LoginPageProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    try {
      await onLogin(password);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-full bg-bg-primary">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm mx-4 p-8 rounded-2xl bg-bg-secondary border border-border shadow-lg"
      >
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent-soft flex items-center justify-center">
            <Terminal size={28} className="text-accent" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-text-primary mb-1 text-center">{t('login.title')}</h1>
        <p className="text-sm text-text-secondary mb-6 text-center">{t('login.subtitle')}</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error/10 text-error text-sm">{error}</div>
        )}

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('login.password')}
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-bg-input border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />

        <button
          type="submit"
          disabled={!password || loading}
          className="w-full mt-4 px-4 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? t('login.loggingIn') : t('login.login')}
        </button>
      </form>
    </div>
  );
}
