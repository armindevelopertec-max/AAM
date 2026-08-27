import { getToken } from "./auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type Product = {
  id: number;
  storeId: number;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  regularPrice: number;
  price: number;
  stock: number;
  imageUrl: string | null;
};

export type CatalogoPrecioVentaTipo = "fijo" | "porcentaje";

export type CatalogoImagen = {
  key: string;
  url: string;
  originalName: string;
  accessUrl?: string;
};

export type Client = {
  id: number;
  storeId: number;
  name: string;
  email: string | null;
  phone: string | null;
  ci: string | null;
};

export type SaleItem = {
  id: number;
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type Sale = {
  id: number;
  storeId: number;
  number: string;
  clientId: number | null;
  createdBy: string | null;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
};

export type QuoteItem = {
  productId: number;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  originalPrice: number;
  subtotal: number;
};

export type QuoteStatus =
  | "borrador"
  | "enviada"
  | "aceptada"
  | "perdida"
  | "vencida";

export type Quote = {
  id: number;
  storeId: number;
  number: string;
  clientId: number | null;
  clientName: string;
  createdBy: string | null;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  total: number;
  validDays: number;
  expiresAt: string;
  status: QuoteStatus;
  createdAt: string;
};

export type Store = {
  id: number;
  name: string;
  currency: string;
  taxRate: number;
  lowStockThreshold: number;
};

export type DashboardSummary = {
  store: Store;
  products: {
    total: number;
    lowStock: number;
    inventoryValue: number;
    stockValue: number;
  };
  clients: { total: number };
  sales: {
    total: number;
    todayCount: number;
    todayRevenue: number;
    revenue: number;
  };
  quotes: { total: number; pending: number };
  lowStockProducts: Product[];
  recentSales: Sale[];
  recentQuotes: Quote[];
};

export type ScrapedProduct = {
  _id: string;
  fuente: string;
  categoriaScrape: string;
  fechaScrape: string;
  urlOriginal: string;
  datosCrudos: {
    idExterno: number;
    nombre: string;
    sku: string;
    precioRegular: number;
    precioOferta: number;
    precioMetro?: number;
    unidad?: string;
    metros?: number;
    moneda: string;
    enStock: boolean;
    stockCantidad: number;
    stockTexto: string;
    marca: string;
    categorias: string[];
    tags: string[];
    descripcionCorta: string;
    descripcionLarga: string;
  };
  imagenesDescargadas: { key: string; originalUrl: string }[];
  importadoAPostgres: boolean;
  postgresProductId: number | null;
  historialPrecios: {
    fecha: string;
    precioRegular: number;
    precioOferta: number;
  }[];
  descartado: boolean;
  notas: string;
};

export type ScrapingStats = {
  total: number;
  importados: number;
  descartados: number;
  pendientes: number;
  porFuente: { _id: string; count: number }[];
};

export type ScrapingRun = {
  id: number;
  fuente: string;
  categoria: string;
  status: string;
  totalEncontrados: number;
  nuevosGuardados: number;
  imagenesDescargadas: number;
  errorMensaje: string;
  inicioEn: string;
  finEn: string | null;
};

const baseHeaders: Record<string, string> = {
  "Content-Type": "application/json",
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${url}`, {
    ...init,
    headers: {
      ...baseHeaders,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    const message = body ? JSON.parse(body).message : res.statusText;
    throw new Error(message);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export async function getProducts(
  q?: string,
  category?: string,
): Promise<Product[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  const qs = params.toString();
  return request(`/products${qs ? `?${qs}` : ""}`);
}

export async function createProduct(input: {
  name: string;
  price: number;
  regularPrice?: number;
  sku?: string;
  category?: string;
  costPrice?: number;
  stock?: number;
}): Promise<Product> {
  return request("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProduct(
  id: number,
  input: Partial<{
    name: string;
    price: number;
    regularPrice: number;
    sku: string;
    category: string;
    costPrice: number;
    stock: number;
  }>,
): Promise<Product> {
  return request(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function adjustStock(
  id: number,
  adjustment: number,
): Promise<Product> {
  return request(`/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ adjustment }),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  await request(`/products/${id}`, { method: "DELETE" });
}

export async function uploadProductImage(
  id: number,
  file: File,
): Promise<Product> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/products/${id}/image`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    const message = body ? JSON.parse(body).message : res.statusText;
    throw new Error(message);
  }
  return res.json();
}

export async function getClients(): Promise<Client[]> {
  return request("/clients");
}

export async function createClient(input: {
  name: string;
  email?: string;
  phone?: string;
  ci?: string;
}): Promise<Client> {
  return request("/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateClient(
  id: number,
  input: { name: string; email: string; phone: string; ci?: string },
): Promise<Client> {
  return request(`/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteClient(id: number): Promise<void> {
  await request(`/clients/${id}`, { method: "DELETE" });
}

export async function getSales(): Promise<Sale[]> {
  return request("/sales");
}

export async function createSale(input: {
  clientId?: number;
  discount?: number;
  items: { productId: number; quantity: number; price?: number }[];
}): Promise<Sale> {
  return request("/sales", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getQuotes(): Promise<Quote[]> {
  return request("/quotes");
}

export async function createQuote(input: {
  clientId?: number;
  clientName?: string;
  discount?: number;
  validDays?: number;
  items: { productId: number; quantity: number; price?: number; originalPrice?: number }[];
}): Promise<Quote> {
  return request("/quotes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateQuoteStatus(
  id: number,
  status: QuoteStatus,
): Promise<Quote> {
  return request(`/quotes/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function convertQuoteToSale(
  id: number,
): Promise<{ sale: Sale; quote: Quote }> {
  return request(`/quotes/${id}/convert`, { method: "POST" });
}

export async function generateQuotePdf(
  id: number,
): Promise<{ key: string; url: string; quoteNumber: string }> {
  return request(`/quotes/${id}/pdf`, { method: "POST" });
}

export async function getDashboard(): Promise<DashboardSummary> {
  return request("/dashboard");
}

// --- Catalogo ---

export interface CatalogoProducto {
  id?: number;
  catalogoId?: number;
  nombre: string | null;
  descripcion: string | null;
  marca: string | null;
  modelo: string | null;
  categoria: string | null;
  canales: number | null;
  precio: number | null;
  precioVentaTipo?: CatalogoPrecioVentaTipo | null;
  precioVentaValor?: number | null;
  precioVenta?: number | null;
  moneda: string | null;
  imagenes?: CatalogoImagen[];
  imagenUrl?: string | null;
}

export interface CatalogoData {
  catalogo: {
    nombre: string;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  productos: CatalogoProducto[];
}

export async function getCatalogo(
  buscar?: string,
  marca?: string,
  categoria?: string,
  page?: number,
  limit?: number,
): Promise<CatalogoData> {
  const params = new URLSearchParams();
  if (buscar) params.set("buscar", buscar);
  if (marca) params.set("marca", marca);
  if (categoria) params.set("categoria", categoria);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return request(`/catalogo${qs ? `?${qs}` : ""}`);
}

export async function importCatalogoFromJson(): Promise<{
  imported: number;
  skipped: number;
  total: number;
}> {
  return request("/catalogo/import", { method: "POST" });
}

export async function updateProducto(
  id: number,
  input: Partial<{
    nombre: string | null;
    descripcion: string | null;
    marca: string | null;
    modelo: string | null;
    categoria: string | null;
    canales: number | null;
    precio: number | null;
    precioVentaTipo: CatalogoPrecioVentaTipo | null;
    precioVentaValor: number | null;
    moneda: string | null;
  }>,
): Promise<CatalogoProducto> {
  return request(`/catalogo/productos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function uploadCatalogoImagenes(
  id: number,
  files: File[],
): Promise<CatalogoProducto> {
  const token = getToken();
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  const res = await fetch(`${API_URL}/catalogo/productos/${id}/imagenes`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.text();
    const message = body ? JSON.parse(body).message : res.statusText;
    throw new Error(message);
  }
  return res.json();
}

export async function deleteCatalogoImagen(
  id: number,
  key: string,
): Promise<CatalogoProducto> {
  const params = new URLSearchParams();
  params.set("key", key);
  return request(`/catalogo/productos/${id}/imagenes?${params.toString()}`, {
    method: "DELETE",
  });
}

export async function deleteProducto(id: number): Promise<void> {
  await request(`/catalogo/productos/${id}`, { method: "DELETE" });
}

// --- Scraping ---

export async function getScrapedProducts(params: {
  fuente?: string;
  categoria?: string;
  importado?: string;
  descartado?: string;
  buscar?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: ScrapedProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params.fuente) searchParams.set("fuente", params.fuente);
  if (params.categoria) searchParams.set("categoria", params.categoria);
  if (params.importado) searchParams.set("importado", params.importado);
  if (params.descartado) searchParams.set("descartado", params.descartado);
  if (params.buscar) searchParams.set("buscar", params.buscar);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return request(`/scraping/products${qs ? `?${qs}` : ""}`);
}

export async function getScrapedProduct(
  id: string,
): Promise<ScrapedProduct> {
  return request(`/scraping/products/${id}`);
}

export async function importScrapedToPostgres(
  id: string,
  overrides?: {
    name?: string;
    sku?: string;
    category?: string;
    costPrice?: number;
    regularPrice?: number;
    price?: number;
    stock?: number;
  },
): Promise<{ postgresProduct: Product; scrapedProduct: ScrapedProduct }> {
  return request(`/scraping/products/${id}/import`, {
    method: "POST",
    body: JSON.stringify(overrides ?? {}),
  });
}

export async function discardScrapedProduct(
  id: string,
  descartado: boolean,
): Promise<ScrapedProduct> {
  return request(`/scraping/products/${id}/discard`, {
    method: "PATCH",
    body: JSON.stringify({ descartado }),
  });
}

export async function updateScrapedNotes(
  id: string,
  notas: string,
): Promise<ScrapedProduct> {
  return request(`/scraping/products/${id}/notes`, {
    method: "PATCH",
    body: JSON.stringify({ notas }),
  });
}

export async function deleteScrapedProduct(id: string): Promise<void> {
  await request(`/scraping/products/${id}`, { method: "DELETE" });
}

export async function getScrapingStats(): Promise<ScrapingStats> {
  return request("/scraping/stats");
}

export async function getScrapingRuns(): Promise<ScrapingRun[]> {
  return request("/scraping/runs");
}

export function getScrapedImageUrl(key: string): string {
  return `${API_URL}/scraping/images/${encodeURIComponent(key)}`;
}

export function formatMoney(value: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}
