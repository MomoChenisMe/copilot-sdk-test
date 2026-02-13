import { useAuth } from './hooks/useAuth';
import { LoginPage } from './components/auth/LoginPage';
import { AppShell } from './components/layout/AppShell';

export function App() {
  const { authenticated, error, login, logout } = useAuth();

  // Loading state
  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-primary text-text-secondary">
        載入中...
      </div>
    );
  }

  // Not authenticated — show login
  if (!authenticated) {
    return <LoginPage onLogin={login} error={error} />;
  }

  // Authenticated — show main app
  return <AppShell onLogout={logout} />;
}
