"""
recomendacion_api.py
FastAPI que expone /api/recomendacion para que server.js lo consuma
igual que consume Supabase — un fetch simple, JSON de vuelta.

Arrancar:
    uvicorn recomendacion_api:app --host 0.0.0.0 --port 8000

server.js agrega:
    GET http://localhost:8000/api/recomendacion   → recomendación actual
    GET http://localhost:8000/api/recomendacion/estado → health check
"""

from __future__ import annotations
import threading
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from motor_recomendaciones import MotorRecomendaciones, ContextoUniversidad


# ── Estado compartido con inferencia_tabaco.py ─────────────────────────
# inferencia_tabaco.py escribe en este buffer; la API lo lee.
# Si corren en el mismo proceso, importar directamente.
# Si corren en procesos separados, usar Redis o un archivo JSON simple.

_historial_compartido: list[dict] = []
_lock = threading.Lock()
_motor: Optional[MotorRecomendaciones] = None


def actualizar_historial(historial_15min: list[dict]) -> None:
    """
    Llamar desde inferencia_tabaco.py después de cada bloque de 15 min.

    En inferencia_tabaco.py agregar al final del bloque de inferencia:
        from recomendacion_api import actualizar_historial
        actualizar_historial(historial_15min)
    """
    global _historial_compartido
    with _lock:
        _historial_compartido = list(historial_15min)


# ── Lifespan (reemplaza on_event deprecated) ──────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _motor
    _motor = MotorRecomendaciones(
        ruta_modelo="modelo_humo_escom.json",
        ruta_meta="metadata_humo.json",
    )
    print("Motor de recomendaciones cargado.")
    yield
    # cleanup si necesario


app = FastAPI(title="Motor de Recomendaciones — Calidad del Aire ESCOM",
              version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ajustar en producción
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ── Schemas de respuesta ───────────────────────────────────────────────
class RecomendacionResponse(BaseModel):
    pm25_actual: float
    pm25_predicho: float
    aqi_estimado: int
    banda_nombre: str
    banda_nivel: int
    color_hex: str
    nivel_alerta: int
    requiere_accion: bool
    tendencia: str
    icono_tendencia: str
    delta_pm25: float
    confianza_modelo: str
    feature_driver: str
    mensaje_general: str
    mensaje_expuesto: str
    contexto_activo: str
    personas_detectadas: int
    humo_detectado: bool
    timestamp: str
    banda_solo_actual: str


class EstadoResponse(BaseModel):
    status: str
    registros_en_historial: int
    listo: bool
    tiene_prediccion: bool
    mensaje: str


# ── Endpoints ──────────────────────────────────────────────────────────
@app.get("/api/recomendacion/estado", response_model=EstadoResponse)
async def estado():
    with _lock:
        n = len(_historial_compartido)
    if n == 0:
        msg = "Sin datos aún — esperando primer bloque de 15 min"
    elif n < 4:
        msg = f"Modo básico (sin predicción) — {n}/4 registros para forecast"
    else:
        msg = "Listo con predicción XGBoost"
    return EstadoResponse(
        status="ok",
        registros_en_historial=n,
        listo=n >= 1,
        tiene_prediccion=n >= 4,
        mensaje=msg,
    )


@app.get("/api/recomendacion", response_model=RecomendacionResponse)
async def recomendacion(
    personas: int = 0,
    humo: bool = False,
):
    """
    Parámetros opcionales:
      ?personas=25  → conteo de personas detectadas por cámara
      ?humo=true    → humo de tabaco detectado por cámara

    El receso y los cambios de clase se detectan automáticamente
    según el horario fijo de ESCOM.

    server.js lo llama así:
      fetch('http://localhost:8000/api/recomendacion')
      fetch('http://localhost:8000/api/recomendacion?personas=18&humo=true')
    """
    with _lock:
        historial = list(_historial_compartido)

    if len(historial) < 1:
        raise HTTPException(
            status_code=503,
            detail="Sin datos aún. El simulador no ha completado ningún bloque de 15 min."
        )

    ts_actual = historial[-1]["ts"]
    contexto = ContextoUniversidad.desde_datetime(
        ts_actual if isinstance(ts_actual, datetime) else datetime.fromisoformat(str(ts_actual)),
        personas_detectadas=personas,
        humo_detectado=humo,
    )

    rec = _motor.generar(historial, contexto)
    return RecomendacionResponse(**rec.to_dict())


# ── Integración directa con inferencia_tabaco.py ───────────────────────
# Si prefieres un solo proceso, agrega esto al final del loop de inferencia:
#
# [en inferencia_tabaco.py, dentro del bloque `if len(historial_15min) >= 4`]
#
#   from motor_recomendaciones import MotorRecomendaciones, ContextoUniversidad
#   motor = MotorRecomendaciones()   # fuera del loop
#   ctx = ContextoUniversidad.desde_datetime(reloj_simulado)
#   rec = motor.generar(historial_15min, ctx)
#   print(f"   [RECOMENDACION] {rec.banda_nombre} {rec.icono_tendencia}")
#   print(f"   {rec.mensaje_general}")
