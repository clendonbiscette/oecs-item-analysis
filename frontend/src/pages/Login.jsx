import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #fafbfc 0%, #f8fafc 50%, #f1f5f9 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative gradient orbs */}
      <Box
        sx={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '40%',
          height: '40%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: '50%',
          height: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
        }}
      />

      <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 5 },
            width: '100%',
            boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* OECS Logo */}
            <Box
              component="img"
              src="/logo.png"
              alt="OECS Logo"
              sx={{
                width: 100,
                height: 'auto',
                mb: 3,
                opacity: 0.95,
              }}
            />

            <Typography
              component="h1"
              variant="h4"
              sx={{
                mb: 1,
                fontWeight: 700,
                color: 'text.primary',
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
              Welcome back
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 4,
                textAlign: 'center',
                fontWeight: 400,
              }}
            >
              Sign in to access the Item Analysis Platform
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{
                  width: '100%',
                  mb: 3,
                  borderRadius: 2.5,
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                sx={{ mb: 3 }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2.5,
                }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>

              <Box
                sx={{
                  mt: 4,
                  p: 2.5,
                  backgroundColor: 'rgba(99, 102, 241, 0.04)',
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'rgba(99, 102, 241, 0.1)',
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 1,
                  }}
                >
                  Demo Credentials
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    color: 'primary.main',
                    fontFamily: 'monospace',
                  }}
                >
                  admin@oecs.org / admin123
                </Typography>
              </Box>
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                mt: 4,
                textAlign: 'center',
                fontSize: '0.75rem',
              }}
            >
              © 2025 OECS Commission - Education Sector
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
