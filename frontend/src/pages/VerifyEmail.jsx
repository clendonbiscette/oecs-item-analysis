import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Alert,
} from '@mui/material';
import { verifyEmail } from '../services/api';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await verifyEmail(token);
        setEmail(response.data.email);
        setStatus('success');
      } catch (err) {
        const errorData = err.response?.data;
        setError(errorData?.error || 'Verification failed');
        setStatus('error');
      }
    };

    if (token) {
      verify();
    } else {
      setError('No verification token provided');
      setStatus('error');
    }
  }, [token]);

  if (status === 'verifying') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          background: 'linear-gradient(135deg, #fafbfc 0%, #f8fafc 50%, #f1f5f9 100%)',
        }}
      >
        <Container component="main" maxWidth="sm" sx={{ display: 'flex', alignItems: 'center' }}>
          <Paper
            elevation={0}
            sx={{
              p: 5,
              width: '100%',
              boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
              textAlign: 'center',
            }}
          >
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Verifying Your Email...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please wait while we verify your email address
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (status === 'success') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          background: 'linear-gradient(135deg, #fafbfc 0%, #f8fafc 50%, #f1f5f9 100%)',
        }}
      >
        <Container component="main" maxWidth="sm" sx={{ display: 'flex', alignItems: 'center' }}>
          <Paper
            elevation={0}
            sx={{
              p: 5,
              width: '100%',
              boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              {/* Success Icon */}
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <Typography variant="h2" sx={{ color: 'white' }}>
                  ✓
                </Typography>
              </Box>

              <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
                Email Verified Successfully!
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Your email <strong>{email}</strong> has been verified.
              </Typography>

              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>What's Next?</strong>
                </Typography>
                <Typography variant="body2">
                  Your account is now pending admin approval. An administrator will review your
                  registration and you will receive an email notification once your access has been
                  approved.
                </Typography>
                <Typography variant="body2" sx={{ mt: 2, fontWeight: 600 }}>
                  This typically takes 1-2 business days.
                </Typography>
              </Alert>

              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                size="large"
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2.5,
                }}
              >
                Back to Login
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Error state
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #fafbfc 0%, #f8fafc 50%, #f1f5f9 100%)',
      }}
    >
      <Container component="main" maxWidth="sm" sx={{ display: 'flex', alignItems: 'center' }}>
        <Paper
          elevation={0}
          sx={{
            p: 5,
            width: '100%',
            boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            {/* Error Icon */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <Typography variant="h2" sx={{ color: 'white' }}>
                ×
              </Typography>
            </Box>

            <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
              Verification Failed
            </Typography>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {error}
            </Alert>

            {error.includes('expired') && (
              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2">
                  Your verification link has expired. Verification links are valid for 24 hours.
                  Please request a new verification email from the login page.
                </Typography>
              </Alert>
            )}

            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                size="large"
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2.5,
                }}
              >
                Go to Login
              </Button>
              <Button
                component={Link}
                to="/register"
                variant="outlined"
                fullWidth
                size="large"
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2.5,
                }}
              >
                Register Again
              </Button>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
