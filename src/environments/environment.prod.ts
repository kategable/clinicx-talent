export const environment = {
  production: true,
  /** API base URL — proxied through Angular dev server to localhost:5001 in dev. */
  apiUrl: '/api/v1',
  googleClientId: '347484688661-f51uunkv9gkmnsrn80q5fffi4c1bjkr3.apps.googleusercontent.com',
  /** When true, use MockAuthProvider. Set to false when the backend is deployed to prod. */
  useMockAuth: true,
  /** When true, use HTTP data sources (calls backend). */
  useBackend: false,
  /** Base URL for commit links on the admin deployments page. */
  commitBaseUrl: 'https://github.com/kategable/clinicx-talent/commit',
};
