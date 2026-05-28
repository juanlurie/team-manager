import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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
  ],
  templateUrl: './expense-claim.component.html',
  styleUrls: ['./expense-claim.component.scss'],
})
export class ExpenseClaimComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  expenseForm!: FormGroup;
  employeeName = '';
  currentDate = '';

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

    this.expenseForm = this.fb.group({
      items: this.fb.array([]),
    });

    this.addItem();
  }

  get items(): FormArray {
    return this.expenseForm.get('items') as FormArray;
  }

  createItem(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      placeOfPurchase: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
    });
  }

  addItem(): void {
    this.items.push(this.createItem());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  getTotal(): number {
    return this.items.controls.reduce((sum, ctrl) => {
      const val = ctrl.get('amount')?.value;
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
  }

  async generateAndDownload(): Promise<void> {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Expense Claim');

    // Column widths matching original exactly
    worksheet.getColumn(1).width = 1.83;
    worksheet.getColumn(2).width = 0.83;
    worksheet.getColumn(3).width = 57.83;
    worksheet.getColumn(4).width = 29.5;
    worksheet.getColumn(5).width = 36.66;
    worksheet.getColumn(6).width = 0.83;
    worksheet.getColumn(7).width = 6.33;

    // Row heights matching original exactly
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

    // Thin border style
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Row 6-7: Title (merged C6:E7)
    worksheet.mergeCells('C6:E7');
    const titleCell = worksheet.getCell('C6');
    titleCell.value = 'EXPENSE CLAIM FORM';
    titleCell.font = { bold: true, size: 18, color: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 8: Employee name and date
    const nameCell = worksheet.getCell('C8');
    nameCell.value = `Name of Employee:  ${this.employeeName}`;
    nameCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
    nameCell.alignment = { vertical: 'middle' };

    const dateCell = worksheet.getCell('E8');
    dateCell.value = `Date: ${this.currentDate}`;
    dateCell.font = { bold: true, size: 14, color: { argb: 'FF000000' } };
    dateCell.alignment = { vertical: 'middle' };

    // Row 9: Column headers with borders
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

    // Rows 10-23: Data rows
    const dataFont: Partial<ExcelJS.Font> = { size: 10, color: { argb: 'FF000000' } };
    const dataAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle' };

    const expenseItems = this.items.controls.map(ctrl => ctrl.value as ExpenseItem);

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

    // Row 24: Total
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

    // Row 25: Employee sign
    const signCell = worksheet.getCell('C25');
    signCell.value = `Employee Sign: ${this.employeeName}`;
    signCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
    signCell.alignment = { vertical: 'middle' };

    // Row 26: Authorised signature and name
    const authSigCell = worksheet.getCell('C26');
    authSigCell.value = 'Authorised Signature:________________________';
    authSigCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
    authSigCell.alignment = { vertical: 'middle' };

    worksheet.mergeCells('D26:E26');
    const authNameCell = worksheet.getCell('D26');
    authNameCell.value = 'Authorised Name:____________________';
    authNameCell.font = { bold: true, size: 12, color: { argb: 'FF000000' } };
    authNameCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Row 27: Note
    const noteCell = worksheet.getCell('C27');
    noteCell.value = 'PLEASE NOTE THAT ALL EXPENSE CLAIMS WILL BE PAID INTO ACCOUNT THAT YOUR SALARY IS DEPOSITED INTO.';
    noteCell.font = { bold: true, size: 10, color: { argb: 'FF000000' } };
    noteCell.alignment = { vertical: 'middle' };
    worksheet.mergeCells('C27:E27');

    // Add logo image
    try {
      const logoResp = await fetch('/assets/expense-claim/logo.jpeg');
      const logoBuffer = await logoResp.arrayBuffer();
      const logoId = workbook.addImage({
        buffer: Buffer.from(logoBuffer),
        extension: 'jpeg',
      });
      worksheet.addImage(logoId, {
        tl: { col: 2, row: 0 },
        ext: { width: 300, height: 100 },
      });
    } catch {
      // Logo not available, skip
    }

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
