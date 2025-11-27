import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutes for large file processing
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const loginUser = (email, password) => {
  return api.post('/auth/login', { email, password });
};

export const registerUser = (data) => {
  return api.post('/auth/register', data);
};

// Assessments
export const getAssessments = () => {
  return api.get('/assessments');
};

export const getAssessment = (id) => {
  return api.get(`/assessments/${id}`);
};

export const deleteAssessment = (id) => {
  return api.delete(`/assessments/${id}`);
};

export const validateFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/assessments/upload/validate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadAssessment = (file, assessmentName, assessmentYear, country) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('assessmentName', assessmentName);
  formData.append('assessmentYear', assessmentYear);
  formData.append('country', country);
  return api.post('/assessments/upload/confirm', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const splitRegionalAssessment = (assessmentId) => {
  return api.post(`/assessments/${assessmentId}/split`);
};

export const downloadTemplate = () => {
  return api.get('/assessments/template/download', {
    responseType: 'blob',
  });
};

export const exportToExcel = (assessmentId) => {
  return api.get(`/assessments/${assessmentId}/export/excel`, {
    responseType: 'blob',
  });
};

export const generatePDFReport = (assessmentId, reportType = 'test-summary') => {
  return api.post('/reports/generate',
    { assessmentId, reportType },
    { responseType: 'blob' }
  );
};

// Member States
export const getMemberStates = () => {
  return api.get('/member-states');
};

export const getMemberState = (id) => {
  return api.get(`/member-states/${id}`);
};

export const getMemberStateAssessments = (id) => {
  return api.get(`/member-states/${id}/assessments`);
};

// Users (Admin only)
export const getUsers = () => {
  return api.get('/users');
};

export const getUser = (id) => {
  return api.get(`/users/${id}`);
};

export const createUser = (userData) => {
  return api.post('/users', userData);
};

export const updateUser = (id, userData) => {
  return api.put(`/users/${id}`, userData);
};

export const updateUserPassword = (id, newPassword) => {
  return api.put(`/users/${id}/password`, { newPassword });
};

export const deleteUser = (id) => {
  return api.delete(`/users/${id}`);
};

// Statistics
export const getStatistics = (assessmentId) => {
  return api.get(`/statistics/${assessmentId}`);
};

export const getItemDistractors = (assessmentId, itemId) => {
  return api.get(`/statistics/${assessmentId}/items/${itemId}/distractors`);
};

export const getStudents = (assessmentId) => {
  return api.get(`/statistics/${assessmentId}/students`);
};

export const getScoreDistribution = (assessmentId, country = null) => {
  const params = country ? { country } : {};
  return api.get(`/statistics/${assessmentId}/score-distribution`, { params });
};

export const getGenderAnalysis = (assessmentId) => {
  return api.get(`/statistics/${assessmentId}/gender-analysis`);
};

export const getContentDomainAnalysis = (assessmentId) => {
  return api.get(`/statistics/${assessmentId}/content-domain-analysis`);
};

export const getDistractorAnalysis = (assessmentId) => {
  return api.get(`/statistics/${assessmentId}/distractors`);
};

export const getStudentContentDomains = (assessmentId, studentId) => {
  return api.get(`/statistics/${assessmentId}/students/${studentId}/content-domains`);
};

export const getAvailableCountries = (assessmentId) => {
  return api.get(`/statistics/${assessmentId}/countries`);
};

// Comparisons
export const getYearOverYearComparison = (countryId, years) => {
  return api.get('/comparisons/year-over-year', {
    params: { countryId, years }
  });
};

export const getCrossCountryComparison = (year, countryIds) => {
  return api.get('/comparisons/cross-country', {
    params: { year, countryIds }
  });
};

export const getTrends = (countryId, startYear, endYear) => {
  return api.get('/comparisons/trends', {
    params: { countryId, startYear, endYear }
  });
};

export const getAvailableYears = (countryId) => {
  return api.get('/comparisons/available-years', {
    params: { countryId }
  });
};

// Audit Logs (Admin only)
export const getAuditLogs = (params) => {
  return api.get('/audit-logs', { params });
};

export const getAuditLogStats = (startDate, endDate) => {
  return api.get('/audit-logs/stats', {
    params: { startDate, endDate }
  });
};

export const getAuditLog = (id) => {
  return api.get(`/audit-logs/${id}`);
};

export const exportAuditLogs = (params) => {
  return api.get('/audit-logs/export/csv', {
    params,
    responseType: 'blob'
  });
};

export default api;
