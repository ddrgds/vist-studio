# Android Studio — primera vez

Setup que solo se hace **una vez por máquina**. Después solo es Run.

## 1) Abrir el proyecto

```bash
npm run mobile:android
```

Esto rebuilds + sync + abre Android Studio con el proyecto cargado.

## 2) Esperar Gradle sync

Abajo derecha aparece una barra **"Gradle sync"**. Primera vez tarda 5-10 min (descarga SDKs).

Si Android Studio te pide:
- **Trust this project** → Yes
- **Update Gradle Plugin?** → Skip (ya está actualizado por Capacitor)

## 3) Instalar Android system image (requerido para emulator)

`Tools` → `SDK Manager` → tab **SDK Platforms**

- Marca **Android 14.0 ("UpsideDownCake")** API Level 34
- Click **Apply** → acepta licencia → descarga (~1 GB)

Cuando termine:

`SDK Manager` → tab **SDK Tools**
- Verifica que esté marcado **Android Emulator**
- Verifica que esté marcado **Android SDK Platform-Tools**
- Si quieres usar comandos CLI también, marca **Android SDK Command-line Tools (latest)**

## 4) Crear el AVD (Android Virtual Device)

`Tools` → `Device Manager` → botón **+ Create Device**

1. **Phone** → elige **Pixel 8** (recomendado por pantalla 1080×2400, igual que muchos phones reales) → Next
2. **System Image** tab **Recommended** → elige **API 34 / UpsideDownCake** (la que descargaste en paso 3)
3. **AVD Name**: `Pixel_8_API_34` (o lo que quieras) → Finish

## 5) Run

1. Top toolbar de Android Studio:
   - Dropdown izquierdo dice **app**
   - Dropdown derecho dice **Pixel 8 API 34**
2. Click el botón verde **▶ Run** (o Shift+F10)
3. El emulador arranca (1-2 min primera vez, después 10-15s)
4. La app VIST se abre con splash cream → MobileApp shell

## Hot reload during dev

Si quieres editar código y ver cambios sin rebuild:

1. En `capacitor.config.ts` descomenta:
   ```ts
   server: {
     androidScheme: 'https',
     url: 'http://10.0.2.2:5173',  // ← descomenta esta línea
     cleartext: true,
   }
   ```
   `10.0.2.2` es la IP especial del emulador Android que apunta a `localhost` de tu Windows.

2. Sync: `npx cap sync android`
3. En terminal corre el dev server: `npm run dev`
4. Run en Android Studio
5. Ahora el emulador carga desde tu Vite dev server. Editas código → Vite hot-reloads → emulator se actualiza al toque.

**Importante**: cuando quieras hacer un build de producción para shippeo, vuelve a comentar la línea `url:`. Si la dejas, el APK final tratará de cargar `http://10.0.2.2:5173` — que no existe en device de usuario.

## Troubleshooting

| Síntoma | Fix |
|---|---|
| `JAVA_HOME not set` o usa Java 8 | Settings → Build → Gradle → **Gradle JDK** → elige `embedded JDK 21` |
| `SDK location not found` | Settings → Languages → Android SDK → **Android SDK Location** → debe apuntar a `C:\Users\<tu_usuario>\AppData\Local\Android\Sdk` |
| Emulator nunca arranca | Habilita virtualización en BIOS (Intel VT-x / AMD-V). En Windows: `bcdedit /set hypervisorlaunchtype auto` (run as admin) y reinicia |
| Pantalla blanca al abrir VIST | Web bundle no se copió. En terminal: `npm run mobile:sync` y vuelve a Run |
| Error 401/credenciales | El emulador tiene su propio almacenamiento. Necesitas hacer login desde dentro |

## Siguiente vez (90% del tiempo)

```bash
npm run mobile:android
```
→ Android Studio abre → Run button → listo. 30 segundos.
