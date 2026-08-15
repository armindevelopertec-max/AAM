import ClientManager from "../../components/ClientManager";
import { getClients } from "../../lib/api";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="mt-1 text-neutral-600 dark:text-neutral-400">Agrega y administra tus clientes</p>
      </header>
      <ClientManager initialClients={clients} />
    </div>
  );
}
