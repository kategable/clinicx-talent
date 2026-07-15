import { AppState } from './app.state';

export function existingAccountDestination(state: AppState): string | undefined {
  const account = state.accounts.find((item) => item.id === state.activeAccountId);
  if (!account) return undefined;
  if (account.status !== 'approved') return '/account/status';
  return account.type === 'clinic' ? '/clinic/talents' : '/talent/home';
}
