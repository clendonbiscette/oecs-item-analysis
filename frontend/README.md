# OECS Assessment Item Analysis - Frontend

React application built with Material-UI for OECS Assessment Item Analysis.

## Features

✅ User authentication with JWT  
✅ Responsive Material-UI design  
✅ File upload with drag-and-drop  
✅ Real-time validation feedback  
✅ Interactive dashboards  
✅ Statistical charts (Recharts)  
✅ Item analysis with distractor analysis  
✅ Student list with search and pagination  
✅ Tab-based navigation  

## Tech Stack

- **React 18** - UI library
- **Material-UI (MUI)** - Component library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Vite** - Build tool

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Backend API running on http://localhost:3000

### Installation

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app will start on **http://localhost:5173**

## Project Structure

```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── Layout.jsx           # Main layout with sidebar
│   │   ├── ProtectedRoute.jsx   # Auth guard
│   │   ├── OverviewTab.jsx      # Test statistics view
│   │   ├── ItemsTab.jsx         # Item analysis table
│   │   └── StudentsTab.jsx      # Student list
│   ├── pages/
│   │   ├── Login.jsx            # Login page
│   │   ├── Dashboard.jsx        # Main dashboard
│   │   ├── Upload.jsx           # File upload wizard
│   │   └── Analysis.jsx         # Analysis page with tabs
│   ├── services/
│   │   └── api.js               # API client
│   ├── context/
│   │   └── AuthContext.jsx      # Auth state management
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles
├── package.json
├── vite.config.js
└── index.html
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Pages

### 1. Login (`/login`)
- Email/password authentication
- Default credentials shown
- Error handling
- Redirects to dashboard on success

### 2. Dashboard (`/`)
- Summary statistics cards
- Recent assessments table
- Quick actions
- Delete assessments

### 3. Upload Assessment (`/upload`)
- 4-step wizard:
  1. File selection
  2. Validation results
  3. Assessment details
  4. Processing
- Drag-and-drop file upload
- Real-time validation
- Error and warning display

### 4. Analysis (`/analysis/:id`)
Three tabs:
- **Overview**: Test statistics, reliability, score distribution chart
- **Items**: Item analysis table with distractor analysis modal
- **Students**: Searchable, paginated student list

## Components

### Layout
- Responsive sidebar navigation
- Top app bar with user menu
- Logout functionality
- Mobile-friendly drawer

### OverviewTab
- Test statistics cards
- Cronbach's Alpha display
- Score distribution bar chart
- Interpretation guide

### ItemsTab
- Sortable item statistics table
- Status indicators (good/review/poor)
- Distractor analysis modal
- Color-coded metrics

### StudentsTab
- Paginated student list (25 per page)
- Search by Student ID
- Total scores and rankings
- Configurable rows per page

## API Integration

All API calls are in `src/services/api.js`:

```javascript
import { getAssessments, uploadAssessment, getStatistics } from './services/api';

// Example usage
const assessments = await getAssessments();
const stats = await getStatistics(assessmentId);
```

Authentication token is automatically attached to requests.

## Styling

### Theme
Custom Material-UI theme with OECS colors:
- Primary: Blue (#1976D2)
- Secondary: Green (#388E3C)
- Error: Red (#F44336)
- Warning: Amber (#FFC107)

### Responsive Design
- Mobile-first approach
- Breakpoints: xs, sm, md, lg, xl
- Responsive sidebar
- Stacked cards on mobile

## Development Tips

### Hot Reload
Vite provides instant HMR. Changes appear immediately without refresh.

### API Proxy
Vite dev server proxies `/api` requests to backend:
```javascript
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true
  }
}
```

### Debugging
React DevTools extension recommended for debugging component state.

## Environment Variables

Create `.env` file:
```
VITE_API_URL=http://localhost:3000/api
```

For production, update to your API URL.

## Building for Production

```bash
npm run build
```

Outputs to `dist/` directory. Deploy to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Nginx/Apache

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

**"Network Error" when uploading**
- Check backend is running on port 3000
- Check CORS is enabled in backend
- Verify file size under 10MB

**"Invalid token"**
- Token expired (1 hour)
- Log out and log back in

**Charts not displaying**
- Check Recharts is installed: `npm install recharts`

## Future Enhancements

- PDF report generation
- Excel export
- Print layouts
- Dark mode
- Multi-language support
- Accessibility improvements

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit PR

## License

Proprietary - OECS Assessment Item Analysis
