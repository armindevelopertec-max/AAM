import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoresService } from '../stores/stores.service';
import { PENDING_STATUSES } from '../quotes/quote-statuses';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storesService: StoresService,
  ) {}

  async summary(storeId: number) {
    const store = await this.storesService.findOne(storeId);
    const lowStockThreshold = store.lowStockThreshold;

    const [products, clients, sales, quotes] = await Promise.all([
      this.prisma.product.findMany({
        where: { storeId },
        orderBy: { id: 'asc' },
      }),
      this.prisma.client.findMany({ where: { storeId } }),
      this.prisma.sale.findMany({
        where: { storeId },
        orderBy: { id: 'asc' },
        include: { items: true },
      }),
      this.prisma.quote.findMany({
        where: { storeId },
        orderBy: { id: 'asc' },
        include: { items: true },
      }),
    ]);

    const lowStockProducts = products
      .filter((product) => product.stock <= lowStockThreshold)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    const today = new Date().toDateString();
    const todaySales = sales.filter(
      (sale) => sale.createdAt.toDateString() === today,
    );
    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const inventoryValue = products.reduce(
      (sum, product) => sum + product.costPrice * product.stock,
      0,
    );
    const stockValue = products.reduce(
      (sum, product) => sum + product.price * product.stock,
      0,
    );

    const effectiveQuotes = quotes.map((quote) => {
      const isPending = PENDING_STATUSES.includes(quote.status);
      if (isPending && quote.expiresAt.getTime() < Date.now()) {
        return { ...quote, status: 'vencida' as const };
      }
      return quote;
    });

    return {
      store,
      products: {
        total: products.length,
        lowStock: lowStockProducts.length,
        inventoryValue,
        stockValue,
      },
      clients: { total: clients.length },
      sales: {
        total: sales.length,
        todayCount: todaySales.length,
        todayRevenue,
        revenue,
      },
      quotes: {
        total: effectiveQuotes.length,
        pending: effectiveQuotes.filter(
          (quote) => quote.status === 'borrador' || quote.status === 'enviada',
        ).length,
      },
      lowStockProducts,
      recentSales: sales.slice(-5).reverse(),
      recentQuotes: effectiveQuotes.slice(-5).reverse(),
    };
  }
}
