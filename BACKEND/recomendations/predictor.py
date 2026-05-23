"""
predictor.py
Wrapper sobre modelo_humo_escom.json.
No replica lógica — importa el historial que ya construye inferencia_tabaco.py.
"""
import numpy as np
import pandas as pd
import xgboost as xgb
import json
from dataclasses import dataclass


@dataclass
class ResultadoPrediccion:
    pm25_pred: float          # PM2.5 predicho en T+15
    tendencia: str            # "sube" | "baja" | "estable"
    delta: float              # diferencia respecto al actual
    confianza: str            # "alta" | "media" | "baja"
    driver: str               # feature más influyente (approx)


class PredictorXGBoost:
    """
    Recibe el mismo historial_15min que ya construye inferencia_tabaco.py
    y expone predict() para uso externo.
    """

    UMBRAL_TENDENCIA = 5.0    # μg/m³ para considerar cambio real
    UMBRAL_DELTA_BAJA = 10.0  # delta alto → confianza baja

    def __init__(self, ruta_modelo: str = "modelo_humo_escom.json",
                 ruta_meta: str = "metadata_humo.json"):
        self.modelo = xgb.XGBRegressor()
        self.modelo.load_model(ruta_modelo)

        with open(ruta_meta) as f:
            meta = json.load(f)

        self.columnas = meta["columnas_entrenamiento"]
        self.umbral_anomalia = meta["umbral_anomalia"]

    def _build_features(self, historial: list[dict]) -> pd.DataFrame:
        """
        Construye el mismo vector de features que usa inferencia_tabaco.py.
        historial: lista de registros de 15 min, orden cronológico ascendente.
        Necesita al menos 4 registros (actual + 3 lags).
        """
        if len(historial) < 4:
            raise ValueError(f"Se necesitan >=4 registros; se recibieron {len(historial)}")

        actual = historial[-1]
        h1     = historial[-2]
        h2     = historial[-3]
        h3     = historial[-4]  # noqa: F841  (disponible si columnas lo piden)

        features = {
            "temp":             actual["temp"],
            "hum":              actual["hum"],
            "pm10":             actual["pm10"],
            "aqi":              actual["aqi"],
            "pm1":              actual["pm1"],
            "pm25_lag_1":       actual["pm25"],
            "pm10_lag_1":       actual["pm10"],
            "pm25_lag_2":       h1["pm25"],
            "pm10_lag_2":       h1["pm10"],
            "pm25_lag_3":       h2["pm25"],
            "pm10_lag_3":       h2["pm10"],
            "diff_pm25":        actual["pm25"] - h1["pm25"],
            "rolling_mean_pm25": np.mean([h["pm25"] for h in historial[-4:]]),
            "rolling_std_pm25":  np.std([h["pm25"] for h in historial[-4:]]),
            "hour":             actual["ts"].hour,
            "day_of_week":      actual["ts"].weekday(),
            "time_gap":         15.0,
        }

        return pd.DataFrame([features])[self.columnas]

    def _calcular_tendencia(self, pm25_actual: float, pm25_pred: float) -> tuple[str, float]:
        delta = pm25_pred - pm25_actual
        if delta > self.UMBRAL_TENDENCIA:
            tendencia = "sube"
        elif delta < -self.UMBRAL_TENDENCIA:
            tendencia = "baja"
        else:
            tendencia = "estable"
        return tendencia, round(delta, 2)

    def _estimar_confianza(self, rolling_std: float, delta: float) -> str:
        """
        Usa rolling_std del historial como proxy de variabilidad.
        Alta variabilidad o delta grande → confianza baja.
        """
        if rolling_std > 15 or abs(delta) > self.UMBRAL_DELTA_BAJA * 2:
            return "baja"
        if rolling_std > 8 or abs(delta) > self.UMBRAL_DELTA_BAJA:
            return "media"
        return "alta"

    def _feature_driver(self, X: pd.DataFrame) -> str:
        """
        Feature con mayor importancia ponderada en este vector.
        Usa feature_importances_ del modelo (gain).
        """
        importancias = self.modelo.feature_importances_
        nombres = X.columns.tolist()
        idx = int(np.argmax(importancias))
        return nombres[idx] if idx < len(nombres) else "desconocido"

    def predict(self, historial: list[dict]) -> ResultadoPrediccion:
        """
        Punto de entrada principal.
        Retorna ResultadoPrediccion con todo lo que necesita el motor.
        """
        X = self._build_features(historial)
        pm25_pred = float(self.modelo.predict(X)[0])

        pm25_actual = historial[-1]["pm25"]
        rolling_std = float(X["rolling_std_pm25"].iloc[0])

        tendencia, delta = self._calcular_tendencia(pm25_actual, pm25_pred)
        confianza = self._estimar_confianza(rolling_std, delta)
        driver = self._feature_driver(X)

        return ResultadoPrediccion(
            pm25_pred=round(pm25_pred, 2),
            tendencia=tendencia,
            delta=delta,
            confianza=confianza,
            driver=driver,
        )
