// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { Resume } from '../../resume/resume.schema';
import { ClassicTemplate, ModernTemplate, ResumeViewer } from './index';

const mockResumeData: Resume = {
  sections: [
    {
      type: 'summary',
      title: 'Professional Summary',
      entries: [
        {
          title: 'Frontend engineer',
          description: 'Implemented a custom React renderer',
        },
      ],
    },
    {
      type: 'experience',
      title: 'Experience',
      entries: [
        {
          title: 'Principal UI Engineer',
          subtitle: 'Northstar Labs',
          startDate: '2021',
          endDate: '2025',
          bullets: ['Designed reliable accessible product interfaces'],
        },
      ],
    },
    {
      type: 'education',
      title: 'Education',
      entries: [
        {
          title: 'B.S. in Computer Science',
          subtitle: 'Lakeview University',
          startDate: '2015',
          endDate: '2019',
        },
      ],
    },
    {
      type: 'projects',
      title: 'Projects',
      entries: [
        {
          title: 'Atlas Design System',
          description: 'Built a reusable component platform for product teams',
        },
      ],
    },
    {
      type: 'skills',
      title: 'Skills',
      entries: [{ title: 'React' }, { title: 'TypeScript' }],
    },
  ],
};

const renderedContent = [
  'Implemented a custom React renderer',
  'Principal UI Engineer',
  'B.S. in Computer Science',
  'React',
  'TypeScript',
];

afterEach(cleanup);

describe('resume templates', () => {
  it('renders the resume content in the classic template', () => {
    render(<ClassicTemplate data={mockResumeData} />);

    for (const text of renderedContent) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('renders the same resume content in the modern template', () => {
    render(<ModernTemplate data={mockResumeData} />);

    for (const text of renderedContent) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('routes to the modern layout in the viewer', () => {
    render(<ResumeViewer data={mockResumeData} templateId="modern" />);

    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Implemented a custom React renderer')).toBeInTheDocument();
  });

  it('omits headings for sections with no entries', () => {
    const partialResume: Resume = {
      sections: [
        mockResumeData.sections[0],
        mockResumeData.sections[1],
        { type: 'projects', title: 'Empty Projects', entries: [] },
        { type: 'education', title: 'Empty Education', entries: [] },
      ],
    };

    const { rerender } = render(<ClassicTemplate data={partialResume} />);
    expect(screen.queryByText('Empty Projects')).not.toBeInTheDocument();
    expect(screen.queryByText('Empty Education')).not.toBeInTheDocument();

    rerender(<ModernTemplate data={partialResume} />);
    expect(screen.queryByText('Empty Projects')).not.toBeInTheDocument();
    expect(screen.queryByText('Empty Education')).not.toBeInTheDocument();
  });
});
