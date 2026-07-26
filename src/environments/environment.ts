export const environment = {
  production: false,
  /** API base URL — proxied through Angular dev server to localhost:5001. */
  apiUrl: '/api/v1',
  googleClientId: '347484688661-f51uunkv9gkmnsrn80q5fffi4c1bjkr3.apps.googleusercontent.com',
  /** When true, use MockAuthProvider instead of real HTTP auth. */
  useMockAuth: false,
  /** When true, use HTTP data sources (calls backend) instead of localStorage. */
  useBackend: true,
};
