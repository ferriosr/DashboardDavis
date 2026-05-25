import os
import cv2
import threading
import time
import requests
import json
from datetime import datetime
from flask import Flask, Response, jsonify, render_template_string
from ultralytics import YOLO

# --- Configuración ---
MODELO = 'runs/detect/yolo_mincam_v4/weights/best.pt'
CONFIANZA = 0.5
IMGSZ = 640
CAMERA_INDEX = 0

# Configuración de Guardado (Basado en tu cam.py original)
SAVE_RAW = True
SAVE_YOLO = True
SAVE_INTERVAL = 1.0  # Segundos entre capturas
DIRECTORIO_SALIDA = "capturas_servidor/" + datetime.now().strftime("%Y%m%d_%H%M%S")

# Configuración de envío al Dashboard
BACKEND_URL = "http://localhost:3001"
CAMERA_SOURCE = "escom_isla_cam"
SEND_METADATA_INTERVAL = 5.0  # Enviar metadatos cada 5 segundos
SEND_VIDEO_INTERVAL = 30.0  # Enviar video completo cada 30 segundos

app = Flask(__name__)

# Variables globales
ultimo_frame_streaming = None
ultimos_metadatos = []
lock = threading.Lock()
ultimo_frame_yolo = None
ultima_captura_video = 0
ultima_captura_metadata = 0

# Crear directorios de salida
ruta_raw = os.path.join(DIRECTORIO_SALIDA, "raw")
ruta_yolo = os.path.join(DIRECTORIO_SALIDA, "yolo")
for d in [ruta_raw, ruta_yolo]:
    os.makedirs(d, exist_ok=True)

print(f"Cargando modelo YOLO: {MODELO}")
try:
    model = YOLO(MODELO)
except Exception as e:
    print(f"Error: {e}. Usando yolov8n.")
    model = YOLO('yolov8n.pt')

def enviar_metadatos_al_backend(detecciones, width, height, fps):
    """Envía metadatos de detecciones al backend."""
    try:
        metadata = {
            "source": CAMERA_SOURCE,
            "camera": "YOLO Isla Camera",
            "resolution": f"{width}x{height}",
            "fps": fps,
            "quality": "HD",
            "extra": {
                "detecciones_count": len(detecciones),
                "timestamp": datetime.now().isoformat(),
                "detecciones": detecciones[:5],  # Top 5
            }
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/video/metadata",
            json=metadata,
            timeout=5
        )
        if response.status_code == 200:
            print(f"✓ Metadatos enviados: {len(detecciones)} detecciones")
        else:
            print(f"✗ Error al enviar metadatos: {response.status_code}")
    except Exception as e:
        print(f"✗ Error de conexión al enviar metadatos: {e}")

def enviar_video_al_backend(frame_yolo, metadata_json):
    """Envía frame/video al backend."""
    try:
        ret, buffer = cv2.imencode('.jpg', frame_yolo)
        if not ret:
            return
        
        frame_bytes = buffer.tobytes()
        
        headers = {
            "X-Video-Metadata": metadata_json,
            "Content-Type": "image/jpeg"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/video/stream",
            data=frame_bytes,
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            print(f"✓ Video/Frame enviado ({len(frame_bytes)} bytes)")
        else:
            print(f"✗ Error al enviar video: {response.status_code}")
    except Exception as e:
        print(f"✗ Error de conexión al enviar video: {e}")

def procesar_camara():
    """Hilo de captura, inferencia y guardado en disco."""
    global ultimo_frame_streaming, ultimos_metadatos, ultimo_frame_yolo, ultima_captura_video, ultima_captura_metadata
    cap = cv2.VideoCapture(CAMERA_INDEX)
    ultimo_guardado = 0
    indice_guardado = 0
    
    # Obtener propiedades de la cámara
    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"Cámara configurada: {width}x{height} @ {fps} FPS")
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            continue

        t_actual = time.time()

        # Inferencia YOLO
        results = model.predict(source=frame, conf=CONFIANZA, imgsz=IMGSZ, verbose=False)
        frame_anotado = results[0].plot()

        # Extraer metadatos
        detecciones = []
        for box in results[0].boxes:
            detecciones.append({
                "clase": model.names[int(box.cls[0])],
                "confianza": float(box.conf[0]),
                "bbox": box.xyxy[0].tolist()
            })

        # Lógica de Guardado Local (Replicada de tu código original)
        if (t_actual - ultimo_guardado) >= SAVE_INTERVAL:
            timestamp_archivo = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
            nombre_archivo = f"frame_{timestamp_archivo}_{indice_guardado:06d}.jpg"

            if SAVE_RAW:
                cv2.imwrite(os.path.join(ruta_raw, nombre_archivo), frame)
            if SAVE_YOLO:
                cv2.imwrite(os.path.join(ruta_yolo, nombre_archivo), frame_anotado)
            
            ultimo_guardado = t_actual
            indice_guardado += 1

        # Actualizar streaming y metadatos globales
        with lock:
            ret, buffer = cv2.imencode('.jpg', frame_anotado)
            ultimo_frame_streaming = buffer.tobytes()
            ultimo_frame_yolo = frame_anotado
            ultimos_metadatos = detecciones

        # Enviar metadatos al backend cada SEND_METADATA_INTERVAL segundos
        if (t_actual - ultima_captura_metadata) >= SEND_METADATA_INTERVAL:
            threading.Thread(
                target=enviar_metadatos_al_backend,
                args=(detecciones, width, height, fps),
                daemon=True
            ).start()
            ultima_captura_metadata = t_actual

        # Enviar video/frame al backend cada SEND_VIDEO_INTERVAL segundos
        if (t_actual - ultima_captura_video) >= SEND_VIDEO_INTERVAL and ultimo_frame_yolo is not None:
            metadata_json = json.dumps({
                "source": CAMERA_SOURCE,
                "camera": "YOLO Isla",
                "detecciones": len(detecciones),
                "fps": fps,
            })
            threading.Thread(
                target=enviar_video_al_backend,
                args=(ultimo_frame_yolo, metadata_json),
                daemon=True
            ).start()
            ultima_captura_video = t_actual

def generate_frames():
    while True:
        with lock:
            if ultimo_frame_streaming:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + ultimo_frame_streaming + b'\r\n')
        time.sleep(0.03) # Limitar a ~30 FPS para ahorrar ancho de banda

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/metadata')
def get_metadata():
    with lock:
        return jsonify({"detecciones": ultimos_metadatos, "count": len(ultimos_metadatos)})

@app.route('/status')
def status():
    """Estado del sistema: conectividad con backend, detecciones, etc."""
    try:
        # Verificar conectividad con backend
        response = requests.get(f"{BACKEND_URL}/api/video/status", timeout=2)
        backend_online = response.status_code == 200
    except:
        backend_online = False
    
    with lock:
        return jsonify({
            "camera": "online",
            "backend": "online" if backend_online else "offline",
            "detecciones_ultimas": len(ultimos_metadatos),
            "fuente": CAMERA_SOURCE,
            "backend_url": BACKEND_URL,
        })

@app.route('/')
def index():
    return render_template_string("""
        <html>
          <head>
            <title>YOLO Server + Dashboard</title>
            <style>
                body { background: #111; color: #fff; font-family: sans-serif; text-align: center; }
                .main { display: flex; justify-content: center; gap: 20px; padding: 20px; flex-wrap: wrap; }
                img { border: 3px solid #333; border-radius: 10px; max-width: 600px; }
                #log { 
                    background: #000; 
                    color: #0f0; 
                    padding: 10px; 
                    text-align: left; 
                    width: 300px; 
                    font-family: monospace;
                    border-radius: 5px;
                    max-height: 400px;
                    overflow-y: auto;
                }
                #status {
                    background: #1a1a1a;
                    color: #0f0;
                    padding: 10px;
                    border-radius: 5px;
                    font-family: monospace;
                    width: 300px;
                    text-align: left;
                }
                h1 { color: #00ff00; }
                h3 { margin: 5px 0; }
            </style>
          </head>
          <body>
            <h1>🎥 YOLO Isla + Dashboard</h1>
            <div class="main">
                <div>
                    <h2>Video en Vivo</h2>
                    <img src="{{ url_for('video_feed') }}" alt="Live Feed">
                </div>
                <div>
                    <div id="status"><h3>Estado del Sistema</h3><pre id="status-data">Conectando...</pre></div>
                    <div id="log"><h3>Detecciones Locales:</h3><pre id="data"></pre></div>
                </div>
            </div>
            <script>
                // Metadatos locales
                setInterval(async () => {
                    const r = await fetch('/metadata');
                    const d = await r.json();
                    document.getElementById('data').textContent = JSON.stringify(d, null, 2);
                }, 500);

                // Estado del sistema
                setInterval(async () => {
                    try {
                        const r = await fetch('/status');
                        const d = await r.json();
                        document.getElementById('status-data').textContent = JSON.stringify(d, null, 2);
                    } catch(e) {
                        document.getElementById('status-data').textContent = '❌ Error al obtener estado';
                    }
                }, 2000);
            </script>
          </body>
        </html>
    """)

if __name__ == "__main__":
    print(f"\n📡 Conectando con dashboard: {BACKEND_URL}")
    print(f"📹 Fuente: {CAMERA_SOURCE}")
    print(f"✓ Enviando metadatos cada {SEND_METADATA_INTERVAL}s")
    print(f"✓ Enviando video cada {SEND_VIDEO_INTERVAL}s\n")
    
    thread = threading.Thread(target=procesar_camara, daemon=True)
    thread.start()
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)


def generate_frames():
    while True:
        with lock:
            if ultimo_frame_streaming:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + ultimo_frame_streaming + b'\r\n')
        time.sleep(0.03) # Limitar a ~30 FPS para ahorrar ancho de banda

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/metadata')
def get_metadata():
    with lock:
        return jsonify({"detecciones": ultimos_metadatos, "count": len(ultimos_metadatos)})

@app.route('/')
def index():
    return render_template_string("""
        <html>
          <head>
            <title>YOLO Server + Storage</title>
            <style>
                body { background: #111; color: #fff; font-family: sans-serif; text-align: center; }
                .main { display: flex; justify-content: center; gap: 20px; padding: 20px; }
                img { border: 3px solid #333; border-radius: 10px; max-width: 800px; }
                #log { background: #000; color: #0f0; padding: 10px; text-align: left; width: 300px; font-family: monospace; }
            </style>
          </head>
          <body>
            <h1>Sistema de Detección y Almacenamiento</h1>
            <div class="main">
                <img src="{{ url_for('video_feed') }}">
                <div id="log"><h3>Detecciones:</h3><pre id="data"></pre></div>
            </div>
            <script>
                setInterval(async () => {
                    const r = await fetch('/metadata');
                    const d = await r.json();
                    document.getElementById('data').textContent = JSON.stringify(d, null, 2);
                }, 500);
            </script>
          </body>
        </html>
    """)

if __name__ == "__main__":
    thread = threading.Thread(target=procesar_camara, daemon=True)
    thread.start()
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)