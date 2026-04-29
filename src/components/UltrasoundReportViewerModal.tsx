import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const PrinterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
  </svg>
);
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

interface MedicalReporter {
  nombre: string;
  especialidad: string;
  registroProfesional?: string;
}

export interface ReportData {
  id: string;
  paciente: string;
  rut: string;
  edad: string | number;
  prevision: string;
  fechaExamen: string;
  fechaEmision?: string;
  tipoExamen: string;
  hallazgos: string | string[];
  conclusion: string;
  medicoInformante: MedicalReporter;
}

export interface UltrasoundReportViewerModalProps {
  isOpen: boolean;
  reportData: ReportData | null;
  onClose: () => void;
  onDownloadPdf?: (report: ReportData) => void;
}

const contentLabelClassName =
  "mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500";

const contentValueClassName = "text-sm font-medium text-gray-800 sm:text-[15px]";

function formatDisplayDate(value?: string) {
  if (!value) {
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date());
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
}

function normalizeParagraphs(content: string | string[]) {
  if (Array.isArray(content)) {
    return content.filter((paragraph) => paragraph.trim().length > 0);
  }

  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

export default function UltrasoundReportViewerModal({
  isOpen,
  reportData,
  onClose,
  onDownloadPdf,
}: UltrasoundReportViewerModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const previousOverflowRef = useRef<string>("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflowRef.current;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !reportData || typeof document === "undefined") {
    return null;
  }

  const hallazgos = normalizeParagraphs(reportData.hallazgos);
  const conclusionParagraphs = normalizeParagraphs(reportData.conclusion);
  const fechaEmision = formatDisplayDate(reportData.fechaEmision);
  const fechaExamen = formatDisplayDate(reportData.fechaExamen);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:static print:block print:bg-transparent print:p-0"
      onClick={onClose}
      role="presentation"
    >
      <div className="pointer-events-none absolute inset-0 print:hidden" />

      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl print:max-h-none print:max-w-none print:rounded-none"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="Cerrar visor de informe"
          className="absolute right-5 top-5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-gray-600 shadow-lg transition hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-500 print:hidden"
          onClick={onClose}
          type="button"
        >
          <XIcon />
        </button>

        <div className="pointer-events-auto overflow-y-auto rounded-2xl bg-transparent print:overflow-visible print:rounded-none">
          <div className="mx-auto w-full max-w-[860px] bg-white text-gray-800 shadow-2xl print:max-w-none print:shadow-none">
            <div className="min-h-[1120px] px-6 py-8 sm:px-10 sm:py-10 print:min-h-0 print:w-full print:px-0 print:py-0">
              <header className="flex flex-col gap-6 border-b border-gray-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-bold tracking-tight text-gray-900">
                    ViñaMed - Portal Clínico
                  </p>
                  <p className="mt-1 text-sm text-gray-500">Informe ecográfico emitido</p>
                </div>

                <div className="space-y-1 text-left text-sm text-gray-600 sm:text-right">
                  <p>
                    <span className="font-semibold text-gray-800">Fecha de emisión:</span>{" "}
                    {fechaEmision}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-800">Folio N°</span> {reportData.id}
                  </p>
                </div>
              </header>

              <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <p className={contentLabelClassName}>Nombre</p>
                    <p className={contentValueClassName}>{reportData.paciente}</p>
                  </div>
                  <div>
                    <p className={contentLabelClassName}>RUT</p>
                    <p className={contentValueClassName}>{reportData.rut}</p>
                  </div>
                  <div>
                    <p className={contentLabelClassName}>Edad</p>
                    <p className={contentValueClassName}>{reportData.edad}</p>
                  </div>
                  <div>
                    <p className={contentLabelClassName}>Previsión</p>
                    <p className={contentValueClassName}>{reportData.prevision}</p>
                  </div>
                  <div>
                    <p className={contentLabelClassName}>Fecha del examen</p>
                    <p className={contentValueClassName}>{fechaExamen}</p>
                  </div>
                </div>
              </section>

              <section className="mt-10">
                <h1
                  className="text-center text-xl font-bold uppercase tracking-[0.22em] text-gray-900 sm:text-2xl"
                  id={titleId}
                >
                  {reportData.tipoExamen}
                </h1>
                <p className="sr-only" id={descriptionId}>
                  Visualizador de informe ecográfico con hallazgos, conclusión y firma médica.
                </p>
              </section>

              <main className="mt-10 space-y-10">
                <section>
                  <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Hallazgos
                  </h2>
                  <div className="space-y-4 font-sans text-sm leading-7 text-gray-700 sm:text-base">
                    {hallazgos.length > 0 ? (
                      hallazgos.map((paragraph, index) => (
                        <p className="whitespace-pre-wrap" key={`${reportData.id}-hallazgo-${index}`}>
                          {paragraph}
                        </p>
                      ))
                    ) : (
                      <p className="whitespace-pre-wrap">{reportData.hallazgos}</p>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-sky-100 bg-sky-50/70 px-5 py-5">
                  <div className="border-l-4 border-sky-600 pl-4">
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-sky-900">
                      Conclusión
                    </h2>
                    <div className="space-y-3 text-sm font-medium leading-7 text-gray-800 sm:text-base">
                      {conclusionParagraphs.length > 0 ? (
                        conclusionParagraphs.map((paragraph, index) => (
                          <p
                            className="whitespace-pre-wrap"
                            key={`${reportData.id}-conclusion-${index}`}
                          >
                            {paragraph}
                          </p>
                        ))
                      ) : (
                        <p className="whitespace-pre-wrap">{reportData.conclusion}</p>
                      )}
                    </div>
                  </div>
                </section>
              </main>

              <footer className="mt-16 flex justify-center sm:justify-end">
                <div className="w-full max-w-sm text-center">
                  <div className="mx-auto h-20 w-full" />
                  <div className="border-t border-gray-400 pt-4">
                    <p className="text-base font-semibold text-gray-900">
                      {reportData.medicoInformante.nombre}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {reportData.medicoInformante.especialidad}
                    </p>
                    {reportData.medicoInformante.registroProfesional ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gray-500">
                        Registro profesional: {reportData.medicoInformante.registroProfesional}
                      </p>
                    ) : null}
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 print:hidden">
          <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/40 bg-white/90 p-3 shadow-2xl backdrop-blur">
            <button
              className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-sky-500"
              onClick={() => window.print()}
              type="button"
            >
              <PrinterIcon />
              Imprimir
            </button>

            <button
              className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              onClick={() => onDownloadPdf?.(reportData)}
              type="button"
            >
              <DownloadIcon />
              Descargar PDF
            </button>

            <button
              className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
              onClick={onClose}
              type="button"
            >
              <XIcon />
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
