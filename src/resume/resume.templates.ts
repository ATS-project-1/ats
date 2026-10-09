import { FullResumeData } from './resume.schema';

export type TemplateType = 'MODERN' | 'CLASSIC' | 'MINIMAL';

const renderEntries = (entries: any[]) => {
  return entries
    .map(
      (entry) => `
      <div class="entry">
        <div class="entry-header">
          <strong>${entry.title}</strong> ${entry.subtitle ? `<span>| ${entry.subtitle}</span>` : ''}
          <span class="dates">${entry.startDate || ''} ${entry.endDate ? `- ${entry.endDate}` : entry.isCurrent ? '- Present' : ''}</span>
        </div>
        ${entry.description ? `<p>${entry.description}</p>` : ''}
        ${
          entry.highlights && entry.highlights.length > 0
            ? `<ul>${entry.highlights.map((h: string) => `<li>${h}</li>`).join('')}</ul>`
            : ''
        }
      </div>`
    )
    .join('');
};

const renderSections = (sections: any[]) => {
  return sections
    .sort((a, b) => a.order - b.order)
    .map(
      (sec) => `
      <section class="section">
        <h2>${sec.title}</h2>
        ${sec.content ? `<p class="section-content">${sec.content}</p>` : ''}
        ${sec.entries ? renderEntries(sec.entries) : ''}
      </section>`
    )
    .join('');
};

export const renderResumeHtml = (data: FullResumeData, template: TemplateType = 'MODERN'): string => {
  const { personalInfo, sections } = data;

  const styles = {
    MODERN: `
      body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; color: #333; line-height: 1.5; }
      h1 { color: #2563eb; margin-bottom: 5px; font-size: 28px; }
      .contact { font-size: 13px; color: #666; margin-bottom: 25px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
      h2 { color: #1e40af; font-size: 18px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; text-transform: uppercase; margin-top: 20px; }
      .entry { margin-bottom: 12px; }
      .entry-header { display: flex; justify-content: space-between; font-size: 14px; }
      .dates { color: #6b7280; font-size: 12px; }
      ul { margin: 5px 0 0 20px; padding: 0; font-size: 13px; }
    `,
    CLASSIC: `
      body { font-family: 'Times New Roman', Georgia, serif; margin: 0; padding: 40px; color: #111; line-height: 1.4; }
      h1 { text-align: center; margin-bottom: 5px; font-size: 30px; text-transform: uppercase; }
      .contact { text-align: center; font-size: 12px; margin-bottom: 20px; border-bottom: 1px solid #000; padding-bottom: 8px; }
      h2 { font-size: 16px; border-bottom: 1px solid #000; text-transform: uppercase; margin-top: 18px; }
      .entry { margin-bottom: 10px; }
      .entry-header { display: flex; justify-content: space-between; }
      .dates { font-style: italic; }
      ul { margin: 4px 0 0 18px; padding: 0; font-size: 13px; }
    `,
    MINIMAL: `
      body { font-family: 'Courier New', Courier, monospace; margin: 0; padding: 30px; color: #222; }
      h1 { font-size: 24px; margin-bottom: 2px; }
      .contact { font-size: 12px; margin-bottom: 20px; color: #444; }
      h2 { font-size: 15px; background: #f3f4f6; padding: 3px 6px; margin-top: 15px; }
      .entry { margin-bottom: 10px; }
      .entry-header { display: flex; justify-content: space-between; font-weight: bold; }
      ul { margin: 4px 0 0 15px; padding: 0; }
    `,
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>${styles[template] || styles.MODERN}</style>
      </head>
      <body>
        <h1>${personalInfo.fullName}</h1>
        <div class="contact">
          ${personalInfo.email} | ${personalInfo.phone || ''} | ${personalInfo.location || ''}
          ${personalInfo.linkedin ? ` | ${personalInfo.linkedin}` : ''}
          ${personalInfo.github ? ` | ${personalInfo.github}` : ''}
        </div>
        ${renderSections(sections)}
      </body>
    </html>
  `;
};