# Spec: Catálogo, Búsqueda y Descarga de Shaders en 'Gestor de Shaders' (Modrinth API)

## Contexto y Alcance
El launcher de Minecraft Forge 1.20.1 (*MonoEvents: Noche de Sangre*) actualmente permite alternar shaders locales y aplicar 3 perfiles de rendimiento preconfigurados (`PVP`, `Equilibrado`, `Cinemático`). Esta especificación define la integración de un buscador y gestor de descargas conectado a la API pública de **Modrinth (Labrinth v2)** ubicado directamente en la pestaña existente **"Gestor de Shaders"**.

## Requisitos Funcionales

### 1. Fuente de Datos: Modrinth API v2
- Endpoint de búsqueda: `https://api.modrinth.com/v2/search`.
- Filtros estrictos de versión y tipo: `facets=[["project_type:shader"],["versions:1.20.1"]]`.
- User-Agent HTTP: `MonoEvents-Launcher/1.0.0 (contact@monoevents.es)`.
- Sin claves de API requeridas (acceso libre y abierto con límite de 300 req/min).

### 2. Detección y Notificación de Consumo / Calidad
Cada proyecto retornado por Modrinth incluye etiquetas en `categories` y `display_categories`. El backend clasifica cada shader en uno de tres niveles de consumo:
- `low` (🟢 **Bajo Consumo / Lite**): Etiquetas como `potato`, `low`, `performance`, `vanilla-like`. Destinado a 90-144+ FPS o gráficas integradas.
- `medium` (🟡 **Equilibrado / Medio**): Etiquetas como `medium`, `semi-realistic`, o proyectos reconocidos como equilibrados. Destinado a 60-90 FPS.
- `high` (🔴 **Alto Consumo / Cinemático**): Etiquetas como `high`, `extreme`, `pathtracing`, `voxels`. Destinado a 30-60 FPS o trazado de rayos.

### 3. Descarga Atómica y Verificación SHA1
- Endpoint de versiones: `https://api.modrinth.com/v2/project/{id}/version?game_versions=["1.20.1"]`.
- Se selecciona el archivo `.zip` primario (`files[0]`).
- Se descarga a `<instancePath>/shaderpacks/<filename>.tmp`.
- Se valida la suma SHA1 contra el hash reportado por la API.
- Se renombra atómicamente a `<filename>`.
- Permanece en la lista de shaders locales para que el usuario pueda activarlo cuando lo desee.

### 4. Integración en la Interfaz de Usuario
- Ubicado en la pestaña **"Gestor de Shaders"**, debajo de la lista de shaders locales.
- Barra de búsqueda interactiva con debounce de 350ms.
- Chips de filtro de consumo: `Todos`, `🟢 Bajo Consumo`, `🟡 Equilibrado`, `🔴 Alto Consumo`.
- Tarjetas con imagen destacada (`featured_gallery` o `icon_url`), número de descargas, autor y descripción.
- Estado:
  - Si el archivo ya existe en disco: badge `Instalado` y botón para activarlo.
  - Si no existe: botón `Descargar (.zip)` con spinner durante la transferencia.
