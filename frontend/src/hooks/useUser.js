import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';

let cache = null;

export function useUser() {
  const [user,    setUser]    = useState(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    api.user.me()
      .then(({ user: u }) => { cache = u; setUser(u); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
