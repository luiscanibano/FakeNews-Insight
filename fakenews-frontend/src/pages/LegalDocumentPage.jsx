/**
 * @file LegalDocumentPage.jsx
 * @description Pagina publica reutilizable para documentos legales de la landing.
 */

import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import LandingBackground from "../components/landing/LandingBackground";

const LEGAL_DOCUMENTS = {
  privacy: {
    es: {
      eyebrow: "Documento legal",
      title: "Política de privacidad",
      updatedAt: "Última actualización: 18 de mayo de 2026",
      intro:
        "En FakeNews Insight tratamos los datos personales necesarios para ofrecer verificación de afirmaciones, acceso a la plataforma, soporte y métricas básicas de uso.",
      sections: [
        {
          title: "1. Responsable del tratamiento",
          paragraphs: [
            "El responsable del tratamiento es FakeNews Insight.",
            "Para cualquier cuestión relativa a privacidad puedes escribir a fakenewsinsight@gmail.com.",
          ],
        },
        {
          title: "2. Datos que recogemos",
          bullets: [
            "Datos de cuenta como correo electrónico e identificadores de usuario.",
            "Contenido que envías para analizar o verificar dentro de la plataforma.",
            "Metadatos técnicos mínimos necesarios para seguridad, autenticación y funcionamiento del servicio.",
            "Información de suscripción o facturación cuando contratas un plan de pago.",
          ],
        },
        {
          title: "3. Finalidades del tratamiento",
          bullets: [
            "Prestar el servicio de análisis y verificación de afirmaciones.",
            "Guardar historial cuando el usuario lo solicita expresamente.",
            "Gestionar autenticación, seguridad, soporte y prevención de abuso.",
            "Administrar planes, límites de uso y procesos de facturación.",
          ],
        },
        {
          title: "4. Base jurídica",
          paragraphs: [
            "Tratamos tus datos para ejecutar la relación contractual derivada del uso del servicio.",
            "También podemos tratarlos por interés legítimo en materia de seguridad, prevención de fraude y mejora operativa del producto.",
          ],
        },
        {
          title: "5. Conservación de los datos",
          paragraphs: [
            "Conservamos los datos mientras tu cuenta permanezca activa o mientras sean necesarios para cumplir obligaciones legales y resolver incidencias.",
            "Puedes solicitar la eliminación de tu cuenta y de tus datos asociados, salvo cuando exista una obligación legal de conservación.",
          ],
        },
        {
          title: "6. Encargados y terceros",
          paragraphs: [
            "Podemos apoyarnos en proveedores de infraestructura, autenticación, almacenamiento, analítica técnica y facturación para operar la plataforma.",
            "Solo compartimos la información necesaria para prestar el servicio y bajo condiciones de confidencialidad y seguridad adecuadas.",
          ],
        },
        {
          title: "7. Derechos del usuario",
          bullets: [
            "Acceder a tus datos personales.",
            "Solicitar su rectificación o supresión.",
            "Oponerte a determinados tratamientos o pedir su limitación.",
            "Solicitar la portabilidad de tus datos cuando proceda.",
          ],
        },
        {
          title: "8. Contacto",
          paragraphs: [
            "Si tienes dudas sobre esta política o sobre el tratamiento de tus datos, escríbenos a fakenewsinsight@gmail.com.",
          ],
        },
      ],
    },
    en: {
      eyebrow: "Legal document",
      title: "Privacy Policy",
      updatedAt: "Last updated: May 18, 2026",
      intro:
        "At FakeNews Insight we process the personal data required to provide claim verification, platform access, support and basic usage metrics.",
      sections: [
        {
          title: "1. Data controller",
          paragraphs: [
            "The data controller is FakeNews Insight.",
            "For any privacy-related request you can contact fakenewsinsight@gmail.com.",
          ],
        },
        {
          title: "2. Data we collect",
          bullets: [
            "Account data such as email address and user identifiers.",
            "Content you submit to analyze or verify within the platform.",
            "Minimum technical metadata required for security, authentication and service operation.",
            "Subscription or billing data when you purchase a paid plan.",
          ],
        },
        {
          title: "3. Purposes of processing",
          bullets: [
            "Provide the analysis and claim verification service.",
            "Store history when the user explicitly requests it.",
            "Manage authentication, security, support and abuse prevention.",
            "Administer plans, usage limits and billing workflows.",
          ],
        },
        {
          title: "4. Legal basis",
          paragraphs: [
            "We process your data to perform the contractual relationship created by your use of the service.",
            "We may also process data under legitimate interest for security, fraud prevention and product operations.",
          ],
        },
        {
          title: "5. Data retention",
          paragraphs: [
            "We retain data while your account remains active or for as long as necessary to comply with legal obligations and resolve incidents.",
            "You may request deletion of your account and associated data, except where retention is legally required.",
          ],
        },
        {
          title: "6. Processors and third parties",
          paragraphs: [
            "We may rely on infrastructure, authentication, storage, technical analytics and billing providers to operate the platform.",
            "We only share the information required to provide the service and under appropriate confidentiality and security conditions.",
          ],
        },
        {
          title: "7. User rights",
          bullets: [
            "Access your personal data.",
            "Request rectification or deletion.",
            "Object to certain processing activities or request restriction.",
            "Request portability of your data where applicable.",
          ],
        },
        {
          title: "8. Contact",
          paragraphs: [
            "If you have questions about this policy or how your data is handled, contact us at fakenewsinsight@gmail.com.",
          ],
        },
      ],
    },
  },
  terms: {
    es: {
      eyebrow: "Documento legal",
      title: "Términos y condiciones",
      updatedAt: "Última actualización: 18 de mayo de 2026",
      intro:
        "Estos términos regulan el acceso y uso de FakeNews Insight como plataforma de análisis y verificación de afirmaciones con ayuda de IA y evidencias web.",
      sections: [
        {
          title: "1. Objeto del servicio",
          paragraphs: [
            "FakeNews Insight ofrece herramientas para contrastar afirmaciones, consultar evidencias y gestionar historiales de verificación.",
            "El servicio tiene finalidad informativa y de apoyo al análisis, y no constituye asesoramiento profesional ni garantía absoluta de veracidad.",
          ],
        },
        {
          title: "2. Cuenta de usuario",
          bullets: [
            "Debes proporcionar información veraz al registrarte.",
            "Eres responsable de la confidencialidad de tus credenciales.",
            "Debes notificarnos cualquier uso no autorizado de tu cuenta.",
          ],
        },
        {
          title: "3. Uso permitido",
          bullets: [
            "Usar la plataforma de conformidad con la ley y estos términos.",
            "No interferir con la seguridad, estabilidad o disponibilidad del servicio.",
            "No utilizar el servicio para actividades ilícitas, abusivas o que vulneren derechos de terceros.",
          ],
        },
        {
          title: "4. Planes y límites",
          paragraphs: [
            "Algunas funcionalidades pueden depender del plan contratado y de límites diarios o técnicos de uso.",
            "Podemos actualizar planes, límites y características siempre que ello no vulnere derechos adquiridos ni obligaciones legales aplicables.",
          ],
        },
        {
          title: "5. Propiedad intelectual",
          paragraphs: [
            "El software, diseño, marca y materiales de FakeNews Insight están protegidos por derechos de propiedad intelectual e industrial.",
            "No se concede al usuario ningún derecho de explotación más allá del uso ordinario del servicio.",
          ],
        },
        {
          title: "6. Disponibilidad y responsabilidad",
          paragraphs: [
            "Nos esforzamos por mantener el servicio disponible y razonablemente actualizado, pero no garantizamos disponibilidad continua ni ausencia total de errores.",
            "Los resultados del sistema pueden incluir incertidumbre o depender de fuentes externas; el usuario debe interpretarlos con criterio propio.",
          ],
        },
        {
          title: "7. Suspensión o cancelación",
          paragraphs: [
            "Podemos suspender o cancelar cuentas en caso de incumplimiento de estos términos, uso abusivo o riesgo para la seguridad del servicio.",
            "El usuario puede dejar de usar el servicio en cualquier momento y solicitar la eliminación de su cuenta conforme a la política de privacidad.",
          ],
        },
        {
          title: "8. Contacto",
          paragraphs: [
            "Para consultas legales o contractuales puedes escribir a fakenewsinsight@gmail.com.",
          ],
        },
      ],
    },
    en: {
      eyebrow: "Legal document",
      title: "Terms & Conditions",
      updatedAt: "Last updated: May 18, 2026",
      intro:
        "These terms govern access to and use of FakeNews Insight as a platform for AI-assisted claim analysis and evidence-backed verification.",
      sections: [
        {
          title: "1. Service scope",
          paragraphs: [
            "FakeNews Insight provides tools to cross-check claims, inspect evidence and manage verification history.",
            "The service is intended for informational and analytical support purposes only and does not constitute professional advice or an absolute guarantee of truthfulness.",
          ],
        },
        {
          title: "2. User account",
          bullets: [
            "You must provide accurate information when registering.",
            "You are responsible for keeping your credentials confidential.",
            "You must notify us of any unauthorized use of your account.",
          ],
        },
        {
          title: "3. Acceptable use",
          bullets: [
            "Use the platform in compliance with the law and these terms.",
            "Do not interfere with the security, stability or availability of the service.",
            "Do not use the service for unlawful, abusive or rights-infringing activities.",
          ],
        },
        {
          title: "4. Plans and limits",
          paragraphs: [
            "Some features may depend on the subscribed plan and on daily or technical usage limits.",
            "We may update plans, limits and features provided this does not violate acquired rights or applicable legal obligations.",
          ],
        },
        {
          title: "5. Intellectual property",
          paragraphs: [
            "The software, design, brand and materials of FakeNews Insight are protected by intellectual and industrial property rights.",
            "No exploitation rights are granted beyond ordinary use of the service.",
          ],
        },
        {
          title: "6. Availability and liability",
          paragraphs: [
            "We make reasonable efforts to keep the service available and up to date, but we do not guarantee uninterrupted availability or total absence of errors.",
            "System outputs may include uncertainty or depend on external sources; users must interpret them critically.",
          ],
        },
        {
          title: "7. Suspension or termination",
          paragraphs: [
            "We may suspend or terminate accounts in case of breach of these terms, abusive use or risk to service security.",
            "Users may stop using the service at any time and request account deletion in accordance with the privacy policy.",
          ],
        },
        {
          title: "8. Contact",
          paragraphs: [
            "For legal or contractual matters you can contact fakenewsinsight@gmail.com.",
          ],
        },
      ],
    },
  },
};

const resolveLang = (rawLang) => {
  const lang = (rawLang || "es").toLowerCase().split("-")[0];
  return lang === "en" ? "en" : "es";
};

function LegalDocumentPage({ documentKey = "privacy" }) {
  const { i18n } = useTranslation();
  const lang = resolveLang(i18n.language);
  const content = LEGAL_DOCUMENTS[documentKey]?.[lang] || LEGAL_DOCUMENTS.privacy.es;

  return (
    <div className="stitch-landing dark relative isolate min-h-screen overflow-x-hidden bg-surface text-on-surface font-body">
      <LandingBackground />

      <header className="fixed top-0 z-50 w-full px-4 pt-4 md:px-6">
        <div className="landing-navbar-shell mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-2xl border border-outline-variant/20 px-4 md:px-6">
          <Link to="/" className="group flex items-center gap-3 text-on-surface">
            <span className="landing-brand-mark" aria-hidden="true">
              <span className="landing-brand-grid" />
              <span className="landing-brand-glyph">
                <span className="landing-brand-bar landing-brand-bar-a" />
                <span className="landing-brand-bar landing-brand-bar-b" />
                <span className="landing-brand-dot" />
              </span>
            </span>
            <span className="leading-tight">
              <span className="landing-brand-lead">FakeNews</span>
              <span className="landing-brand-tail">Insight</span>
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface/50 px-3 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <ArrowLeft className="size-4" />
            {lang === "en" ? "Back to landing" : "Volver a la landing"}
          </Link>
        </div>
      </header>

      <main className="px-6 pb-20 pt-28 md:pt-32">
        <section className="mx-auto w-full max-w-4xl">
          <div className="landing-glass-card rounded-[2rem] border border-outline-variant/15 bg-surface-container p-8 shadow-[0_18px_60px_rgba(0,0,0,0.28)] md:p-12">
            <span className="inline-flex items-center rounded-full border border-outline-variant/20 bg-surface/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              {content.eyebrow}
            </span>
            <h1 className="mt-5 font-headline text-3xl font-bold text-on-surface md:text-5xl">
              {content.title}
            </h1>
            <p className="mt-3 text-sm text-on-surface-variant">{content.updatedAt}</p>
            <p className="mt-6 text-base leading-relaxed text-on-surface-variant md:text-lg">
              {content.intro}
            </p>

            <div className="mt-10 space-y-8">
              {content.sections.map((section) => (
                <section key={section.title} className="rounded-2xl border border-outline-variant/15 bg-surface/35 p-5 md:p-6">
                  <h2 className="font-headline text-xl font-bold text-on-surface md:text-2xl">
                    {section.title}
                  </h2>

                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-4 text-sm leading-7 text-on-surface-variant md:text-base">
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets?.length ? (
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-on-surface-variant md:text-base">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LegalDocumentPage;