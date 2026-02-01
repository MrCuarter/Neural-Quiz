
# Arquitectura Técnica & Flujo de Datos - Neural Quiz

Este documento detalla el funcionamiento interno de Neural Quiz, centrándose en las estrategias de extracción de datos, el procesamiento mediante IA y la gestión de formatos.

## 1. Arquitectura General
La aplicación es una **SPA (Single Page Application)** construida con React y TypeScript. Funciona completamente del lado del cliente (Client-Side), sin depender de un backend propio para el procesamiento.
- **Frontend:** React + Vite + Tailwind CSS.
- **Lógica de Negocio:** Servicios modulares (`urlService`, `geminiService`, `importService`, `exportService`).
- **Persistencia:** LocalStorage (para guardar el progreso) y memoria del navegador.

---

## 2. Estrategia de Extracción de Contenido ("Plan Omega")

Para responder a las preguntas específicas sobre la extracción:

### 1. ¿En qué formato estás extrayendo el contenido?
Depende de la fuente de origen. Utilizamos un enfoque híbrido:
- **Kahoot (Público):** Extraemos **JSON crudo** interceptando la API interna.
- **Sitios Web Generales (Quizizz, Blooket, Blogs):** Extraemos **Markdown limpio** o **HTML crudo**.
- **Documentos:** Extraemos **Texto Plano** de PDFs.
- **Hojas de Cálculo:** Extraemos **Arrays de Datos** (Binario) de Excel/CSV.

### 2. ¿Qué herramientas estás usando para extraerlo?
Al no tener backend, no podemos usar Puppeteer o Selenium. Usamos una arquitectura de "Agentes" que rotan si uno falla:

*   **Agente Alpha (Jina Reader):** Utilizamos la API de `r.jina.ai` que actúa como un navegador remoto. Renderiza el Javascript de la página destino y nos devuelve un **Markdown** limpio y estructurado, ideal para la IA.
*   **Agente Beta (CORS Proxies):** Utilizamos `corsproxy.io` y `api.allorigins.win`. Estas herramientas actúan como túneles para saltar la restricción CORS del navegador y obtener el HTML o JSON crudo de la web destino.
*   **PDF.js:** Librería de Mozilla (ejecutada en el navegador) para leer archivos PDF y convertirlos a texto.
*   **SheetJS (XLSX):** Para leer archivos Excel y CSV byte a byte.

### 3. ¿Qué parte del contenido sí logras extraer?
*   **Enunciados (Preguntas):** Sí, siempre.
*   **Opciones (Respuestas):**
    *   *Kahoot:* Sí. Al interceptar el JSON de la API, obtenemos las opciones e incluso identificamos cuál es la correcta (`correct: true`).
    *   *PDFs / Texto:* Sí, la IA las identifica por contexto.
    *   *Webs protegidas (Vista Previa):* A veces las webs (como Wayground o Kahoots privados) ocultan las respuestas en el HTML. En este caso, **extraemos solo la pregunta** y activamos el módulo **"Enhance AI"** (ver abajo) para que la IA genere respuestas plausibles automáticamente.
*   **Imágenes:**
    *   Sí. Extraemos la URL de la imagen.
    *   En el caso específico de Kahoot, reconstruimos la URL utilizando su CDN (`images-cdn.kahoot.it`) ya que a veces solo entregan un ID parcial.

---

## 3. El Cerebro: Google AI Studio (Gemini)

Toda la lógica de comprensión y estructuración recae en la API de Google Gemini.

### 4. ¿Qué tipo de IA estás usando?
*   **Modelo:** `gemini-3-flash-preview`.
*   **Por qué este modelo:** Es el modelo más rápido y eficiente (latencia baja) de la familia Gemini 3, ideal para tareas de estructuración de datos en tiempo real. Soporta una ventana de contexto grande para leer PDFs enteros.
*   **Configuración:**
    *   `responseMimeType: "application/json"`: Forzamos a la IA a responder SIEMPRE en formato JSON estricto.
    *   `responseSchema`: Definimos un esquema TypeScript estricto (`Question`, `Option`, `Type`) para asegurar que la salida nunca rompa la aplicación.

### 5. Niveles de Dificultad (Protocolo v2)
La IA sigue estrictamente estos niveles al generar contenido:

*   **Nivel 1 · Básico:**
    Preguntas muy simples y directas. Predominan el verdadero/falso, la opción única con 2–3 respuestas o la respuesta corta muy evidente (una palabra clara). No hay distractores complejos ni ambigüedad. Evalúan reconocimiento inmediato y recuerdo literal.

*   **Nivel 2 · Inicial:**
    Preguntas fáciles pero con un pequeño reto. Se usan opciones únicas con 3–4 respuestas, checkbox con una combinación clara, o ordenar procesos cortos (3 pasos). Las respuestas falsas son evidentes si se comprende mínimamente el contenido. Requieren atención y comprensión básica.

*   **Nivel 3 · Intermedio:**
    Preguntas de dificultad media. Incluyen opción única con 4–5 respuestas, checkbox con varias respuestas correctas, respuesta corta menos obvia o ordenar procesos de 4 pasos. Los distractores son plausibles y obligan a pensar antes de responder.

*   **Nivel 4 · Avanzado:**
    Preguntas exigentes que combinan complejidad conceptual y formato. Aparecen opciones únicas con 5–6 respuestas, checkbox con varias respuestas correctas no evidentes, respuestas cortas que exigen precisión, u ordenar procesos largos (5–6 pasos). Se evalúa análisis y dominio del contenido.

*   **Nivel 5 · Experto:**
    Preguntas de máxima dificultad. Distractores muy bien construidos, checkbox con combinaciones complejas, respuestas cortas abiertas donde no hay pistas, u ordenaciones completas con muchos pasos. También pueden incluir preguntas sin validación (encuestas o abiertas) pensadas para reflexión, transferencia y pensamiento crítico, más que para corrección automática.

---

## 4. Flujo de Datos Detallado

1.  **Input:** El usuario introduce una URL (ej. Kahoot) o sube un PDF.
2.  **Intercepción (urlService.ts):**
    *   Si es URL de Kahoot, detectamos el UUID con RegEx.
    *   Construimos una petición a `https://create.kahoot.it/rest/kahoots/{UUID}` pasando por un Proxy CORS.
    *   Obtenemos el JSON original del quiz.
3.  **Normalización:**
    *   Si tenemos JSON, lo formateamos a un string legible.
    *   Si tenemos PDF, extraemos el texto página a página.
4.  **Inferencia (geminiService.ts):**
    *   Enviamos los datos crudos a Gemini con un *System Prompt* diseñado para "Análisis Forense".
    *   La IA busca patrones de preguntas, respuestas, imágenes y tipos (Test, Verdadero/Falso).
    *   Si la IA detecta preguntas sin respuestas, marca el flag de advertencia.
5.  **Post-Procesamiento (Heurística):**
    *   Ejecutamos código (`sanitizeQuestion`) para corregir errores comunes de la IA (ej. asegurar que "Verdadero/Falso" siempre tenga 2 opciones, o arreglar concordancia de género en español).
6.  **Interfaz:** El usuario ve el quiz en el "Editor Manual" donde puede modificarlo.
7.  **Exportación:** `exportService.ts` transforma el objeto JSON interno a formatos específicos (Excel para Kahoot, CSV para Blooket, API para Google Forms).

## 5. Estructura de Ficheros Clave

*   `services/urlService.ts`: Lógica de scraping y proxies (El "Plan Omega").
*   `services/geminiService.ts`: Comunicación con la API de Google y Schemas.
*   `services/importService.ts`: Parsers deterministas para Excel/CSV.
*   `services/googleFormsService.ts`: Lógica OAuth2 y API de Google Forms.
*   `types.ts`: Definiciones de tipos (Interface `Quiz`, `Question`).
