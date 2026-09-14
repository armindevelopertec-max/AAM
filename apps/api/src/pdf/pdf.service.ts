import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as vm from 'vm';
import type {
  TDocumentDefinitions,
  Content,
  TableCell,
} from 'pdfmake/interfaces.js';
import { FilesService } from '../files/files.service';
import { INSTALL_WRENCH_PNG } from './install-wrench';

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
      pdfMake.virtualfs.writeFileSync('/' + name, Buffer.from(data, 'base64'));
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

  async generateQuotePdf(
    quote: {
      number: string;
      clientId: string | null;
      clientName: string;
      createdBy: string | null;
      items: Array<{
        name: string;
        sku: string;
        quantity: number;
        unitPrice: number;
        originalPrice: number;
        subtotal: number;
        imageDataUri?: string | null;
      }>;
      subtotal: number;
      discount: number;
      total: number;
      validDays: number;
      expiresAt: Date;
      createdAt: Date;
    },
    opts?: {
      label?: string;
      footerNote?: string;
      showExpiry?: boolean;
    },
  ): Promise<Buffer> {
    const storeName = process.env.STORE_NAME ?? 'SEGTECAM';
    const storeSubtitle =
      process.env.STORE_SUBTITLE ?? 'Distribuidor Autorizado';
    const storePhone = process.env.STORE_PHONE ?? '';

    const hasInstall = quote.items.some(
      (i) => i.sku === 'SERVICIO' || i.name.toLowerCase().includes('instalaci'),
    );
    const installItem = quote.items.find(
      (i) => i.sku === 'SERVICIO' || i.name.toLowerCase().includes('instalaci'),
    );

    const displayedNumber = `N° ${Math.floor(100000 + Math.random() * 900000)}`;

    const accent = '#141414';
    const ink = '#111111';
    const inkSoft = '#555555';
    const labelGray = '#8f8f8f';
    const hairline = '#e4e4e4';

    const headerContent: Content[] = [
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              {
                text: [
                  {
                    text: storeName.toUpperCase(),
                    fontSize: 17,
                    bold: true,
                    color: '#ffffff',
                    characterSpacing: 4,
                  },
                  {
                    text: '\n' + storeSubtitle.toUpperCase(),
                    fontSize: 8,
                    color: '#a5a5a5',
                    characterSpacing: 2,
                  },
                  ...(storePhone
                    ? [
                        {
                          text: '\nTEL. ' + storePhone.toUpperCase(),
                          fontSize: 7.5,
                          color: '#8f8f8f',
                          characterSpacing: 1.5,
                        },
                      ]
                    : []),
                ],
                alignment: 'left',
              },
              {
                text: [
                  {
                    text: opts?.label ?? 'COTIZACIÓN',
                    fontSize: 12,
                    bold: true,
                    color: '#ffffff',
                    characterSpacing: 3,
                    alignment: 'right',
                  },
                  {
                    text: '\n' + displayedNumber,
                    fontSize: 9,
                    color: '#b9b9b9',
                    alignment: 'right',
                  },
                  {
                    text: '\n' + this.formatDate(quote.createdAt),
                    fontSize: 7.5,
                    color: '#8f8f8f',
                    alignment: 'right',
                  },
                ],
                alignment: 'right',
              },
            ],
          ],
        },
        layout: {
          fillColor: () => accent,
          paddingLeft: () => 20,
          paddingRight: () => 20,
          paddingTop: () => 16,
          paddingBottom: () => 16,
          hLineWidth: () => 0,
          vLineWidth: () => 0,
        },
        margin: [0, 0, 0, 18] as [number, number, number, number],
      },
    ];

    const infoRows: TableCell[][] = [];

    const hasRegisteredClient =
      quote.clientId != null &&
      (quote.clientName ?? '') !== '' &&
      (quote.clientName ?? '') !== 'Cliente general';

    if (hasRegisteredClient) {
      infoRows.push([
        {
          text: [
            {
              text: 'CLIENTE'.toUpperCase(),
              fontSize: 7.5,
              bold: true,
              color: labelGray,
              characterSpacing: 2,
            },
            {
              text: '   ' + (quote.clientName || '—'),
              fontSize: 10,
              color: ink,
            },
          ],
          colSpan: 2,
        },
        {},
      ]);
    }

    if (hasInstall && installItem && hasRegisteredClient) {
      const cleanName = String(installItem.name).replace(
        /\s*\(\d+\s*punto[s]?\)\s*$/i,
        '',
      );
      infoRows.push([
        {
          text: [
            {
              text: 'SERVICIO: '.toUpperCase(),
              fontSize: 7.5,
              bold: true,
              color: labelGray,
              characterSpacing: 2,
            },
            { text: cleanName, fontSize: 9, color: inkSoft },
            {
              text: `  ·  ${installItem.quantity} ${
                installItem.quantity === 1 ? 'punto' : 'puntos'
              }`,
              fontSize: 9,
              bold: true,
              color: ink,
            },
          ],
          colSpan: 2,
        },
        {},
      ]);
    }

    const showExpiry = opts?.showExpiry !== false;

    if (showExpiry && quote.expiresAt) {
      infoRows.push([
        {
          text: [
            {
              text: 'EMISIÓN   ',
              fontSize: 7.5,
              bold: true,
              color: labelGray,
              characterSpacing: 2,
            },
            {
              text: this.formatDate(quote.createdAt),
              fontSize: 9.5,
              color: ink,
            },
          ],
          alignment: 'left',
        },
        {
          text: [
            {
              text: 'VÁLIDA HASTA   ',
              fontSize: 7.5,
              bold: true,
              color: labelGray,
              characterSpacing: 2,
            },
            {
              text: this.formatDate(quote.expiresAt),
              fontSize: 9.5,
              color: ink,
            },
          ],
          alignment: 'right',
        },
      ]);
    } else {
      infoRows.push([
        {
          text: [
            {
              text: 'EMISIÓN   ',
              fontSize: 7.5,
              bold: true,
              color: labelGray,
              characterSpacing: 2,
            },
            {
              text: this.formatDate(quote.createdAt),
              fontSize: 9.5,
              color: ink,
            },
          ],
          colSpan: 2,
          alignment: 'left',
        },
        {},
      ]);
    }

    const infoContent: Content[] = [
      {
        table: {
          widths: ['*', 'auto'],
          body: infoRows,
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 14] as [number, number, number, number],
      },
    ];

    const headerRow: TableCell[] = [
      { text: '#', style: 'tableHeader', alignment: 'center' },
      { text: 'IMAGEN', style: 'tableHeader', alignment: 'center' },
      { text: 'PRODUCTO', style: 'tableHeader' },
      { text: 'SKU', style: 'tableHeader' },
      { text: 'CANT.', style: 'tableHeader', alignment: 'center' },
      { text: 'P. UNITARIO', style: 'tableHeader', alignment: 'right' },
      { text: 'SUBTOTAL', style: 'tableHeader', alignment: 'right' },
    ];

    const bodyRows: TableCell[][] = [headerRow];
    quote.items.forEach((item, idx) => {
      const isInstall =
        item.sku === 'SERVICIO' ||
        item.name.toLowerCase().includes('instalaci');
      const imageCell: TableCell = item.imageDataUri
        ? {
            image: item.imageDataUri,
            fit: [34, 34],
            alignment: 'center',
          }
        : isInstall
          ? {
              image: INSTALL_WRENCH_PNG,
              fit: [26, 26],
              alignment: 'center',
            }
          : { text: '', alignment: 'center' };
      bodyRows.push([
        {
          text: String(idx + 1),
          alignment: 'center',
          fontSize: 8.5,
          color: isInstall ? inkSoft : ink,
        },
        imageCell,
        {
          text: item.name,
          fontSize: 9.5,
          color: isInstall ? inkSoft : ink,
          ...(isInstall ? { italics: true } : {}),
        },
        { text: item.sku ?? '', fontSize: 8, color: '#666666' },
        { text: String(item.quantity), fontSize: 9, alignment: 'center' },
        {
          text: this.formatMoney(item.unitPrice),
          fontSize: 9,
          alignment: 'right',
        },
        {
          text: this.formatMoney(item.subtotal),
          fontSize: 9.5,
          alignment: 'right',
          bold: true,
          color: ink,
        },
      ]);
    });

    const tableContent: Content[] = [
      {
        table: {
          headerRows: 1,
          widths: [22, 46, '*', 60, 30, 64, 66],
          body: bodyRows,
        },
        layout: {
          hLineWidth: (i: number, node: any) =>
            i === 1 ? 1.2 : i > 1 && i < node.table.body.length ? 0.5 : 0,
          hLineColor: (i: number) => (i === 1 ? ink : hairline),
          vLineWidth: () => 0,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 16] as [number, number, number, number],
      },
    ];

    const summaryRows: TableCell[][] = [];

    summaryRows.push([
      {
        text: [
          {
            text: 'TOTAL  ',
            fontSize: 11,
            bold: true,
            color: ink,
            characterSpacing: 2,
          },
          {
            text: this.formatMoney(quote.total),
            fontSize: 15,
            bold: true,
            color: ink,
          },
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
      { text: '', margin: [0, 12, 0, 0] as [number, number, number, number] },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.5,
            lineColor: '#dddddd',
          },
        ],
      },
      {
        text:
          opts?.footerNote ??
          `Esta cotización es válida por ${quote.validDays} días a partir de la fecha de emisión.`,
        fontSize: 8,
        color: '#9c9c9c',
        alignment: 'center',
        margin: [0, 8, 0, 0] as [number, number, number, number],
      },
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                text: storeName.toUpperCase(),
                alignment: 'center',
                fontSize: 9,
                bold: true,
                color: '#ffffff',
                characterSpacing: 4,
              },
            ],
          ],
        },
        layout: {
          fillColor: () => accent,
          paddingTop: () => 10,
          paddingBottom: () => 10,
          hLineWidth: () => 0,
          vLineWidth: () => 0,
        },
        margin: [0, 10, 0, 0] as [number, number, number, number],
      },
    ];

    const docDefinition: TDocumentDefinitions = {
      content: [
        ...headerContent,
        ...infoContent,
        ...tableContent,
        ...summaryContent,
      ],
      styles: {
        tableHeader: {
          fontSize: 7.5,
          bold: true,
          color: labelGray,
          characterSpacing: 1,
        },
      },
      defaultStyle: { fontSize: 10, color: ink },
      pageMargins: [30, 30, 30, 30] as [number, number, number, number],
    };

    const pdfDoc = pdfMake.createPdf(docDefinition);
    const buffer = await pdfDoc.getBuffer();
    return Buffer.from(buffer);
  }

  async generateSalePdf(sale: {
    number: string;
    clientId: string | null;
    clientName: string;
    createdBy: string | null;
    items: Array<{
      name: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      originalPrice: number;
      subtotal: number;
      imageDataUri?: string | null;
    }>;
    subtotal: number;
    discount: number;
    total: number;
    createdAt: Date;
  }): Promise<Buffer> {
    return this.generateQuotePdf(
      {
        ...sale,
        validDays: 0,
        expiresAt: sale.createdAt,
      },
      {
        label: 'RECIBO DE VENTA',
        showExpiry: false,
        footerNote:
          '¡Gracias por su compra! Esta es su constancia de venta realizada.',
      },
    );
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

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}
