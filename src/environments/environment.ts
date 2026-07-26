export const environment = {
  production: false,
  /** API base URL — proxied through Angular dev server to localhost:5001. */
  apiUrl: '/api/v1',
  googleClientId: '1234567890-xxxxx.apps.googleusercontent.com',
  /** When true, use MockAuthProvider instead of real HTTP auth. */
  useMockAuth: true,
  /** When true, use HTTP data sources (calls backend) instead of localStorage. */
  useBackend: false,
};
