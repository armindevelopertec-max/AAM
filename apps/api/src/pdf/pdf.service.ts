import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as vm from 'vm';
import type {
  TDocumentDefinitions,
  Content,
  TableCell,
} from 'pdfmake/interfaces.js';
import { FilesService } from '../files/files.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfMake = require('pdfmake') as {
  virtualfs: {
    writeFileSync: (path: string, data: Buffer) => void;
  };
  setFonts: (fonts: Record<string, unknown>) => void;
  createPdf: (
    doc: TDocumentDefinitions,
    options?: Record<string, unknown>,
  ) => {
    getBuffer(): Promise<ArrayBuffer>;
  };
};

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private readonly files: FilesService) {
    this.initFonts();
  }

  private initFonts() {
    const fontPath = require.resolve('pdfmake/build/vfs_fonts');
    const fontContent = fs.readFileSync(fontPath, 'utf8');
    const sandbox: Record<string, unknown> = {};
    vm.runInNewContext(fontContent, sandbox);

    const vfs = sandbox.vfs as Record<string, string>;
    Object.entries(vfs).forEach(([name, data]) => {
      pdfMake.virtualfs.writeFileSync(
        '/' + name,
        Buffer.from(data, 'base64'),
      );
    });

    pdfMake.setFonts({
      Roboto: {
        normal: '/Roboto-Regular.ttf',
        bold: '/Roboto-Medium.ttf',
        italics: '/Roboto-Italic.ttf',
        bolditalics: '/Roboto-MediumItalic.ttf',
      },
    });

    this.logger.log('PDF fonts loaded');
  }

  async generateQuotePdf(quote: {
    number: string;
    clientName: string;
    createdBy: string | null;
    items: Array<{
      name: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      originalPrice: number;
      subtotal: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    validDays: number;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<Buffer> {
    const storeName = process.env.STORE_NAME ?? 'BLUETEL';
    const storeSubtitle =
      process.env.STORE_SUBTITLE ?? 'Distribuidor Autorizado';
    const storePhone = process.env.STORE_PHONE ?? '';

    const hasInstall = quote.items.some(
      (i) => i.sku === 'SERVICIO' || i.name.toLowerCase().includes('instalaci'),
    );
    const installItem = quote.items.find(
      (i) => i.sku === 'SERVICIO' || i.name.toLowerCase().includes('instalaci'),
    );

    const savings = quote.discount;
    const totalOriginal = quote.subtotal + savings;
    const savingsPct =
      totalOriginal > 0 ? Math.round((savings / totalOriginal) * 100) : 0;

    const headerContent: Content[] = [
      {
        columns: [
          {
            width: '*',
            text: [
              { text: storeName, fontSize: 18, bold: true },
              { text: '\n' + storeSubtitle, fontSize: 9, color: '#666' },
              ...(storePhone
                ? [{ text: '\nTel. ' + storePhone, fontSize: 9, color: '#666' }]
                : []),
            ],
          },
          {
            width: 'auto',
            text: [
              { text: 'COTIZACIÓN', fontSize: 14, bold: true, alignment: 'right' },
              {
                text: '\n' + quote.number,
                fontSize: 11,
                color: '#4f8cff',
                bold: true,
                alignment: 'right',
              },
            ],
          },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#4f8cff' },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
    ];

    const infoRows: TableCell[][] = [
      [
        { text: [{ text: 'Cliente: ', bold: true }, quote.clientName || '—'], colSpan: 2 },
        {},
      ],
      [
        {
          text: [
            { text: 'Fecha: ', bold: true },
            quote.createdAt.toLocaleDateString('es-BO'),
          ],
        },
        {
          text: [
            { text: 'Válida hasta: ', bold: true },
            quote.expiresAt.toLocaleDateString('es-BO'),
          ],
        },
      ],
    ];

    if (quote.createdBy) {
      infoRows.push([
        {
          text: [{ text: 'Atendido por: ', bold: true }, quote.createdBy],
          colSpan: 2,
        },
        {},
      ]);
    }

    if (hasInstall && installItem) {
      infoRows.push([
        {
          text: [
            { text: ' Instalación: ', bold: true, color: '#d97706' },
            installItem.name,
          ],
          colSpan: 2,
        },
        {},
      ]);
    }

    const infoContent: Content[] = [
      {
        table: {
          widths: ['50%', '50%'],
          body: infoRows,
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
    ];

    const headerRow: TableCell[] = [
      { text: '#', style: 'tableHeader', alignment: 'center' },
      { text: 'Producto', style: 'tableHeader' },
      { text: 'SKU', style: 'tableHeader' },
      { text: 'Cant.', style: 'tableHeader', alignment: 'center' },
      { text: 'P. Unitario', style: 'tableHeader', alignment: 'right' },
      { text: 'Dcto.', style: 'tableHeader', alignment: 'center' },
      { text: 'Subtotal', style: 'tableHeader', alignment: 'right' },
    ];

    const bodyRows: TableCell[][] = [headerRow];
    quote.items.forEach((item, idx) => {
      const isInstall =
        item.sku === 'SERVICIO' || item.name.toLowerCase().includes('instalaci');
      const hasDiscount = !isInstall && item.originalPrice > 0 && item.originalPrice > item.unitPrice;
      const discountPct = hasDiscount
        ? Math.round((1 - item.unitPrice / item.originalPrice) * 100)
        : 0;
      bodyRows.push([
        {
          text: String(idx + 1),
          alignment: 'center',
          ...(isInstall ? { color: '#d97706' } : {}),
        },
        {
          text: item.name,
          ...(isInstall ? { color: '#d97706', italics: true } : {}),
        },
        { text: item.sku ?? '', fontSize: 8 },
        { text: String(item.quantity), alignment: 'center' },
        { text: this.formatMoney(item.unitPrice), alignment: 'right' },
        {
          text: isInstall ? '—' : hasDiscount ? `-${discountPct}%` : '—',
          alignment: 'center',
          color: isInstall ? '#999' : hasDiscount ? '#2ecc71' : '#999',
          fontSize: 8,
        },
        { text: this.formatMoney(item.subtotal), alignment: 'right', bold: true },
      ]);
    });

    const tableContent: Content[] = [
      {
        table: {
          headerRows: 1,
          widths: [20, '*', 55, 30, 55, 30, 60],
          body: bodyRows,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#4f8cff' : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e0e0e0',
          vLineColor: () => '#e0e0e0',
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
    ];

    const summaryRows: TableCell[][] = [];

    if (savings > 0) {
      summaryRows.push([
        {
          text: `Subtotal (precio normal): ${this.formatMoney(totalOriginal)}`,
          alignment: 'right',
          colSpan: 2,
          fontSize: 9,
          color: '#999',
        },
        {},
      ]);
      summaryRows.push([
        {
          text: `Ahorro (${savingsPct}%): -${this.formatMoney(savings)}`,
          alignment: 'right',
          colSpan: 2,
          color: '#2ecc71',
          bold: true,
        },
        {},
      ]);
    }

    summaryRows.push([
      {
        text: [
          { text: 'TOTAL: ', fontSize: 13, bold: true },
          { text: this.formatMoney(quote.total), fontSize: 13, bold: true, color: '#4f8cff' },
        ],
        alignment: 'right',
        colSpan: 2,
      },
      {},
    ]);

    const summaryContent: Content[] = [
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            table: { widths: ['auto', 'auto'], body: summaryRows },
            layout: 'noBorders',
          },
        ],
      },
      { text: '', margin: [0, 15, 0, 0] as [number, number, number, number] },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#ccc' },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },
      {
        text: `Esta cotización es válida por ${quote.validDays} días a partir de la fecha de emisión.`,
        fontSize: 8,
        color: '#999',
        alignment: 'center',
      },
    ];

    const docDefinition: TDocumentDefinitions = {
      content: [
        ...headerContent,
        ...infoContent,
        ...tableContent,
        ...summaryContent,
      ],
      defaultStyle: { fontSize: 10 },
      pageMargins: [30, 30, 30, 30] as [number, number, number, number],
    };

    const pdfDoc = pdfMake.createPdf(docDefinition);
    const buffer = await pdfDoc.getBuffer();
    return Buffer.from(buffer);
  }

  async uploadQuotePdf(
    quoteNumber: string,
    pdfBuffer: Buffer,
  ): Promise<string> {
    const key = `pdfs/quotes/${quoteNumber}.pdf`;
    await this.files.uploadObject(key, pdfBuffer, 'application/pdf');
    return key;
  }

  async getQuotePdfUrl(key: string): Promise<string> {
    return this.files.getSignedUrl(key, 3600);
  }

  async getQuotePdfBuffer(
    key: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const data = await this.files.getObject(key);
    return { buffer: data.body, contentType: data.contentType };
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2,
    }).format(value);
  }
}
