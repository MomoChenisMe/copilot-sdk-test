import { useState, useEffect, useCallback } from 'react';
import { apiPost, apiGet, apiDelete, ApiError } from '../lib/api';

interface AuthState {
  authenticated: boolean | null; // null = loading
  error: string | null;
  errorCode?: 'rate_limited' | 'locked';
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    authenticated: null,
    error: null,
    errorCode: undefined,
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
      let message = '登入失敗';
      let code: 'rate_limited' | 'locked' | undefined;
      if (err instanceof ApiError) {
        message = err.message;
        if (err.status === 429) code = 'rate_limited';
        else if (err.status === 423) code = 'locked';
      }
      setState({ authenticated: false, error: message, errorCode: code });
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
    errorCode: state.errorCode,
    login,
    logout,
    checkStatus,
  };
}
