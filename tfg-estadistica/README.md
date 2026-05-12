# TFG Estadística — Memoria

Carpeta autónoma con la memoria del **TFG de Estadística** (tutor distinto al de
Informática) sobre el componente teórico-estadístico del proyecto FakeNews
Insight: verificación de afirmaciones contra evidencias mediante NLI sobre el
dataset **FEVER**.

> Esta memoria comparte código y datos con el TFG de Informática pero **no
> comparte texto**: cada apartado se redacta de forma independiente y desde un
> enfoque puramente estadístico (modelización, calibración, inferencia).

## Contenidos por capítulo

1. Introducción: contexto, objetivos, estructura.
2. Estado del arte: detección de fake news y verificación de afirmaciones (NLI / FEVER).
3. Marco teórico: probabilidad, regresión logística multinomial, atención y
   transformers, NLI como problema de clasificación condicional.
4. Diseño experimental: dataset FEVER, particiones, métricas, protocolo.
5. Baseline TF-IDF + Regresión Logística multinomial.
6. Modelo neuronal: fine-tune de DeBERTa-v3 sobre FEVER.
7. Calibración: Platt, isotónica, ECE y diagramas de fiabilidad.
8. Tests estadísticos: McNemar, bootstrap de F1 macro, intervalos de confianza.
9. Formalización probabilística de la regla de agregación de claims.
10. Resultados y análisis de errores.
11. Conclusiones y trabajo futuro.

## Cumplimiento de las normas (`docs/definicion-de-las-normas-de-estiloydefensa-tfge.pdf`)

- Idioma: español.
- Fuente: Times New Roman 12pt (la plantilla `main.tex` lo configura).
- Interlineado: sencillo.
- Márgenes: 2 cm sup/inf, 2.5 cm izq/der.
- Extensión: 40–50 páginas (de la introducción al final del desarrollo).
- Página 1 = inicio de la introducción (cubierta, portada, doc. acreditativo e
  índice no cuentan; la plantilla los pagina con números romanos).
- Teoría ≥ 50 % del contenido (capítulos 2, 3, 7-9 son íntegramente teóricos).
- Anexos en **fichero separado** (`anexos/main.tex` compila a `anexos.pdf`).
- Solo se incluyen en la memoria gráficos y tablas fundamentales; el resto va
  a anexos (código completo, hiperparámetros detallados, tablas extensas).

## Compilación

```powershell
cd tfg-estadistica/memoria
latexmk -pdf main.tex
latexmk -pdf -outdir=../anexos-build ../anexos/main.tex
```

(Requiere TeX Live o MiKTeX con `latexmk`, `biber`, `polyglossia` o `babel`.)

## Notas

- Las secciones marcadas con `% TODO(resultados)` esperan números reales del
  entrenamiento (Fase 6 del plan general). El borrador deja la estructura,
  fórmulas y discusión teórica listas; al ejecutar el entrenamiento solo
  habrá que insertar tablas/figuras.
- La bibliografía se gestiona con BibLaTeX en `bib/refs.bib`.
- El estilo de citación es `authoryear` (APA) por compatibilidad con la guía
  de la facultad.
