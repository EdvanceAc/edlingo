import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
    }
    
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    
    const { error } = await signInWithGoogle();
    
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="uiverse-login">
      <div className="login-wrap">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="login-card">
            <div className="avatar">EL</div>
            <div className="title">Welcome Back</div>
            <div className="subtitle">Sign in to continue your learning journey</div>

            {error && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="error">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <Mail className="icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="input"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="field">
                <Lock className="icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="toggle-btn"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="links">
                <Link to="/auth/forgot-password" className="link">Forgot password?</Link>
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner className="w-4 h-4" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            <button
              type="button"
              className="oauth-btn google-btn"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              aria-label="Continue with Google"
            >
              <span className="google-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#fbc02d" d="M43.6 20.5H42V20H24v8h11.3C33.4 32.9 29.1 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.7 3l5.7-5.7C34.2 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20c10.2 0 19-7.3 19.8-17c.1-.7.2-1.5.2-2.2c0-1.2-.2-2.4-.4-3.5z"/>
                  <path fill="#e53935" d="M6.3 14.7l6.6 4.8C14 16.2 18.6 12 24 12c3 0 5.7 1.1 7.7 3l5.7-5.7C34.2 6.1 29.4 4 24 4C16.9 4 10.5 8.1 6.3 14.7z"/>
                  <path fill="#4caf50" d="M24 44c5 0 9.6-1.9 13.1-5l-6-4.9C29.3 35.7 26.8 36 24 36c-5 0-9.3-3.1-11.1-7.4l-6.6 5.1C10.5 40 16.9 44 24 44z"/>
                  <path fill="#1565c0" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.9-6.5 8-11.3 8c-5 0-9.3-3.1-11.1-7.4l-6.6 5.1C10.5 40 16.9 44 24 44c10.2 0 19-7.3 19.8-17c.1-.7.2-1.5.2-2.2c0-1.2-.2-2.4-.4-3.5z"/>
                </svg>
              </span>
              <span>Continue with Google</span>
            </button>

            <div className="footer">
              <span>
                Don't have an account?{' '}
                <Link to="/auth/signup" className="link">Sign up</Link>
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;