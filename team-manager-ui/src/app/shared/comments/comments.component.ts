import { Component, Input, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Comment } from '../../core/models/comment.model';
import { TeamMember } from '../../core/models/team-member.model';
import { CommentService } from '../../core/services/comment.service';
import { TeamMemberService } from '../../core/services/team-member.service';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatDialogModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div style="margin-top:6px">
      <button mat-button (click)="toggle()" style="font-size:0.78rem;min-height:32px;line-height:1">
        @if (open) {
          <mat-icon style="font-size:16px;height:16px;width:16px;margin-right:4px">chat_bubble</mat-icon>
        } @else {
          <mat-icon style="font-size:16px;height:16px;width:16px;margin-right:4px">chat_bubble_outline</mat-icon>
        }
        Comments
        @if (commentCount() > 0) {
          <span style="margin-left:6px;min-width:18px;height:18px;border-radius:9px;background:#64b5f6;color:#0f1923;font-size:0.65rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;padding:0 5px;line-height:1">{{ commentCount() }}</span>
        }
      </button>

      @if (open) {
        @if (loading) {
          <div style="font-size:0.72rem;opacity:0.3;padding:4px 0;letter-spacing:0.1em">···</div>
        } @else {
          @for (c of commentsData; track c.id) {
            <div style="display:flex;align-items:flex-start;gap:8px;padding:3px 0">
              <span style="font-size:0.68rem;color:rgba(255,255,255,0.3);white-space:nowrap;flex-shrink:0;padding-top:2px">{{ c.createdAt | date:'d MMM HH:mm' }}</span>
              <span style="flex:1;font-size:0.78rem;line-height:1.4;color:rgba(255,255,255,0.75);word-break:break-word" [innerHTML]="highlightMentions(c.text)"></span>
              <button style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border:none;border-radius:4px;background:transparent;color:rgba(255,255,255,0.3);cursor:pointer;flex-shrink:0"
                      (click)="deleteComment(c.id)">
                <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px">close</mat-icon>
              </button>
            </div>
          }
          <div style="display:flex;align-items:center;gap:4px;margin-top:6px;position:relative">
            <input [ngModel]="commentDraft"
                   (ngModelChange)="commentDraft = $event"
                   (input)="onInput($event)"
                   (keydown)="onKeydown($event)"
                   placeholder="Add comment&#8230; @name to notify"
                   style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 10px;font-size:0.78rem;color:inherit;outline:none;font-family:inherit">
            @if (mentionActive() && filteredMentions().length > 0) {
              <div style="position:absolute;bottom:100%;left:0;right:0;margin-bottom:4px;background:#1e2a3a;border:1px solid rgba(255,255,255,0.12);border-radius:8px;overflow:hidden;z-index:100;box-shadow:0 4px 16px rgba(0,0,0,0.4)">
                @for (m of filteredMentions(); track m.id; let i = $index) {
                  <div (mousedown)="insertMention(m)"
                       [style.background]="i === mentionSelectedIndex ? 'rgba(100,181,246,0.15)' : 'transparent'"
                       style="padding:6px 12px;cursor:pointer;font-size:0.78rem;display:flex;align-items:center;gap:8px"
                       (mouseenter)="mentionSelectedIndex = i">
                    <span style="color:#64b5f6;font-weight:500">&#64;</span>
                    <span>{{ m.firstName }} {{ m.lastName }}</span>
                  </div>
                }
              </div>
            }
            <button style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:none;border-radius:6px;background:transparent;color:rgba(255,255,255,0.4);cursor:pointer;flex-shrink:0"
                    [disabled]="!commentDraft.trim() || saving"
                    (click)="addComment()">
              <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">send</mat-icon>
            </button>
          </div>
        }
      }
    </div>
  `
})
export class CommentsComponent implements OnInit {
  @Input({ required: true }) entityType!: string;
  @Input({ required: true }) entityId!: string;
  @Input() initialCount: number = 0;

  private svc = inject(CommentService);
  private teamMemberSvc = inject(TeamMemberService);
  private dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);

  open = false;
  loaded = false;
  loading = false;
  commentsData: Comment[] = [];
  commentDraft = '';
  saving = false;

  allTeamMembers = signal<TeamMember[]>([]);
  mentionActive = signal(false);
  mentionQuery = signal('');
  mentionAtPos = 0;
  mentionSelectedIndex = 0;

  filteredMentions = computed(() => {
    if (!this.mentionActive()) return [];
    const q = this.mentionQuery().toLowerCase();
    if (!q) return [];
    return this.allTeamMembers().filter(m =>
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
    ).slice(0, 10);
  });

  commentCount = computed(() => {
    const loaded = this.commentsData.length;
    return loaded > 0 ? loaded : this.initialCount;
  });

  ngOnInit() {
    this.teamMemberSvc.getAll().subscribe(members => this.allTeamMembers.set(members));
  }

  toggle() {
    this.open = !this.open;
    if (this.open && !this.loaded) {
      this.loading = true;
      this.svc.getComments(this.entityType, this.entityId).subscribe(cs => {
        this.commentsData = cs;
        this.loaded = true;
        this.loading = false;
      });
    }
  }

  addComment() {
    if (!this.commentDraft.trim() || this.saving) return;
    this.saving = true;
    this.svc.create({ entityType: this.entityType, entityId: this.entityId, text: this.commentDraft.trim() })
      .subscribe(c => {
        this.commentsData = [...this.commentsData, c];
        this.commentDraft = '';
        this.saving = false;
      });
  }

  deleteComment(commentId: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete comment?', danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.svc.delete(commentId).subscribe(() => {
        this.commentsData = this.commentsData.filter(c => c.id !== commentId);
      });
    });
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value;
    const cursorPos = input.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atIdx = textBeforeCursor.lastIndexOf('@');
    if (atIdx >= 0) {
      const query = textBeforeCursor.slice(atIdx + 1);
      if (!query.includes(' ')) {
        this.mentionActive.set(true);
        this.mentionAtPos = atIdx;
        this.mentionQuery.set(query);
        this.mentionSelectedIndex = 0;
        return;
      }
    }
    this.mentionActive.set(false);
    this.mentionQuery.set('');
  }

  onKeydown(event: KeyboardEvent) {
    if (this.mentionActive() && this.filteredMentions().length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const max = this.filteredMentions().length - 1;
        this.mentionSelectedIndex = Math.min(this.mentionSelectedIndex + 1, max);
        return;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.mentionSelectedIndex = Math.max(this.mentionSelectedIndex - 1, 0);
        return;
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        const members = this.filteredMentions();
        if (members[this.mentionSelectedIndex]) {
          event.preventDefault();
          this.insertMention(members[this.mentionSelectedIndex]);
          return;
        }
      } else if (event.key === 'Escape') {
        this.mentionActive.set(false);
        this.mentionQuery.set('');
        return;
      }
    }
    if (event.key === 'Enter') {
      this.addComment();
    }
  }

  insertMention(member: TeamMember) {
    const before = this.commentDraft.slice(0, this.mentionAtPos);
    const after = this.commentDraft.slice(this.mentionAtPos + 1 + this.mentionQuery().length);
    this.commentDraft = `${before}@${member.firstName} ${member.lastName} ${after}`;
    this.mentionActive.set(false);
    this.mentionQuery.set('');
  }

  highlightMentions(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      text.replace(/(@\w+(?:\s\w+)*)/g, '<span style="color:#64b5f6;font-weight:600">$1</span>')
    );
  }
}
