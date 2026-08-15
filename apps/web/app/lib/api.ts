export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type Product = {
  id: number;
  name: string;
  price: number;
};

export type Client = {
  id: number;
  name: string;
  email: string;
  phone: string;
};

export async function getProducts(): Promise<Product[]> {
  const res = await fetch(`${API_URL}/products`);
  if (!res.ok) {
    throw new Error(`Error al cargar productos: ${res.status}`);
  }
  return res.json();
}

export async function createProduct(input: { name: string; price: number }): Promise<Product> {
  const res = await fetch(`${API_URL}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Error al crear producto: ${res.status}`);
  }
  return res.json();
}

export async function updateProduct(
  id: number,
  input: { name: string; price: number }
): Promise<Product> {
  const res = await fetch(`${API_URL}/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Error al actualizar producto: ${res.status}`);
  }
  return res.json();
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/products/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`Error al eliminar producto: ${res.status}`);
  }
}

export async function getClients(): Promise<Client[]> {
  const res = await fetch(`${API_URL}/clients`);
  if (!res.ok) {
    throw new Error(`Error al cargar clientes: ${res.status}`);
  }
  return res.json();
}

export async function createClient(input: { name: string; email: string; phone: string }): Promise<Client> {
  const res = await fetch(`${API_URL}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Error al crear cliente: ${res.status}`);
  }
  return res.json();
}

export async function updateClient(
  id: number,
  input: { name: string; email: string; phone: string }
): Promise<Client> {
  const res = await fetch(`${API_URL}/clients/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`Error al actualizar cliente: ${res.status}`);
  }
  return res.json();
}

export async function deleteClient(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/clients/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`Error al eliminar cliente: ${res.status}`);
  }
}
