export type AccountType = 'clinic' | 'talent';
export type ReviewStatus = 'under-review' | 'approved' | 'on-hold';
export type ThemePreference = 'auto' | 'light' | 'dark';

export interface AccountRecord {
  id: string;
  type: AccountType;
  phone: string;
  status: ReviewStatus;
  createdAt: string;
  profileComplete: boolean;
  displayName: string;
  clinicDetails?: ClinicDetails;
  talentDetails?: TalentDetails;
  themePreference?: ThemePreference;
}

export interface ClinicDetails {
  clinicName: string;
  location: string;
  city: string;
  state: string;
  website: string;
  specialties: string;
  about: string;
  position: string;
  mustHaveSkills: string;
  payRange: string;
  benefits: string;
  urgency: string;
  idealHire: string;
}

export interface TalentDetails {
  professionalName: string;
  photoName: string;
  videoName: string;
  role: string;
  location: string;
  yearsExperience: string;
  experienceTimeline: string;
  skills: string;
  certificateNames: string[];
  availability: string;
  salaryExpectation: string;
  languages: string;
  portfolioUrl: string;
  galleryNames: string[];
  introduction: string;
}

export interface TestCredential {
  phone: string;
  code: string;
}

export const TEST_CREDENTIALS: TestCredential[] = [
  { phone: '(312) 555-0101', code: '246810' },
  { phone: '(312) 555-0102', code: '135790' },
  { phone: '(312) 555-0199', code: '112233' },
  { phone: '(773) 555-0142', code: '445566' },
  { phone: '(847) 555-0168', code: '778899' },
];

export const SEEDED_ACCOUNTS: AccountRecord[] = [
  {
    id: 'clinic-demo',
    type: 'clinic',
    phone: '(773) 555-0142',
    status: 'under-review',
    createdAt: 'Jul 14, 2026',
    profileComplete: true,
    displayName: 'Lumen Aesthetics',
    clinicDetails: {
      clinicName: 'Lumen Aesthetics',
      location: 'River North, Chicago, IL',
      city: 'Chicago',
      state: 'IL',
      website: 'https://lumenaesthetics.example',
      specialties: 'Injectables, laser treatments, skin rejuvenation',
      about: 'A modern aesthetics clinic centered on thoughtful, personalized care.',
      position: 'RN Injector',
      mustHaveSkills: 'Injectables, consultations, luxury client care',
      payRange: '$85,000–$110,000',
      benefits: 'Health insurance, paid time off, treatment allowance',
      urgency: 'Within 30 days',
      idealHire:
        'Warm, polished, clinically excellent, and comfortable building client relationships.',
    },
  },
  {
    id: 'talent-demo',
    type: 'talent',
    phone: '(847) 555-0168',
    status: 'on-hold',
    createdAt: 'Jul 13, 2026',
    profileComplete: true,
    displayName: 'Alex Morgan, RN',
    talentDetails: {
      professionalName: 'Alex Morgan, RN',
      photoName: 'alex-morgan-headshot.jpg',
      videoName: 'alex-introduction.mp4',
      role: 'RN Injector',
      location: 'Chicago, IL',
      yearsExperience: '6 years',
      experienceTimeline: '2022–Present · Lead RN Injector\n2020–2022 · Aesthetic RN',
      skills: 'Injectables, Morpheus8, consultations, treatment sales',
      certificateNames: ['Illinois RN License.pdf', 'Allergan Training.pdf'],
      availability: 'Full time',
      salaryExpectation: '$95,000–$115,000',
      languages: 'English',
      portfolioUrl: 'https://portfolio.example/alex-morgan',
      galleryNames: ['lip-filler-before-after.jpg', 'skin-treatment-before-after.jpg'],
      introduction:
        'A patient-focused aesthetic RN who values education and long-term relationships.',
    },
  },
];

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export function formatPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
