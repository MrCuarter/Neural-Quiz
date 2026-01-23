
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
        // RETRO TECH & NOSTALGIA
        "Metiendo el CD de Encarta 97...",
        "Soplando el cartucho de la Game Boy...",
        "Consultando en la Larousse de mi abuela...",
        "Rebobinando el cassette con un boli BIC...",
        "Esperando a que mi madre cuelgue el teléfono para usar Internet...",
        "Conectando al Messenger... Enviando zumbido...",
        "Bajando datos del eMule... (Quedan 27 días)...",
        "Limpiando la bola del ratón...",
        "Sintonizando el Canal+ codificado...",
        "Cerrando ventanas emergentes del Internet Explorer 6...",
        "Buscando drivers en un disquete de 3½...",
        "Actualizando la definición de virus de Avast...",
        "Esperando a que el logo del DVD toque la esquina exacta...",
        "Poniendo celo en la cinta VHS para grabar encima...",
        "Comprobando si Tuenti sigue activo...",
        "Enviando un SMS al 5555 con la palabra QUIZ...",
        "Haciendo una perdida para que me llamen con la respuesta...",
        "Buscando el clip de Office (Clippy) para que me ayude...",
        "Instalando barra de herramientas de Softonic...",
        "Quemando un CD Verbatim con las respuestas...",
        "Cambiando el tono polifónico del servidor...",
        "Jugando a la serpiente del Nokia mientras espero...",
        "Buscando cobertura 3G...",
        "Revelando el carrete de fotos de 24 exposiciones...",
        "Revisando el Teletexto página 100...",
        "Desfragmentando el disco duro (esto va para largo)...",
        
        // INTERNET CULTURE & FORUMS
        "Buscando datos científicos en Forocoches... ❌ Error: Solo hay encuestas de fiabilidad.",
        "Analizando Reddit... ❌ Imposible. No hay solidez científica.",
        "Buscando en Yahoo Respuestas la verdad absoluta...",
        "Consultando el Rincón del Vago...",
        "Preguntando en un foro de 2004 si alguien tiene la respuesta...",
        "Discutiendo con un bot en Twitter...",
        "Buscando preguntas en Reels de TikTok... ¡Mira qué perrete!",
        "Viendo un tutorial indio en YouTube a 2x de velocidad...",
        "Creando un hilo en Twitter para pedir ayuda...",
        "Buscando la respuesta en la página 2 de Google (zona oscura)...",
        "Intentando descargar más memoria RAM...",
        "Minando bitcoins en segundo plano (es broma, ¿o no?)...",
        "Filtrando Fake News de WhatsApp...",
        "Haciendo un baile de TikTok para invocar a la sabiduría...",
        "Leyendo los términos y condiciones (es broma, nadie lo hace)...",
        
        // ABSURD & LAZY AI
        "Tomando un café virtual... Un momento...",
        "La IA está procrastinando... Dame un segundo.",
        "Consultando la Bola Mágica 8...",
        "Tirando los dados de rol (D20) para calcular la dificultad...",
        "Alineando los chakras del procesador...",
        "Consultando el horóscopo del servidor...",
        "Preguntando a ChatGPT si soy real...",
        "Hackeando la NASA (es broma, solo leo Wikipedia)...",
        "Escribiendo código con los pies...",
        "Resolviendo un cubo de Rubik mental...",
        "Contando ovejas eléctricas...",
        "Debatiendo con una tostadora sobre el sentido de la vida...",
        "Buscando la tecla 'Any' en el teclado...",
        "Reiniciando el router (la solución universal)...",
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
        "Buscando la receta de la Cangreburger...",
        "Entrenando a la red neuronal con vídeos de gatitos...",
        "Aplicando filtros de Instagram a los datos...",
        "Sobornando a la CPU con electricidad extra...",
        "Negociando con los bits...",
        "Organizando los 0 y los 1...",
        "Limpiando el caché con lejía...",
        "Asegurando los cables con cinta aislante...",
        "Golpeando el monitor a ver si arregla algo...",
        "Soplando en el puerto USB...",
        "Generando excusas por si fallo...",
        "Contrastando datos con la enciclopedia Espasa...",
        "Buscando en el tomo P de la Larousse...",
        
        // POP CULTURE
        "Recitando el código binario al revés...",
        "Viajando a 88 millas por hora...",
        "Buscando a Wally en la base de datos...",
        "Descifrando el código Da Vinci...",
        "Usando la Fuerza para encontrar preguntas...",
        "Esperando a mi carta de Hogwarts...",
        "Lanzando un dado de 20 caras... ¡Crítico!",
        "Evitando caparazones azules...",
        "Recogiendo monedas de Mario...",
        "Buscando la salida del laberinto del Minotauro...",
        "Preguntando a Siri, pero no me contesta...",
        "Esperando a que Gandalf llegue al amanecer del quinto día...",
        "Abriendo la caja de Pandora (con cuidado)...",
        "Siguiendo al conejo blanco...",
        "Tomando la pastilla roja...",
        "Cargando Matrix...",
        "Esquivando balas en cámara lenta...",
        "Buscando el Anillo Único...",
        "Invocando a Shen Long...",
        "Reuniendo las Bolas de Dragón...",
        "Esperando a que Oliver y Benji lleguen a la portería..."
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
