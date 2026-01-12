
# Protocolo de Extracción Blooket (Ingeniería Inversa)

Este documento detalla la lógica técnica implementada en `services/blooketService.ts` para la extracción, limpieza y transformación de cuestionarios desde la plataforma Blooket.

## 1. Detección y Enrutamiento
El proceso comienza en `services/urlService.ts`.

*   **Patrón de URL:** Se detecta si la URL contiene la cadena `blooket.com/set/`.
*   **Extracción de ID:** Se utiliza una expresión regular para extraer el ID del set:
    `/\/set\/([a-zA-Z0-9]+)/`
    *   *Ejemplo:* De `https://dashboard.blooket.com/set/6035c7e0c93240001887e456`, se extrae `6035c7e0c93240001887e456`.

## 2. Estrategia de Acceso (Evasión de CORS)
Como Blooket no ofrece una API pública documentada y bloquea peticiones directas desde navegadores externos (CORS), utilizamos una red de proxies rotativos.

*   **Endpoint Objetivo (Oculto):** `https://api.blooket.com/api/games?gameId={BLOOKET_ID}`
*   **Túneles CORS:** La aplicación intenta rotar entre los siguientes servicios para evitar bloqueos:
    1.  `CorsProxy` (`corsproxy.io`)
    2.  `AllOrigins` (`api.allorigins.win`)

## 3. Escaneo Profundo (Deep Find)
Una vez obtenido el JSON crudo de la respuesta, no asumimos una estructura fija, ya que Blooket cambia su formato ocasionalmente.

*   Utilizamos `services/deepFindService.ts` para escanear recursivamente el árbol JSON.
*   **Heurística de Candidatos:** Buscamos un array de objetos que cumpla con:
    *   Tener propiedades de texto (`question`, `text`).
    *   Tener arrays de opciones (`answers`, `choices`).
    *   Tener claves específicas de Blooket (`correctAnswers`).

## 4. Normalización de Datos
Una vez localizado el array de preguntas, se ejecuta `normalizeBlooketToQuiz` con las siguientes reglas de transformación:

### A. Imágenes
Blooket no siempre devuelve URLs completas.
*   **Lógica:**
    1.  Si el campo `image` empieza por `http`, se usa tal cual.
    2.  Si es una cadena alfanumérica corta (ID de Cloudinary), se reconstruye la URL:
        `https://media.blooket.com/image/upload/{ID_DE_IMAGEN}`

### B. Respuestas y Corrección
Blooket almacena las respuestas correctas como un array de cadenas de texto (`correctAnswers`) que coinciden literalmente con el texto de las opciones.

1.  Se extraen todas las opciones de `answers` o `choices`.
2.  Se genera un UUID único para cada opción.
3.  **Cruce de datos:** Se comprueba si el texto de la opción existe dentro del array `correctAnswers`.
    *   Si coincide: Se marca el ID de esa opción como `correctOptionId`.

### C. Inferencia de Tipos
La aplicación deduce el tipo de pregunta basándose en la estructura de los datos:
*   **Verdadero/Falso:** Si hay exactamente 2 opciones y sus textos (normalizados a minúsculas) contienen "true" y "false".
*   **Multi-Select:** Si el array `correctAnswers` tiene más de un elemento o el tipo explícito es `select`.
*   **Multiple Choice:** Por defecto.

### D. Banderas de Calidad (Forensic Analysis)
Si el cuestionario extraído tiene defectos (ej. preguntas privadas donde Blooket oculta las respuestas), se añaden "Flags":
*   `needsEnhanceAI`: `true` si no se encontraron opciones o respuestas correctas.
*   `enhanceReason`: `"no_correct_exposed_public"` (indica que se requiere post-procesamiento con Gemini para arreglar la pregunta).

## 5. Salida
El resultado es un objeto `Quiz` estandarizado compatible con el editor manual y todos los formatos de exportación (Kahoot, Google Forms, etc.).
