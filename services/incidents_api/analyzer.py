from __future__ import annotations

import csv
from io import StringIO
from pathlib import Path


REQUIRED_COLUMNS = [
	"incident_id",
	"date",
	"country",
	"customer_type",
	"tracking_number",
	"carrier",
	"category",
	"description",
	"status",
	"customer_email",
]

ALLOWED_VALUES = {
	"country": {"ES", "US"},
	"customer_type": {"B2B", "B2C"},
	"carrier": {"DHL_ES", "DHL_US", "FEDEX", "LOCAL_ES", "MRW", "SEUR", "UPS"},
	"category": {"DAMAGE", "DELAYED_DELIVERY", "LOST_PARCEL", "RETURN_REQUEST", "WRONG_ADDRESS"},
	"status": {"CLOSED", "DISCARDED", "OPEN"},
}

PATTERNS = {
	"incident_id": r"^TRF-\d{6}$",
	"tracking_number": r"^[A-Z0-9]{12}$",
	"customer_email": r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
}


def validate_csv_file(csv_file: Path) -> Path:
	if not csv_file.exists():
		raise FileNotFoundError(f"El archivo no existe: {csv_file}")

	if not csv_file.is_file():
		raise IsADirectoryError(f"La ruta no apunta a un archivo: {csv_file}")

	if csv_file.suffix.lower() != ".csv":
		raise ValueError(f"El archivo debe tener extension .csv: {csv_file}")

	return csv_file


def _empty_mask(series):
	return series.isna() | series.astype("string").fillna("").str.strip().eq("")


def build_validation_masks(dataframe, pd):
	masks: dict[str, object] = {}

	for column in REQUIRED_COLUMNS:
		masks[f"campo faltante | {column}"] = _empty_mask(dataframe[column])

	parsed_dates = dataframe["date"].where(~_empty_mask(dataframe["date"]))
	invalid_dates = pd.to_datetime(parsed_dates, errors="coerce").isna()
	masks["formato invalido | date"] = parsed_dates.notna() & invalid_dates

	for column, pattern in PATTERNS.items():
		filled = dataframe[column].astype("string").fillna("").str.strip()
		masks[f"formato invalido | {column}"] = (~_empty_mask(dataframe[column])) & (~filled.str.match(pattern, na=False))

	for column, allowed_values in ALLOWED_VALUES.items():
		filled = dataframe[column].astype("string").fillna("").str.strip()
		masks[f"valor fuera de catalogo | {column}"] = (~_empty_mask(dataframe[column])) & (~filled.isin(allowed_values))

	score = dataframe["satisfaction_score"]
	masks["valor fuera de rango | satisfaction_score"] = score.notna() & (~score.between(1, 5))
	return masks


def summarize_invalid_records(dataframe) -> dict[str, object]:
	import pandas as pd

	validation_masks = build_validation_masks(dataframe, pd)
	invalid_record_mask = dataframe.index.to_series().map(lambda _: False)
	issue_counts: dict[str, int] = {}
	problem_type_counts: dict[str, int] = {}
	record_problems: dict[int, list[str]] = {}

	for issue_name, mask in validation_masks.items():
		count = int(mask.sum())
		if count == 0:
			continue

		invalid_record_mask = invalid_record_mask | mask
		issue_counts[issue_name] = count
		problem_type = issue_name.split(" | ", maxsplit=1)[0]
		problem_type_counts[problem_type] = problem_type_counts.get(problem_type, 0) + count

		for row_index in dataframe.index[mask]:
			record_problems.setdefault(int(row_index), []).append(issue_name)

	invalid_examples = []
	for row_index, issues in sorted(record_problems.items()):
		invalid_examples.append(
			{
				"incident_id": dataframe.at[row_index, "incident_id"],
				"problems": issues,
			}
		)

	return {
		"invalid_record_count": int(invalid_record_mask.sum()),
		"invalid_record_mask": invalid_record_mask,
		"issue_counts": issue_counts,
		"problem_type_counts": problem_type_counts,
		"invalid_examples": invalid_examples,
	}


def summarize_valid_records(dataframe) -> dict[str, object]:
	invalid_summary = summarize_invalid_records(dataframe)
	invalid_record_mask = invalid_summary["invalid_record_mask"]
	valid_dataframe = dataframe.loc[~invalid_record_mask].copy()
	closed_with_score = valid_dataframe.loc[
		(valid_dataframe["status"] == "CLOSED") & valid_dataframe["satisfaction_score"].notna()
	]

	status_labels = {
		"OPEN": "abierto",
		"CLOSED": "cerrado",
		"DISCARDED": "descartado",
	}

	valid_metrics = {
		"total_processed": len(dataframe.index),
		"valid_records": len(valid_dataframe.index),
		"invalid_records": invalid_summary["invalid_record_count"],
		"category_totals": valid_dataframe["category"].value_counts().sort_index().to_dict(),
		"status_totals": {
			status_labels.get(status, status.lower()): int(count)
			for status, count in valid_dataframe["status"].value_counts().sort_index().items()
		},
		"closed_satisfaction_mean": float(closed_with_score["satisfaction_score"].mean())
		if not closed_with_score.empty
		else None,
	}

	invalid_summary.pop("invalid_record_mask")
	return {
		"invalid_summary": invalid_summary,
		"valid_metrics": valid_metrics,
	}


def analyze_csv(csv_file: Path) -> dict[str, object]:
	try:
		import pandas as pd
	except ModuleNotFoundError as error:
		raise ModuleNotFoundError(
			"Pandas no esta instalado. Instala la dependencia con: pip install pandas"
		) from error

	dataframe = pd.read_csv(csv_file)
	summary = summarize_valid_records(dataframe)
	return {
		"file": str(csv_file),
		"columns": dataframe.columns.tolist(),
		"row_count": len(dataframe.index),
		"invalid_summary": summary["invalid_summary"],
		"valid_metrics": summary["valid_metrics"],
	}


def build_export_rows(summary: dict[str, object]) -> list[dict[str, object]]:
	rows = [
		{"seccion": "general", "metrica": "archivo", "valor": summary["file"]},
		{"seccion": "general", "metrica": "columnas", "valor": len(summary["columns"])},
		{"seccion": "general", "metrica": "filas_leidas", "valor": summary["row_count"]},
		{"seccion": "general", "metrica": "registros_validos", "valor": summary["valid_metrics"]["valid_records"]},
		{
			"seccion": "general",
			"metrica": "registros_invalidos",
			"valor": summary["invalid_summary"]["invalid_record_count"],
		},
		{
			"seccion": "general",
			"metrica": "total_procesados",
			"valor": summary["valid_metrics"]["total_processed"],
		},
	]

	for category, count in summary["valid_metrics"]["category_totals"].items():
		rows.append({"seccion": "categorias_validas", "metrica": category, "valor": count})

	for status, count in summary["valid_metrics"]["status_totals"].items():
		rows.append({"seccion": "estados_validos", "metrica": status, "valor": count})

	closed_satisfaction_mean = summary["valid_metrics"]["closed_satisfaction_mean"]
	rows.append(
		{
			"seccion": "satisfaccion",
			"metrica": "media_cerrados_con_puntuacion",
			"valor": "sin datos" if closed_satisfaction_mean is None else f"{closed_satisfaction_mean:.2f}",
		}
	)

	for problem_type, count in summary["invalid_summary"]["problem_type_counts"].items():
		rows.append({"seccion": "problemas_por_tipo", "metrica": problem_type, "valor": count})

	for issue_name, count in summary["invalid_summary"]["issue_counts"].items():
		rows.append({"seccion": "detalle_por_regla", "metrica": issue_name, "valor": count})

	return rows


def export_results_to_csv(summary: dict[str, object], output_path: Path) -> None:
	rows = build_export_rows(summary)
	with output_path.open("w", encoding="utf-8", newline="") as handle:
		writer = csv.DictWriter(handle, fieldnames=["seccion", "metrica", "valor"])
		writer.writeheader()
		writer.writerows(rows)


def summary_to_csv_content(summary: dict[str, object]) -> str:
	rows = build_export_rows(summary)
	buffer = StringIO()
	writer = csv.DictWriter(buffer, fieldnames=["seccion", "metrica", "valor"])
	writer.writeheader()
	writer.writerows(rows)
	return buffer.getvalue()