import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
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
    MatTableModule,
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
  displayedColumns = ['description', 'placeOfPurchase', 'amount', 'actions'];

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

    worksheet.columns = [
      { width: 2 },
      { width: 2 },
      { width: 40 },
      { width: 40 },
      { width: 15 },
      { width: 2 },
      { width: 2 },
      { width: 2 },
      { width: 2 },
    ];

    const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 16, color: { argb: 'FF000000' } };
    const headerAlign: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

    const labelFont: Partial<ExcelJS.Font> = { size: 11, color: { argb: 'FF000000' } };
    const labelAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle' };

    const cellFont: Partial<ExcelJS.Font> = { size: 11, color: { argb: 'FF000000' } };
    const cellAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle' };
    const cellBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    const columnHeaderFont: Partial<ExcelJS.Font> = { bold: true, size: 11, color: { argb: 'FF000000' } };
    const columnHeaderAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center' };

    const totalFont: Partial<ExcelJS.Font> = { bold: true, size: 11, color: { argb: 'FF000000' } };
    const totalAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'right' };

    const footerFont: Partial<ExcelJS.Font> = { size: 10, color: { argb: 'FF000000' } };
    const footerAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle' };

    const noteFont: Partial<ExcelJS.Font> = { size: 9, italic: true, color: { argb: 'FF666666' } };
    const noteAlign: Partial<ExcelJS.Alignment> = { vertical: 'middle' };

    for (let i = 1; i <= 5; i++) {
      worksheet.getRow(i).height = 20;
    }

    worksheet.getRow(6).height = 30;
    const titleCell = worksheet.getCell('C6');
    titleCell.value = 'EXPENSE CLAIM FORM';
    titleCell.font = headerFont;
    titleCell.alignment = headerAlign;
    worksheet.mergeCells('C6:E6');

    worksheet.getRow(8).height = 25;
    const nameCell = worksheet.getCell('C8');
    nameCell.value = `Name of Employee:  ${this.employeeName}`;
    nameCell.font = labelFont;
    nameCell.alignment = labelAlign;

    const dateCell = worksheet.getCell('E8');
    dateCell.value = `Date: ${this.currentDate}`;
    dateCell.font = labelFont;
    dateCell.alignment = { ...labelAlign, horizontal: 'right' };

    worksheet.getRow(9).height = 25;
    const headers = ['Description', 'Place of Purchase', 'Amount'];
    const headerCols = ['C', 'D', 'E'];
    headers.forEach((h, i) => {
      const cell = worksheet.getCell(`${headerCols[i]}9`);
      cell.value = h;
      cell.font = columnHeaderFont;
      cell.alignment = columnHeaderAlign;
      cell.border = cellBorder;
    });

    const items = this.items.controls.map(ctrl => ctrl.value as ExpenseItem);
    const startRow = 10;
    const endRow = 23;

    for (let row = startRow; row <= endRow; row++) {
      worksheet.getRow(row).height = 25;
      const itemIndex = row - startRow;

      if (itemIndex < items.length) {
        const item = items[itemIndex];
        ['C', 'D', 'E'].forEach((col, idx) => {
          const cell = worksheet.getCell(`${col}${row}`);
          if (idx === 0) cell.value = item.description;
          else if (idx === 1) cell.value = item.placeOfPurchase;
          else {
            cell.value = item.amount;
            cell.numFmt = '#,##0.00';
          }
          cell.font = cellFont;
          cell.alignment = cellAlign;
          cell.border = cellBorder;
        });
      } else {
        ['C', 'D', 'E'].forEach(col => {
          const cell = worksheet.getCell(`${col}${row}`);
          cell.border = cellBorder;
        });
      }
    }

    const totalRow = 24;
    worksheet.getRow(totalRow).height = 25;
    const totalLabelCell = worksheet.getCell('D24');
    totalLabelCell.value = 'TOTAL CLAIM';
    totalLabelCell.font = totalFont;
    totalLabelCell.alignment = { ...totalAlign, horizontal: 'right' };
    totalLabelCell.border = cellBorder;

    const totalValueCell = worksheet.getCell('E24');
    totalValueCell.value = this.getTotal();
    totalValueCell.numFmt = '#,##0.00';
    totalValueCell.font = { ...totalFont, bold: true };
    totalValueCell.alignment = totalAlign;
    totalValueCell.border = cellBorder;

    worksheet.getRow(25).height = 25;
    const signCell = worksheet.getCell('C25');
    signCell.value = `Employee Sign: ${this.employeeName}`;
    signCell.font = footerFont;
    signCell.alignment = footerAlign;

    worksheet.getRow(26).height = 25;
    const authSigCell = worksheet.getCell('C26');
    authSigCell.value = 'Authorised Signature:________________________';
    authSigCell.font = footerFont;
    authSigCell.alignment = footerAlign;

    const authNameCell = worksheet.getCell('D26');
    authNameCell.value = 'Authorised Name:____________________';
    authNameCell.font = footerFont;
    authNameCell.alignment = footerAlign;

    worksheet.getRow(27).height = 25;
    const noteCell = worksheet.getCell('C27');
    noteCell.value = 'PLEASE NOTE THAT ALL EXPENSE CLAIMS WILL BE PAID INTO ACCOUNT THAT YOUR SALARY IS DEPOSITED INTO.';
    noteCell.font = noteFont;
    noteCell.alignment = noteAlign;
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
