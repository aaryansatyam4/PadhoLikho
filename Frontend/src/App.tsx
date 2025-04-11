import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BlogDetail from './pages/BlogDetail';
import GitHubCallback from './github/GitHubCallback';
import OtherUserProfile from './pages/OtherUserProfile';
import Profile from './pages/Profile';
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = !!Cookies.get('authToken');
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/github/callback" element={<GitHubCallback />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
         <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <PrivateRoute>
              <OtherUserProfile />
            </PrivateRoute>
          }
        />

        <Route
          path="/blog/:id"
          element={
            <PrivateRoute>
              <BlogDetail />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;