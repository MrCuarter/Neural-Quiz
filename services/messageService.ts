
// A dedicated service for the "Personality" of the loader

const messages = {
    start: [
        "Iniciando motores cuánticos...",
        "Consultando con Mr. Cuarter...",
        "Calentando los circuitos neuronales...",
        "Despertando al hámster del servidor...",
        "Cargando la matriz de conocimiento...",
        "Estableciendo enlace neural..."
    ],
    detect_kahoot: [
        "¡Ajá! Veo formas de colores y música pegadiza... ¡Es un Kahoot!",
        "Detectando arquitectura Kahoot. Mr. Cuarter aprueba esto.",
        "Extrayendo diversión del formato Kahoot...",
        "Decodificando el ADN de ese Kahoot...",
        "¡Un clásico! Procesando estructura Kahoot...",
        "Traduciendo 'Quiz de colores' a datos puros..."
    ],
    detect_blooket: [
        "¿Es eso un blook? Detectando formato Blooket...",
        "Robando oro... digo, procesando Blooket...",
        "Analizando modo Tower Defense... Es un Blooket.",
        "Hackeando el mainframe de Blooket (con permiso de Mr. Cuarter)...",
        "Identificando estructura de juego cripto...",
        "¡Blooket detectado! Extrayendo preguntas..."
    ],
    detect_genially: [
        "Detectando interactividad... ¡Es un Genially!",
        "Analizando la gamificación de Genially...",
        "Desplegando la magia visual de Genially...",
        "Oh la la, un Genially. Qué elegante.",
        "Extrayendo nodos interactivos...",
        "Procesando estructura de presentación interactiva..."
    ],
    detect_pdf: [
        "Desplegando el papel digital...",
        "Leyendo entre líneas (literalmente)... Es un PDF.",
        "Usando visión de rayos X en este PDF...",
        "Convirtiendo tinta digital a datos...",
        "Aplanando el documento para análisis forense...",
        "Mr. Cuarter está traduciendo este PDF antiguo..."
    ],
    detect_generic: [
        "Analizando patrones de texto...",
        "Buscando preguntas en el caos...",
        "Estructurando datos no estructurados...",
        "Mr. Cuarter está aplicando lógica difusa...",
        "Intentando entender tu letra (digital)...",
        "Buscando signos de interrogación..."
    ],
    progress: [
        "¡Casi lo tenemos! Puliendo los píxeles...",
        "La IA está pensando fuerte...",
        "Ordenando las respuestas correctas...",
        "Generando distractores convincentes...",
        "Comprobando la ortografía interdimensional...",
        "Mr. Cuarter está revisando el resultado final..."
    ],
    success: [
        "¡BOOM! ¡Lo tenemos!",
        "¡Misión cumplida! Datos asegurados.",
        "¡Eureka! Tu quiz está listo.",
        "Conversión exitosa al 100%.",
        "¡Listo para el despegue!",
        "¡Victoria! La IA ha triunfado."
    ],
    error: [
        "Vaya, la página web tiene un campo de fuerza anti-IA...",
        "Houston, tenemos un problema con esa URL...",
        "Mis sensores no pueden leer esa web. Está blindada.",
        "¡Error! La web se resiste a ser leída.",
        "Ups, parece que esa web no quiere compartir sus secretos hoy."
    ]
};

export const getRandomMessage = (category: keyof typeof messages): string => {
    const list = messages[category];
    return list[Math.floor(Math.random() * list.length)];
};

export const getDetectionMessage = (filename: string, content: string): string => {
    const lowerName = filename.toLowerCase();
    const lowerContent = content.toLowerCase();

    if (lowerName.includes('kahoot') || lowerContent.includes('kahoot')) return getRandomMessage('detect_kahoot');
    if (lowerName.includes('blooket') || lowerContent.includes('blooket')) return getRandomMessage('detect_blooket');
    if (lowerName.includes('genially') || lowerContent.includes('genially')) return getRandomMessage('detect_genially');
    if (lowerName.endsWith('.pdf')) return getRandomMessage('detect_pdf');
    
    // Check URL patterns if content is short (likely a URL)
    if (content.includes('kahoot.it')) return getRandomMessage('detect_kahoot');
    if (content.includes('blooket.com')) return getRandomMessage('detect_blooket');
    if (content.includes('genial.ly')) return getRandomMessage('detect_genially');
    if (content.includes('gimkit.com')) return getRandomMessage('detect_generic'); // Gimkit logic

    return getRandomMessage('detect_generic');
};
