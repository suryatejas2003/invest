/**
 * Development seed. Everything it creates is fictional and flagged isDemo,
 * and every demo account carries a "Demo account" tag in the interface.
 *
 *   npm run db:seed
 *
 * Demo sign-in: any seeded address with the password  OpenDoors2026!
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { INDUSTRIES, GEOGRAPHIES } from '../src/lib/config/vocab';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'OpenDoors2026!';

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/* ------------------------------------------------------------ investors */

interface InvestorSeed {
  name: string; email: string; org?: string; type: Prisma.InvestorProfileCreateInput['investorType'];
  city: string; headline: string; bio: string; thesis: string; expertise: string[];
  sectors: string[]; stages: string[]; geos: string[]; min: number; max: number; currency?: string;
  portfolio?: Array<[string, number, string]>;
}

const INVESTORS: InvestorSeed[] = [
  { name: 'Priya Raghavan', email: 'priya.raghavan@demo.doorkey.app', org: 'Fernwood Capital', type: 'VENTURE_CAPITAL', city: 'UK_LONDON',
    headline: 'Partner at Fernwood Capital', bio: 'Fifteen years in industrial technology, first as an operator and now investing. I like companies where the hard part is physics rather than distribution.',
    thesis: 'I back energy hardware and industrial efficiency in Europe at seed and Series A. I care most about unit economics at the point of manufacture, and about teams that have already put something in the ground.',
    expertise: ['industrial scale-up', 'energy markets', 'hardware supply chains'],
    sectors: ['ENERGY', 'MOBILITY', 'MATERIALS'], stages: ['SEED', 'SERIES_A'], geos: ['UK_LONDON', 'EU_BERLIN', 'EU_AMSTERDAM'], min: 250_000, max: 2_000_000,
    portfolio: [['Thermalux', 2023, 'Waste heat recovery'], ['Gridmoor', 2022, 'Grid-scale storage software']] },

  { name: 'Tomas Lindqvist', email: 'tomas.lindqvist@demo.doorkey.app', type: 'ANGEL', city: 'EU_STOCKHOLM',
    headline: 'Angel investor, former COO', bio: 'I ran operations at two consumer businesses through their scaling years. Now I write small cheques early and stay close.',
    thesis: 'Pre-seed and seed cheques into circular economy and food systems. I invest anywhere I can be useful on a call, and I am most interested in businesses that reduce material waste as a side effect of being cheaper.',
    expertise: ['operations', 'circular economy', 'go to market'],
    sectors: ['CIRCULAR', 'AGRI', 'DTC'], stages: ['PRE_SEED', 'SEED'], geos: ['ANY'], min: 25_000, max: 150_000,
    portfolio: [['Returnly', 2024, 'Packaging reuse']] },

  { name: 'Amelia Whitcombe', email: 'amelia.whitcombe@demo.doorkey.app', org: 'Calder & Finch', type: 'MICRO_VC', city: 'UK_LONDON',
    headline: 'Founding partner, Calder & Finch', bio: 'Former regulator, now investing in the infrastructure that financial services actually runs on.',
    thesis: 'Seed cheques into payments infrastructure and regulatory technology across the UK and Ireland. I look for founders who understand compliance as a product surface rather than a cost centre.',
    expertise: ['financial regulation', 'compliance automation', 'payments'],
    sectors: ['PAYMENTS', 'REGTECH', 'LENDING'], stages: ['SEED'], geos: ['UK_LONDON', 'IE_DUBLIN'], min: 200_000, max: 1_000_000,
    portfolio: [['Settle Street', 2024, 'Reconciliation'], ['Kestrel Compliance', 2023, 'Reporting automation']] },

  { name: 'Daniel Okafor', email: 'daniel.okafor@demo.doorkey.app', org: 'Harmattan Ventures', type: 'VENTURE_CAPITAL', city: 'NG_LAGOS',
    headline: 'Managing partner at Harmattan Ventures', bio: 'Investing across African markets since 2016, with a bias towards businesses that work offline as well as on.',
    thesis: 'Seed and Series A into marketplaces, logistics and payments serving African markets. I want evidence of real transaction volume before the pitch deck gets ambitious.',
    expertise: ['emerging markets', 'logistics', 'mobile money'],
    sectors: ['MARKETPLACES', 'LOGISTICS', 'PAYMENTS'], stages: ['SEED', 'SERIES_A'], geos: ['NG_LAGOS', 'AE_DUBAI'], min: 150_000, max: 1_500_000, currency: 'USD',
    portfolio: [['Kano Freight', 2023, 'Road logistics']] },

  { name: 'Sofia Marchetti', email: 'sofia.marchetti@demo.doorkey.app', org: 'Corvo Health Partners', type: 'VENTURE_CAPITAL', city: 'EU_BERLIN',
    headline: 'Principal at Corvo Health Partners', bio: 'Trained as a clinician, spent six years in hospital operations before moving to investing.',
    thesis: 'Digital health and care delivery in Europe, seed through Series A. I look hardest at whether a service can be reimbursed, because that is what decides whether it survives contact with a health system.',
    expertise: ['clinical workflows', 'reimbursement', 'regulated software'],
    sectors: ['DIGITAL_HEALTH', 'CARE', 'MEDTECH'], stages: ['SEED', 'SERIES_A'], geos: ['EU_BERLIN', 'EU_PARIS', 'UK_LONDON'], min: 300_000, max: 2_500_000, currency: 'EUR',
    portfolio: [['Ward Round', 2023, 'Hospital handover'], ['Pallia', 2022, 'Community care']] },

  { name: 'Jonah Feldman', email: 'jonah.feldman@demo.doorkey.app', org: 'Rill Capital', type: 'MICRO_VC', city: 'US_NYC',
    headline: 'General partner at Rill Capital', bio: 'Two engineering exits behind me. I invest in the tools engineers choose for themselves.',
    thesis: 'Developer tools and data infrastructure at pre-seed and seed, anywhere. I look for adoption that happened before anyone was paid to sell it.',
    expertise: ['developer tools', 'open source business models', 'technical hiring'],
    sectors: ['DEVTOOLS', 'DATA_INFRA', 'SAAS'], stages: ['PRE_SEED', 'SEED'], geos: ['ANY'], min: 100_000, max: 750_000, currency: 'USD',
    portfolio: [['Tracepoint', 2024, 'Observability'], ['Quillbase', 2023, 'Embedded database']] },

  { name: 'Mei Tan', email: 'mei.tan@demo.doorkey.app', org: 'Straits Forward', type: 'VENTURE_CAPITAL', city: 'SG_SINGAPORE',
    headline: 'Partner at Straits Forward', bio: 'Southeast Asia focused, with a background in semiconductor manufacturing.',
    thesis: 'Deep tech and advanced manufacturing across Asia Pacific, Series A onwards. I prefer companies with a defensible process rather than a defensible interface.',
    expertise: ['semiconductors', 'manufacturing', 'technical diligence'],
    sectors: ['ROBOTICS', 'MATERIALS', 'QUANTUM'], stages: ['SERIES_A', 'SERIES_B'], geos: ['SG_SINGAPORE', 'IN_BENGALURU'], min: 1_000_000, max: 6_000_000, currency: 'SGD',
    portfolio: [['Lattice Works', 2022, 'Precision fabrication']] },

  { name: 'Ruth Adeyemi', email: 'ruth.adeyemi@demo.doorkey.app', type: 'ANGEL', city: 'UK_NORTH',
    headline: 'Angel investor and operator', bio: 'I built and sold a B2B software company in Manchester. I now invest in founders outside London who are being overlooked.',
    thesis: 'Pre-seed cheques into B2B software anywhere in the UK, with a deliberate bias away from London. I care about a first ten customers who pay, not a waitlist.',
    expertise: ['b2b sales', 'first hires', 'pricing'],
    sectors: ['SAAS', 'HR_TECH', 'FUTURE_WORK'], stages: ['IDEA', 'PRE_SEED'], geos: ['UK_NORTH', 'UK_SCOTLAND', 'UK_LONDON'], min: 20_000, max: 120_000 },

  { name: 'Henrik Bauer', email: 'henrik.bauer@demo.doorkey.app', org: 'Nordlicht Family Office', type: 'FAMILY_OFFICE', city: 'EU_BERLIN',
    headline: 'Director at Nordlicht Family Office', bio: 'We invest patient capital on behalf of a single family with a manufacturing background.',
    thesis: 'Later stage positions in industrial and energy businesses in Europe. We hold for a long time and do not need a fast exit, which suits capital-heavy companies.',
    expertise: ['long hold capital', 'industrial operations', 'governance'],
    sectors: ['ENERGY', 'MATERIALS', 'CIRCULAR'], stages: ['SERIES_A', 'SERIES_B', 'GROWTH'], geos: ['EU_BERLIN', 'EU_AMSTERDAM', 'EU_STOCKHOLM'], min: 2_000_000, max: 10_000_000, currency: 'EUR' },

  { name: 'Ana Ferreira', email: 'ana.ferreira@demo.doorkey.app', org: 'Praça Syndicate', type: 'SYNDICATE', city: 'EU_PARIS',
    headline: 'Lead at Praça Syndicate', bio: 'I bring together operators from consumer businesses to invest as a group.',
    thesis: 'Consumer and marketplace businesses at seed in Europe. Our syndicate is useful when a founder wants twenty operators on their cap table rather than one fund.',
    expertise: ['consumer growth', 'brand', 'community'],
    sectors: ['DTC', 'MARKETPLACES', 'RETAIL_TECH'], stages: ['SEED'], geos: ['EU_PARIS', 'EU_AMSTERDAM', 'UK_LONDON'], min: 100_000, max: 500_000, currency: 'EUR' },

  { name: 'Vikram Shenoy', email: 'vikram.shenoy@demo.doorkey.app', org: 'Deccan Seed', type: 'ACCELERATOR', city: 'IN_BENGALURU',
    headline: 'Programme director at Deccan Seed', bio: 'We run a twelve week programme twice a year and invest at the start of it.',
    thesis: 'Very early cheques into Indian software and education companies, usually pre-revenue. The money is small; the point is the twelve weeks.',
    expertise: ['early product', 'founder coaching', 'india go to market'],
    sectors: ['EDTECH', 'SAAS', 'AI_ML'], stages: ['IDEA', 'PRE_SEED'], geos: ['IN_BENGALURU', 'IN_MUMBAI'], min: 15_000, max: 60_000, currency: 'INR' },

  { name: 'Claire Donnelly', email: 'claire.donnelly@demo.doorkey.app', org: 'Liffey Works', type: 'MICRO_VC', city: 'IE_DUBLIN',
    headline: 'Partner at Liffey Works', bio: 'Irish market specialist with a security background.',
    thesis: 'Seed investments in security and data infrastructure, Ireland and the UK. I have a low tolerance for companies that describe themselves as AI-first without saying what the model does.',
    expertise: ['security', 'enterprise sales', 'compliance'],
    sectors: ['SECURITY', 'DATA_INFRA', 'REGTECH'], stages: ['SEED', 'SERIES_A'], geos: ['IE_DUBLIN', 'UK_LONDON'], min: 250_000, max: 1_200_000, currency: 'EUR',
    portfolio: [['Bastion IQ', 2023, 'Identity']] },

  { name: 'Marcus Ilesanmi', email: 'marcus.ilesanmi@demo.doorkey.app', org: 'Northgate Corporate Ventures', type: 'CORPORATE_VC', city: 'US_BOSTON',
    headline: 'Investment lead at Northgate Corporate Ventures', bio: 'I invest on behalf of a logistics group looking for technology it can eventually buy.',
    thesis: 'Series A into logistics, robotics and supply chain software in North America. A commercial pilot with our parent group is usually part of the deal.',
    expertise: ['supply chain', 'corporate partnerships', 'pilots'],
    sectors: ['LOGISTICS', 'ROBOTICS', 'MARKETPLACES'], stages: ['SERIES_A', 'SERIES_B'], geos: ['US_BOSTON', 'US_NYC', 'CA_TORONTO'], min: 1_000_000, max: 5_000_000, currency: 'USD' },

  { name: 'Yasmin Haddad', email: 'yasmin.haddad@demo.doorkey.app', org: 'Gulf Innovation Fund', type: 'GOVERNMENT_FUND', city: 'AE_DUBAI',
    headline: 'Investment manager at Gulf Innovation Fund', bio: 'Public capital with a mandate to bring technology businesses into the region.',
    thesis: 'Seed and Series A into companies willing to establish a regional presence. Sector-agnostic within software, with a preference for fintech and education.',
    expertise: ['market entry', 'public funding', 'regional partnerships'],
    sectors: ['PAYMENTS', 'EDTECH', 'SAAS'], stages: ['SEED', 'SERIES_A'], geos: ['AE_DUBAI', 'IN_MUMBAI'], min: 500_000, max: 3_000_000, currency: 'USD' },

  { name: 'Peter Nakamura', email: 'peter.nakamura@demo.doorkey.app', type: 'ANGEL', city: 'US_SF',
    headline: 'Angel, former machine learning lead', bio: 'I spent a decade building recommendation systems. I invest in the layer underneath other people models.',
    thesis: 'Pre-seed and seed into machine learning infrastructure and tooling, anywhere. I ask what breaks at a hundred times the current load, and I expect an answer.',
    expertise: ['machine learning infrastructure', 'research to product', 'technical founders'],
    sectors: ['AI_ML', 'DATA_INFRA', 'DEVTOOLS'], stages: ['PRE_SEED', 'SEED'], geos: ['ANY'], min: 50_000, max: 400_000, currency: 'USD',
    portfolio: [['Vectorly', 2024, 'Retrieval infrastructure']] },

  { name: 'Grace Mbeki', email: 'grace.mbeki@demo.doorkey.app', org: 'Tessellate Partners', type: 'VENTURE_CAPITAL', city: 'CA_TORONTO',
    headline: 'Partner at Tessellate Partners', bio: 'Former insurance executive investing in the businesses that will replace the one I used to run.',
    thesis: 'Seed and Series A into insurance and wealth technology in North America and the UK. Distribution beats product in this category and I invest accordingly.',
    expertise: ['insurance', 'distribution partnerships', 'regulated products'],
    sectors: ['INSURTECH', 'WEALTH', 'LENDING'], stages: ['SEED', 'SERIES_A'], geos: ['CA_TORONTO', 'US_NYC', 'UK_LONDON'], min: 400_000, max: 2_500_000, currency: 'USD',
    portfolio: [['Underwrite Co', 2023, 'Commercial underwriting']] },
];

/* ------------------------------------------------------------- startups */

interface StartupSeed {
  founder: string; email: string; title?: string; city: string; bio: string;
  company: string; oneLiner: string; description: string;
  industry: string; sectors: string[]; stage: string; model: string;
  founded: number; team: number; seeking?: number; raised?: number; currency?: string;
  previous?: string; revenue?: number; users?: number; customers?: number;
  growth?: string; traction?: string; goals: string[];
}

const STARTUPS: StartupSeed[] = [
  { founder: 'Amara Okonjo', email: 'amara.okonjo@demo.doorkey.app', city: 'UK_LONDON',
    bio: 'I spent six years in payments operations watching reconciliation break at month end. Ledgerline is the tool I wanted then.',
    company: 'Ledgerline', oneLiner: 'Reconciliation for marketplaces that move money on behalf of other people',
    description: 'Marketplaces hold money for sellers and settle it later. When the ledger disagrees with the bank, finance teams find out days afterwards from a spreadsheet. Ledgerline reconciles continuously and flags the break when it happens, with an audit trail regulators accept.',
    industry: 'FINANCE', sectors: ['PAYMENTS', 'REGTECH'], stage: 'SEED', model: 'FINTECH_INFRA',
    founded: 2023, team: 9, seeking: 800_000, raised: 250_000, previous: 'Pre-seed of £250k in 2023, angels only',
    revenue: 190_000, customers: 14, growth: '11% month on month since January',
    traction: 'Fourteen paying marketplaces, two of them processing over £4m a month.', goals: ['FUNDING', 'INTRODUCTIONS'] },

  { founder: 'Daniel Mbeki', email: 'daniel.mbeki@demo.doorkey.app', city: 'IE_DUBLIN',
    bio: 'Former compliance analyst. I got tired of rewriting the same report every quarter.',
    company: 'Clausewise', oneLiner: 'Regulatory reporting that assembles itself from systems you already run',
    description: 'Regulated firms produce the same returns every quarter by hand. Clausewise connects to the source systems, maps fields once, and generates the filing with every number traceable back to where it came from.',
    industry: 'FINANCE', sectors: ['REGTECH'], stage: 'SEED', model: 'B2B_SAAS',
    founded: 2022, team: 12, seeking: 600_000, raised: 400_000, currency: 'EUR',
    revenue: 310_000, customers: 21, growth: 'Doubled customers in the last year',
    traction: 'Twenty-one regulated firms, average contract €15k.', goals: ['FUNDING', 'MENTORSHIP'] },

  { founder: 'Elena Vasquez', email: 'elena.vasquez@demo.doorkey.app', city: 'UK_LONDON',
    bio: 'Mechanical engineer. I have spent my career on heat, which is where most industrial energy goes to die.',
    company: 'Thermara', oneLiner: 'Waste heat recovery for commercial buildings, retrofitted in a weekend',
    description: 'Commercial buildings throw away most of the heat they generate. Existing recovery systems need a plant room rebuild. Thermara is a modular unit that fits existing riser space and pays for itself in under four years at current energy prices.',
    industry: 'CLIMATE', sectors: ['ENERGY', 'CIRCULAR'], stage: 'SEED', model: 'HARDWARE',
    founded: 2022, team: 16, seeking: 1_200_000, raised: 600_000, previous: 'Grant funding of £350k plus a £250k pre-seed',
    revenue: 240_000, customers: 6, traction: 'Six buildings live in London, eleven months of performance data.',
    goals: ['FUNDING', 'PARTNERSHIPS', 'INTRODUCTIONS'] },

  { founder: 'Kwame Asante', email: 'kwame.asante@demo.doorkey.app', city: 'NG_LAGOS',
    bio: 'I ran a haulage business for four years. Everything I know about logistics I learned by losing money on it.',
    company: 'Roadbound', oneLiner: 'Freight matching for road haulage across West Africa',
    description: 'Half of all trucks on West African routes run empty in one direction. Roadbound matches return loads by phone as well as app, settles payment on delivery confirmation, and holds the money until both sides agree.',
    industry: 'COMMERCE', sectors: ['LOGISTICS', 'MARKETPLACES'], stage: 'SERIES_A', model: 'MARKETPLACE',
    founded: 2021, team: 34, seeking: 2_500_000, raised: 900_000, currency: 'USD',
    revenue: 1_400_000, users: 4200, customers: 310, growth: '2.4x revenue year on year',
    traction: 'Over 4,200 registered drivers and 310 shippers, $1.4m annualised revenue.', goals: ['FUNDING', 'HIRING'] },

  { founder: 'Ingrid Sørensen', email: 'ingrid.sorensen@demo.doorkey.app', city: 'EU_STOCKHOLM',
    bio: 'Packaging designer turned founder. I care about the boring middle of the supply chain.',
    company: 'Returnly', oneLiner: 'Reusable packaging pooled across brands instead of owned by one',
    description: 'Reusable packaging fails when each brand runs its own scheme and its own return logistics. Returnly operates a shared pool with standard containers, so brands pay per trip instead of buying inventory.',
    industry: 'CLIMATE', sectors: ['CIRCULAR', 'LOGISTICS'], stage: 'SEED', model: 'HARDWARE',
    founded: 2023, team: 11, seeking: 900_000, raised: 300_000, currency: 'EUR',
    revenue: 150_000, customers: 9, traction: 'Nine brands in the pool, 62,000 trips completed.', goals: ['FUNDING', 'PARTNERSHIPS'] },

  { founder: 'Rahul Menon', email: 'rahul.menon@demo.doorkey.app', city: 'IN_BENGALURU',
    bio: 'Teacher for five years, engineer since. I build for the schools I taught in, not the ones in the case studies.',
    company: 'Chalkline', oneLiner: 'Assessment tools for schools with unreliable internet',
    description: 'Most education software assumes a connection. Chalkline works offline on low-end Android devices, syncs when it can, and gives teachers marking analytics without asking them to change how they teach.',
    industry: 'EDUCATION', sectors: ['EDTECH'], stage: 'PRE_SEED', model: 'B2B_SAAS',
    founded: 2024, team: 5, seeking: 250_000, currency: 'INR',
    users: 18_000, customers: 42, growth: 'Forty-two schools signed in eight months',
    traction: '18,000 students across 42 schools, mostly in Karnataka.', goals: ['FUNDING', 'MENTORSHIP', 'INTRODUCTIONS'] },

  { founder: 'Sophie Laurent', email: 'sophie.laurent@demo.doorkey.app', city: 'EU_PARIS',
    bio: 'Emergency medicine doctor. I built the first version of this on night shifts.',
    company: 'Ward Round', oneLiner: 'Clinical handover that survives a shift change',
    description: 'Handover between hospital shifts still happens on paper and memory. Ward Round structures it, carries the open questions forward, and produces a record that satisfies the incident review nobody wants to have.',
    industry: 'HEALTH', sectors: ['DIGITAL_HEALTH', 'CARE'], stage: 'SERIES_A', model: 'B2B_SAAS',
    founded: 2021, team: 28, seeking: 4_000_000, raised: 1_800_000, currency: 'EUR',
    revenue: 1_100_000, customers: 17, growth: '17 hospital trusts, up from 6 last year',
    traction: 'Deployed in 17 hospitals across France and Belgium.', goals: ['FUNDING', 'HIRING'] },

  { founder: 'Marcus Chen', email: 'marcus.chen@demo.doorkey.app', city: 'US_SF',
    bio: 'Infrastructure engineer. I have been on call for other people databases for eleven years.',
    company: 'Tracepoint', oneLiner: 'Observability that tells you which change caused the regression',
    description: 'Dashboards tell you something is wrong. Tracepoint correlates deploys, config changes and traffic shifts against the metric that moved, so the first question in an incident has an answer before anyone opens a dashboard.',
    industry: 'SOFTWARE', sectors: ['DEVTOOLS', 'DATA_INFRA'], stage: 'SEED', model: 'B2B_SAAS',
    founded: 2023, team: 8, seeking: 3_000_000, raised: 1_000_000, currency: 'USD',
    revenue: 620_000, customers: 48, growth: '14% month on month',
    traction: '48 paying teams, all inbound.', goals: ['FUNDING'] },

  { founder: 'Nadia Farouk', email: 'nadia.farouk@demo.doorkey.app', city: 'AE_DUBAI',
    bio: 'I worked in retail banking across three markets. Savings products have not changed since I started.',
    company: 'Qism', oneLiner: 'Group savings for people whose banks do not offer it',
    description: 'Informal savings circles move billions and run on trust and messaging apps. Qism gives them a ledger, automated collection and a dispute process, without pretending the social structure is a bug.',
    industry: 'FINANCE', sectors: ['WEALTH', 'PAYMENTS'], stage: 'SEED', model: 'B2C',
    founded: 2023, team: 14, seeking: 1_500_000, raised: 500_000, currency: 'USD',
    users: 71_000, revenue: 340_000, growth: '71,000 users in eighteen months',
    traction: '71,000 active users, $18m held in circles.', goals: ['FUNDING', 'PARTNERSHIPS'] },

  { founder: 'Oliver Bradshaw', email: 'oliver.bradshaw@demo.doorkey.app', city: 'UK_NORTH',
    bio: 'I ran recruitment for a manufacturing group. The good people were never the ones with the best CVs.',
    company: 'Shopfloor', oneLiner: 'Hiring for skilled trades that does not start with a CV',
    description: 'Skilled trade hiring runs on agencies and word of mouth. Shopfloor assesses practical competence directly, with employers setting the tasks, so a candidate without the right paperwork can still be evaluated properly.',
    industry: 'EDUCATION', sectors: ['HR_TECH', 'FUTURE_WORK'], stage: 'PRE_SEED', model: 'MARKETPLACE',
    founded: 2024, team: 4, seeking: 400_000,
    customers: 11, traction: 'Eleven employers running live assessments, 340 candidates placed.',
    goals: ['FUNDING', 'MENTORSHIP'] },

  { founder: 'Fatima Zahra', email: 'fatima.zahra@demo.doorkey.app', city: 'EU_AMSTERDAM',
    bio: 'Agronomist. I spent four years on farms in three countries before writing a line of code.',
    company: 'Rootline', oneLiner: 'Soil monitoring that tells growers what to do, not just what happened',
    description: 'Soil sensors produce data nobody acts on. Rootline combines in-field sensing with local agronomy models and outputs one decision per week: irrigate, fertilise, or wait. Growers pay per hectare.',
    industry: 'CLIMATE', sectors: ['AGRI', 'CIRCULAR'], stage: 'SEED', model: 'HARDWARE',
    founded: 2022, team: 13, seeking: 1_100_000, raised: 450_000, currency: 'EUR',
    revenue: 280_000, customers: 37, traction: '37 farms across the Netherlands and Spain, 4,100 hectares covered.',
    goals: ['FUNDING', 'PARTNERSHIPS'] },

  { founder: 'James Okonkwo', email: 'james.okonkwo@demo.doorkey.app', city: 'US_NYC',
    bio: 'Underwriter for nine years. I am building the system I kept asking IT for.',
    company: 'Underwrite Co', oneLiner: 'Commercial underwriting for brokers who still work in email',
    description: 'Commercial insurance submissions arrive as email attachments and get rekeyed. Underwrite Co reads the submission, prices it against the carrier appetite, and returns a quote the broker can send back the same hour.',
    industry: 'FINANCE', sectors: ['INSURTECH'], stage: 'SERIES_A', model: 'B2B_SAAS',
    founded: 2021, team: 31, seeking: 6_000_000, raised: 2_400_000, currency: 'USD',
    revenue: 2_900_000, customers: 64, growth: '2.1x year on year',
    traction: '64 broker firms, $2.9m annual recurring revenue.', goals: ['FUNDING', 'HIRING'] },

  { founder: 'Lena Fischer', email: 'lena.fischer@demo.doorkey.app', city: 'EU_BERLIN',
    bio: 'Materials scientist, ten years in battery chemistry.',
    company: 'Kathoden', oneLiner: 'Cathode material that removes cobalt without losing cycle life',
    description: 'Cobalt supply is the constraint on battery cost and the source of most of the sector ethical problems. Kathoden has a manganese-rich cathode chemistry at pilot scale, currently at 91% of the cycle life of the incumbent.',
    industry: 'INDUSTRIAL', sectors: ['MATERIALS', 'ENERGY'], stage: 'SERIES_A', model: 'DEEP_TECH',
    founded: 2020, team: 24, seeking: 8_000_000, raised: 3_500_000, currency: 'EUR',
    previous: 'Series A of €3.5m in 2023, plus €1.2m in public grants',
    traction: 'Pilot line running at 40kg a week, two automotive partners evaluating.',
    goals: ['FUNDING', 'PARTNERSHIPS', 'INTRODUCTIONS'] },

  { founder: 'Arjun Desai', email: 'arjun.desai@demo.doorkey.app', city: 'IN_MUMBAI',
    bio: 'I built lending systems at a bank. The credit decision was never the hard part.',
    company: 'Sahaj Credit', oneLiner: 'Working capital for small retailers, underwritten on their own sales data',
    description: 'Small retailers cannot borrow because they have no formal accounts. Sahaj underwrites against point of sale data with the retailer permission, lends against next month stock, and collects from daily takings.',
    industry: 'FINANCE', sectors: ['LENDING', 'PAYMENTS'], stage: 'SEED', model: 'FINTECH_INFRA',
    founded: 2023, team: 19, seeking: 2_000_000, raised: 700_000, currency: 'INR',
    customers: 2800, revenue: 420_000, growth: '2,800 retailers, from 400 a year ago',
    traction: 'Default rate under 3% across 2,800 active borrowers.', goals: ['FUNDING'] },

  { founder: 'Ciara Byrne', email: 'ciara.byrne@demo.doorkey.app', city: 'IE_DUBLIN',
    bio: 'Security engineer. I have run incident response for two breaches I am not allowed to talk about.',
    company: 'Bastion IQ', oneLiner: 'Machine identity management for companies with more services than staff',
    description: 'Most breaches now start with a credential belonging to a service, not a person. Bastion IQ inventories machine identities, finds the ones nobody owns, and rotates them without breaking the thing that was using them.',
    industry: 'SOFTWARE', sectors: ['SECURITY', 'DATA_INFRA'], stage: 'SEED', model: 'B2B_SAAS',
    founded: 2022, team: 15, seeking: 1_800_000, raised: 800_000, currency: 'EUR',
    revenue: 740_000, customers: 29, traction: '29 enterprise customers, average contract €25k.',
    goals: ['FUNDING', 'HIRING'] },

  { founder: 'Tobias Andersen', email: 'tobias.andersen@demo.doorkey.app', city: 'EU_STOCKHOLM',
    bio: 'I designed warehouse automation for a decade and watched most of it sit idle.',
    company: 'Palletwise', oneLiner: 'Warehouse robots that work with the racking you already have',
    description: 'Warehouse automation usually requires rebuilding the warehouse. Palletwise units navigate existing racking and aisle widths, so a site can automate one aisle at a time instead of all at once.',
    industry: 'INDUSTRIAL', sectors: ['ROBOTICS', 'LOGISTICS'], stage: 'SERIES_A', model: 'HARDWARE',
    founded: 2020, team: 41, seeking: 7_000_000, raised: 4_000_000, currency: 'EUR',
    revenue: 2_200_000, customers: 8, traction: 'Eight sites live, 62 units deployed.',
    goals: ['FUNDING', 'PARTNERSHIPS'] },

  { founder: 'Zoe Kaplan', email: 'zoe.kaplan@demo.doorkey.app', city: 'US_BOSTON',
    bio: 'Computational biologist. I am doing the unglamorous data work the field keeps skipping.',
    company: 'Assay Commons', oneLiner: 'Shared infrastructure for lab data that currently lives in spreadsheets',
    description: 'Wet lab results are recorded inconsistently and lost between people. Assay Commons standardises capture at the bench, links results to protocols, and makes a lab own data searchable years later.',
    industry: 'HEALTH', sectors: ['BIOTECH', 'MEDTECH'], stage: 'SEED', model: 'B2B_SAAS',
    founded: 2023, team: 10, seeking: 2_500_000, raised: 900_000, currency: 'USD',
    revenue: 380_000, customers: 22, traction: '22 labs, including four at university research centres.',
    goals: ['FUNDING', 'INTRODUCTIONS'] },

  { founder: 'Hassan Rahimi', email: 'hassan.rahimi@demo.doorkey.app', city: 'UK_LONDON',
    bio: 'I taught machine learning before I built with it. I am suspicious of most of what gets called AI.',
    company: 'Vectorly', oneLiner: 'Retrieval infrastructure for teams whose documents will not fit in a prompt',
    description: 'Retrieval systems are easy to demo and hard to run. Vectorly handles chunking, refresh and permission-aware retrieval so a team document store stays queryable as it changes, without rebuilding the index every week.',
    industry: 'SOFTWARE', sectors: ['AI_ML', 'DATA_INFRA'], stage: 'SEED', model: 'OPEN_SOURCE',
    founded: 2023, team: 7, seeking: 1_500_000, raised: 500_000,
    users: 9400, customers: 26, growth: '9,400 open source installs, 26 paying',
    traction: 'Open core with 26 paying teams on the managed version.', goals: ['FUNDING', 'HIRING'] },

  { founder: 'Grace Lim', email: 'grace.lim@demo.doorkey.app', city: 'SG_SINGAPORE',
    bio: 'Semiconductor process engineer turned founder.',
    company: 'Lattice Works', oneLiner: 'Precision fabrication for research groups priced out of foundry runs',
    description: 'Small research groups cannot afford a foundry run for a handful of devices. Lattice Works aggregates orders onto shared wafers, so a university lab can get twenty devices for the cost of a shared slot.',
    industry: 'INDUSTRIAL', sectors: ['MATERIALS', 'QUANTUM'], stage: 'SERIES_A', model: 'DEEP_TECH',
    founded: 2021, team: 22, seeking: 5_000_000, raised: 2_000_000, currency: 'SGD',
    revenue: 1_600_000, customers: 54, traction: '54 research groups served across 11 countries.',
    goals: ['FUNDING', 'PARTNERSHIPS'] },

  { founder: 'Rebecca Turner', email: 'rebecca.turner@demo.doorkey.app', city: 'UK_SCOTLAND',
    bio: 'I ran a community care service for six years. The software we were given made the job harder.',
    company: 'Pallia', oneLiner: 'Scheduling for community care teams built around travel time',
    description: 'Community care rotas are built on assumptions about travel that do not survive a rural round. Pallia schedules against real journey times, so carers stop absorbing the gap between the plan and the road.',
    industry: 'HEALTH', sectors: ['CARE', 'DIGITAL_HEALTH'], stage: 'SEED', model: 'B2B_SAAS',
    founded: 2022, team: 12, seeking: 750_000, raised: 300_000,
    revenue: 290_000, customers: 19, traction: '19 care providers, 2,400 carers scheduled daily.',
    goals: ['FUNDING', 'MENTORSHIP', 'PARTNERSHIPS'] },

  { founder: 'Yusuf Adeyemi', email: 'yusuf.adeyemi@demo.doorkey.app', city: 'UK_LONDON',
    bio: 'Second-time founder. The first one failed and I learned more from that than from the years before it.',
    company: 'Counterweight', oneLiner: 'Pricing software for wholesalers who still quote from memory',
    description: 'Wholesale pricing is set by whoever picks up the phone. Counterweight gives sales teams a defensible price per customer per volume, based on the margin the business actually needs rather than last year list.',
    industry: 'COMMERCE', sectors: ['RETAIL_TECH', 'MARKETPLACES'], stage: 'PRE_SEED', model: 'B2B_SAAS',
    founded: 2024, team: 3, seeking: 350_000,
    customers: 5, traction: 'Five wholesalers on paid pilots, £4.2m of quotes priced.',
    goals: ['FUNDING', 'MENTORSHIP', 'HIRING'] },

  { founder: 'Isabelle Moreau', email: 'isabelle.moreau@demo.doorkey.app', city: 'EU_PARIS',
    bio: 'Former buyer for a department store group. I know exactly how much stock gets written off.',
    company: 'Seconde', oneLiner: 'Resale infrastructure that brands can run under their own name',
    description: 'Brands want a resale channel but not the operations behind it. Seconde handles authentication, grading, pricing and fulfilment, and presents it as the brand own storefront.',
    industry: 'COMMERCE', sectors: ['DTC', 'RETAIL_TECH', 'CIRCULAR'], stage: 'SEED', model: 'MARKETPLACE',
    founded: 2023, team: 18, seeking: 1_800_000, raised: 700_000, currency: 'EUR',
    revenue: 910_000, customers: 7, growth: 'Revenue up 3.1x year on year',
    traction: 'Seven brand partners, 41,000 items resold.', goals: ['FUNDING', 'PARTNERSHIPS'] },
];

/* --------------------------------------------------------------- runner */

async function main() {
  console.info('Seeding Doorkey…');

  // Controlled vocabulary first: everything else references it.
  for (const industry of INDUSTRIES) {
    const record = await prisma.industry.upsert({
      where: { code: industry.code },
      create: { code: industry.code, name: industry.name },
      update: { name: industry.name },
    });
    for (const [code, name] of industry.sectors) {
      await prisma.sector.upsert({
        where: { code },
        create: { code, name, industryId: record.id },
        update: { name, industryId: record.id },
      });
    }
  }

  for (const geo of GEOGRAPHIES) {
    await prisma.geography.upsert({
      where: { code: geo.code },
      create: { code: geo.code, name: geo.name, region: geo.region, isAny: 'isAny' in geo ? geo.isAny : false },
      update: { name: geo.name, region: geo.region },
    });
  }

  const sectors = new Map((await prisma.sector.findMany()).map((s) => [s.code, s.id]));
  const industries = new Map((await prisma.industry.findMany()).map((i) => [i.code, i.id]));
  const geographies = new Map((await prisma.geography.findMany()).map((g) => [g.code, g.id]));
  console.info(`  vocabulary: ${industries.size} industries, ${sectors.size} sectors, ${geographies.size} geographies`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const verifiedAt = new Date();

  // An administrator, so the admin panel can be opened straight away.
  await prisma.user.upsert({
    where: { email: 'admin@demo.doorkey.app' },
    create: {
      email: 'admin@demo.doorkey.app', passwordHash, role: 'ADMIN', isDemo: true,
      emailVerifiedAt: verifiedAt, onboardingCompletedAt: verifiedAt, onboardingStep: 99,
      profile: { create: { displayName: 'Doorkey Admin', slug: 'doorkey-admin', headline: 'Platform administration', visibility: 'PRIVATE' } },
      verifications: { create: { type: 'EMAIL', status: 'VERIFIED' } },
    },
    update: {},
  });

  const investorUserIds: string[] = [];
  for (const seed of INVESTORS) {
    const org = seed.org
      ? await prisma.organization.upsert({
          where: { slug: slugify(seed.org) },
          create: { name: seed.org, slug: slugify(seed.org), verified: true },
          update: {},
        })
      : null;

    const user = await prisma.user.upsert({
      where: { email: seed.email },
      create: {
        email: seed.email, passwordHash, role: 'INVESTOR', isDemo: true,
        emailVerifiedAt: verifiedAt, onboardingCompletedAt: verifiedAt, onboardingStep: 99,
        profile: {
          create: {
            displayName: seed.name, slug: slugify(seed.name), headline: seed.headline, bio: seed.bio,
            geographyId: geographies.get(seed.city), visibility: 'PUBLIC', completion: 100,
            investor: {
              create: {
                investorType: seed.type, organizationId: org?.id, thesis: seed.thesis, expertise: [...seed.expertise],
                preference: {
                  create: {
                    stages: seed.stages as never, minCheque: seed.min, maxCheque: seed.max,
                    currency: (seed.currency ?? 'GBP') as never,
                    sectors: { connect: seed.sectors.map((c) => ({ id: sectors.get(c)! })) },
                    geographies: { connect: seed.geos.map((c) => ({ id: geographies.get(c)! })) },
                  },
                },
                portfolio: seed.portfolio
                  ? { create: seed.portfolio.map(([name, year, note]) => ({ name, year, note })) }
                  : undefined,
              },
            },
          },
        },
        verifications: {
          create: [
            { type: 'EMAIL', status: 'VERIFIED' },
            { type: 'INVESTOR_REVIEW', status: org ? 'VERIFIED' : 'PENDING' },
            ...(org ? [{ type: 'ORGANIZATION' as const, status: 'VERIFIED' as const }] : []),
          ],
        },
      },
      update: {},
    });
    investorUserIds.push(user.id);
  }
  console.info(`  investors: ${investorUserIds.length}`);

  const founderUserIds: string[] = [];
  for (const seed of STARTUPS) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      create: {
        email: seed.email, passwordHash, role: 'ENTREPRENEUR', isDemo: true,
        emailVerifiedAt: verifiedAt, onboardingCompletedAt: verifiedAt, onboardingStep: 99,
        profile: {
          create: {
            displayName: seed.founder, slug: slugify(seed.founder),
            headline: `${seed.title ?? 'Founder'} at ${seed.company}`, bio: seed.bio,
            geographyId: geographies.get(seed.city), visibility: 'PUBLIC', completion: 100,
            entrepreneur: { create: { goals: seed.goals as never } },
          },
        },
        verifications: { create: [{ type: 'EMAIL', status: 'VERIFIED' }, { type: 'STARTUP_REVIEW', status: 'PENDING' }] },
      },
      update: {},
    });

    const profile = await prisma.profile.findUniqueOrThrow({ where: { userId: user.id } });

    const startup = await prisma.startup.upsert({
      where: { slug: slugify(seed.company) },
      create: {
        slug: slugify(seed.company), name: seed.company, oneLiner: seed.oneLiner, description: seed.description,
        industryId: industries.get(seed.industry)!, geographyId: geographies.get(seed.city),
        stage: seed.stage as never, businessModel: seed.model as never,
        foundedYear: seed.founded, teamSize: seed.team,
        amountSeeking: seed.seeking ?? null, amountRaised: seed.raised ?? null,
        currency: (seed.currency ?? 'GBP') as never, previousFunding: seed.previous ?? null,
        revenueAnnual: seed.revenue ?? null, userCount: seed.users ?? null, customerCount: seed.customers ?? null,
        growthNote: seed.growth ?? null, tractionNote: seed.traction ?? null,
        isDemo: true, visibility: 'PUBLIC',
        sectors: { connect: seed.sectors.map((c) => ({ id: sectors.get(c)! })) },
      },
      update: {},
    });

    await prisma.founder.upsert({
      where: { profileId_startupId: { profileId: profile.id, startupId: startup.id } },
      create: { profileId: profile.id, startupId: startup.id, title: seed.title ?? 'Founder', isPrimary: true },
      update: {},
    });

    founderUserIds.push(user.id);
  }
  console.info(`  founders and startups: ${founderUserIds.length}`);

  // A handful of accepted connections with a conversation, so the product is
  // not empty on first run. Pairs are deterministic, not random.
  const pairs: Array<[string, string]> = [
    [founderUserIds[0], investorUserIds[2]],
    [founderUserIds[2], investorUserIds[0]],
    [founderUserIds[7], investorUserIds[5]],
    [founderUserIds[6], investorUserIds[4]],
  ];

  for (const [founderId, investorId] of pairs) {
    if (!founderId || !investorId) continue;
    const [a, b] = founderId < investorId ? [founderId, investorId] : [investorId, founderId];
    const existing = await prisma.connection.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
    if (existing) continue;

    const request = await prisma.connectionRequest.create({
      data: {
        requesterId: founderId, recipientId: investorId, status: 'ACCEPTED',
        message: 'Saw that you invest at our stage and in our sector. Would value twenty minutes.',
        respondedAt: new Date(),
      },
    });
    const conversation = await prisma.conversation.create({
      data: { participants: { create: [{ userId: founderId }, { userId: investorId }] } },
    });
    await prisma.connection.create({ data: { userAId: a, userBId: b, requestId: request.id, conversationId: conversation.id } });
    await prisma.message.create({
      data: { conversationId: conversation.id, senderId: founderId, body: 'Thanks for accepting. Happy to send the deck across, or talk through it live if that is easier.' },
    });
    await prisma.message.create({
      data: { conversationId: conversation.id, senderId: investorId, body: 'Send it over and I will read before we speak. What does the round look like at the moment?' },
    });
  }

  // Two requests left pending, so the connections screen has something in it.
  for (const [founderIdx, investorIdx] of [[1, 1], [4, 9]] as const) {
    const requesterId = founderUserIds[founderIdx];
    const recipientId = investorUserIds[investorIdx];
    if (!requesterId || !recipientId) continue;
    await prisma.connectionRequest.upsert({
      where: { requesterId_recipientId: { requesterId, recipientId } },
      create: { requesterId, recipientId, message: 'We are raising and your thesis lines up closely with what we are building.' },
      update: {},
    });
    await prisma.notification.create({
      data: {
        userId: recipientId, actorId: requesterId, type: 'CONNECTION_REQUEST',
        title: 'A founder would like to connect', body: 'Open connections to read their note.', url: '/connections',
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    investors: await prisma.investorProfile.count(),
    startups: await prisma.startup.count(),
    founders: await prisma.founder.count(),
    connections: await prisma.connection.count(),
  };

  console.info('\nSeed complete:');
  console.table(counts);
  console.info(`\nSign in with any seeded address and the password: ${DEMO_PASSWORD}`);
  console.info('For example  amara.okonjo@demo.doorkey.app  (founder)');
  console.info('             priya.raghavan@demo.doorkey.app (investor)');
  console.info('             admin@demo.doorkey.app          (admin)\n');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
