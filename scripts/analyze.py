from __future__ import annotations

import argparse
from pathlib import Path
import sys
from typing import Sequence

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
	sys.path.insert(0, str(ROOT_DIR))

from services.incidents_api.analyzer import analyze_csv, export_results_to_csv, validate_csv_file


def print_separator(title: str | None = None, width: int = 72) -> None:
	line = "=" * width
	if title is None:
		print(line)
		return

	title_text = f" {title} "
	padding = max(width - len(title_text), 0)
	left = padding // 2
	right = padding - left
	print(f"{'=' * left}{title_text}{'=' * right}")


def print_labeled_value(label: str, value: object, label_width: int = 40) -> None:
	print(f"{label:<{label_width}} : {value}")


def print_count_block(title: str, values: dict[str, int], label_width: int = 32) -> None:
	print_separator(title)
	for label, count in values.items():
		print_labeled_value(label, count, label_width)


def print_invalid_examples(examples: list[dict[str, object]], limit: int = 10) -> None:
	print_separator("Ejemplos de registros invalidos")
	for example in examples[:limit]:
		problems = ", ".join(example["problems"])
		print_labeled_value(str(example["incident_id"]), problems, 18)


def ask_to_export_results() -> bool:
	while True:
		answer = input("¿Deseas exportar los resultados a CSV? [s / n] ").strip().lower()
		if answer in {"s", "n"}:
			return answer == "s"
		print("Respuesta no valida. Escribe 's' o 'n'.")


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		description="Carga un archivo CSV y muestra un resumen basico.",
	)
	parser.add_argument(
		"csv_file",
		type=Path,
		help="Ruta al archivo CSV que se quiere analizar.",
	)
	return parser
def main(argv: Sequence[str] | None = None) -> int:
	parser = build_parser()
	args = parser.parse_args(argv)

	try:
		csv_file = validate_csv_file(args.csv_file)
		summary = analyze_csv(csv_file)
	except (FileNotFoundError, IsADirectoryError, ModuleNotFoundError, ValueError) as error:
		parser.error(str(error))

	print_separator("Resumen de analisis")
	print_labeled_value("Archivo", summary["file"])
	print_labeled_value("Columnas", len(summary["columns"]))
	print_labeled_value("Filas leidas", summary["row_count"])
	print_labeled_value("Registros validos", summary["valid_metrics"]["valid_records"])
	print_labeled_value("Registros invalidos", summary["invalid_summary"]["invalid_record_count"])
	print_labeled_value("Total procesados", summary["valid_metrics"]["total_processed"])

	print_count_block("Totales validos por categoria", summary["valid_metrics"]["category_totals"])
	print_count_block("Totales validos por estado", summary["valid_metrics"]["status_totals"])

	closed_satisfaction_mean = summary["valid_metrics"]["closed_satisfaction_mean"]
	print_separator("Satisfaccion")
	if closed_satisfaction_mean is None:
		print_labeled_value("Media en cerrados con puntuacion", "sin datos")
	else:
		print_labeled_value("Media en cerrados con puntuacion", f"{closed_satisfaction_mean:.2f}")

	if summary["invalid_summary"]["problem_type_counts"]:
		print_count_block("Problemas por tipo", summary["invalid_summary"]["problem_type_counts"])
		print_count_block("Detalle por regla", summary["invalid_summary"]["issue_counts"], 42)
		print_invalid_examples(summary["invalid_summary"]["invalid_examples"])

	print_separator()
	if ask_to_export_results():
		output_path = Path("results.csv")
		export_results_to_csv(summary, output_path)
		print(f"Resultados exportados a {output_path}")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
