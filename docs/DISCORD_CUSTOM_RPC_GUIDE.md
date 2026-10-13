# Guía Oficial: Creación y Configuración de Discord Rich Presence 100% Personalizado

Esta guía detalla paso a paso los requisitos, recursos y modificaciones de código necesarias para configurar un **Discord Rich Presence (RPC) totalmente propio** para **MonoEvents: Noche de Sangre**, mostrando el nombre exacto del evento como juego ("Jugando a MonoEvents: Noche de Sangre"), con carátulas e insignias oficiales personalizadas y botones de enlace directo.

---

## 1. Requisitos Previos

1. **Cuenta de Discord verificada:** Se requiere una cuenta con correo verificado (y preferiblemente autenticación en dos pasos - 2FA) para acceder al portal de desarrolladores.
2. **Recursos Gráficos (Arte Generado Listo en `resources/discord-rpc/`):**
   - **Ícono de la Aplicación (`app_icon.png`):** PNG `512x512` px con el squircle temático de Halloween y el fantasma de Lucide.
   - **Imagen de Portada / Banner (`cover.png`):** PNG `1024x576` px (16:9) de alta definición con diseño oficial y branding de MonoCraft.
   - **Carátula Principal (`halloween.png`):** PNG `512x512` px con clave `halloween` (`large_image`).
   - **Insignia Secundaria (`forge.png`):** PNG `512x512` px con clave `forge` (`small_image`).
   - **Insignias Opcionales (`flame.png`, `swords.png`):** PNG `512x512` px para eventos y PvP.
3. **Enlaces Comunitarios (Opcional para Botones):**
   - Enlace permanente de invitación a tu servidor de Discord (`https://discord.gg/...`).
   - Enlace a la web oficial (`https://mc-gko.vercel.app`).

---

## 2. Paso a Paso en el Discord Developer Portal

### Paso 2.1: Crear la Aplicación en Discord

1. Abre el navegador e ingresa a: **[Discord Developer Portal](https://discord.com/developers/applications)**.
2. Inicia sesión con la cuenta de Discord administradora del evento.
3. Haz clic en el botón superior derecho: **"New Application"**.
4. **Nombre de la Aplicación (Crítico):**
   - Escribe exactamente el nombre que deseas que aparezca en el estado de Discord:
     ```text
     MonoCraft: Noche de Sangre
     ```
   - *Nota:* Discord muestra automáticamente `Jugando a <Nombre de la Aplicación>`. Por lo tanto, si la llamas `MonoCraft: Noche de Sangre`, en Discord aparecerá:  
     > **JUGANDO A**  
     > **MonoCraft: Noche de Sangre**
5. Acepta los términos de servicio de Discord y haz clic en **"Create"**.

---

### Paso 2.2: Configurar Icono, Portada y Obtener el Application ID (Client ID)

1. En el menú lateral izquierdo, ve a **General Information**.
2. Sube el ícono de la aplicación: usa directamente [`resources/discord-rpc/app_icon.png`](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/resources/discord-rpc/app_icon.png) en **App Icon**.
3. Sube la portada oficial (Cover Image): usa directamente [`resources/discord-rpc/cover.png`](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/resources/discord-rpc/cover.png) (1024x576 px).
4. Localiza el campo **Application ID** (un número largo de 18 o 19 dígitos).
5. Haz clic en **Copy**. Guárdate este número; será tu nuevo `DISCORD_CLIENT_ID`.

---

### Paso 2.3: Subir los Recursos Visuales (Art Assets)

1. En el menú lateral izquierdo, despliega la sección **Rich Presence** y selecciona **Art Assets**.
2. En la sección **Rich Presence Assets**, haz clic en **Add Image(s)**:
   - Sube la imagen principal: [`resources/discord-rpc/halloween.png`](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/resources/discord-rpc/halloween.png)
     - **Nombre de clave (Asset Key):** Escribe exactamente `halloween`.
   - Sube la insignia de modloader: [`resources/discord-rpc/forge.png`](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/resources/discord-rpc/forge.png)
     - **Nombre de clave (Asset Key):** Escribe exactamente `forge`.
   - (Opcional) Sube [`flame.png`](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/resources/discord-rpc/flame.png) con clave `flame` y [`swords.png`](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/resources/discord-rpc/swords.png) con clave `swords`.
3. Haz clic en el botón inferior verde: **Save Changes**.

> [!IMPORTANT]
> **Tiempo de propagación en la CDN de Discord:**  
> Las imágenes subidas a la CDN de Discord (`cdn.discordapp.com/app-assets/...`) pueden tardar entre **5 y 15 minutos** en propagarse globalmente. Si configuras la aplicación inmediatamente y ves la imagen rota o vacía, espera unos minutos a que la caché de Discord se actualice.

---

## 3. Modificaciones en el Código del Launcher

Una vez obtenidas las claves, solo necesitas ajustar las constantes de configuración en el cliente IPC nativo de Rust.

### Archivo a Modificar: `src-tauri/src/discord/rpc.rs`

#### 1. Reemplazar el `DISCORD_CLIENT_ID`:

En la línea 8 de [src-tauri/src/discord/rpc.rs](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/src-tauri/src/discord/rpc.rs#L8):

```rust
// ANTES (ID genérico de Minecraft / CraftPresence):
// pub const DISCORD_CLIENT_ID: &str = "450485984333660181";

// AHORA (Tu nuevo Application ID del Discord Developer Portal):
pub const DISCORD_CLIENT_ID: &str = "TU_APPLICATION_ID_AQUI";
```

---

#### 2. Actualizar las Claves de Assets en los Payloads:

En la función `build_activity_payload`:

```rust
pub fn build_activity_payload(state: &DiscordActivityState) -> serde_json::Value {
    let pid = std::process::id();
    match state {
        DiscordActivityState::InLauncher => json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": pid,
                "activity": {
                    "details": "En el menú principal",
                    "state": "MonoEvents: Noche de Sangre",
                    "assets": {
                        "large_image": "halloween", // <-- Nombre exacto de clave subido en Art Assets
                        "large_text": "MonoEvents: Noche de Sangre"
                    }
                }
            },
            "nonce": "monoevents-launcher"
        }),
        DiscordActivityState::InGame { start_timestamp, server_ip } => json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": pid,
                "activity": {
                    "details": format!("Jugando en {}", server_ip),
                    "state": "MonoEvents: Noche de Sangre",
                    "timestamps": {
                        "start": start_timestamp
                    },
                    "assets": {
                        "large_image": "halloween",  // <-- Clave de la carátula grande
                        "large_text": "MonoEvents: Noche de Sangre",
                        "small_image": "forge_icon", // <-- Clave de la insignia de Forge
                        "small_text": "Minecraft 1.20.1 (Forge)"
                    }
                }
            },
            "nonce": "monoevents-game"
        }),
    }
}
```

---

### 4. (Opcional) Agregar Botones Interactivos en Discord

Discord Rich Presence permite incluir hasta **2 botones interactivos** en el perfil (por ejemplo: "Unirse al Discord" y "Web del Evento").

Para habilitarlos, basta con añadir el arreglo `"buttons"` al objeto `"activity"`:

```rust
"buttons": [
    {
        "label": "Unirse al Discord",
        "url": "https://discord.gg/tu-enlace-aqui"
    },
    {
        "label": "Ver Novedades",
        "url": "https://monoevents.es"
    }
]
```

> [!NOTE]
> **Comportamiento de botones en Discord:**  
> Discord **no** permite que el propio usuario haga clic en los botones de su propia tarjeta de estado (aparecen desactivados o no interactivos para uno mismo). Sin embargo, cualquier otro amigo o miembro de un servidor sí verá los botones perfectamente funcionales y podrá hacer clic para unirse directamente.

---

## 5. Lista de Verificación (Checklist) para Puesta en Marcha

- [ ] Aplicación creada en Discord Developer Portal con el nombre exacto deseado.
- [ ] Application ID copiado y colocado en `DISCORD_CLIENT_ID` en `src-tauri/src/discord/rpc.rs`.
- [ ] Assets subidos en la sección **Art Assets** (`large_image` y `small_image`).
- [ ] Esperados 10 minutos para propagación de imágenes en la CDN de Discord.
- [ ] Ejecutada prueba de compilación: `cargo test` y `npm run build`.
- [ ] Launcher arrancado con Discord de escritorio abierto.
- [ ] Verificado que el perfil de Discord muestra la tarjeta personalizada con el nombre, imágenes y cronómetro.
