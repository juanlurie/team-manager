import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Comment } from '../../core/models/comment.model';
import { CommentService } from '../../core/services/comment.service';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatDialogModule, DatePipe],
  styles: [`.comment-delete { color:rgba(255,255,255,0.2);background:transparent;transition:color 0.15s,background 0.15s; } .comment-delete:hover { color:#ef5350;background:rgba(239,83,80,0.1); }`],
  template: `
    <div style="margin-top:16px">
      <div style="font-size:0.75rem;font-weight:700;opacity:0.4;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px">
        Comments <span style="font-weight:400;opacity:0.6">({{ comments().length }})</span>
      </div>

      @for (c of comments(); track c.id) {
        <div style="display:flex;gap:10px;margin-bottom:10px;align-items:flex-start">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(100,181,246,0.12);color:#64b5f6;
                      display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;
                      flex-shrink:0;margin-top:1px">
            {{ initials(c.authorName) }}
          </div>
          <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 10px;
                      border:1px solid rgba(255,255,255,0.06);min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              @if (c.authorName) {
                <span style="font-size:0.75rem;font-weight:600;opacity:0.7">{{ c.authorName }}</span>
              }
              <span style="font-size:0.68rem;opacity:0.35">{{ c.createdAt | date:'d MMM yyyy, HH:mm' }}</span>
            </div>
            <div style="font-size:0.83rem;line-height:1.5;white-space:pre-wrap;word-break:break-word">{{ c.text }}</div>
          </div>
          <button (click)="remove(c)" class="comment-delete"
                  style="width:24px;height:24px;border:none;border-radius:5px;
                         cursor:pointer;flex-shrink:0;margin-top:3px;
                         display:flex;align-items:center;justify-content:center">
            <mat-icon style="font-size:14px;width:14px;height:14px">close</mat-icon>
          </button>
        </div>
      }

      <!-- Input row -->
      <div style="display:flex;gap:8px;align-items:flex-start;margin-top:8px">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" style="flex:1">
          <textarea matInput [(ngModel)]="newText" placeholder="Add a comment…" rows="2"
                    (keydown.ctrl.enter)="submit()" style="resize:none"></textarea>
        </mat-form-field>
        <button (click)="submit()" [disabled]="!newText.trim() || submitting()"
                style="height:52px;width:40px;border:none;border-radius:8px;cursor:pointer;flex-shrink:0;
                       background:rgba(100,181,246,0.15);color:#64b5f6;display:flex;align-items:center;justify-content:center"
                [style.opacity]="!newText.trim() || submitting() ? '0.4' : '1'">
          <mat-icon style="font-size:18px;width:18px;height:18px">send</mat-icon>
        </button>
      </div>
    </div>
  `
})
export class CommentsComponent implements OnInit {
  @Input() entityType!: string;
  @Input() entityId!: string;

  private svc = inject(CommentService);
  private dialog = inject(MatDialog);

  comments = signal<Comment[]>([]);
  newText = '';
  submitting = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.svc.getComments(this.entityType, this.entityId).subscribe(c => this.comments.set(c));
  }

  submit() {
    if (!this.newText.trim() || this.submitting()) return;
    this.submitting.set(true);
    this.svc.create({ entityType: this.entityType, entityId: this.entityId, text: this.newText.trim() })
      .subscribe({
        next: c => {
          this.comments.update(list => [...list, c]);
          this.newText = '';
          this.submitting.set(false);
        },
        error: () => this.submitting.set(false)
      });
  }

  remove(c: Comment) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete comment?', danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.svc.delete(c.id).subscribe(() =>
        this.comments.update(list => list.filter(x => x.id !== c.id))
      );
    });
  }

  initials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  }
}
