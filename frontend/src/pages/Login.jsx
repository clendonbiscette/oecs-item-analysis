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
        background: 'linear-gradient(135deg, #f0f7ff 0%, #e0f0ff 100%)',
      }}
    >
      <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center' }}>
        <Paper
          elevation={2}
          sx={{
            p: 4,
            width: '100%',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* OECS Logo */}
            <Box
              component="img"
              src="/logo.png"
              alt="OECS Logo"
              sx={{
                width: 120,
                height: 'auto',
                mb: 2,
              }}
            />

            <Typography
              component="h1"
              variant="h5"
              sx={{
                mb: 0.5,
                fontWeight: 600,
                color: 'text.primary',
                textAlign: 'center'
              }}
            >
              Item Analysis Platform
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 3,
                textAlign: 'center'
              }}
            >
              OECS Commission
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{ width: '100%', mb: 2 }}
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
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  backgroundColor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', fontWeight: 500 }}>
                  Demo Credentials
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
                  admin@oecs.org / admin123
                </Typography>
              </Box>
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 3, textAlign: 'center' }}
            >
              © 2025 OECS Commission
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
