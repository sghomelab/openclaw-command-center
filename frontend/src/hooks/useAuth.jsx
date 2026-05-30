import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const stored = localStorage.getItem('user');
    if (token && stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          setUser(parsed);
        }
      } catch {}
      api.get('/auth/me').then(r => {
        if (r.data && r.data.id) {
          setUser(r.data);
          localStorage.setItem('user', JSON.stringify(r.data));
        } else {
          localStorage.clear();
          setUser(null);
        }
      }).catch(() => {
        localStorage.clear();
        setUser(null);
      });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (!data || !data.access_token) throw new Error('Invalid login response');
    localStorage.setItem('token', data.access_token);
    const me = await api.get('/auth/me');
    if (!me.data || !me.data.id) throw new Error('Unable to load user profile');
    localStorage.setItem('user', JSON.stringify(me.data));
    setUser(me.data);
    return me.data;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    window.location.hash = '#/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
