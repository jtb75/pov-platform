# PoV Platform Frontend

This directory contains the React-based frontend for the PoV Platform.

## Component Architecture

The frontend is structured into global components that define the overall layout and page-specific components that render the main content.

### Global Components

These components provide the core structure, navigation, and authentication for the application.

| File | Description |
| :--- | :--- |
| **`Root.tsx`** | The top-level component that fetches the Google OAuth client ID and wraps the application in the `GoogleOAuthProvider`. |
| **`App.tsx`** | Handles all client-side routing, mapping paths to their corresponding components and protecting them with the `ProtectedRoute`. |
| **`MainLayout.tsx`** | Defines the primary UI structure, including the persistent sidebar for navigation and a header containing the user profile and logout button. |
| **`ProtectedRoute.tsx`** | A higher-order component that ensures a user is authenticated before rendering a protected route. It also handles token validation. |

### Page-Specific Components

These components are responsible for rendering the content of individual pages.

| Page | File | Description | Backend API Endpoints |
| :--- | :--- | :--- | :--- |
| **Login** | `Login.tsx` | Handles user authentication via Google OAuth. | `/api/login`, `/api/public-google-client-id` |
| **Dashboard** | `Dashboard.tsx` | Displays summary charts and statistics for requirements. | `/api/requirements` |
| **Requirements**|`RequirementsPage.tsx`| Displays all requirements in a filterable, sortable table. | `/api/requirements`, `/api/requirements/bulk-upload`, `/api/requirements/mass-delete`, `/api/requirements/mass-edit` |
| **Success Criteria** | `SuccessCriteriaPage.tsx` | Manages Success Criteria documents, allowing users to create, view, and modify them. | `/api/success-criteria` |
| **System Status** | `SystemStatusPage.tsx` | Shows the health status of the frontend and backend services. | `/api/health`, `/health.json` |
| **Audit Logs** | `AuditLogsPage.tsx` | Provides a view of all user actions within the system for administrative review. | `/api/audit-logs` |
| **User Management** | `UserManagementPage.tsx` | Allows administrators to view and manage user roles. | `/api/users`, `/api/users/promote` |
| **Session Settings**|`SessionSettingsPage.tsx`| Allows administrators to configure the application's session duration. | `/api/session-config` |

### Styling

The application's styling is managed through a set of global CSS files.

| File | Description |
| :--- | :--- |
| **`index.css`** | Contains global styles for the application, including the base font and background colors. |
| **`colors.css`** | Defines the application's color palette as CSS custom properties (variables) for consistent use. |
| **`MainLayout.css`** | Provides the styling for the main layout, including the sidebar, header, and content area. |
| **`Table.css`** | Contains the unified styles for all tables in the application, ensuring a consistent look and feel. |

### Utilities

The `src/utils` directory contains helper functions that are used across the application.

| File | Description |
| :--- | :--- |
| **`api.ts`** | A set of utility functions for making API requests to the backend. It handles adding the authentication token to headers and checking for token expiration. |
