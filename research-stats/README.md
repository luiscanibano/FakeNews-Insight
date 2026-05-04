# research-stats — TFG Estadística

Código de investigación estadística asociado al **TFG de Estadística**:
*"Modelización predictiva para la detección automática de noticias falsas
mediante aprendizaje automático y procesamiento del lenguaje natural"*.

Este directorio contiene **únicamente el trabajo de investigación**
(descarga y preprocesado de datos, entrenamiento, evaluación, calibración,
tests estadísticos, figuras para la memoria) y está diseñado para poder
extraerse a un repositorio independiente conservando su historial:

```bash
git filter-repo --subdirectory-filter research-stats/
```

Por esta razón:

- El backend de la aplicación SaaS (`../fakenews-backend/`) **nunca importa**
  desde aquí.
- El código de aquí **nunca importa** desde `../fakenews-backend/` ni
  desde el frontend.
- La única frontera entre investigación y producción es el artefacto del
  modelo en `../models/fever/<version>/` (+ `model_card.md`).

## Estructura

```
research-stats/
  data/         descarga y preprocesado de FEVER
  notebooks/    EDA y análisis cualitativo de errores
  baseline/     baseline TF-IDF + Logistic Regression
  transformer/  fine-tune DeBERTa-v3 sobre FEVER
  evaluation/   métricas, calibración, tests estadísticos
  reports/      tablas y figuras generadas para la memoria
  export/       exportación del modelo final al backend
  tests/        tests unitarios de utilidades estadísticas
```

## Instalación

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> Las dependencias pesadas de entrenamiento (`torch`, `transformers`,
> `datasets`, `accelerate`) viven aquí, **no en el backend de producción**.

## Pipeline reproducible

```powershell
# 1. Descargar FEVER (HuggingFace `datasets`)
python -m research_stats.data.download_fever

# 2. Preprocesar a (claim, evidence, label)
python -m research_stats.data.preprocess

# 3a. Baseline TF-IDF + LogReg
python -m research_stats.baseline.train_tfidf_lr

# 3b. Fine-tune DeBERTa-v3 (requiere GPU recomendado)
python -m research_stats.transformer.train_deberta

# 4. Evaluación completa (métricas + calibración + tests)
python -m research_stats.evaluation.run_evaluation

# 5. Exportar modelo final a la frontera con el backend
python -m research_stats.export.export_to_onnx
```

## Conexión con el TFG de Informática

El artefacto producido por `export/export_to_onnx.py` se consume desde
`../fakenews-backend/fever/inference.py` (`FeverNLIClassifier`). Esta es
la única dependencia entre ambos trabajos.
