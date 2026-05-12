# Model card — deberta-v3-small-fever-v1

- Tarea: Natural Language Inference 3-way (SUPPORTS / REFUTES / NOT ENOUGH INFO)
- Dataset de entrenamiento: FEVER-NLI (`pietrolesci/nli_fever`, subset train estratificado)
- Backbone: DeBERTa-v3-small (`microsoft/deberta-v3-small`)
- Checkpoint fuente: `checkpoints\deberta-v3-small-fever-v1`
- Formato: ONNX (consumido por fakenews-backend/fever/inference.py)
- Generado por: research-stats/export/export_to_onnx.py
