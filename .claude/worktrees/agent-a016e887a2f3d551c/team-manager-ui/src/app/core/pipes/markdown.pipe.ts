import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

// Angular sanitizes any string bound via [innerHTML] automatically, so this just needs to
// produce HTML — no separate DomSanitizer step required.
@Pipe({ name: 'markdown', standalone: true, pure: true })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return marked.parse(value, { async: false }) as string;
  }
}
