"""
motor_recomendaciones.py
Orquestador principal. No carga el modelo directamente —
delega en predictor.py y bandas_nom172.py.

Uso desde inferencia_tabaco.py:
    from motor_recomendaciones import MotorRecomendaciones
    motor = MotorRecomendaciones()
    rec = motor.generar(historial_15min, contexto_universidad)
    print(rec.to_dict())

Uso desde recomendacion_api.py (FastAPI):
    motor = MotorRecomendaciones()   # singleton en startup
    rec = motor.generar(historial, ctx)
"""

from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime

from predictor import PredictorXGBoost, ResultadoPrediccion
from bandas_nom172 import InfoBanda, banda_preventiva, pm25_a_banda, pm25_a_aqi


# ── Contexto universitario ─────────────────────────────────────────────
@dataclass
class ContextoUniversidad:
    hora: int
    dia_semana: int        # 0=lunes … 6=domingo
    es_receso: bool = False
    es_cambio_clase: bool = False  # ventana ±5 min de cambio de hora
    personas_detectadas: int = 0   # conteo de personas por cámara (0 = sin dato)
    humo_detectado: bool = False   # humo de tabaco detectado por visión artificial

    # Recesos fijos ESCOM: (inicio_min, fin_min) en minutos desde medianoche
    _RECESOS_MIN = [
        (10 * 60,       10 * 60 + 30),   # 10:00 – 10:30
        (18 * 60,       18 * 60 + 30),   # 18:00 – 18:30
    ]

    # Inicio de cada bloque de clase ESCOM, en minutos desde medianoche
    # Bloques de 1.5 h: 7:00, 8:30, (receso 10-10:30), 10:30, 12:00,
    #                   13:30, 15:00, 16:30, (receso 18-18:30), 18:30, 20:00
    _CAMBIOS_MIN = [
        7 * 60,
        8 * 60 + 30,
        10 * 60 + 30,
        12 * 60,
        13 * 60 + 30,
        15 * 60,
        16 * 60 + 30,
        18 * 60 + 30,
        20 * 60,
    ]

    @classmethod
    def desde_datetime(cls, dt: datetime,
                       personas_detectadas: int = 0,
                       humo_detectado: bool = False) -> "ContextoUniversidad":
        hora = dt.hour
        total_min = hora * 60 + dt.minute

        es_receso = any(ini <= total_min < fin for ini, fin in cls._RECESOS_MIN)

        # Ventana ±5 min alrededor de cada inicio de clase
        es_cambio = (
            not es_receso
            and any(abs(total_min - c) <= 5 for c in cls._CAMBIOS_MIN)
        )

        return cls(
            hora=hora,
            dia_semana=dt.weekday(),
            es_receso=es_receso,
            es_cambio_clase=es_cambio,
            personas_detectadas=personas_detectadas,
            humo_detectado=humo_detectado,
        )


# ── Resultado final ────────────────────────────────────────────────────
@dataclass
class Recomendacion:
    # Métricas
    pm25_actual: float
    pm25_predicho: float
    aqi_estimado: int

    # Clasificación
    banda_nombre: str
    banda_nivel: int           # 0–5 (Banda enum)
    color_hex: str
    nivel_alerta: int          # 0=info  1=warning  2=critical
    requiere_accion: bool

    # Tendencia
    tendencia: str             # "sube" | "baja" | "estable"
    icono_tendencia: str       # "↑" | "↓" | "→"
    delta_pm25: float

    # Confianza del modelo
    confianza_modelo: str      # "alta" | "media" | "baja"
    feature_driver: str

    # Mensajes
    mensaje_general: str
    mensaje_expuesto: str
    contexto_activo: str       # describe el modificador aplicado

    # Cámara
    personas_detectadas: int
    humo_detectado: bool

    # Metadatos
    timestamp: str
    banda_solo_actual: str     # para comparar en UI ("sin predicción sería X")

    def to_dict(self) -> dict:
        return asdict(self)


# ── Motor principal ────────────────────────────────────────────────────
class MotorRecomendaciones:
    """
    Singleton recomendado: instanciar una vez, llamar generar() en cada ciclo.
    """

    # Horas pico identificadas en el análisis histórico (7–9 AM)
    HORAS_PICO = {7, 8, 9}

    def __init__(self,
                 ruta_modelo: str = "modelo_humo_escom.json",
                 ruta_meta:   str = "metadata_humo.json"):
        self._predictor = PredictorXGBoost(ruta_modelo, ruta_meta)

    # ── Pesos adaptativos según driver ─────────────────────────────────
    _PESOS_BASE = {
        "w_actual":    0.40,
        "w_pred":      0.35,
        "w_tendencia": 0.15,
        "w_contexto":  0.10,
    }

    def _ajustar_pesos(self, driver: str) -> dict:
        pesos = dict(self._PESOS_BASE)
        # Si el modelo dice que PM2.5 / PM10 son el driver,
        # le damos más peso a la predicción directa.
        if "pm25" in driver or "pm10" in driver:
            pesos["w_pred"] += 0.10
            pesos["w_actual"] -= 0.05
            pesos["w_contexto"] -= 0.05
        elif "hour" in driver or "day" in driver:
            # El ciclo horario domina → contexto más relevante
            pesos["w_contexto"] += 0.08
            pesos["w_tendencia"] -= 0.08
        return pesos

    # ── Penalización contextual ─────────────────────────────────────────
    def _penalizacion_contexto(self, ctx: ContextoUniversidad) -> tuple[float, str]:
        """
        Retorna (multiplicador_score, descripcion).
        Multiplicador > 1 sube el nivel de urgencia.
        Integra datos de cámara: humo de tabaco y conteo de personas.
        """
        if ctx.es_receso:
            mult, desc = 0.85, "receso académico — actividad reducida"
        elif ctx.hora in self.HORAS_PICO and not ctx.es_receso:
            if ctx.es_cambio_clase:
                mult, desc = 1.20, "hora pico + cambio de clase — máxima exposición"
            else:
                mult, desc = 1.12, "hora pico matutina"
        elif ctx.es_cambio_clase:
            mult, desc = 1.08, "cambio de clase — tránsito de personas"
        elif ctx.dia_semana >= 5:
            mult, desc = 0.90, "fin de semana — actividad baja"
        else:
            mult, desc = 1.0, "horario normal"

        # Cámara: humo de tabaco (+0.20 — fuente directa confirmada)
        if ctx.humo_detectado:
            mult = min(mult + 0.20, 1.50)
            desc += " · humo de tabaco detectado por cámara"

        # Cámara: ocupación
        if ctx.personas_detectadas >= 30:
            mult = min(mult + 0.10, 1.50)
            desc += f" · alta ocupación ({ctx.personas_detectadas} personas)"
        elif ctx.personas_detectadas >= 15:
            mult = min(mult + 0.05, 1.50)
            desc += f" · ocupación moderada ({ctx.personas_detectadas} personas)"
        elif ctx.personas_detectadas > 0:
            desc += f" · {ctx.personas_detectadas} personas"

        return mult, desc

    # ── Generación de mensajes ──────────────────────────────────────────
    _MENSAJES_GENERAL: dict[str, dict] = {
        "Buena": {
            "msg": "Calidad del aire buena. No se requieren precauciones especiales.",
            "expuesto": "Condiciones favorables para actividades al exterior.",
        },
        "Aceptable": {
            "msg": "Calidad del aire aceptable. Personas muy sensibles pueden percibir molestias leves.",
            "expuesto": "Usar cubrebocas si realiza actividad física prolongada al exterior.",
        },
        "Mala para grupos sensibles": {
            "msg": "Calidad regular. Grupos sensibles (asma, adultos mayores, niños) deben reducir actividad exterior.",
            "expuesto": "Obligatorio cubrebocas N95 al exterior. Limitar exposición a 30 min continuos.",
        },
        "No saludable": {
            "msg": "Aire no saludable. Toda la comunidad universitaria debe evitar actividades exteriores prolongadas.",
            "expuesto": "No realizar labores al exterior sin equipo de protección. Reportar al área de seguridad.",
        },
        "Muy no saludable": {
            "msg": "Alerta roja. Evitar cualquier actividad exterior. Mantener ventanas cerradas.",
            "expuesto": "Suspender actividades exteriores. Protocolo de emergencia ambiental activado.",
        },
        "Peligrosa": {
            "msg": "EMERGENCIA AMBIENTAL. Permanecer en interiores. Seguir indicaciones de protección civil.",
            "expuesto": "SUSPENDER TODA ACTIVIDAD EXTERIOR. Evacuar hacia zonas interiores ventiladas.",
        },
    }

    def _generar_mensajes(self, banda: InfoBanda, tendencia: str,
                           driver: str, ctx_desc: str) -> tuple[str, str]:
        base = self._MENSAJES_GENERAL.get(
            banda.nombre,
            {"msg": "Monitorear condiciones.", "expuesto": "Precaución adicional recomendada."}
        )
        sufijo = ""
        if tendencia == "sube":
            sufijo = " La tendencia indica que la calidad puede empeorar en los próximos 15 min."
        elif tendencia == "baja":
            sufijo = " Se espera mejora en los próximos 15 min."

        if "pm25" in driver or "pm10" in driver:
            sufijo += " Niveles de partículas finas son el factor determinante."

        if "humo de tabaco" in ctx_desc:
            sufijo += " Fuente de humo de tabaco identificada por cámara — alejarse del área afectada."

        return base["msg"] + sufijo, base["expuesto"] + sufijo

    # ── Fallback sin predicción ─────────────────────────────────────────
    def _generar_sin_prediccion(self,
                                historial_15min: list[dict],
                                contexto: ContextoUniversidad) -> Recomendacion:
        """
        Genera recomendación usando solo el PM2.5 actual.
        Se usa cuando historial < 4 registros y no hay suficiente contexto
        para ejecutar el modelo XGBoost.
        """
        actual = historial_15min[-1]
        pm25_act = actual["pm25"]

        banda_actual = pm25_a_banda(pm25_act)
        _, ctx_desc = self._penalizacion_contexto(contexto)

        msg_general, msg_expuesto = self._generar_mensajes(
            banda_actual, "estable", "sin modelo", ctx_desc
        )

        return Recomendacion(
            pm25_actual=round(pm25_act, 2),
            pm25_predicho=round(pm25_act, 2),
            aqi_estimado=pm25_a_aqi(pm25_act),

            banda_nombre=banda_actual.nombre,
            banda_nivel=int(banda_actual.banda),
            color_hex=banda_actual.color_hex,
            nivel_alerta=banda_actual.nivel_alerta,
            requiere_accion=banda_actual.requiere_accion,

            tendencia="estable",
            icono_tendencia="→",
            delta_pm25=0.0,

            confianza_modelo="sin modelo",
            feature_driver="sin modelo",

            mensaje_general=msg_general,
            mensaje_expuesto=msg_expuesto,
            contexto_activo=ctx_desc,

            personas_detectadas=contexto.personas_detectadas,
            humo_detectado=contexto.humo_detectado,

            timestamp=actual["ts"].isoformat(),
            banda_solo_actual=banda_actual.nombre,
        )

    # ── API pública ─────────────────────────────────────────────────────
    def generar(self,
                historial_15min: list[dict],
                contexto: ContextoUniversidad | None = None) -> Recomendacion:
        """
        Punto de entrada. historial_15min es la misma lista que
        construye inferencia_tabaco.py (dicts con keys: pm25, pm10,
        pm1, temp, hum, aqi, ts).

        contexto: si None, se infiere desde el último timestamp.

        Flujo:
          - >= 4 registros → predicción XGBoost completa
          - 1–3 registros  → fallback sin predicción (solo PM2.5 actual)
          - 0 registros    → ValueError
        """
        if len(historial_15min) < 1:
            raise ValueError("Se necesita al menos 1 registro de 15 min.")

        actual = historial_15min[-1]

        # Inferir contexto si no se pasa
        if contexto is None:
            contexto = ContextoUniversidad.desde_datetime(actual["ts"])

        # Fallback cuando no hay historial suficiente para el modelo
        if len(historial_15min) < 4:
            return self._generar_sin_prediccion(historial_15min, contexto)

        # 1. Predicción XGBoost
        pred: ResultadoPrediccion = self._predictor.predict(historial_15min)

        # 2. Banda preventiva worst-case
        banda_efectiva, banda_solo_actual = banda_preventiva(
            pm25_actual=actual["pm25"],
            pm25_pred=pred.pm25_pred,
            confianza=pred.confianza,
        )

        # 3. Pesos adaptativos según driver
        pesos = self._ajustar_pesos(pred.driver)

        # 4. Penalización contextual
        mult_ctx, ctx_desc = self._penalizacion_contexto(contexto)

        # 5. Score compuesto (interno, para posible ajuste fino futuro)
        #    Aquí ya está implícito en banda_efectiva + ajuste por confianza,
        #    pero lo calculamos explícitamente para metadata/logging.
        _score = (
            pesos["w_actual"]    * (actual["pm25"] / 225.5)   # normalizado
            + pesos["w_pred"]    * (pred.pm25_pred / 225.5)
            + pesos["w_tendencia"] * max(0, pred.delta / 100)
            + pesos["w_contexto"] * (mult_ctx - 1.0)
        ) * mult_ctx  # noqa — disponible para logging externo

        # 6. Icono tendencia
        iconos = {"sube": "↑", "baja": "↓", "estable": "→"}

        # 7. Mensajes
        msg_general, msg_expuesto = self._generar_mensajes(
            banda_efectiva, pred.tendencia, pred.driver, ctx_desc
        )

        aqi_est = pm25_a_aqi(max(actual["pm25"], pred.pm25_pred))

        return Recomendacion(
            pm25_actual=round(actual["pm25"], 2),
            pm25_predicho=pred.pm25_pred,
            aqi_estimado=aqi_est,

            banda_nombre=banda_efectiva.nombre,
            banda_nivel=int(banda_efectiva.banda),
            color_hex=banda_efectiva.color_hex,
            nivel_alerta=banda_efectiva.nivel_alerta,
            requiere_accion=banda_efectiva.requiere_accion,

            tendencia=pred.tendencia,
            icono_tendencia=iconos[pred.tendencia],
            delta_pm25=pred.delta,

            confianza_modelo=pred.confianza,
            feature_driver=pred.driver,

            mensaje_general=msg_general,
            mensaje_expuesto=msg_expuesto,
            contexto_activo=ctx_desc,

            personas_detectadas=contexto.personas_detectadas,
            humo_detectado=contexto.humo_detectado,

            timestamp=actual["ts"].isoformat(),
            banda_solo_actual=banda_solo_actual.nombre,
        )
