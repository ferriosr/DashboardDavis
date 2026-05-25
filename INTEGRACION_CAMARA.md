# 📹 Integración Cámara Isla → Dashboard

Guía para enviar video en vivo y metadatos YOLO desde `cam_isla.py` al dashboard.

## 📋 Requisitos

### En `cam_isla.py` (Sistema externo)

```bash
pip install cv2 flask ultralytics requests
```

O si usas `requirements.txt`:

```
opencv-python
flask
ultralytics
requests
```

### En el Backend (Dashboard)

- Node.js 16+
- Endpoints ya configurados: `/api/video/metadata` y `/api/video/stream`

---

## 🚀 Cómo usar

### Paso 1: Iniciar el Backend

```bash
cd BACKEND/
npm run dev
# O: node server.js
```

Debe estar corriendo en `http://localhost:3001`

### Paso 2: Iniciar cam_isla.py

```bash
cd DashboardDavis/
python cam_isla.py
```

Debe estar corriendo en `http://localhost:5000`

**Output esperado:**
```
📡 Conectando con dashboard: http://localhost:3001
📹 Fuente: escom_isla_cam
✓ Enviando metadatos cada 5.0s
✓ Enviando video cada 30.0s

 * Running on http://0.0.0.0:5000
```

### Paso 3: Abrir el Frontend

```bash
cd FRONTEND/
npm run dev
# O: npm run build && npm run preview
```

Acceder a `http://localhost:5173` (o el puerto que muestre)

### Paso 4: Navegar a "Cámara Isla"

En el sidebar del dashboard, hay una nueva opción **📹 Cámara Isla**.

---

## 📊 Flujo de Datos

```
cam_isla.py (localhost:5000)
    ↓
    [Captura + YOLO Inference]
    ↓
    [Extrae detecciones]
    ↓
    Envía cada 5s  → POST /api/video/metadata → Backend (localhost:3001)
    Envía cada 30s → POST /api/video/stream   → Backend (localhost:3001)
    ↓
    [Backend almacena]
    ↓
    Frontend consume → Muestra en Dashboard
```

---

## 🔧 Configuración en cam_isla.py

En la sección de "Configuración de envío al Dashboard":

```python
# URL del backend
BACKEND_URL = "http://localhost:3001"

# Identificador de la cámara
CAMERA_SOURCE = "escom_isla_cam"

# Intervalo de envío de metadatos (segundos)
SEND_METADATA_INTERVAL = 5.0

# Intervalo de envío de video (segundos)
SEND_VIDEO_INTERVAL = 30.0
```

---

## 📡 Endpoints Utilizados

### 1. POST `/api/video/metadata`

Envía detecciones YOLO cada 5 segundos.

**Payload:**
```json
{
  "source": "escom_isla_cam",
  "camera": "YOLO Isla Camera",
  "resolution": "1920x1080",
  "fps": 30,
  "quality": "HD",
  "extra": {
    "detecciones_count": 5,
    "timestamp": "2026-05-16T12:30:45.123Z",
    "detecciones": [
      {
        "clase": "persona",
        "confianza": 0.95,
        "bbox": [100, 150, 300, 400]
      }
    ]
  }
}
```

### 2. POST `/api/video/stream`

Envía frame/video cada 30 segundos con metadatos en header.

**Headers:**
```
Content-Type: image/jpeg
X-Video-Metadata: {"source":"escom_isla_cam","detecciones":5,...}
```

**Body:** Datos binarios del JPEG

---

## 🎨 Dashboard de Cámara

El componente `CamaraIsla.jsx` muestra:

1. **Video en Vivo** (embedded desde `http://localhost:5000/video_feed`)
2. **Estado del Sistema**
   - ✅ Cámara: Online/Offline
   - ✅ Backend: Online/Offline
   - Detecciones últimas
   - Fuente de video

3. **Detecciones Recientes**
   - Contador de objetos detectados
   - Información de envío

4. **Flujo de Datos**
   - Visualización del pipeline: Captura → YOLO → Backend → Dashboard

---

## 🐛 Troubleshooting

### Error: "Cannot connect to backend"

```
✗ Backend no disponible
```

**Solución:**
- Verifica que el backend esté corriendo: `npm run dev` en `BACKEND/`
- Verifica puerto 3001 esté disponible

### Error: "Cannot connect to camera"

**Solución:**
- Verifica que `cam_isla.py` esté corriendo: `python cam_isla.py`
- Verifica puerto 5000 esté disponible
- Verifica cámara conectada: `CAMERA_INDEX = 0` (o índice correcto)

### Video no aparece en dashboard

**Causas:**
- `cam_isla.py` no está corriendo
- CORS bloqueado (poco probable, ya configurado)
- Firewall bloqueando conexión

**Solución:**
- Accede directo a `http://localhost:5000` para verificar que funciona
- Verifica logs en consola de `cam_isla.py`

### Metadatos no se actualizan

**Solución:**
- Abre la consola del navegador (F12)
- Verifica que NO haya errores de red
- Verifica que backend esté recibiendo: `console.log()` en backend

---

## 📝 Modificaciones Hechas

### `cam_isla.py`
- ✅ Agregada librería `requests`
- ✅ Agregadas funciones de envío: `enviar_metadatos_al_backend()` y `enviar_video_al_backend()`
- ✅ Hilos separados para envío (no bloquean captura)
- ✅ Endpoint `/status` para verificar conectividad
- ✅ Configuración centralizada

### `BACKEND/server.js`
- ✅ Endpoints `/api/video/metadata` y `/api/video/stream`
- ✅ Soporte para `express.json()` y `express.raw()`
- ✅ Importada `writeFileSync` para guardar videos

### Frontend
- ✅ Nuevo componente `CamaraIsla.jsx`
- ✅ Actualizado `App.jsx` para renderizar componente
- ✅ Actualizado `Sidebar.jsx` con opción "Cámara Isla"

---

## 🔄 Próximos Pasos

Opcional, para mejorar:

1. **Guardar metadatos en BD**
   - En `/api/video/metadata`, almacenar en Supabase
   - Ver historial de detecciones

2. **Almacenamiento de videos**
   - Guardar videos en S3 o Supabase
   - Generar thumbs

3. **Alertas en tiempo real**
   - Si detecciones > umbral, enviar notificación
   - Integrar con NotificationsPanel

4. **Multi-cámara**
   - `CAMERA_SOURCE` dinámico
   - Panel de selección en dashboard

5. **Streaming en vivo**
   - En lugar de iframes, usar WebRTC
   - Menor latencia

---

## 📞 Contacto

Para soporte o mejoras, contacta al equipo de desarrollo.

