import type { Resume } from '../../resume/resume.schema';

interface ClassicTemplateProps {
  data: Resume;
}

export function ClassicTemplate({ data }: ClassicTemplateProps) {
  const sections = (data.sections ?? []).filter(
    (section) => section?.entries?.length,
  );

  return (
    <article className="mx-auto max-w-4xl bg-white px-8 py-10 font-serif text-gray-900">
      {sections.map((section, sectionIndex) => (
        <section
          className="mb-8 last:mb-0"
          key={`${section.type}-${section.title}-${sectionIndex}`}
        >
          <h2 className="mb-4 border-b-2 border-gray-800 pb-2 text-xl font-bold uppercase tracking-wide">
            {section.title}
          </h2>
          <div className="space-y-5">
            {section.entries.map((entry, entryIndex) => (
              <div key={`${entry.title}-${entryIndex}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="text-lg font-semibold">{entry.title}</h3>
                  {(entry.startDate || entry.endDate) && (
                    <p className="shrink-0 text-sm">
                      {entry.startDate}
                      {entry.startDate && entry.endDate ? ' – ' : ''}
                      {entry.endDate}
                    </p>
                  )}
                </div>
                {entry.subtitle && (
                  <p className="mt-0.5 text-sm italic text-gray-700">{entry.subtitle}</p>
                )}
                {entry.description && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
                    {entry.description}
                  </p>
                )}
                {entry.bullets && entry.bullets.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                    {entry.bullets.map((bullet, bulletIndex) => (
                      <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
