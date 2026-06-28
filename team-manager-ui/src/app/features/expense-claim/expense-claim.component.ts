import { Component, inject, OnInit, signal, AfterViewInit, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import * as ExcelJS from 'exceljs';

interface ExpenseItem {
  description: string;
  placeOfPurchase: string;
  amount: number;
}

@Component({
  selector: 'app-expense-claim',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './expense-claim.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./expense-claim.component.scss'],
})
export class ExpenseClaimComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  employeeName = '';
  currentDate = '';
  items = signal<ExpenseItem[]>([]);
  showItemDialog = signal(false);
  editingIndex = signal<number | null>(null);
  itemForm!: FormGroup;

  uploadedLogoBase64 = signal<string | null>(null);
  uploadedLogoExt = signal<'jpeg' | 'png' | 'gif'>('jpeg');

  @ViewChild('descInput') descInput!: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    this.currentDate = new Date().toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    this.auth.me$.subscribe(me => {
      if (me) {
        this.employeeName = `${me.firstName} ${me.lastName}`;
      }
    });

    this.itemForm = this.fb.group({
      description: ['', Validators.required],
      placeOfPurchase: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
    });
  }

  getTotal(): number {
    return this.items().reduce((sum, item) => sum + item.amount, 0);
  }

  openAddDialog(): void {
    this.editingIndex.set(null);
    this.itemForm.reset({ description: '', placeOfPurchase: '', amount: 0 });
    this.showItemDialog.set(true);
    setTimeout(() => this.descInput?.nativeElement?.focus(), 100);
  }

  openEditDialog(index: number): void {
    this.editingIndex.set(index);
    const item = this.items()[index];
    this.itemForm.patchValue(item);
    this.showItemDialog.set(true);
    setTimeout(() => this.descInput?.nativeElement?.focus(), 100);
  }

  closeDialog(): void {
    this.showItemDialog.set(false);
    this.editingIndex.set(null);
  }

  saveItem(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }
    const value = this.itemForm.value as ExpenseItem;
    const idx = this.editingIndex();
    if (idx !== null) {
      const updated = [...this.items()];
      updated[idx] = value;
      this.items.set(updated);
    } else {
      this.items.set([...this.items(), value]);
    }
    this.closeDialog();
  }

  removeItem(index: number): void {
    this.items.set(this.items().filter((_, i) => i !== index));
  }

  onLogoUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const ext: 'jpeg' | 'png' | 'gif' = file.type.includes('png') ? 'png' : file.type.includes('gif') ? 'gif' : 'jpeg';
    this.uploadedLogoExt.set(ext);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      this.uploadedLogoBase64.set(base64);
    };
    reader.readAsDataURL(file);
  }

  clearLogo(): void {
    this.uploadedLogoBase64.set(null);
  }

  async generateAndDownload(): Promise<void> {
    if (this.items().length === 0) {
      this.snackBar.open('Please add at least one expense item', 'Close', { duration: 3000 });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expense Claim');

    worksheet.getColumn(1).width = 1.83;
    worksheet.getColumn(2).width = 0.83;
    worksheet.getColumn(3).width = 57.83;
    worksheet.getColumn(4).width = 29.5;
    worksheet.getColumn(5).width = 36.66;
    worksheet.getColumn(6).width = 0.83;
    worksheet.getColumn(7).width = 6.33;

    const rowHeights: Record<number, number> = {
      1: 20, 2: 20, 3: 10.5, 4: 20, 5: 12.75,
      6: 14.25, 7: 14.25, 8: 25.5, 9: 22.5,
    };
    for (let r = 1; r <= 23; r++) {
      worksheet.getRow(r).height = rowHeights[r] || 20;
    }
    worksheet.getRow(24).height = 20;
    worksheet.getRow(25).height = 20;
    worksheet.getRow(26).height = 20;
    worksheet.getRow(27).height = 21.75;
    worksheet.getRow(28).height = 6.75;

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    const whiteFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    for (let r = 1; r <= 5; r++) {
      for (const col of ['C', 'D', 'E']) {
        worksheet.getCell(`${col}${r}`).fill = whiteFill;
      }
    }

    const logoBase64 = this.uploadedLogoBase64();
    if (logoBase64) {
      const logoBytes = Uint8Array.from(atob(logoBase64), c => c.charCodeAt(0));
      const logoId = workbook.addImage({
        buffer: logoBytes as any,
        extension: this.uploadedLogoExt(),
      });
      worksheet.addImage(logoId, {
        tl: { col: 2, row: 0 },
        ext: { width: 280, height: 93 },
      });
    }

    worksheet.mergeCells('C6:E7');
    const titleCell = worksheet.getCell('C6');
    titleCell.value = 'EXPENSE CLAIM FORM';
    titleCell.font = { bold: true, size: 18, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const nameCell = worksheet.getCell('C8');
    nameCell.value = `Name of Employee:  ${this.employeeName}`;
    nameCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
    nameCell.alignment = { vertical: 'middle' };

    const dateCell = worksheet.getCell('E8');
    dateCell.value = `Date: ${this.currentDate}`;
    dateCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
    dateCell.alignment = { vertical: 'middle' };

    const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 14, color: { argb: 'FF000000' } };
    const headerAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle' };

    ['C9', 'D9', 'E9'].forEach(coord => {
      const cell = worksheet.getCell(coord);
      cell.font = headerFont;
      cell.alignment = headerAlign;
      cell.border = thinBorder;
    });
    worksheet.getCell('C9').value = 'Description';
    worksheet.getCell('D9').value = 'Place of Purchase';
    worksheet.getCell('E9').value = 'Amount';

    const dataFont: Partial<ExcelJS.Font> = { size: 10, color: { argb: 'FF000000' } };
    const dataAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle' };

    const expenseItems = this.items();

    for (let row = 10; row <= 23; row++) {
      const itemIndex = row - 10;
      if (itemIndex < expenseItems.length) {
        const item = expenseItems[itemIndex];
        const cCell = worksheet.getCell(`C${row}`);
        cCell.value = item.description;
        cCell.font = dataFont;
        cCell.alignment = dataAlign;
        cCell.border = thinBorder;

        const dCell = worksheet.getCell(`D${row}`);
        dCell.value = item.placeOfPurchase;
        dCell.font = dataFont;
        dCell.alignment = dataAlign;
        dCell.border = thinBorder;

        const eCell = worksheet.getCell(`E${row}`);
        eCell.value = item.amount;
        eCell.numFmt = '#,##0.00';
        eCell.font = dataFont;
        eCell.alignment = { ...dataAlign, horizontal: 'right' };
        eCell.border = thinBorder;
      } else {
        ['C', 'D', 'E'].forEach(col => {
          worksheet.getCell(`${col}${row}`).border = thinBorder;
        });
      }
    }

    const totalLabelCell = worksheet.getCell('D24');
    totalLabelCell.value = 'TOTAL CLAIM';
    totalLabelCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
    totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const totalValueCell = worksheet.getCell('E24');
    totalValueCell.value = this.getTotal();
    totalValueCell.numFmt = '#,##0.00';
    totalValueCell.font = { size: 10, color: { argb: 'FF000000' } };
    totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
    totalValueCell.border = thinBorder;

    const signCell = worksheet.getCell('C25');
    signCell.value = `Employee Sign: ${this.employeeName}`;
    signCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
    signCell.alignment = { vertical: 'middle' };

    const authSigCell = worksheet.getCell('C26');
    authSigCell.value = 'Authorised Signature:________________________';
    authSigCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
    authSigCell.alignment = { vertical: 'middle' };

    worksheet.mergeCells('D26:E26');
    const authNameCell = worksheet.getCell('D26');
    authNameCell.value = 'Authorised Name:____________________';
    authNameCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
    authNameCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const noteCell = worksheet.getCell('C27');
    noteCell.value = 'PLEASE NOTE THAT ALL EXPENSE CLAIMS WILL BE PAID INTO ACCOUNT THAT YOUR SALARY IS DEPOSITED INTO.';
    noteCell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
    noteCell.alignment = { vertical: 'middle' };
    worksheet.mergeCells('C27:E27');

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Expense_Claim_${this.employeeName.replace(/\s+/g, '_')}_${this.currentDate.replace(/\//g, '-')}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.snackBar.open('Expense claim downloaded successfully', 'Close', { duration: 3000 });
  }
}
