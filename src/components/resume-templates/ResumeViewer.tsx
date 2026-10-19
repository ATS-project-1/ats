import type { Resume } from '../../resume/resume.schema';
import { ClassicTemplate } from './ClassicTemplate';
import { ModernTemplate } from './ModernTemplate';

interface ResumeViewerProps {
  data: Resume;
  templateId: string;
}

export function ResumeViewer({ data, templateId }: ResumeViewerProps) {
  switch (templateId.toLowerCase()) {
    case 'modern':
      return <ModernTemplate data={data} />;
    case 'classic':
    default:
      return <ClassicTemplate data={data} />;
  }
}
