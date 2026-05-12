/**
 * @file landingProcessContent.js
 * @description Pasos del proceso ("como funciona") en la landing.
 */

export const landingProcessContent = {
  es: {
    title: "Desarrollado para verificar afirmaciones.",
    description: "Tres pasos para pasar del texto a un veredicto con evidencias.",
    steps: [
      {
        number: "01",
        title: "Introduce la información",
        eta: "Paso inicial · 15s",
        description:
          "Pega un texto dudoso, una URL o selecciona un fragmento desde la extensión para iniciar el análisis.",
        details: [
          "Acepta texto libre, titulares, claims o URL completas.",
          "Normalización del contenido antes de extraer afirmaciones.",
        ],
      },
      {
        number: "02",
        title: "FEVER contrasta las afirmaciones",
        eta: "NLI + evidencias",
        description:
          "El agente separa claims, recupera evidencias web y usa inferencia NLI para medir si cada evidencia apoya o refuta la afirmación.",
        details: [
          "Cruce entre afirmación, evidencia y etiqueta FEVER.",
          "Confianza por claim y resumen agregado del texto.",
        ],
      },
      {
        number: "03",
        title: "Obtén el veredicto",
        eta: "Resultado · inmediato",
        description:
          "Recibe un indicador claro: apoyado, refutado, contradictorio o sin información suficiente, acompañado de fuentes consultadas.",
        details: [
          "Veredicto interpretable con confianza agregada.",
          "Evidencias enlazadas para revisar el razonamiento.",
        ],
      },
    ],
  },
  en: {
    title: "Built to verify claims.",
    description: "Three steps from raw text to an evidence-backed verdict.",
    steps: [
      {
        number: "01",
        title: "Submit the information",
        eta: "Initial step · 15s",
        description:
          "Paste a suspicious text, URL or selected fragment from the extension to start the analysis.",
        details: [
          "Accepts free text, headlines, claims or full URLs.",
          "Content normalization before extracting claims.",
        ],
      },
      {
        number: "02",
        title: "FEVER checks the claims",
        eta: "NLI + evidence",
        description:
          "The agent splits claims, retrieves web evidence and uses NLI inference to estimate whether each evidence supports or refutes the statement.",
        details: [
          "Cross-checking between claim, evidence and FEVER label.",
          "Per-claim confidence and aggregate text summary.",
        ],
      },
      {
        number: "03",
        title: "Get the verdict",
        eta: "Result · instant",
        description:
          "Receive a clear indicator: supported, refuted, conflicting or not enough information, with the sources consulted.",
        details: [
          "Interpretable verdict with aggregate confidence.",
          "Linked evidence so you can inspect the reasoning.",
        ],
      },
    ],
  },
};
