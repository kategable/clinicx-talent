import { AppActions } from './app.actions';
import { appReducer } from './app.reducer';
import { existingAccountDestination } from './app.navigation';
import { resolveTheme } from '../theme-manager';
import { initialAppState } from './app.state';
import { selectThemePreference } from './app.selectors';

describe('ClinicX NgRx state', () => {
  it('creates a verified clinic account under review', () => {
    let state = appReducer(
      initialAppState,
      AppActions.resetRegistration({ accountType: 'clinic', signIn: false }),
    );
    state = appReducer(state, AppActions.requestSMSCode({ phone: '3125550199' }));
    state = appReducer(state, AppActions.verifyRegistrationCode({ code: '112233' }));

    const newAccount = state.accounts[state.activeAccountId!];
    expect(newAccount.status).toBe('under-review');
    expect(newAccount.type).toBe('clinic');
    expect(newAccount.phone).toBe('(312) 555-0199');
    expect(state.registration.accountCreated).toBe(true);
  });

  it('recognizes an existing registration account and routes it by review status', () => {
    let state = appReducer(
      initialAppState,
      AppActions.resetRegistration({ accountType: 'clinic', signIn: false }),
    );
    state = appReducer(state, AppActions.requestSMSCode({ phone: '7735550142' }));
    state = appReducer(state, AppActions.verifyRegistrationCode({ code: '445566' }));

    expect(state.registration.accountCreated).toBe(false);
    expect(state.activeAccountId).toBe('clinic-demo');
    expect(existingAccountDestination(state)).toBe('/clinic/status');
  });

  it('signs into an existing account without creating another account', () => {
    let state = appReducer(initialAppState, AppActions.resetRegistration({ signIn: true }));
    state = appReducer(state, AppActions.requestSMSCode({ phone: '7735550142' }));
    state = appReducer(state, AppActions.verifySignInCode({ code: '445566' }));

    expect(state.activeAccountId).toBe('clinic-demo');
    expect(Object.keys(state.accounts)).toHaveLength(5); // 5 seeded accounts
  });

  it('does not create an account from sign in', () => {
    let state = appReducer(initialAppState, AppActions.resetRegistration({ signIn: true }));
    state = appReducer(state, AppActions.requestSMSCode({ phone: '3125550199' }));
    state = appReducer(state, AppActions.verifySignInCode({ code: '112233' }));

    expect(state.activeAccountId).toBeNull();
    expect(Object.keys(state.accounts)).toHaveLength(5); // 5 seeded accounts
  });

  it('allows only the hard-coded MVP admin credential', () => {
    const rejected = appReducer(
      initialAppState,
      AppActions.adminLogin({ username: 'admin', password: 'wrong' }),
    );
    const accepted = appReducer(
      rejected,
      AppActions.adminLogin({ username: 'admin', password: 'admin' }),
    );

    expect(rejected.adminAuthenticated).toBe(false);
    expect(accepted.adminAuthenticated).toBe(true);
  });

  it('flags the system after more than 5 distinct phones and locks a phone after 3 attempts', () => {
    let state = initialAppState;
    const phones = ['3125550001', '3125550002', '3125550003', '3125550004', '3125550005', '3125550006'];
    for (const phone of phones) {
      state = appReducer(state, AppActions.requestSMSCode({ phone }));
    }

    expect(state.verificationSecurity.flagged).toBe(true);
    expect(Object.keys(state.verificationSecurity.phoneAttempts)).toHaveLength(6);

    state = appReducer(state, AppActions.requestSMSCode({ phone: '3125550001' }));
    state = appReducer(state, AppActions.requestSMSCode({ phone: '3125550001' }));
    state = appReducer(state, AppActions.requestSMSCode({ phone: '3125550001' }));
    expect(state.verificationSecurity.lockedPhones).toContain('3125550001');
    expect(state.error).toContain('temporarily locked');
  });

  it('updates admin review decisions through an action', () => {
    const state = appReducer(
      initialAppState,
      AppActions.setReviewStatus({ id: 'clinic-demo', status: 'approved' }),
    );
    expect(state.accounts['clinic-demo']?.status).toBe('approved');
  });

  it('records a review reminder only once for the active browser session', () => {
    let state = appReducer(
      initialAppState,
      AppActions.requestReviewReminder({ accountId: 'clinic-demo' }),
    );
    state = appReducer(state, AppActions.requestReviewReminder({ accountId: 'clinic-demo' }));

    expect(state.reviewReminder.pingedAccountIds).toEqual(['clinic-demo']);
  });

  it('saves clinic details against the logged-in clinic account', () => {
    const state = appReducer(
      { ...initialAppState, activeAccountId: 'clinic-demo' },
      AppActions.saveClinicDetails({
        details: {
          clinicName: 'Example Clinic',
          location: 'River North, Chicago, IL',
          city: 'Chicago',
          state: 'IL',
          website: 'https://clinic.example',
          specialties: 'Injectables and lasers',
          about: 'A patient-first aesthetics clinic.',
          position: 'RN Injector',
          mustHaveSkills: 'Injectables and client care',
          payRange: '$85,000–$110,000',
          benefits: 'Health insurance and PTO',
          urgency: 'Within 30 days',
          idealHire: 'Warm, polished, and clinically excellent.',
        },
      }),
    );

    expect(state.accounts['clinic-demo']?.clinicDetails?.city).toBe('Chicago');
  });

  it('saves talent details against the logged-in talent account', () => {
    const state = appReducer(
      { ...initialAppState, activeAccountId: 'talent-demo' },
      AppActions.saveTalentDetails({
        details: {
          professionalName: 'Alex Morgan, RN',
          photoName: 'alex.jpg',
          videoName: 'intro.mp4',
          role: 'RN Injector',
          location: 'Chicago, IL',
          yearsExperience: '6 years',
          experienceTimeline: '2022–Present · Lead RN Injector',
          skills: 'Injectables and consultations',
          certificateNames: ['rn-license.pdf'],
          availability: 'Full time',
          salaryExpectation: '$95,000–$115,000',
          languages: 'English',
          portfolioUrl: 'https://portfolio.example',
          galleryNames: ['before-after.jpg'],
          introduction: 'A patient-focused aesthetic RN.',
        },
      }),
    );

    expect(state.accounts['talent-demo']?.talentDetails?.role).toBe('RN Injector');
  });

  it('stores an account theme preference and resolves automatic day and night themes', () => {
    const state = appReducer(
      { ...initialAppState, activeAccountId: 'clinic-demo' },
      AppActions.setThemePreference({ preference: 'dark' }),
    );

    expect(state.accounts['clinic-demo']?.themePreference).toBe('dark');
    const signedOutState = appReducer(state, AppActions.signOut());
    expect(signedOutState.activeAccountId).toBeNull();
    expect(selectThemePreference.projector(signedOutState, undefined)).toBe('auto');
    expect(resolveTheme('auto', 12)).toBe('light');
    expect(resolveTheme('auto', 22)).toBe('dark');
    expect(resolveTheme('auto', 12, 'dark')).toBe('dark');
    expect(resolveTheme('dark', 22, 'light')).toBe('light');
  });

  it('keeps a signed-out theme preference separate from account preferences', () => {
    const guestState = appReducer(
      initialAppState,
      AppActions.setThemePreference({ preference: 'dark' }),
    );
    const signedInState = appReducer(
      { ...guestState, activeAccountId: 'clinic-demo' },
      AppActions.setThemePreference({ preference: 'light' }),
    );

    expect(guestState.guestThemePreference).toBe('dark');
    expect(
      selectThemePreference.projector(
        { ...guestState, activeAccountId: 'talent-demo' },
        guestState.accounts['talent-demo'],
      ),
    ).toBe('auto');
    expect(signedInState.guestThemePreference).toBe('dark');
    expect(signedInState.accounts['clinic-demo']?.themePreference).toBe('light');
  });
});
