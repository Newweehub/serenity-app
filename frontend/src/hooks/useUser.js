import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

// Module-level cache — cleared when invalidateUserCache() is called
let cache = null;
let listeners = [];

// Call this after saving profile to force a fresh fetch everywhere
export function invalidateUserCache() {
  cache = null;
  listeners.forEach(fn => fn());
}

export function useUser() {
  const [user,    setUser]    = useState(cache);
  const [loading, setLoading] = useState(!cache);

  const fetchUser = useCallback(() => {
    setLoading(true);
    api.user.me()
      .then(({ user: u }) => {
        cache = u;
        setUser(u);
        listeners.forEach(fn => fn());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Register as a listener so cache invalidation triggers a re-render
    const refresh = () => {
      if (cache) setUser(cache);
      else fetchUser();
    };
    listeners.push(refresh);

    if (!cache) fetchUser();

    return () => {
      listeners = listeners.filter(fn => fn !== refresh);
    };
  }, [fetchUser]);

  return { user, loading, refetch: fetchUser };
}
