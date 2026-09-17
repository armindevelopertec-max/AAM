"use client";

import { useState } from "react";
import { submitContactForm, type ContactFormInput } from "../../lib/api";

export default function ContactForm() {
  const [formData, setFormData] = useState<ContactFormInput>({
    name: "",
    email: "",
    phone: "",
    message: "",
    type: "instalacion",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await submitContactForm(formData);
      setStatus("success");
      setSuccessMessage(result.message);
      setFormData({ name: "", email: "", phone: "", message: "", type: "instalacion" });
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al enviar el formulario");
    }
  };

  const typeOptions = [
    { value: "instalacion", label: "Consulta por Instalación (precio externo)" },
    { value: "cotizacion", label: "Solicitar Cotización" },
    { value: "otro", label: "Otra Consulta" },
  ];

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div className="mx-auto max-w-xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold">Contáctanos</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            ¿Interesado en un kit? ¿Necesitas instalación? Escríbenos y te responderemos a la brevedad.
          </p>
        </div>

        {status === "success" && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-600 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
            {successMessage}
          </div>
        )}

        {status === "error" && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Nombre *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={status === "submitting"}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={status === "submitting"}
                className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Teléfono
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={status === "submitting"}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Tipo de Consulta *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
              disabled={status === "submitting"}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Mensaje *
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={4}
              disabled={status === "submitting"}
              className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              placeholder="Cuéntanos qué necesitas: kit de interés, tipo de instalación, ubicación, etc."
            />
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-md bg-neutral-900 px-4 py-3 text-white font-medium transition hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {status === "submitting" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Enviando...
              </span>
            ) : (
              "Enviar Consulta"
            )}
          </button>

          <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
            * Los precios de instalación son externos y se cotizan según el proyecto.
          </p>
        </form>
      </div>
    </section>
  );
}