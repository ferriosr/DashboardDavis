"""
test_escenarios.py
Datos de prueba realistas para el motor de recomendaciones.
Simula 5 escenarios con datos del sensor Davis + camara (humo y personas).

Ejecutar desde la carpeta recomendations/:
    python test_escenarios.py

Requiere modelo en ../BACKEND/modelo_humo_escom.json
"""

import sys
import io
import json
from pathlib import Path
from datetime import datetime, timedelta

# Forzar UTF-8 en la salida del terminal (Windows cp1252 no tiene flechas unicode)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# -- Rutas ------------------------------------------------------------------
ROOT    = Path(__file__).resolve().parent
BACKEND = ROOT.parent / "BACKEND"
MODELO  = str(BACKEND / "modelo_humo_escom.json")
META    = str(BACKEND / "metadata_humo.json")

sys.path.insert(0, str(ROOT))

from motor_recomendaciones import MotorRecomendaciones, ContextoUniversidad


# -- Helper: construir bloque de 15 min ------------------------------------
def bloque(ts, pm25, pm10, temp, hum, aqi, pm1):
    return {"ts": ts, "pm25": pm25, "pm10": pm10, "temp": temp,
            "hum": hum, "aqi": aqi, "pm1": pm1}


def hace(minutos, desde):
    return desde - timedelta(minutes=minutos)


# -- Escenarios -------------------------------------------------------------
ESCENARIOS = [

    # 1. Manana normal - aire aceptable, hora pico
    {
        "nombre": "1 | Lunes 08:30 -- hora pico, calidad aceptable",
        "ts_ref": datetime(2026, 5, 18, 8, 30),
        "historial": lambda ts: [
            bloque(hace(45, ts), 22.1, 36.4, 24.5, 43.0, 72.0, 14.8),
            bloque(hace(30, ts), 25.8, 39.2, 25.0, 42.0, 78.0, 17.2),
            bloque(hace(15, ts), 29.3, 42.7, 25.6, 41.5, 83.0, 19.5),
            bloque(ts,           31.7, 45.1, 26.1, 40.8, 87.0, 21.3),
        ],
        "personas": 22,
        "humo": False,
        "es_receso": False,
    },

    # 2. Fumador detectado - grupos sensibles en riesgo
    {
        "nombre": "2 | Martes 09:15 -- fumador activo, PM2.5 moderado-alto",
        "ts_ref": datetime(2026, 5, 19, 9, 15),
        "historial": lambda ts: [
            bloque(hace(45, ts), 28.5, 44.0, 26.3, 38.5, 83.0, 18.9),
            bloque(hace(30, ts), 33.2, 48.6, 27.0, 37.8, 89.0, 22.4),
            bloque(hace(15, ts), 40.8, 54.3, 27.5, 37.2, 96.0, 27.1),
            bloque(ts,           47.6, 60.1, 28.0, 36.9, 105.0, 31.8),
        ],
        "personas": 28,
        "humo": True,
        "es_receso": False,
    },

    # 3. Pico critico - alta contaminacion + maxima ocupacion
    {
        "nombre": "3 | Miercoles 08:00 -- pico critico, emergencia",
        "ts_ref": datetime(2026, 5, 20, 8, 0),
        "historial": lambda ts: [
            bloque(hace(45, ts), 45.2, 62.0, 27.1, 35.0, 101.0, 30.1),
            bloque(hace(30, ts), 55.9, 71.4, 27.8, 34.3, 115.0, 37.4),
            bloque(hace(15, ts), 64.3, 79.8, 28.4, 33.8, 126.0, 42.9),
            bloque(ts,           72.1, 87.3, 29.0, 33.2, 138.0, 48.6),
        ],
        "personas": 38,
        "humo": True,
        "es_receso": False,
    },

    # 4. Tarde tranquila - aire bueno, pocos alumnos
    {
        "nombre": "4 | Viernes 15:30 -- tarde sin clases, calidad buena",
        "ts_ref": datetime(2026, 5, 22, 15, 30),
        "historial": lambda ts: [
            bloque(hace(45, ts), 12.4, 22.1, 30.5, 28.0, 45.0,  8.3),
            bloque(hace(30, ts), 10.8, 19.7, 31.0, 27.5, 41.0,  7.1),
            bloque(hace(15, ts),  9.2, 17.3, 31.4, 27.2, 38.0,  6.2),
            bloque(ts,            8.5, 16.0, 31.8, 27.0, 35.0,  5.8),
        ],
        "personas": 6,
        "humo": False,
        "es_receso": False,
    },

    # 5. Sin historial - modo basico (1 solo registro)
    {
        "nombre": "5 | Inicio del sistema -- solo 1 registro (sin prediccion)",
        "ts_ref": datetime(2026, 5, 18, 7, 0),
        "historial": lambda ts: [
            bloque(ts, 38.5, 53.0, 26.0, 40.0, 93.0, 25.4),
        ],
        "personas": 12,
        "humo": False,
        "es_receso": False,
    },
]


# -- Impresion formateada ---------------------------------------------------
SEP = "-" * 72

def imprimir_rec(rec, nombre):
    alerta_label = {0: "[INFO]   ", 1: "[AVISO]  ", 2: "[CRITICO]"}
    nivel_str = alerta_label.get(rec.get("nivel_alerta", 0), "[?]      ")

    print(f"\n{SEP}")
    print(f"  {nivel_str}  {nombre}")
    print(SEP)

    if "error" in rec:
        print(f"  ERROR: {rec['error']}")
        return

    print(f"  Banda:       {rec['banda_nombre']}  (nivel {rec['banda_nivel']})  {rec['color_hex']}")
    tend = rec['icono_tendencia']
    delta = rec['delta_pm25']
    print(f"  PM2.5:       {rec['pm25_actual']} -> {rec['pm25_predicho']} ug/m3"
          f"  {tend}  delta={delta:+.1f}")
    print(f"  AQI est.:    {rec['aqi_estimado']}")
    print(f"  Confianza:   {rec['confianza_modelo']}  |  Driver: {rec['feature_driver']}")
    print(f"  Contexto:    {rec['contexto_activo']}")
    humo_str = "*** HUMO DE TABACO DETECTADO ***" if rec['humo_detectado'] else "sin humo"
    print(f"  Camara:      {rec['personas_detectadas']} personas  |  {humo_str}")
    print(f"  Mensaje:     {rec['mensaje_general']}")
    if rec.get("requiere_accion"):
        print(f"  Expuesto:    {rec['mensaje_expuesto']}")
    print(f"  Timestamp:   {rec['timestamp']}")


# -- Ejecucion -------------------------------------------------------------
def main():
    print("\n" + "=" * 72)
    print("  MOTOR DE RECOMENDACIONES -- CALIDAD DEL AIRE ESCOM")
    print("  Datos de prueba: sensores Davis + camara (humo / personas)")
    print("=" * 72)

    try:
        motor = MotorRecomendaciones(ruta_modelo=MODELO, ruta_meta=META)
        print(f"  Modelo cargado: {Path(MODELO).name}")
    except FileNotFoundError as e:
        print(f"\n  AVISO: modelo no encontrado -- {e}")
        print("  Ejecutando en modo sin-prediccion para todos los escenarios...")
        motor = None

    resultados = []
    for esc in ESCENARIOS:
        ts   = esc["ts_ref"]
        hist = esc["historial"](ts)
        ctx  = ContextoUniversidad.desde_datetime(
            ts,
            es_receso=esc["es_receso"],
            personas_detectadas=esc["personas"],
            humo_detectado=esc["humo"],
        )

        try:
            rec = motor.generar(hist, ctx) if motor else None
            resultado = rec.to_dict() if rec else {"error": "motor no disponible"}
        except Exception as exc:
            resultado = {"error": str(exc), "nivel_alerta": 0}

        imprimir_rec(resultado, esc["nombre"])
        resultados.append({"escenario": esc["nombre"], **resultado})

    # Exportar JSON
    out_path = ROOT / "test_resultados.json"
    out_path.write_text(
        json.dumps(resultados, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    print(f"\n{SEP}")
    print(f"  Resultados exportados -> {out_path.name}")
    print(SEP + "\n")


if __name__ == "__main__":
    main()
