# Incidents API

Servicio backend para analizar incidencias desde un CSV usando la misma logica que `scripts/analyze.py`.

## Endpoint

- `POST /api/incidents/analyze`
  - `Content-Type: multipart/form-data`
  - Campo esperado: `file`
  - El archivo debe tener extension `.csv`

## Ejecutar localmente

1. Instalar dependencias:
   - `python -m pip install fastapi uvicorn python-multipart pandas`
2. Desde la raiz del repositorio:
   - `uvicorn services.incidents_api.main:app --reload`

## Probar con curl

```bash
curl -X POST \
  -F "file=@scripts/incidents-trackflow.csv" \
  http://127.0.0.1:8000/api/incidents/analyze
```
