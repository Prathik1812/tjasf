export interface SubjectDiscipline {
  id: string;
  name: string;
  code: string;
  domainName: string;
  domainSlug: string;
  domainId?: string;
}

export interface DomainGroup {
  domainName: string;
  domainSlug: string;
  subjects: SubjectDiscipline[];
}

export const DOMAIN_DISCIPLINES: DomainGroup[] = [
  {
    domainName: 'Engineering & Technology',
    domainSlug: 'engineering',
    subjects: [
      { id: 'cse', name: 'Computer Science & Engineering', code: 'CSE', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'ece', name: 'Electronics & Communication Engineering', code: 'ECE', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'eee', name: 'Electrical & Electronics Engineering', code: 'EEE', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'mech', name: 'Mechanical Engineering', code: 'MECH', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'civil', name: 'Civil & Structural Engineering', code: 'CIVIL', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'chem_eng', name: 'Chemical & Process Engineering', code: 'CHEM', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'bme', name: 'Biomedical & Clinical Engineering', code: 'BME', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'aero', name: 'Aerospace & Aeronautical Engineering', code: 'AERO', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'mate', name: 'Materials & Metallurgical Engineering', code: 'MATE', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'ind', name: 'Industrial & Manufacturing Engineering', code: 'IND', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'auto', name: 'Automotive & Transportation Engineering', code: 'AUTO', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'mar', name: 'Marine & Ocean Engineering', code: 'MAR', domainName: 'Engineering & Technology', domainSlug: 'engineering' },
      { id: 'gen_eng', name: 'General & Interdisciplinary Engineering', code: 'ENG', domainName: 'Engineering & Technology', domainSlug: 'engineering' }
    ]
  },
  {
    domainName: 'Computational Science & Information Technology',
    domainSlug: 'computational-science',
    subjects: [
      { id: 'aiml', name: 'Artificial Intelligence & Machine Learning', code: 'AIML', domainName: 'Computational Science & Information Technology', domainSlug: 'computational-science' },
      { id: 'ds', name: 'Data Science & Big Data Analytics', code: 'DS', domainName: 'Computational Science & Information Technology', domainSlug: 'computational-science' },
      { id: 'cyber', name: 'Cybersecurity, Information Security & Cryptography', code: 'CYBER', domainName: 'Computational Science & Information Technology', domainSlug: 'computational-science' },
      { id: 'cloud', name: 'Cloud Computing, Distributed Systems & DevOps', code: 'CLOUD', domainName: 'Computational Science & Information Technology', domainSlug: 'computational-science' },
      { id: 'iot', name: 'Internet of Things (IoT) & Embedded Systems', code: 'IOT', domainName: 'Computational Science & Information Technology', domainSlug: 'computational-science' },
      { id: 'rob', name: 'Robotics, Automation & Mechatronics', code: 'ROB', domainName: 'Computational Science & Information Technology', domainSlug: 'computational-science' },
      { id: 'se', name: 'Software Engineering & Information Systems', code: 'SE', domainName: 'Computational Science & Information Technology', domainSlug: 'computational-science' },
      { id: 'hpc', name: 'High-Performance & Quantum Computing', code: 'HPC', domainName: 'Computational Science & Information Technology', domainSlug: 'computational-science' }
    ]
  },
  {
    domainName: 'Physical Sciences & Applied Mathematics',
    domainSlug: 'physical-sciences',
    subjects: [
      { id: 'phys', name: 'Applied Physics, Optics & Photonics', code: 'PHYS', domainName: 'Physical Sciences & Applied Mathematics', domainSlug: 'physical-sciences' },
      { id: 'chm', name: 'Applied Chemistry & Molecular Sciences', code: 'CHM', domainName: 'Physical Sciences & Applied Mathematics', domainSlug: 'physical-sciences' },
      { id: 'math', name: 'Pure, Applied & Computational Mathematics', code: 'MATH', domainName: 'Physical Sciences & Applied Mathematics', domainSlug: 'physical-sciences' },
      { id: 'nano', name: 'Materials Science & Nanotechnology', code: 'NANO', domainName: 'Physical Sciences & Applied Mathematics', domainSlug: 'physical-sciences' },
      { id: 'stat', name: 'Applied Statistics, Modeling & Optimization', code: 'STAT', domainName: 'Physical Sciences & Applied Mathematics', domainSlug: 'physical-sciences' }
    ]
  },
  {
    domainName: 'Environmental Systems & Sustainable Technologies',
    domainSlug: 'environmental-systems',
    subjects: [
      { id: 'energy', name: 'Renewable Energy, Smart Grids & Power Systems', code: 'ENERGY', domainName: 'Environmental Systems & Sustainable Technologies', domainSlug: 'environmental-systems' },
      { id: 'env', name: 'Environmental Science, Ecology & Climate Systems', code: 'ENV', domainName: 'Environmental Systems & Sustainable Technologies', domainSlug: 'environmental-systems' },
      { id: 'earth', name: 'Earth, Atmospheric & Planetary Sciences', code: 'EARTH', domainName: 'Environmental Systems & Sustainable Technologies', domainSlug: 'environmental-systems' },
      { id: 'sust', name: 'Sustainable Technologies & Green Engineering', code: 'SUST', domainName: 'Environmental Systems & Sustainable Technologies', domainSlug: 'environmental-systems' }
    ]
  }
];

// Flat list of all subjects
export const ALL_SUBJECTS: SubjectDiscipline[] = DOMAIN_DISCIPLINES.flatMap((g) => g.subjects);

// Helper to find a subject by id or code
export function findSubject(identifier: string): SubjectDiscipline | undefined {
  if (!identifier) return undefined;
  const lower = identifier.toLowerCase().trim();
  return ALL_SUBJECTS.find(
    (s) => s.id.toLowerCase() === lower || s.code.toLowerCase() === lower || s.name.toLowerCase() === lower
  );
}

// Format: YEAR-SUBJECTCODE-MMDD-SEQ (e.g., 2026-CSE-0924-01)
export function generateTrackingCode(subjectCode: string, sequenceNumber: number = 1): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  const code = (subjectCode || 'ENG').toUpperCase().trim();
  const seq = String(sequenceNumber).padStart(2, '0');
  return `${year}-${code}-${month}${date}-${seq}`;
}

// Display helper that returns tracking code or fallback
export function getManuscriptDisplayCode(m: { id: string; tracking_code?: string }): string {
  if (m.tracking_code && m.tracking_code.trim().length > 0) {
    return m.tracking_code;
  }
  return m.id ? m.id.substring(0, 8).toUpperCase() : 'UNKNOWN';
}
