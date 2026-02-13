import { useState, type FormEvent } from 'react';

interface LoginPageProps {
  onLogin: (password: string) => Promise<void>;
  error?: string | null;
}

export function LoginPage({ onLogin, error }: LoginPageProps) {
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
        className="w-full max-w-sm mx-4 p-6 rounded-xl bg-bg-secondary border border-border"
      >
        <h1 className="text-xl font-bold text-text-primary mb-1">AI Terminal</h1>
        <p className="text-sm text-text-secondary mb-6">請輸入密碼以繼續</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error/10 text-error text-sm">{error}</div>
        )}

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密碼"
          autoFocus
          className="w-full px-4 py-3 rounded-lg bg-bg-input border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
        />

        <button
          type="submit"
          disabled={!password || loading}
          className="w-full mt-4 px-4 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '登入中...' : '登入'}
        </button>
      </form>
    </div>
  );
}
