import { Pipe, PipeTransform } from '@angular/core';

const LABELS: Record<string, string> = {
  Planned: 'Planned',
  InProgress: 'In Progress',
  Completed: 'Completed',
  ReadyForRelease: 'Ready for Release',
  Released: 'Released',
};

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(value: string): string {
    return LABELS[value] ?? value;
  }
}
