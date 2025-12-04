import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  FormHelperText,
  MenuItem,
} from '@mui/material';
import { registerUser, getMemberStates } from '../services/api';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'analyst', // Default role - admin can change during approval
    country: '',
  });
  const [memberStates, setMemberStates] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch OECS member states on component mount
  useEffect(() => {
    const fetchMemberStates = async () => {
      try {
        const response = await getMemberStates();
        setMemberStates(response.data);
      } catch (err) {
        console.error('Failed to load member states:', err);
      }
    };
    fetchMemberStates();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    const { password } = formData;
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 25, label: 'Weak', color: 'error' };
    if (score === 3) return { score: 50, label: 'Fair', color: 'warning' };
    if (score === 4) return { score: 75, label: 'Good', color: 'primary' };
    return { score: 100, label: 'Strong', color: 'success' };
  };

  const passwordStrength = getPasswordStrength();

  const validateForm = () => {
    const { email, password, confirmPassword, fullName } = formData;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }

    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }

    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    // Full name validation
    if (!fullName.trim()) {
      setError('Full name is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await registerUser({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role, // Will be 'analyst' by default
        country: formData.country || undefined, // Optional country
      });

      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
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
                Check Your Email
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                We've sent a verification link to <strong>{formData.email}</strong>
              </Typography>

              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Next Steps:</strong>
                </Typography>
                <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
                  <li>Check your email inbox (and spam folder)</li>
                  <li>Click the verification link (valid for 24 hours)</li>
                  <li>Wait for admin approval (typically 1-2 business days)</li>
                  <li>You'll receive an email when your account is approved</li>
                </Typography>
              </Alert>

              <Button
                component={Link}
                to="/login"
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
              >
                Back to Login
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #fafbfc 0%, #f8fafc 50%, #f1f5f9 100%)',
        py: 6,
      }}
    >
      <Container component="main" maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 5 },
            width: '100%',
            boxShadow: '0 4px 20px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Box
              component="img"
              src="/logo.png"
              alt="OECS Logo"
              sx={{
                width: 80,
                height: 'auto',
                mb: 2,
                opacity: 0.95,
              }}
            />
            <Typography
              component="h1"
              variant="h4"
              sx={{ fontWeight: 700, mb: 1 }}
            >
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Register for access to OECS Assessment Item Analysis
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              label="Full Name"
              name="fullName"
              autoComplete="name"
              value={formData.fullName}
              onChange={handleChange}
              disabled={loading}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />

            {formData.password && (
              <Box sx={{ mt: 1, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Password Strength
                  </Typography>
                  <Typography variant="caption" color={`${passwordStrength.color}.main`}>
                    {passwordStrength.label}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength.score}
                  color={passwordStrength.color}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <FormHelperText>
                  Must contain: 8+ characters, uppercase, lowercase, and number
                </FormHelperText>
              </Box>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />

            <TextField
              margin="normal"
              fullWidth
              select
              label="Country (Optional)"
              name="country"
              value={formData.country}
              onChange={handleChange}
              disabled={loading}
              helperText="Select your OECS member state"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {memberStates.map((state) => (
                <MenuItem key={state.id} value={state.id}>
                  {state.state_name}
                </MenuItem>
              ))}
            </TextField>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2.5,
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
            </Button>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link
                  to="/login"
                  style={{
                    color: '#6366f1',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 3,
            textAlign: 'center',
            display: 'block',
            fontSize: '0.75rem',
          }}
        >
          © {new Date().getFullYear()} OECS Assessment Item Analysis
        </Typography>
      </Container>
    </Box>
  );
}
