import Link from "next/link";
import { getClients } from "../lib/api";
import { getProducts } from "../lib/api";

export default async function DashboardPage() {
  const [products, clients] = await Promise.all([getProducts(), getClients()]);

  const totalProducts = products.length;
  const totalClients = clients.length;
  const totalValue = products.reduce((sum, p) => sum + p.price, 0);

  const stats = [
    { label: "Productos", value: totalProducts, href: "/products" },
    { label: "Clientes", value: totalClients, href: "/clients" },
    { label: "Valor total", value: `$${totalValue.toFixed(2)}`, href: "/products" },
  ];

  const latestProducts = products.slice(-5).reverse();
  const latestClients = clients.slice(-5).reverse();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">Resumen general de tu negocio</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-lg border border-neutral-200 bg-white p-6 transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
          >
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold">Últimos productos</h2>
          {latestProducts.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay productos.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {latestProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between py-2">
                  <span>{product.name}</span>
                  <span className="font-medium">${product.price.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold">Últimos clientes</h2>
          {latestClients.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay clientes.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
              {latestClients.map((client) => (
                <li key={client.id} className="flex items-center justify-between py-2">
                  <span>{client.name}</span>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">{client.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
