from __future__ import annotations

import csv
import os
from io import StringIO
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response

from services.incidents_api.analyzer import analyze_csv, summary_to_csv_content

app = FastAPI(title="Incidents Analyzer API", version="1.0.0")

LAST_ANALYSIS_SUMMARY: dict[str, object] | None = None


@app.post("/api/incidents/analyze")
async def analyze_incidents_csv(file: UploadFile = File(...)) -> dict[str, object]:
    global LAST_ANALYSIS_SUMMARY

    filename = (file.filename or "").strip()
    if not filename:
        raise HTTPException(status_code=400, detail="Debes enviar un archivo CSV.")

    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe tener extension .csv")

    temp_path: Path | None = None
    try:
        import pandas as pd

        payload = await file.read()
        if not payload:
            raise HTTPException(status_code=400, detail="El fichero CSV esta vacio.")

        with NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
            temp_file.write(payload)
            temp_path = Path(temp_file.name)

        summary = analyze_csv(temp_path)
        summary["file"] = filename
        LAST_ANALYSIS_SUMMARY = summary
        return summary
    except pd.errors.EmptyDataError as error:
        raise HTTPException(status_code=400, detail="El fichero CSV esta vacio.") from error
    except pd.errors.ParserError as error:
        raise HTTPException(status_code=422, detail="Formato CSV incorrecto o corrupto.") from error
    except KeyError as error:
        missing_column = str(error).strip("'")
        raise HTTPException(
            status_code=422,
            detail=f"CSV invalido: falta la columna requerida '{missing_column}'.",
        ) from error
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=422, detail="No se pudo leer el CSV. Revisa la codificacion.") from error
    except ModuleNotFoundError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error analizando el archivo: {error}") from error
    finally:
        await file.close()
        if temp_path and temp_path.exists():
            os.unlink(temp_path)


@app.get("/api/incidents/results/export")
async def export_last_analysis_results() -> Response:
    if LAST_ANALYSIS_SUMMARY is None:
        raise HTTPException(
            status_code=404,
            detail="No hay analisis previo para exportar. Ejecuta primero POST /api/incidents/analyze.",
        )

    csv_content = summary_to_csv_content(LAST_ANALYSIS_SUMMARY)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="results.csv"'},
    )
