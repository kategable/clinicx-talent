import { AppState } from './app.state';

export function existingAccountDestination(state: AppState): string | undefined {
  const account = state.activeAccountId
    ? state.accounts[state.activeAccountId]
    : undefined;
  if (!account) return undefined;
  if (account.status !== 'approved') {
    return account.type === 'clinic' ? '/clinic/status' : '/talent/status';
  }
  return account.type === 'clinic' ? '/clinic/talents' : '/talent/home';
}
