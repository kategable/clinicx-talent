export const DEVTOOLS_SESSION_KEY = 'clinicx.enable-ngrx-devtools';

export function areDevtoolsEnabled(): boolean {
  return sessionStorage.getItem(DEVTOOLS_SESSION_KEY) === 'true';
}

export function enableDevtools(): void {
  sessionStorage.setItem(DEVTOOLS_SESSION_KEY, 'true');
  location.reload();
}

export function disableDevtools(): void {
  sessionStorage.removeItem(DEVTOOLS_SESSION_KEY);
  location.reload();
}
