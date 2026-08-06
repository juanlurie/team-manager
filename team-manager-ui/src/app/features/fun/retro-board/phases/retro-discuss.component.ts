import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';
import { RetroTopicComponent } from '../retro-topic.component';
import { GroupSimilarButtonComponent } from '../group-similar-button.component';

@Component({
  selector: 'app-retro-discuss',
  standalone: true,
  imports: [CommonModule, FormsModule, RetroTopicComponent, GroupSimilarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES, `
    .from-note { font-size: 11.5px; color: var(--mute); margin-top: 4px; display: block; }
    .from-note b { color: var(--ds-text, #e6e9ef); font-weight: 500; }
  `],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head">
        <div><h1>Discuss</h1><p class="sub">Top-voted first — turn topics into action items</p></div>
        <div class="ph-right">
          <app-group-similar-button />
          @if (store.liveFacilitation()) { <button class="btn primary" (click)="store.goNext()">Continue to {{ store.nextPhaseLabel() }} →</button> }
        </div>
      </div>
      <div class="grid g2" style="align-items:start">
        <div>
          <!-- Discussion runs on topics, so a merged idea is talked through once, at the rank its
               combined votes earned it. -->
          @for (t of store.topicsByVotes(); track t.id) {
            <app-retro-topic [topic]="t" variant="discuss" />
            @if (store.actionDraft(); as d) {
              @if (topicOwnsDraft(t, d.noteId)) {
                <div class="card" style="margin:-4px 0 10px;padding:12px 16px">
                  <input class="f" [(ngModel)]="d.title" placeholder="Action…">
                  <ng-container [ngTemplateOutlet]="assignPicker" [ngTemplateOutletContext]="{ draft: d }"></ng-container>
                  <div class="row" style="margin-top:10px">
                    <button class="btn primary sm" (click)="store.saveAction()">Add action</button>
                    <button class="btn ghost sm" (click)="store.actionDraft.set(null)">Cancel</button>
                  </div>
                </div>
              }
            }
          }
        </div>
        <div class="card">
          <h3 style="margin:0 0 12px">Action items</h3>
          @for (a of s.actions; track a.id) {
            <div class="note">
              <div class="row between"><span>{{ a.title }}</span>@if (store.amFacilitator()) { <button class="btn ghost sm" (click)="store.delAction(a.id)">✕</button> }</div>
              <!-- Where this action came from. The link was always stored; it was just never shown,
                   so an action lost its context the moment it left the note that prompted it. -->
              @if (store.sourceNoteOf(a); as src) {
                <span class="from-note">from <b>{{ src.text }}</b></span>
              } @else if (a.sourceNoteId) {
                <span class="from-note">from a note that has since been deleted</span>
              }
              @if (a.assigneeMemberIds.length) { <div class="chips">@for (m of a.assigneeMemberIds; track m) { <span class="tag">{{ store.memberName(m) }}</span> }</div> }
            </div>
          }
          @if (s.actions.length === 0) { <p class="muted">No actions yet.</p> }
          @if (store.amFacilitator()) {
            <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
              <input class="f" [(ngModel)]="store.manual.title" placeholder="Add an action…">
              <ng-container [ngTemplateOutlet]="assignPicker" [ngTemplateOutletContext]="{ draft: store.manual }"></ng-container>
              <button class="btn primary sm" style="margin-top:10px" (click)="store.addManual()">+ Add action</button>
            </div>
          }
        </div>
      </div>
    }

    <!-- reusable assignee typeahead: bind to an object with { assignees: string[] } -->
    <ng-template #assignPicker let-draft="draft">
      @if (draft.assignees.length) { <div class="chips">
        @for (id of draft.assignees; track id) { <span class="chip">{{ store.memberName(id) }} <b (click)="store.removeAssignee(draft, id)">✕</b></span> }
      </div> }
      <div class="ta">
        <input class="f" [(ngModel)]="store.assigneeQuery" placeholder="Assign — type a name…">
        @if (store.assigneeQuery.trim()) { <div class="ta-list">
          @for (m of store.filterMembers(store.assigneeQuery, draft.assignees); track m.id) { <div class="ta-item" (click)="store.addAssignee(draft, m.id)">{{ m.name }}</div> }
          @if (store.filterMembers(store.assigneeQuery, draft.assignees).length === 0) { <div class="ta-item muted">No matches</div> }
        </div> }
      </div>
    </ng-template>
  `,
})
export class RetroDiscussComponent {
  store = inject(RetroBoardStore);

  /** The action composer opens under whichever topic contains the note it was started from — for a
   *  group that's any of its members, since the ⋯ raises the action against the anchor. */
  topicOwnsDraft(t: { notes: { id: string }[] }, noteId: string) {
    return t.notes.some(n => n.id === noteId);
  }
}
