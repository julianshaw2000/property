# MaintainUK - Frontend Application

Modern Angular frontend for the MaintainUK property maintenance SaaS platform.

## Tech Stack

- **Angular 18** - Latest version with standalone components
- **Angular Material** - Material Design UI components
- **TypeScript** - Strict typing enabled
- **SCSS** - Modern styling with flexbox/grid
- **Signals** - For reactive state management
- **Reactive Forms** - For all form handling

## Project Structure

```
src/
├── app/
│   ├── core/                    # Core services and guards
│   │   ├── services/
│   │   │   ├── api.service.ts   # HTTP API wrapper
│   │   │   └── auth.service.ts  # Authentication service
│   │   ├── guards/
│   │   │   └── auth.guard.ts    # Route protection
│   │   └── interceptors/
│   │       └── auth.interceptor.ts  # JWT injection
│   ├── features/                # Feature modules
│   │   ├── auth/
│   │   │   ├── login/           # Login component
│   │   │   └── register/        # Registration component
│   │   ├── dashboard/           # Dashboard with stats
│   │   ├── tickets/             # Tickets CRUD
│   │   │   ├── services/
│   │   │   ├── ticket-list/
│   │   │   ├── ticket-detail/
│   │   │   └── ticket-form/
│   │   ├── work-orders/         # Work orders module
│   │   ├── quotes/              # Quotes module
│   │   └── invoices/            # Invoices module
│   ├── app.component.ts         # Root component with nav
│   ├── app.routes.ts            # Routing configuration
│   └── app.config.ts            # Application config
├── environments/                # Environment configs
└── styles.scss                  # Global styles

## Features Implemented

### ✅ Authentication
- Login with email/password
- Registration with organization creation
- JWT token management
- Auto-redirect based on auth state
- Refresh token handling

### ✅ Dashboard
- Key metrics overview (New, In Progress, Urgent, Completed)
- Recent tickets list
- Quick action cards
- Responsive grid layout

### ✅ Tickets Module
- **List View**
  - Filterable by status and priority
  - Sortable table view
  - Color-coded status badges
  - Responsive layout
- **Detail View**
  - Full ticket information
  - Timeline of events
  - Update ticket form
  - Delete functionality
- **Create Form**
  - All ticket fields
  - Category and priority selection
  - Optional reporter information
  - Validation

### ✅ Navigation
- Sidebar navigation with Material Design
- Top toolbar with user menu
- Logout functionality
- Active route highlighting
- Mobile-responsive

### ⏳ Coming Soon
- Work Orders management
- Quotes handling
- Invoice tracking
- Real-time notifications
- File uploads for tickets
- Advanced filtering & search

## Development

### Start Dev Server

```bash
npm start
# or
ng serve
```

Application will be available at `http://localhost:4200`

### Build for Production

```bash
npm run build:prod
```

Output will be in `dist/maintainuk-web/`

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Environment Configuration

### Development (`environment.ts`)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api/v1'
};
```

### Production (`environment.prod.ts`)

```typescript
export const environment = {
  production: true,
  apiUrl: '/api/v1'  // Update to your production API URL
};
```

## API Integration

The frontend integrates with the .NET backend API via:

- **ApiService**: Generic HTTP wrapper with response envelope handling
- **AuthService**: Authentication flows and token management
- **AuthInterceptor**: Automatic JWT injection in requests
- **AuthGuard**: Route protection for authenticated routes

### API Response Format

All API responses follow this envelope:

```typescript
interface ApiResponse<T> {
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  traceId: string;
}
```

## Styling Guide

### Material Theme
- Primary: Indigo
- Accent: Pink
- Warn: Red
- Using prebuilt indigo-pink theme

### Component Styles
- Component-scoped SCSS
- Flexbox and Grid layouts
- No `!important` unless necessary
- Responsive breakpoints

### Color Palette
- Status colors:
  - New/Open: Blue (#2196f3)
  - Assigned/In Progress: Orange (#ff9800)
  - Resolved/Closed: Green (#4caf50)
- Priority colors:
  - Routine: Green
  - Urgent: Orange
  - Emergency: Red

## State Management

Using Angular Signals for reactive state:

```typescript
// Example in AuthService
isAuthenticated = signal(false);
userId = signal<string | null>(null);
```

Benefits:
- Fine-grained reactivity
- Better performance than Zone.js
- Type-safe
- Easy to use

## Routing

All routes use lazy loading for optimal performance:

```typescript
{
  path: 'tickets',
  canActivate: [authGuard],
  loadComponent: () => import('./features/tickets/ticket-list/ticket-list.component')
}
```

## Best Practices

1. **Standalone Components**: All components are standalone (no NgModules)
2. **OnPush Change Detection**: Use where applicable for performance
3. **Reactive Forms**: All forms use Reactive Forms API
4. **Type Safety**: Strict TypeScript enabled
5. **Lazy Loading**: Feature modules loaded on-demand
6. **Single Responsibility**: Small, focused components
7. **Dependency Injection**: Use `inject()` function
8. **Signals**: Prefer signals over BehaviorSubject for UI state

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Optimization

- Lazy-loaded routes
- OnPush change detection
- Signals for fine-grained updates
- Minimal bundle sizes through tree-shaking
- AOT compilation in production

## Accessibility

- WCAG AA compliant
- Proper ARIA labels
- Keyboard navigation
- Screen reader friendly
- High contrast support

## Known Issues

- Bundle size warnings (expected with Material Design)
- Some placeholder components (work orders, quotes, invoices)

## Next Steps

1. Implement Work Orders UI
2. Add Quotes management
3. Build Invoice tracking
4. Add file upload for tickets
5. Implement real-time notifications
6. Add advanced search and filtering
7. Create admin panel
8. Add user management UI

