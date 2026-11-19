import PublicKits from "./components/PublicKits";
import CompanyInfo from "./components/CompanyInfo";
import ContactForm from "./components/ContactForm";

export default function PublicHomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-4 py-20 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Soluciones Integrales en <span className="text-green-600 dark:text-green-400">Seguridad Electrónica</span>
          </h1>
          <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-400">
            Kits completos de CCTV, control de acceso y networking. Precios finales, sin sorpresas.
            La instalación se cotiza por separado según tu proyecto.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#kits"
              className="rounded-md bg-neutral-900 px-6 py-3 text-white font-medium transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Ver Kits Disponibles
            </a>
            <a
              href="#contacto"
              className="rounded-md border border-neutral-300 bg-white px-6 py-3 text-neutral-900 font-medium transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
            >
              Solicitar Instalación
            </a>
          </div>
        </div>
      </section>

      {/* Kits Section */}
      <section id="kits" className="mx-auto max-w-5xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold">Kits Disponibles</h2>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Equipos listos para instalar. Precios finales con IVA incluido.
          </p>
        </div>
        <PublicKits />
      </section>

      {/* Company Info Section */}
      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <CompanyInfo />
      </section>

      {/* Contact Section */}
      <section id="contacto" className="bg-neutral-50 dark:bg-neutral-900">
        <ContactForm />
      </section>
    </div>
  );
}