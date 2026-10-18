import type { Resume, ResumeSection } from '../../resume/resume.schema';

interface ModernTemplateProps {
  data: Resume;
}

function ResumeSectionView({ section }: { section: ResumeSection }) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="mb-4 border-b border-gray-300 pb-2 text-lg font-semibold uppercase tracking-wider text-gray-900">
        {section.title}
      </h2>
      <div className="space-y-5">
        {section.entries.map((entry, entryIndex) => (
          <div key={`${entry.title}-${entryIndex}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h3 className="font-semibold text-gray-900">{entry.title}</h3>
              {(entry.startDate || entry.endDate) && (
                <p className="text-sm text-gray-500">
                  {entry.startDate}
                  {entry.startDate && entry.endDate ? ' – ' : ''}
                  {entry.endDate}
                </p>
              )}
            </div>
            {entry.subtitle && (
              <p className="mt-0.5 text-sm text-gray-500">{entry.subtitle}</p>
            )}
            {entry.description && (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                {entry.description}
              </p>
            )}
            {entry.bullets && entry.bullets.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
                {entry.bullets.map((bullet, bulletIndex) => (
                  <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ModernTemplate({ data }: ModernTemplateProps) {
  const sections = (data.sections ?? []).filter(
    (section) => section?.entries?.length,
  );
  const sidebarSections = sections.filter((section) =>
    ['summary', 'skills'].includes(section.type),
  );
  const mainSections = sections.filter(
    (section) => !['summary', 'skills'].includes(section.type),
  );

  return (
    <article className="mx-auto grid max-w-5xl grid-cols-1 overflow-hidden bg-white font-sans text-gray-800 md:grid-cols-[minmax(14rem,1fr)_2fr]">
      <aside className="bg-gray-50 px-6 py-8 md:px-8">
        {sidebarSections.map((section, sectionIndex) => (
          <div key={`${section.type}-${section.title}-${sectionIndex}`}>
            <ResumeSectionView section={section} />
          </div>
        ))}
      </aside>
      <main className="px-6 py-8 md:px-10">
        {mainSections.map((section, sectionIndex) => (
          <ResumeSectionView
            key={`${section.type}-${section.title}-${sectionIndex}`}
            section={section}
          />
        ))}
      </main>
    </article>
  );
}
