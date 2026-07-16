import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';

@Component({
  selector: 'app-retro-discuss',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head"><div><h1>Discuss</h1><p class="sub">Top-voted first — turn topics into action items</p></div>
        @if (store.liveFacilitation()) { <button class="btn primary" (click)="store.goNext()">Continue to {{ store.nextPhaseLabel() }} →</button> }</div>
      <div class="grid g2" style="align-items:start">
        <div>
          @for (n of store.sortedByVotes(); track n.id) {
            <div class="card" style="padding:14px 16px" [style.borderLeft]="'3px solid ' + store.columnColor(n.columnId)">
              <div class="row between"><div class="row" style="gap:12px"><span class="avatar" [style.background]="store.columnColor(n.columnId)+'22'" [style.color]="store.columnColor(n.columnId)">{{ n.voteCount }}</span>
                <div><div>{{ n.text }}</div><div class="muted" style="font-size:12px"><span [style.color]="store.columnColor(n.columnId)" style="font-weight:600">{{ n.columnKey }}</span>{{ n.isAnonymous ? '' : ' · ' + n.authorName }}</div></div></div>
                @if (store.amFacilitator()) { <button class="btn ghost sm" (click)="store.startAction(n)">+ Action</button> }</div>
              @if (store.actionDraft()?.noteId === n.id) {
                <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
                  <input class="f" [(ngModel)]="store.actionDraft()!.title" placeholder="Action…">
                  <ng-container [ngTemplateOutlet]="assignPicker" [ngTemplateOutletContext]="{ draft: store.actionDraft() }"></ng-container>
                  <div class="row" style="margin-top:10px"><button class="btn primary sm" (click)="store.saveAction()">Add action</button><button class="btn ghost sm" (click)="store.actionDraft.set(null)">Cancel</button></div>
                </div>
              }
            </div>
          }
        </div>
        <div class="card">
          <h3 style="margin:0 0 12px">Action items</h3>
          @for (a of s.actions; track a.id) {
            <div class="note"><div class="row between"><span>{{ a.title }}</span>@if (store.amFacilitator()) { <button class="btn ghost sm" (click)="store.delAction(a.id)">✕</button> }</div>
              @if (a.assigneeMemberIds.length) { <div class="chips">@for (m of a.assigneeMemberIds; track m) { <span class="tag">{{ store.memberName(m) }}</span> }</div> }</div>
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
}
