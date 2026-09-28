/** Display labels for controlled vocabulary. Values are seeded in the database. */

export const STAGE_LABEL: Record<string, string> = {
  IDEA: 'Idea', PRE_SEED: 'Pre-seed', SEED: 'Seed',
  SERIES_A: 'Series A', SERIES_B: 'Series B', GROWTH: 'Growth',
};

export const INVESTOR_TYPE_LABEL: Record<string, string> = {
  ANGEL: 'Angel', VENTURE_CAPITAL: 'Venture capital', MICRO_VC: 'Micro VC',
  FAMILY_OFFICE: 'Family office', CORPORATE_VC: 'Corporate VC',
  ACCELERATOR: 'Accelerator', SYNDICATE: 'Syndicate', GOVERNMENT_FUND: 'Government fund',
};

export const BUSINESS_MODEL_LABEL: Record<string, string> = {
  B2B_SAAS: 'B2B software', B2C: 'Consumer', MARKETPLACE: 'Marketplace',
  HARDWARE: 'Hardware', DEEP_TECH: 'Deep tech', FINTECH_INFRA: 'Financial infrastructure',
  SERVICES: 'Services', OPEN_SOURCE: 'Open source',
};

export const GOAL_LABEL: Record<string, string> = {
  FUNDING: 'Funding', MENTORSHIP: 'Mentorship', PARTNERSHIPS: 'Strategic partnerships',
  INTRODUCTIONS: 'Introductions', HIRING: 'Hiring', OTHER: 'Something else',
};

export const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', INR: '₹', SGD: 'S$',
};

export const VERIFICATION_LABEL: Record<string, string> = {
  EMAIL: 'Email confirmed', IDENTITY: 'Identity checked',
  ORGANIZATION: 'Organisation confirmed', INVESTOR_REVIEW: 'Investor profile reviewed',
  STARTUP_REVIEW: 'Startup reviewed',
};

export const REPORT_CATEGORY_LABEL: Record<string, string> = {
  SPAM: 'Spam', FRAUD: 'Fraud', HARASSMENT: 'Harassment',
  MISREPRESENTATION: 'Misrepresentation', OTHER: 'Something else',
};

export const INDUSTRIES = [
  { code: 'SOFTWARE', name: 'Software', sectors: [
    ['SAAS', 'SaaS'], ['DEVTOOLS', 'Developer tools'], ['SECURITY', 'Security'],
    ['DATA_INFRA', 'Data infrastructure'], ['AI_ML', 'AI and machine learning'],
  ]},
  { code: 'FINANCE', name: 'Financial services', sectors: [
    ['PAYMENTS', 'Payments'], ['LENDING', 'Lending'], ['INSURTECH', 'Insurance'],
    ['WEALTH', 'Wealth and savings'], ['REGTECH', 'Regulatory technology'],
  ]},
  { code: 'HEALTH', name: 'Health', sectors: [
    ['DIGITAL_HEALTH', 'Digital health'], ['MEDTECH', 'Medical devices'],
    ['BIOTECH', 'Biotech'], ['CARE', 'Care delivery'],
  ]},
  { code: 'CLIMATE', name: 'Climate and energy', sectors: [
    ['ENERGY', 'Energy'], ['MOBILITY', 'Mobility'], ['CIRCULAR', 'Circular economy'],
    ['AGRI', 'Agriculture and food'],
  ]},
  { code: 'COMMERCE', name: 'Commerce', sectors: [
    ['DTC', 'Direct to consumer'], ['RETAIL_TECH', 'Retail technology'],
    ['LOGISTICS', 'Logistics'], ['MARKETPLACES', 'Marketplaces'],
  ]},
  { code: 'EDUCATION', name: 'Education and work', sectors: [
    ['EDTECH', 'Education technology'], ['FUTURE_WORK', 'Future of work'], ['HR_TECH', 'HR technology'],
  ]},
  { code: 'INDUSTRIAL', name: 'Industrial and deep tech', sectors: [
    ['ROBOTICS', 'Robotics'], ['SPACE', 'Space'], ['MATERIALS', 'Advanced materials'],
    ['QUANTUM', 'Quantum technologies'],
  ]},
] as const;

export const GEOGRAPHIES = [
  { code: 'UK_LONDON', name: 'London', region: 'UK & Ireland' },
  { code: 'UK_NORTH', name: 'Northern England', region: 'UK & Ireland' },
  { code: 'UK_SCOTLAND', name: 'Scotland', region: 'UK & Ireland' },
  { code: 'IE_DUBLIN', name: 'Dublin', region: 'UK & Ireland' },
  { code: 'EU_BERLIN', name: 'Berlin', region: 'Europe' },
  { code: 'EU_PARIS', name: 'Paris', region: 'Europe' },
  { code: 'EU_AMSTERDAM', name: 'Amsterdam', region: 'Europe' },
  { code: 'EU_STOCKHOLM', name: 'Stockholm', region: 'Europe' },
  { code: 'US_NYC', name: 'New York', region: 'North America' },
  { code: 'US_SF', name: 'San Francisco Bay Area', region: 'North America' },
  { code: 'US_BOSTON', name: 'Boston', region: 'North America' },
  { code: 'CA_TORONTO', name: 'Toronto', region: 'North America' },
  { code: 'IN_BENGALURU', name: 'Bengaluru', region: 'Asia Pacific' },
  { code: 'IN_MUMBAI', name: 'Mumbai', region: 'Asia Pacific' },
  { code: 'SG_SINGAPORE', name: 'Singapore', region: 'Asia Pacific' },
  { code: 'AE_DUBAI', name: 'Dubai', region: 'Middle East & Africa' },
  { code: 'NG_LAGOS', name: 'Lagos', region: 'Middle East & Africa' },
  { code: 'ANY', name: 'Anywhere', region: 'Global', isAny: true },
] as const;
