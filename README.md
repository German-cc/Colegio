# RAEEBot

Aplicación web mobile-first para el Punto Verde de Parque Saavedra. Permite subir una foto o describir un residuo electrónico u obra hecha con descarte tecnológico para generar una ficha técnica con Google Gemini.

## Stack

- Node.js + Express
- Multer para carga segura de imágenes
- Google Gemini API con `@google/genai`
- Frontend estático mobile-first servido desde `public/`

## Ejecutar local

```bash
npm install
cp .env.example .env
npm start
```

Configurar `.env`:

```bash
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
GEMINI_MODEL=gemini-2.5-flash
PORT=3001
```

Abrir:

```txt
http://localhost:3001
```

## Deploy en Render

En Render Dashboard crear un **Web Service** conectado al repo de GitHub.

- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `Node`
- Environment Variables:
  - `GEMINI_API_KEY`: tu API key real
  - `GEMINI_MODEL`: `gemini-2.5-flash`

Render define `PORT` automáticamente, por eso no hace falta configurarlo en producción.

## Seguridad

No subir `.env` a GitHub. El archivo está ignorado por Git y la API key debe cargarse como variable de entorno en Render.
