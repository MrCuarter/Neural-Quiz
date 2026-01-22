
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
    generate_ai: [
        "Metiendo el CD de Encarta 97...",
        "Soplando el cartucho de la Game Boy...",
        "Consultando en la Larousse de mi abuela...",
        "Contrastando datos con la enciclopedia Espasa...",
        "Buscando en Forocoches fuentes científicas... ❌ Fuentes no encontradas.",
        "Conectando al Messenger... Enviando zumbido.",
        "Rebobinando el cassette con un boli BIC...",
        "Esperando a que mi madre cuelgue el teléfono para usar Internet...",
        "Consultando el Teletexto página 100...",
        "Bajando datos del eMule... (Quedan 27 días).",
        "Buscando en Yahoo Respuestas la verdad absoluta...",
        "Consultando en Reddit aportaciones a la humanidad... ❌ No encontradas.",
        "Viendo tutoriales en YouTube a 2x de velocidad...",
        "Buscando en Reels de Instagram... ❌ Acabo de perder el tiempo.",
        "Creando usuario en TikTok para encontrar respuestas...",
        "Preguntando a ChatGPT si soy real...",
        "Hackeando la NASA (es broma, solo leo la Wikipedia)...",
        "Desfragmentando el disco duro...",
        "Limpiando la bola del ratón...",
        "Cargando el buffer de conocimiento...",
        "Esperando a que cargue el vídeo en RealPlayer...",
        "Enviando SMS al 5555 con la palabra QUIZ...",
        "Comprobando si Tuenti sigue activo...",
        "Haciendo una perdida para que me llamen con la respuesta...",
        "Buscando el clip de Office para que me ayude...",
        "Instalando barra de herramientas de Softonic...",
        "Quemando un CD con las respuestas...",
        "Sintonizando Canal+ codificado...",
        "Cambiando el tono polifónico del servidor...",
        "Jugando a la serpiente mientras espero...",
        "Poniendo celo en la cinta VHS para grabar encima...",
        "Consultando al Oráculo de Delfos (versión beta)...",
        "Leyendo los términos y condiciones (es broma, nadie lo hace)...",
        "Calculando la masa del Sol con un ábaco...",
        "Traduciendo jeroglíficos con Google Lens...",
        "Buscando cobertura 3G...",
        "Enviando un fax a las oficinas de Google...",
        "Revelando el carrete de fotos...",
        "Revisando la carpeta de SPAM de mi mente...",
        "Actualizando Adobe Flash Player...",
        "Cerrando ventanas emergentes del IE6...",
        "Buscando drivers en un disquete...",
        "Esperando a que el logo del DVD toque la esquina...",
        "Haciendo scroll infinito...",
        "Consultando la Bola Mágica 8...",
        "Descifrando el código Da Vinci...",
        "Buscando a Wally en la base de datos...",
        "Compilando memes de gatos...",
        "Generando excusas por si fallo...",
        "Alineando los chakras del procesador...",
        "Tomando un café virtual...",
        "Consultando el horóscopo del servidor...",
        "Ajustando el condensador de fluzo...",
        "Viajando a 88 millas por hora...",
        "Recitando el código binario al revés...",
        "Contando ovejas eléctricas...",
        "Debatiendo con una IA sobre el sentido de la vida...",
        "Buscando la tecla 'Any'...",
        "Reiniciando el router (solución universal)...",
        "Llamando al soporte técnico... me han puesto música de espera.",
        "Escribiendo en la máquina de escribir invisible...",
        "Enviando señales de humo a la nube...",
        "Consultando la Guía del Autoestopista Galáctico...",
        "Buscando el botón de 'Turbo' del PC...",
        "Haciendo Ctrl+Alt+Supr a la realidad...",
        "Imprimiendo en matricial... Rrrrt Rrrrt...",
        "Cargando texturas en baja resolución...",
        "Renderizando polígonos...",
        "Esperando el lag...",
        "Haciendo ping a Marte...",
        "Consultando la Wikipedia en modo incógnito...",
        "Robando WiFi del vecino para ir más rápido...",
        "Usando Internet Explorer... esto va para largo.",
        "Descargando más memoria RAM...",
        "Minando bitcoins en segundo plano (es broma)...",
        "Buscando la receta de la Cangreburger...",
        "Entrenando a la red neuronal con gatitos...",
        "Filtrando Fake News...",
        "Aplicando filtros de Instagram a los datos...",
        "Haciendo un baile de TikTok para invocar datos...",
        "Escribiendo código con los pies...",
        "Leyendo el manual de instrucciones (¡por fin!)...",
        "Resolviendo un cubo de Rubik mental...",
        "Buscando la salida del laberinto...",
        "Recogiendo monedas de Mario...",
        "Evitando caparazones azules...",
        "Esperando a que la tostada caiga del lado de la mantequilla...",
        "Buscando tréboles de cuatro hojas...",
        "Cruzando los dedos digitales...",
        "Rezando a los dioses del silicio...",
        "Sobornando a la CPU con electricidad extra...",
        "Negociando con los bits...",
        "Organizando los 0 y los 1...",
        "Limpiando el caché con lejía...",
        "Asegurando los cables con cinta aislante...",
        "Golpeando el monitor a ver si arregla algo...",
        "Soplando en el puerto USB..."
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
    detect_image: [
        "Activando córtex visual...",
        "Leyendo píxeles como si fueran letras...",
        "Descifrando jeroglíficos en la imagen...",
        "Aplicando OCR cuántico...",
        "¿Es eso una mancha de café o un acento?",
        "Extrayendo texto de la captura..."
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

export const getRandomMessage = (category: keyof typeof messages, lang?: string): string => {
    const list = messages[category];
    return list[Math.floor(Math.random() * list.length)];
};

export const getDetectionMessage = (filename: string, content: string, lang?: string): string => {
    const lowerName = filename.toLowerCase();
    const lowerContent = content.toLowerCase();

    // Image detection
    if (lowerName.match(/\.(png|jpg|jpeg|webp)$/)) return getRandomMessage('detect_image', lang);

    if (lowerName.includes('kahoot') || lowerContent.includes('kahoot')) return getRandomMessage('detect_kahoot', lang);
    if (lowerName.includes('blooket') || lowerContent.includes('blooket')) return getRandomMessage('detect_blooket', lang);
    if (lowerName.includes('genially') || lowerContent.includes('genially')) return getRandomMessage('detect_genially', lang);
    if (lowerName.endsWith('.pdf')) return getRandomMessage('detect_pdf', lang);
    
    // Check URL patterns if content is short (likely a URL)
    if (content.includes('kahoot.it')) return getRandomMessage('detect_kahoot', lang);
    if (content.includes('blooket.com')) return getRandomMessage('detect_blooket', lang);
    if (content.includes('genial.ly')) return getRandomMessage('detect_genially', lang);
    if (content.includes('gimkit.com')) return getRandomMessage('detect_generic', lang); // Gimkit logic

    return getRandomMessage('detect_generic', lang);
};
