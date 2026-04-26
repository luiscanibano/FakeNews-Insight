/**
 * @file LandingProcess.jsx
 * @description Componente de la landing page orientado a contenido, comunicacion de valor y conversion.
 */

/** Explica el flujo del producto en pasos secuenciales para el usuario final. */
function LandingProcess({ content }) {
  return (
    <section className="relative overflow-hidden px-6 py-24" id="process">
      <div className="mx-auto w-full max-w-7xl">
        <div className="landing-reveal mb-20 text-center">
          <h2 className="mb-4 font-headline text-3xl font-bold text-on-surface md:text-4xl">{content.title}</h2>
          <p className="text-on-surface-variant">{content.description}</p>
        </div>

        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3">
          <div className="absolute left-0 top-1/4 -z-10 hidden h-px w-full bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent md:block" />

          <div className="contents">
            {content.steps.map((step, index) => (
              <div
                key={step.number}
                className="landing-reveal group text-center"
                style={{ "--landing-delay": `${(index + 1) * 90}ms` }}
              >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-outline-variant/20 bg-surface-container transition-all duration-500 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-[0_8px_26px_rgba(173,199,255,0.18)]">
                  <span className="font-headline text-xl font-bold text-on-surface">{step.number}</span>
                </div>
                <h4 className="mb-3 font-headline text-lg font-bold">{step.title}</h4>
                <p className="text-sm leading-relaxed text-on-surface-variant">{step.description}</p>
                <div className="mt-4 inline-flex items-center rounded-full border border-outline-variant/20 bg-surface-container-high px-3 py-1 text-[10px] font-label uppercase tracking-wider text-primary">
                  {step.eta}
                </div>
                <ul className="mt-4 space-y-2 text-left">
                  {step.details?.map((detail) => (
                    <li key={detail} className="flex items-start gap-2 text-xs leading-relaxed text-on-surface-variant/90">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary/70" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingProcess;
