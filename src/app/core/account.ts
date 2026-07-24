export type AccountType = 'clinic' | 'talent';
export type ReviewStatus = 'under-review' | 'approved' | 'on-hold';
export type ThemePreference = 'auto' | 'light' | 'dark';

export interface AccountRecord {
  id: string;
  type: AccountType;
  phone: string;
  displayPhone: string;
  email: string;
  shareEmail: boolean;
  sharePhone: boolean;
  status: ReviewStatus;
  createdAt: string;
  profileComplete: boolean;
  displayName: string;
  clinicDetails?: ClinicDetails;
  talentDetails?: TalentDetails;
  themePreference?: ThemePreference;
  founder: boolean;
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
  { phone: '(312) 555-0200', code: '998877' },
];

export const SEEDED_ACCOUNTS: AccountRecord[] = [
  {
    id: 'account-3125550101',
    type: 'clinic',
    phone: '(312) 555-0101',
    displayPhone: '',
    email: '',
    shareEmail: false,
    sharePhone: false,
    status: 'approved',
    createdAt: 'Jul 14, 2026',
    profileComplete: true,
    displayName: 'Radiance Med Clinic',
    founder: true,
    clinicDetails: {
      clinicName: 'Radiance Med Clinic',
      location: 'Lincoln Park, Chicago, IL',
      city: 'Chicago',
      state: 'IL',
      website: 'https://radiancemed.example',
      specialties: 'Injectables, laser resurfacing, medical-grade peels',
      about: 'A physician-led clinic focused on natural-looking results.',
      position: 'RN Injector',
      mustHaveSkills: 'Injectables, laser treatments, patient education',
      payRange: '$90,000–$120,000',
      benefits: 'Health, dental, 401k, CME allowance',
      urgency: 'Within 30 days',
      idealHire: 'Detail-oriented RN who prioritizes safety and natural aesthetics.',
    },
  },
  {
    id: 'account-3125550102',
    type: 'talent',
    phone: '(312) 555-0102',
    displayPhone: '',
    email: '',
    shareEmail: false,
    sharePhone: false,
    status: 'approved',
    createdAt: 'Jul 14, 2026',
    profileComplete: true,
    displayName: 'Sophia Chen, RN',
    founder: true,
    talentDetails: {
      professionalName: 'Sophia Chen, RN',
      photoName: '',
      videoName: '',
      role: 'Aesthetic RN',
      location: 'Chicago, IL',
      yearsExperience: '4 years',
      experienceTimeline: '2022–Present · Aesthetic RN\n2020–2022 · ICU RN',
      skills: 'Injectables, microneedling, PRP, patient consultations',
      certificateNames: ['Illinois RN License.pdf'],
      availability: 'Full time',
      salaryExpectation: '$85,000–$105,000',
      languages: 'English, Mandarin',
      portfolioUrl: '',
      galleryNames: [],
      introduction:
        'Transitioned from critical care to aesthetics. Passionate about safe, evidence-based treatments.',
    },
  },
  {
    id: 'clinic-approved',
    type: 'clinic',
    phone: '(312) 555-0200',
    displayPhone: '',
    email: '',
    shareEmail: false,
    sharePhone: false,
    status: 'approved',
    createdAt: 'Jul 14, 2026',
    profileComplete: true,
    displayName: 'Lux Aesthetics Lounge',
    founder: true,
    clinicDetails: {
      clinicName: 'Lux Aesthetics Lounge',
      location: 'Gold Coast, Chicago, IL',
      city: 'Chicago',
      state: 'IL',
      website: 'https://luxaesthetics.example',
      specialties: 'Injectables, laser, body contouring',
      about: 'A premier aesthetics lounge in Chicago\'s Gold Coast.',
      position: 'Aesthetic NP',
      mustHaveSkills: 'Injectables, client consultations, treatment planning',
      payRange: '$100,000–$130,000',
      benefits: 'Full benefits, commission, product allowance',
      urgency: 'Within 60 days',
      idealHire: 'Experienced NP with a boutique service mindset.',
    },
  },
  {
    id: 'clinic-demo',
    type: 'clinic',
    phone: '(773) 555-0142',
    displayPhone: '',
    email: '',
    shareEmail: false,
    sharePhone: false,
    status: 'under-review',
    createdAt: 'Jul 14, 2026',
    profileComplete: true,
    displayName: 'Lumen Aesthetics',
    founder: true,
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
    displayPhone: '',
    email: '',
    shareEmail: false,
    sharePhone: false,
    status: 'on-hold',
    createdAt: 'Jul 13, 2026',
    profileComplete: true,
    displayName: 'Alex Morgan, RN',
    founder: true,
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

export function toAccountsRecord(
  accounts: AccountRecord[],
): Record<string, AccountRecord> {
  const record: Record<string, AccountRecord> = {};
  for (const a of accounts) {
    record[a.id] = a;
  }
  return record;
}
