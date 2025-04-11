// src/pages/GitHubCallback.tsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

export default function GitHubCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const id = params.get('id');
    const name = params.get('name');

    if (token && id) {
      // ✅ Set cookies for auth
      Cookies.set('authToken', token);
      Cookies.set('userId', id);
      Cookies.set('username', name || '');

      // ✅ Redirect to actual dashboard (no query)
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [location, navigate]);

  return <p>Logging you in with GitHub...</p>;
}
