import { Component, computed, ElementRef, input, output, signal, viewChild, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { SquadSummary } from '../../../core/models/squad.model';

@Component({
  selector: 'app-squad-filter',
  standalone: true,
  imports: [FormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <mat-form-field appearance="outline" style="width:170px;margin:0" subscriptSizing="dynamic">
      <mat-label>Squad</mat-label>
      <input matInput type="text" [ngModel]="displayValue()"
             [matAutocomplete]="auto" [placeholder]="placeholder()"
             (ngModelChange)="onInput($event)"
             style="font-size:0.85rem">
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onSelect($event.option.value)">
        <mat-option value="">All squads</mat-option>
        @for (sq of filtered(); track sq.id) {
          <mat-option [value]="sq.id">{{ sq.name }}</mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `
})
export class SquadFilterComponent implements OnInit {
  squads = input<SquadSummary[]>([]);
  value = input('');
  valueChange = output<string>();
  placeholder = input('Search squads…');

  selected = '';
  displayValue = signal('');
  searchInput = signal('');

  filtered = computed(() => {
    const q = this.searchInput().trim().toLowerCase();
    const all = this.squads();
    return q ? all.filter(s => s.name.toLowerCase().includes(q)) : all;
  });

  ngOnInit() {
    this.selected = this.value();
    this.updateDisplay();
  }

  updateDisplay() {
    if (!this.selected) {
      this.displayValue.set('');
    } else {
      const squad = this.squads().find(s => s.id === this.selected);
      this.displayValue.set(squad?.name ?? '');
    }
  }

  onInput(val: string) {
    this.searchInput.set(val);
    if (!val) {
      this.selected = '';
      this.displayValue.set('');
      this.valueChange.emit('');
    }
  }

  onSelect(val: string) {
    this.selected = val;
    this.searchInput.set('');
    this.updateDisplay();
    this.valueChange.emit(val);
  }
}
