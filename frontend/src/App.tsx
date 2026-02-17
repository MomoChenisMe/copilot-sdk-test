import { useTranslation } from 'react-i18next';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './components/auth/LoginPage';
import { AppShell } from './components/layout/AppShell';
import { LightboxProvider } from './components/shared/LightboxContext';

export function App() {
  const { t } = useTranslation();
  const { authenticated, error, login, logout } = useAuth();

  // Loading state
  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-primary text-text-secondary">
        {t('app.loading')}
      </div>
    );
  }

  // Not authenticated — show login
  if (!authenticated) {
    return <LoginPage onLogin={login} error={error} />;
  }

  // Authenticated — show main app
  return (
    <LightboxProvider>
      <AppShell onLogout={logout} />
    </LightboxProvider>
  );
}
