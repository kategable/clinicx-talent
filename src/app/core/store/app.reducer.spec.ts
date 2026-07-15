import { AppActions } from './app.actions';
import { appReducer } from './app.reducer';
import { existingAccountDestination } from './app.navigation';
import { initialAppState } from './app.state';

describe('ClinicX NgRx state', () => {
  it('creates a verified clinic account under review', () => {
    let state = appReducer(
      initialAppState,
      AppActions.resetRegistration({ accountType: 'clinic', signIn: false }),
    );
    state = appReducer(state, AppActions.requestSMSCode({ phone: '3125550101' }));
    state = appReducer(state, AppActions.verifyRegistrationCode({ code: '246810' }));

    expect(state.accounts[0].status).toBe('under-review');
    expect(state.accounts[0].type).toBe('clinic');
    expect(state.accounts[0].phone).toBe('(312) 555-0101');
    expect(state.activeAccountId).toBe(state.accounts[0].id);
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
    expect(existingAccountDestination(state)).toBe('/account/status');
  });

  it('signs into an existing account without creating another account', () => {
    let state = appReducer(initialAppState, AppActions.resetRegistration({ signIn: true }));
    state = appReducer(state, AppActions.requestSMSCode({ phone: '7735550142' }));
    state = appReducer(state, AppActions.verifySignInCode({ code: '445566' }));

    expect(state.activeAccountId).toBe('clinic-demo');
    expect(state.accounts).toHaveLength(2);
  });

  it('does not create an account from sign in', () => {
    let state = appReducer(initialAppState, AppActions.resetRegistration({ signIn: true }));
    state = appReducer(state, AppActions.requestSMSCode({ phone: '3125550101' }));
    state = appReducer(state, AppActions.verifySignInCode({ code: '246810' }));

    expect(state.activeAccountId).toBeNull();
    expect(state.accounts).toHaveLength(2);
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

  it('blocks verification after more than three distinct phone numbers', () => {
    let state = initialAppState;
    for (const phone of ['3125550101', '3125550102', '3125550199', '7735550142']) {
      state = appReducer(state, AppActions.requestSMSCode({ phone }));
    }

    expect(state.verificationSecurity.blocked).toBe(true);
    expect(state.error).toContain('paused');
  });

  it('updates admin review decisions through an action', () => {
    const state = appReducer(
      initialAppState,
      AppActions.setReviewStatus({ id: 'clinic-demo', status: 'approved' }),
    );
    expect(state.accounts.find((account) => account.id === 'clinic-demo')?.status).toBe('approved');
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

    expect(
      state.accounts.find((account) => account.id === 'clinic-demo')?.clinicDetails?.city,
    ).toBe('Chicago');
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

    expect(
      state.accounts.find((account) => account.id === 'talent-demo')?.talentDetails?.role,
    ).toBe('RN Injector');
  });
});
