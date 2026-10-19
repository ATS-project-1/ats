import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import puppeteer from 'puppeteer';
import type { Resume } from './resume.schema';
import { ClassicTemplate, ModernTemplate } from '../components/resume-templates';

export const pdfService = {
  async generatePdf(resumeData: Resume, templateId: string): Promise<Buffer> {
    const Template = templateId.toLowerCase() === 'modern' ? ModernTemplate : ClassicTemplate;
    const markup = renderToStaticMarkup(createElement(Template, { data: resumeData }));
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <title>Resume</title>
  </head>
  <body>${markup}</body>
</html>`;
    const browser = await puppeteer.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.waitForNetworkIdle({ idleTime: 500, concurrency: 0 });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  },
};
