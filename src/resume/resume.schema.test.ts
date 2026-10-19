import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { resumeSchema } from './resume.schema';

// ---------------------------------------------------------------------------
// Sample A – Experience-heavy chronological resume
// ---------------------------------------------------------------------------

const sampleA = {
  sections: [
    {
      type: 'summary',
      title: 'Professional Summary',
      entries: [
        {
          title: 'Senior Full-Stack Engineer',
          description:
            '8 years delivering high-traffic web applications for fintech and e-commerce clients.',
        },
      ],
    },
    {
      type: 'experience',
      title: 'Work Experience',
      entries: [
        {
          title: 'Senior Software Engineer',
          subtitle: 'Paystack',
          startDate: 'Mar 2021',
          endDate: 'Present',
          bullets: [
            'Architected a real-time payment notification pipeline handling 50k events/s.',
            'Reduced checkout abandonment by 18% through A/B-tested UX changes.',
            'Led migration from REST to GraphQL across four internal services.',
          ],
        },
        {
          title: 'Software Engineer',
          subtitle: 'Flutterwave',
          startDate: 'Aug 2018',
          endDate: 'Feb 2021',
          bullets: [
            'Built and maintained the merchant dashboard used by 12,000+ businesses.',
            'Introduced integration tests that cut regression escapes by 60%.',
          ],
        },
        {
          title: 'Junior Developer',
          subtitle: 'Andela',
          startDate: 'Jan 2016',
          endDate: 'Jul 2018',
          bullets: [
            'Developed RESTful APIs for two client projects using Node.js and Express.',
          ],
        },
      ],
    },
    {
      type: 'skills',
      title: 'Skills',
      entries: [
        {
          title: 'Languages',
          bullets: ['TypeScript', 'JavaScript', 'Python', 'SQL'],
        },
        {
          title: 'Frameworks & Tools',
          bullets: ['Node.js', 'React', 'Express', 'Prisma', 'PostgreSQL', 'Redis'],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Sample B – Education-focused academic resume (no work experience)
// ---------------------------------------------------------------------------

const sampleB = {
  sections: [
    {
      type: 'summary',
      title: 'About',
      entries: [
        {
          title: 'PhD Candidate in Computer Science',
          description:
            'Researching distributed consensus algorithms with a focus on Byzantine fault tolerance.',
        },
      ],
    },
    {
      type: 'education',
      title: 'Academic Background',
      entries: [
        {
          title: 'PhD, Computer Science',
          subtitle: 'University of Cambridge',
          startDate: 'Sep 2022',
          endDate: 'Present',
          description: 'Thesis: Adaptive BFT Protocols for Geo-Distributed Ledgers.',
          bullets: [
            'Awarded the Winston Churchill Scholarship.',
            'Published two peer-reviewed papers at SOSP and OSDI.',
          ],
        },
        {
          title: 'MSc, Distributed Computing',
          subtitle: 'University of Edinburgh',
          startDate: 'Sep 2020',
          endDate: 'Aug 2022',
          bullets: [
            'Distinction. Dissertation: Evaluating Raft vs Paxos under partial network partitions.',
          ],
        },
        {
          title: 'BSc, Mathematics & Computer Science',
          subtitle: 'University of Lagos',
          startDate: 'Sep 2016',
          endDate: 'Jun 2020',
          bullets: ['First Class Honours. Best final-year project award.'],
        },
      ],
    },
    {
      type: 'projects',
      title: 'Research Projects',
      entries: [
        {
          title: 'AdaptiveBFT',
          subtitle: 'Go · gRPC · Docker',
          description:
            'Open-source implementation of an adaptive Byzantine fault-tolerant consensus protocol.',
          bullets: ['300+ GitHub stars within first month of release.'],
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Sample C – Project-based and skills-heavy portfolio resume
// ---------------------------------------------------------------------------

const sampleC = {
  sections: [
    {
      type: 'skills',
      title: 'Technical Skills',
      entries: [
        {
          title: 'Frontend',
          bullets: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Framer Motion'],
        },
        {
          title: 'Backend',
          bullets: ['Node.js', 'Express', 'Prisma', 'PostgreSQL', 'Redis', 'GraphQL'],
        },
        {
          title: 'DevOps & Cloud',
          bullets: ['Docker', 'GitHub Actions', 'Vercel', 'GCP', 'Terraform'],
        },
      ],
    },
    {
      type: 'projects',
      title: 'Featured Projects',
      entries: [
        {
          title: 'ATS Platform',
          subtitle: 'TypeScript · Express · Prisma · PostgreSQL',
          startDate: 'Jun 2026',
          endDate: 'Present',
          description:
            'Full-featured applicant tracking system with AI-assisted resume scoring and JSONB content storage.',
          bullets: [
            'Designed extensible JSON resume schema with Zod runtime validation.',
            'Implemented event-driven status transitions via transactional outbox pattern.',
            '95%+ integration test coverage on all HTTP routes.',
          ],
        },
        {
          title: 'RealtimeCollab',
          subtitle: 'Next.js · WebSockets · CRDTs · Redis',
          startDate: 'Jan 2026',
          endDate: 'May 2026',
          description: 'Google Docs-style collaborative editor with CRDT-based conflict resolution.',
          bullets: [
            'Supports 200 concurrent editors per document with < 50 ms sync latency.',
            'Open-sourced under MIT; 1,200+ GitHub stars.',
          ],
        },
        {
          title: 'Budgetr',
          subtitle: 'React Native · Expo · Firebase',
          startDate: 'Aug 2025',
          endDate: 'Dec 2025',
          description: 'Mobile personal finance tracker with receipt OCR and category auto-tagging.',
          bullets: [
            '4.7/5 rating on the App Store with 3,000+ downloads in first month.',
          ],
        },
      ],
    },
    {
      type: 'education',
      title: 'Education',
      entries: [
        {
          title: 'BSc Computer Science',
          subtitle: 'Covenant University',
          startDate: 'Sep 2018',
          endDate: 'Jul 2022',
        },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resumeSchema', () => {
  describe('valid resumes', () => {
    it('Sample A – experience-heavy chronological resume passes validation', () => {
      expect(() => resumeSchema.parse(sampleA)).not.toThrow();
    });

    it('Sample B – education-focused academic resume passes validation', () => {
      expect(() => resumeSchema.parse(sampleB)).not.toThrow();
    });

    it('Sample C – project-based portfolio resume passes validation', () => {
      expect(() => resumeSchema.parse(sampleC)).not.toThrow();
    });

    it('parses and returns a typed Resume object with correct section count', () => {
      const result = resumeSchema.parse(sampleA);
      expect(result.sections).toHaveLength(3);
      expect(result.sections[1].type).toBe('experience');
      expect(result.sections[1].entries).toHaveLength(3);
    });

    it('accepts entries with only the required title field', () => {
      expect(() =>
        resumeSchema.parse({
          sections: [{ type: 'skills', title: 'Skills', entries: [{ title: 'Node.js' }] }],
        }),
      ).not.toThrow();
    });

    it('accepts a resume with an empty sections array', () => {
      expect(() => resumeSchema.parse({ sections: [] })).not.toThrow();
    });
  });

  describe('invalid resumes', () => {
    it('throws ZodError when a section has an invalid type ("hobbies")', () => {
      const malformed = {
        sections: [
          {
            type: 'hobbies', // not in enum
            title: 'Hobbies & Interests',
            entries: [{ title: 'Rock climbing' }],
          },
        ],
      };

      expect(() => resumeSchema.parse(malformed)).toThrowError(ZodError);

      try {
        resumeSchema.parse(malformed);
      } catch (err) {
        expect(err).toBeInstanceOf(ZodError);
        const zodErr = err as ZodError;
        const paths = zodErr.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('sections.0.type');
        // Zod v4 renamed the enum error code from `invalid_enum_value` to `invalid_value`
        expect(zodErr.issues[0].code).toBe('invalid_value');
      }
    });

    it('throws ZodError when entry title is missing', () => {
      expect(() =>
        resumeSchema.parse({
          sections: [
            {
              type: 'experience',
              title: 'Work Experience',
              entries: [{ subtitle: 'Some Corp' }], // title is required
            },
          ],
        }),
      ).toThrowError(ZodError);
    });

    it('throws ZodError when sections field is absent from the root object', () => {
      expect(() => resumeSchema.parse({})).toThrowError(ZodError);
    });

    it('throws ZodError when bullets contains a non-string value', () => {
      expect(() =>
        resumeSchema.parse({
          sections: [
            {
              type: 'skills',
              title: 'Skills',
              entries: [{ title: 'Languages', bullets: ['TypeScript', 42] }],
            },
          ],
        }),
      ).toThrowError(ZodError);
    });
  });
});
