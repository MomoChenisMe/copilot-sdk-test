import { useState, useEffect, useCallback } from 'react';
import { apiPost, apiGet, apiDelete, ApiError } from '../lib/api';

interface AuthState {
  authenticated: boolean | null; // null = loading
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    authenticated: null,
    error: null,
  });

  const checkStatus = useCallback(async () => {
    try {
      const data = await apiGet<{ authenticated: boolean }>('/api/auth/status');
      setState({ authenticated: data.authenticated, error: null });
    } catch {
      setState({ authenticated: false, error: null });
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const login = useCallback(async (password: string) => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      await apiPost('/api/auth/login', { password });
      setState({ authenticated: true, error: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '登入失敗';
      setState({ authenticated: false, error: message });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiDelete('/api/auth/logout');
    } finally {
      setState({ authenticated: false, error: null });
    }
  }, []);

  return {
    authenticated: state.authenticated,
    error: state.error,
    login,
    logout,
    checkStatus,
  };
}
