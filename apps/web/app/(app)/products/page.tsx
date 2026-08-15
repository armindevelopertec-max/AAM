import ProductManager from "../../components/ProductManager";
import { getProducts } from "../../lib/api";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Productos</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">Agrega y administra tus productos</p>
      </header>
      <ProductManager initialProducts={products} />
    </div>
  );
}
