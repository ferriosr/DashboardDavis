import pandas as pd
import numpy as np
import xgboost as xgb
import json
import time
from datetime import datetime, timedelta

# 1. CARGA DE RECURSOS (Tu i7-12700KF ya hizo el trabajo pesado)
modelo_vm = xgb.XGBRegressor()
modelo_vm.load_model('modelo_humo_escom.json')

with open('metadata_humo.json', 'r') as f:
    meta = json.load(f)

# 2. CONFIGURACIÓN DE LA SIMULACIÓN
umbral = meta['umbral_anomalia']
columnas = meta['columnas_entrenamiento']
buffer_5min = []     # Para promediar lecturas de 5 min
historial_15min = [] # Para los Lags (necesitamos 4 registros de 15min)
reloj_simulado = datetime(2026, 5, 12, 8, 0, 0) # Empieza a las 8 AM

print(f"--- SIMULADOR DE INFERENCIA 'TABACO ZERO' ---")
print(f"Modelo cargado. Umbral: {umbral} ug/m3")
print(f"Simulando entrada cada 5 min (1s real)... Ctrl+C para detener.\n")

while True:
    # A. GENERAR VECTOR ALEATORIO (Simulando el Sensor Davis)
    # Valores realistas para la ESCOM en mayo
    dato_crudo = {
        'hora_sensor_utc': reloj_simulado.strftime('%d/%m/%Y %H:%M'),
        'temperatura': np.random.uniform(22.0, 32.0),
        'humedad': np.random.uniform(30.0, 50.0),
        'pm2_5': np.random.uniform(30.0, 70.0), # Picos aleatorios
        'pm10': np.random.uniform(40.0, 80.0),
        'aqi': np.random.uniform(60.0, 100.0),
        'pm1': np.random.uniform(20.0, 45.0)
    }
    
    buffer_5min.append(dato_crudo)
    print(f"[{dato_crudo['hora_sensor_utc']}] Recibido: PM2.5={dato_crudo['pm2_5']:.2f}")

    # B. LÓGICA DE AGREGACIÓN (Esperar a completar 15 minutos)
    if len(buffer_5min) == 3:
        # Promediamos los 3 registros de 5 min para normalizar
        df_temp = pd.DataFrame(buffer_5min)
        registro_15min = {
            'pm25': df_temp['pm2_5'].mean(),
            'pm10': df_temp['pm10'].mean(),
            'temp': df_temp['temperatura'].mean(),
            'hum': df_temp['humedad'].mean(),
            'aqi': df_temp['aqi'].mean(),
            'pm1': df_temp['pm1'].mean(),
            'ts': reloj_simulado
        }
        historial_15min.append(registro_15min)
        buffer_5min = [] # Limpiamos para el siguiente bloque
        
        print(f"   >> Bloque de 15min completado. PM2.5 Promedio: {registro_15min['pm25']:.2f}")

        # C. INFERENCIA (Solo si tenemos historial para Lags)
        if len(historial_15min) >= 4:
            actual = historial_15min[-1]
            h1 = historial_15min[-2]
            h2 = historial_15min[-3]
            h3 = historial_15min[-4]

            # Construir el vector exacto que espera XGBoost
            features = {
                'temp': actual['temp'],
                'hum': actual['hum'],
                'pm10': actual['pm10'],
                'aqi': actual['aqi'],
                'pm1': actual['pm1'],
                'pm25_lag_1': actual['pm25'],
                'pm10_lag_1': actual['pm10'],
                'pm25_lag_2': h1['pm25'],
                'pm10_lag_2': h1['pm10'],
                'pm25_lag_3': h2['pm25'],
                'pm10_lag_3': h2['pm10'],
                'diff_pm25': actual['pm25'] - h1['pm25'],
                'rolling_mean_pm25': np.mean([h['pm25'] for h in historial_15min[-4:]]),
                'rolling_std_pm25': np.std([h['pm25'] for h in historial_15min[-4:]]),
                'hour': actual['ts'].hour,
                'day_of_week': actual['ts'].weekday(),
                'time_gap': 15.0
            }

            # Predecir siguiente valor (T+15)
            X_input = pd.DataFrame([features])[columnas]
            prediccion = modelo_vm.predict(X_input)[0]
            
            # Cálculo de anomalía
            # En la vida real, compararíamos 'prediccion' contra el SIGUIENTE dato real
            # Aquí lo comparamos con el actual para ver la desviación
            residuo = abs(actual['pm25'] - prediccion)
            
            print(f"   [MODELO] Predicción esperada: {prediccion:.2f} | Residuo: {residuo:.2f}")
            
            if residuo > umbral:
                print(f"   !!! ALERTA DE HUMO DETECTADA !!!")
            
            # Mantener historial corto para no saturar la RAM de la VM
            historial_15min.pop(0)

    # Avanzar tiempo y pausar
    reloj_simulado += timedelta(minutes=5)
    time.sleep(1)