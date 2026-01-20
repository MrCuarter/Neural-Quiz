
import { Quiz, QUESTION_TYPES } from "../types";

const uuid = () => Math.random().toString(36).substring(2, 9);

export const DEMO_QUIZZES: Quiz[] = [
    {
        id: 'demo-1',
        userId: 'system',
        title: '🧠 Cultura General: Edición Arcade',
        description: '30 preguntas de cine, historia, ciencia y curiosidades. ¿Podrás con todas?',
        tags: ['Demo', 'Trivia', 'Hardcore'],
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: [
            // --- CIENCIA & NATURALEZA ---
            {
                id: uuid(),
                text: "🪐 ¿Cuál es el planeta más grande del sistema solar?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg",
                options: [
                    { id: 'opt1', text: 'Tierra' },
                    { id: 'opt2', text: 'Júpiter' },
                    { id: 'opt3', text: 'Saturno' },
                    { id: 'opt4', text: 'Marte' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🦴 ¿Cuántos huesos tiene el cuerpo humano adulto?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1530210124550-912dc1381cb8?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: '206' },
                    { id: 'opt2', text: '208' },
                    { id: 'opt3', text: '300' },
                    { id: 'opt4', text: '195' }
                ],
                correctOptionId: 'opt1',
                correctOptionIds: ['opt1']
            },
            {
                id: uuid(),
                text: "⚛️ ¿Cuál es el elemento químico con símbolo 'Au'?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                imageUrl: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Plata' },
                    { id: 'opt2', text: 'Aluminio' },
                    { id: 'opt3', text: 'Oro' },
                    { id: 'opt4', text: 'Cobre' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🩸 ¿Cuál es el tipo de sangre considerado donante universal?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'A Positivo' },
                    { id: 'opt2', text: 'O Negativo' },
                    { id: 'opt3', text: 'AB Negativo' },
                    { id: 'opt4', text: 'B Positivo' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "⚡ ¿Qué inventó Thomas Edison?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'La bombilla incandescente' },
                    { id: 'opt2', text: 'El teléfono' },
                    { id: 'opt3', text: 'El automóvil' },
                    { id: 'opt4', text: 'La radio' }
                ],
                correctOptionId: 'opt1',
                correctOptionIds: ['opt1']
            },
            {
                id: uuid(),
                text: "🌡️ ¿A qué temperatura hierve el agua?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: '90°C' },
                    { id: 'opt2', text: '100°C' },
                    { id: 'opt3', text: '110°C' },
                    { id: 'opt4', text: '120°C' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🚀 ¿Quién fue el primer hombre en pisar la Luna?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1541873676-a18131494184?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Yuri Gagarin' },
                    { id: 'opt2', text: 'Buzz Aldrin' },
                    { id: 'opt3', text: 'Neil Armstrong' },
                    { id: 'opt4', text: 'Michael Collins' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },

            // --- ARTE & LITERATURA ---
            {
                id: uuid(),
                text: "🎨 ¿Quién pintó la Mona Lisa?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/402px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg",
                options: [
                    { id: 'opt1', text: 'Vincent van Gogh' },
                    { id: 'opt2', text: 'Pablo Picasso' },
                    { id: 'opt3', text: 'Leonardo da Vinci' },
                    { id: 'opt4', text: 'Claude Monet' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "📚 ¿Quién escribió 'Don Quijote de la Mancha'?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Title_page_first_edition_Don_Quijote.jpg/440px-Title_page_first_edition_Don_Quijote.jpg",
                options: [
                    { id: 'opt1', text: 'Lope de Vega' },
                    { id: 'opt2', text: 'Miguel de Cervantes' },
                    { id: 'opt3', text: 'Gabriel García Márquez' },
                    { id: 'opt4', text: 'Federico García Lorca' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🖌️ ¿Qué artista cortó parte de su propia oreja?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Vincent van Gogh' },
                    { id: 'opt2', text: 'Salvador Dalí' },
                    { id: 'opt3', text: 'Frida Kahlo' },
                    { id: 'opt4', text: 'Andy Warhol' }
                ],
                correctOptionId: 'opt1',
                correctOptionIds: ['opt1']
            },
            {
                id: uuid(),
                text: "🎭 ¿Quién escribió 'Romeo y Julieta'?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Charles Dickens' },
                    { id: 'opt2', text: 'William Shakespeare' },
                    { id: 'opt3', text: 'Jane Austen' },
                    { id: 'opt4', text: 'Mark Twain' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },

            // --- GEOGRAFÍA ---
            {
                id: uuid(),
                text: "🌊 ¿Cuál es el río más largo del mundo?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1572083515797-a720dc207673?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Nilo' },
                    { id: 'opt2', text: 'Amazonas' },
                    { id: 'opt3', text: 'Yangtsé' },
                    { id: 'opt4', text: 'Misisipi' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "👢 ¿Qué país tiene forma de bota?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1529154036614-a60975f5c760?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'España' },
                    { id: 'opt2', text: 'Grecia' },
                    { id: 'opt3', text: 'Italia' },
                    { id: 'opt4', text: 'Portugal' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🇯🇵 ¿Cuál es la capital de Japón?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Seúl' },
                    { id: 'opt2', text: 'Pekín' },
                    { id: 'opt3', text: 'Bangkok' },
                    { id: 'opt4', text: 'Tokio' }
                ],
                correctOptionId: 'opt4',
                correctOptionIds: ['opt4']
            },
            {
                id: uuid(),
                text: "🗻 ¿En qué país se encuentra el Everest?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'India' },
                    { id: 'opt2', text: 'Nepal' },
                    { id: 'opt3', text: 'China' },
                    { id: 'opt4', text: 'Bután' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🇦🇺 ¿Cuál es la capital de Australia?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Sídney' },
                    { id: 'opt2', text: 'Melbourne' },
                    { id: 'opt3', text: 'Canberra' },
                    { id: 'opt4', text: 'Brisbane' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },

            // --- CINE Y CULTURA POP ---
            {
                id: uuid(),
                text: "🌌 ¿En qué película aparece el personaje Darth Vader?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1546561892-65bf811416b9?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Star Trek' },
                    { id: 'opt2', text: 'Star Wars' },
                    { id: 'opt3', text: 'Dune' },
                    { id: 'opt4', text: 'Avatar' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🧙‍♂️ ¿Cómo se llama el mago protagonista de 'El Señor de los Anillos'?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Dumbledore' },
                    { id: 'opt2', text: 'Merlín' },
                    { id: 'opt3', text: 'Gandalf' },
                    { id: 'opt4', text: 'Saruman' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🕸️ ¿Qué superhéroe es conocido como 'El trepamuros'?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                imageUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Batman' },
                    { id: 'opt2', text: 'Spider-Man' },
                    { id: 'opt3', text: 'Superman' },
                    { id: 'opt4', text: 'Flash' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🚢 ¿Cómo se llamaba el barco que se hundió en 1912?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Titanic' },
                    { id: 'opt2', text: 'Olympic' },
                    { id: 'opt3', text: 'Britannic' },
                    { id: 'opt4', text: 'Lusitania' }
                ],
                correctOptionId: 'opt1',
                correctOptionIds: ['opt1']
            },
            {
                id: uuid(),
                text: "🦁 ¿Cómo se llama el rey de la selva en 'El Rey León'?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Scar' },
                    { id: 'opt2', text: 'Simba' },
                    { id: 'opt3', text: 'Mufasa' },
                    { id: 'opt4', text: 'Timón' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },

            // --- DEPORTES & JUEGOS ---
            {
                id: uuid(),
                text: "⚽ ¿Qué país ganó el mundial de fútbol de 2010?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Brasil' },
                    { id: 'opt2', text: 'Alemania' },
                    { id: 'opt3', text: 'España' },
                    { id: 'opt4', text: 'Argentina' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "♟️ ¿Qué pieza de ajedrez se mueve en 'L'?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1586165368502-1bad197a6461?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Alfil' },
                    { id: 'opt2', text: 'Torre' },
                    { id: 'opt3', text: 'Caballo' },
                    { id: 'opt4', text: 'Rey' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🎾 ¿En qué deporte destaca Rafa Nadal?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Fútbol' },
                    { id: 'opt2', text: 'Baloncesto' },
                    { id: 'opt3', text: 'Tenis' },
                    { id: 'opt4', text: 'Golf' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },

            // --- VARIOS ---
            {
                id: uuid(),
                text: "🍅 Verdadero o Falso: Los tomates son una fruta.",
                questionType: QUESTION_TYPES.TRUE_FALSE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Verdadero' },
                    { id: 'opt2', text: 'Falso' }
                ],
                correctOptionId: 'opt1',
                correctOptionIds: ['opt1']
            },
            {
                id: uuid(),
                text: "🕰️ ¿Cuántos segundos hay en una hora?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 25,
                options: [
                    { id: 'opt1', text: '360' },
                    { id: 'opt2', text: '3600' },
                    { id: 'opt3', text: '6000' },
                    { id: 'opt4', text: '1200' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🎹 ¿Cuántas teclas tiene un piano estándar?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: '66' },
                    { id: 'opt2', text: '88' },
                    { id: 'opt3', text: '100' },
                    { id: 'opt4', text: '72' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🍎 ¿Qué fruta cayó sobre la cabeza de Isaac Newton?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Una pera' },
                    { id: 'opt2', text: 'Una manzana' },
                    { id: 'opt3', text: 'Una naranja' },
                    { id: 'opt4', text: 'Un coco' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🎸 ¿Quién es conocido como el 'Rey del Rock'?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Freddie Mercury' },
                    { id: 'opt2', text: 'Michael Jackson' },
                    { id: 'opt3', text: 'Elvis Presley' },
                    { id: 'opt4', text: 'John Lennon' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            }
        ]
    },
    {
        id: 'demo-2',
        userId: 'system',
        title: '🎓 Pequeños Genios (Primaria)',
        description: 'Matemáticas, ciencias y geografía para las mentes más brillantes del futuro.',
        tags: ['Demo', 'Educación', 'Niños'],
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: [
            // --- MATEMÁTICAS ---
            {
                id: uuid(),
                text: "➗ ¿Cuánto es 7 x 8?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 30,
                options: [
                    { id: 'opt1', text: '54' },
                    { id: 'opt2', text: '56' },
                    { id: 'opt3', text: '48' },
                    { id: 'opt4', text: '64' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "➕ ¿Cuánto es 15 + 25?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 25,
                options: [
                    { id: 'opt1', text: '30' },
                    { id: 'opt2', text: '35' },
                    { id: 'opt3', text: '40' },
                    { id: 'opt4', text: '45' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🔺 ¿Cómo se llama el polígono de 5 lados?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Cuadrado' },
                    { id: 'opt2', text: 'Hexágono' },
                    { id: 'opt3', text: 'Pentágono' },
                    { id: 'opt4', text: 'Triángulo' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🕒 ¿Cuántos minutos hay en media hora?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: '15' },
                    { id: 'opt2', text: '30' },
                    { id: 'opt3', text: '45' },
                    { id: 'opt4', text: '60' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🔢 ¿Qué número sigue la serie: 2, 4, 6, 8, ...?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: '9' },
                    { id: 'opt2', text: '10' },
                    { id: 'opt3', text: '11' },
                    { id: 'opt4', text: '12' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },

            // --- CIENCIAS ---
            {
                id: uuid(),
                text: "🧊 ¿Cuál es el estado del agua cuando se congela?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Líquido' },
                    { id: 'opt2', text: 'Gaseoso' },
                    { id: 'opt3', text: 'Sólido' },
                    { id: 'opt4', text: 'Plasma' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🌍 ¿Qué planeta es conocido como el Planeta Azul?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/600px-The_Earth_seen_from_Apollo_17.jpg",
                options: [
                    { id: 'opt1', text: 'Marte' },
                    { id: 'opt2', text: 'Tierra' },
                    { id: 'opt3', text: 'Venus' },
                    { id: 'opt4', text: 'Neptuno' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "☀️ ¿Por dónde sale el Sol?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Norte' },
                    { id: 'opt2', text: 'Sur' },
                    { id: 'opt3', text: 'Este' },
                    { id: 'opt4', text: 'Oeste' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🌱 ¿Qué necesitan las plantas para hacer la fotosíntesis?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 25,
                imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Luz solar y agua' },
                    { id: 'opt2', text: 'Pizza y refresco' },
                    { id: 'opt3', text: 'Oscuridad' },
                    { id: 'opt4', text: 'Solo tierra' }
                ],
                correctOptionId: 'opt1',
                correctOptionIds: ['opt1']
            },
            {
                id: uuid(),
                text: "🌡️ ¿Qué instrumento usamos para medir la temperatura?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Barómetro' },
                    { id: 'opt2', text: 'Termómetro' },
                    { id: 'opt3', text: 'Regla' },
                    { id: 'opt4', text: 'Cronómetro' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },

            // --- ANIMALES (Básico) ---
            {
                id: uuid(),
                text: "🐋 ¿Qué animal es un mamífero?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1568430462989-44163eb1752f?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Tiburón' },
                    { id: 'opt2', text: 'Cocodrilo' },
                    { id: 'opt3', text: 'Ballena' },
                    { id: 'opt4', text: 'Águila' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🐸 ¿Qué animal es un anfibio?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Perro' },
                    { id: 'opt2', text: 'Gato' },
                    { id: 'opt3', text: 'Rana' },
                    { id: 'opt4', text: 'León' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🥚 ¿Qué animal pone huevos?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Vaca' },
                    { id: 'opt2', text: 'Gallina' },
                    { id: 'opt3', text: 'Gato' },
                    { id: 'opt4', text: 'Perro' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },

            // --- GEOGRAFÍA & CULTURA ---
            {
                id: uuid(),
                text: "🗼 ¿En qué ciudad está la Torre Eiffel?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce7859?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Londres' },
                    { id: 'opt2', text: 'Madrid' },
                    { id: 'opt3', text: 'París' },
                    { id: 'opt4', text: 'Roma' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🇪🇸 ¿Cuál es la capital de España?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Barcelona' },
                    { id: 'opt2', text: 'Sevilla' },
                    { id: 'opt3', text: 'Madrid' },
                    { id: 'opt4', text: 'Valencia' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🌊 ¿Qué es más grande, un océano o un mar?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Un océano' },
                    { id: 'opt2', text: 'Un mar' },
                    { id: 'opt3', text: 'Son iguales' },
                    { id: 'opt4', text: 'Un lago' }
                ],
                correctOptionId: 'opt1',
                correctOptionIds: ['opt1']
            },

            // --- LENGUAJE ---
            {
                id: uuid(),
                text: "📝 ¿Cuál es el antónimo de 'Rápido'?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Veloz' },
                    { id: 'opt2', text: 'Lento' },
                    { id: 'opt3', text: 'Fuerte' },
                    { id: 'opt4', text: 'Alto' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🔤 ¿Cuántas letras tiene el abecedario español?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: '25' },
                    { id: 'opt2', text: '26' },
                    { id: 'opt3', text: '27' },
                    { id: 'opt4', text: '30' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🗣️ ¿Qué idioma se habla en Brasil?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Español' },
                    { id: 'opt2', text: 'Portugués' },
                    { id: 'opt3', text: 'Inglés' },
                    { id: 'opt4', text: 'Francés' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },

            // --- COLORES & FORMAS ---
            {
                id: uuid(),
                text: "🌈 ¿Cuántos colores tiene el arcoíris?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                imageUrl: "https://images.unsplash.com/photo-1508614999368-9260051292e5?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: '5' },
                    { id: 'opt2', text: '6' },
                    { id: 'opt3', text: '7' },
                    { id: 'opt4', text: '8' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🟣 ¿Qué color obtienes si mezclas rojo y azul?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Verde' },
                    { id: 'opt2', text: 'Naranja' },
                    { id: 'opt3', text: 'Morado' },
                    { id: 'opt4', text: 'Marrón' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "⚽ ¿Qué forma tiene un balón de fútbol?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Cubo' },
                    { id: 'opt2', text: 'Esfera' },
                    { id: 'opt3', text: 'Pirámide' },
                    { id: 'opt4', text: 'Cilindro' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },

            // --- VARIOS ---
            {
                id: uuid(),
                text: "📅 ¿Cuántos días tiene una semana?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: '5' },
                    { id: 'opt2', text: '6' },
                    { id: 'opt3', text: '7' },
                    { id: 'opt4', text: '10' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "👃 ¿Qué sentido usamos para oler?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Vista' },
                    { id: 'opt2', text: 'Olfato' },
                    { id: 'opt3', text: 'Gusto' },
                    { id: 'opt4', text: 'Tacto' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🏫 ¿Quién trabaja en un colegio enseñando a los niños?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Médico' },
                    { id: 'opt2', text: 'Bombero' },
                    { id: 'opt3', text: 'Profesor' },
                    { id: 'opt4', text: 'Policía' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🚗 ¿Cuántas ruedas tiene un coche normal?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: '2' },
                    { id: 'opt2', text: '3' },
                    { id: 'opt3', text: '4' },
                    { id: 'opt4', text: '6' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🎅 ¿Quién trae regalos en Navidad?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Papá Noel' },
                    { id: 'opt2', text: 'El Ratón Pérez' },
                    { id: 'opt3', text: 'El Conejo de Pascua' },
                    { id: 'opt4', text: 'Batman' }
                ],
                correctOptionId: 'opt1',
                correctOptionIds: ['opt1']
            },
            {
                id: uuid(),
                text: "🍎 ¿Qué fruta es roja por fuera y blanca por dentro?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Plátano' },
                    { id: 'opt2', text: 'Manzana' },
                    { id: 'opt3', text: 'Naranja' },
                    { id: 'opt4', text: 'Kiwi' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🎸 ¿Qué instrumento tiene cuerdas?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Trompeta' },
                    { id: 'opt2', text: 'Tambor' },
                    { id: 'opt3', text: 'Guitarra' },
                    { id: 'opt4', text: 'Flauta' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            }
        ]
    },
    {
        id: 'demo-3',
        userId: 'system',
        title: '🦁 Mundo Salvaje: Bestias y Récords',
        description: 'Sonidos, hábitats y récords del reino animal. ¡Grrrr!',
        tags: ['Demo', 'Naturaleza', 'Animales'],
        createdAt: new Date(),
        updatedAt: new Date(),
        questions: [
            // --- RÉCORDS ANIMALES ---
            {
                id: uuid(),
                text: "🐆 ¿Cuál es el animal terrestre más rápido?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1535591273668-578e31182c4f?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'León' },
                    { id: 'opt2', text: 'Guepardo' },
                    { id: 'opt3', text: 'Gacela' },
                    { id: 'opt4', text: 'Caballo' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🐋 ¿Cuál es el animal más grande del mundo?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg",
                options: [
                    { id: 'opt1', text: 'Elefante Africano' },
                    { id: 'opt2', text: 'Ballena Azul' },
                    { id: 'opt3', text: 'Tiburón Ballena' },
                    { id: 'opt4', text: 'Calamar Gigante' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🦒 ¿Cuál es el animal más alto?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1547721064-da6cfb341d50?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Elefante' },
                    { id: 'opt2', text: 'Jirafa' },
                    { id: 'opt3', text: 'Avestruz' },
                    { id: 'opt4', text: 'Oso Polar' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🦅 ¿Qué ave puede volar hacia atrás?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1550948537-130a1ce83314?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Águila' },
                    { id: 'opt2', text: 'Colibrí' },
                    { id: 'opt3', text: 'Loro' },
                    { id: 'opt4', text: 'Búho' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },

            // --- CARACTERÍSTICAS ---
            {
                id: uuid(),
                text: "🕷️ ¿Cuántas patas tiene una araña?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: '6' },
                    { id: 'opt2', text: '8' },
                    { id: 'opt3', text: '10' },
                    { id: 'opt4', text: '12' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🐙 ¿Cuántos corazones tiene un pulpo?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: '1' },
                    { id: 'opt2', text: '2' },
                    { id: 'opt3', text: '3' },
                    { id: 'opt4', text: '4' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🦓 ¿De qué color es la piel de la cebra (bajo el pelo)?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Blanca' },
                    { id: 'opt2', text: 'Negra' },
                    { id: 'opt3', text: 'Rayada' },
                    { id: 'opt4', text: 'Rosa' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🦇 ¿Cuál es el único mamífero capaz de volar?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Ardilla voladora' },
                    { id: 'opt2', text: 'Murciélago' },
                    { id: 'opt3', text: 'Lemur' },
                    { id: 'opt4', text: 'Ornitorrinco' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },

            // --- HÁBITATS & DIETA ---
            {
                id: uuid(),
                text: "🐼 ¿Qué come principalmente un oso panda?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1564349683136-772650dcae31?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Pescado' },
                    { id: 'opt2', text: 'Bambú' },
                    { id: 'opt3', text: 'Carne' },
                    { id: 'opt4', text: 'Fruta' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "❄️ ¿Dónde viven los pingüinos salvajes?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Polo Norte' },
                    { id: 'opt2', text: 'Hemisferio Sur' },
                    { id: 'opt3', text: 'Desierto del Sahara' },
                    { id: 'opt4', text: 'Selva Amazónica' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🐪 ¿Dónde almacenan agua los camellos?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'En la joroba' },
                    { id: 'opt2', text: 'En el estómago' },
                    { id: 'opt3', text: 'En las patas' },
                    { id: 'opt4', text: 'No almacenan agua, es grasa' }
                ],
                correctOptionId: 'opt4',
                correctOptionIds: ['opt4']
            },
            {
                id: uuid(),
                text: "🐨 ¿Qué animal duerme hasta 22 horas al día?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Perezoso' },
                    { id: 'opt2', text: 'Koala' },
                    { id: 'opt3', text: 'Gato' },
                    { id: 'opt4', text: 'León' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },

            // --- CURIOSIDADES ---
            {
                id: uuid(),
                text: "👑 ¿Qué animal es conocido como el 'Rey de la Selva'?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                imageUrl: "https://images.unsplash.com/photo-1517649281203-dad836b4add6?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Elefante' },
                    { id: 'opt2', text: 'Tigre' },
                    { id: 'opt3', text: 'León' },
                    { id: 'opt4', text: 'Gorila' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🐕 ¿Cuál es el mejor amigo del hombre?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Gato' },
                    { id: 'opt2', text: 'Perro' },
                    { id: 'opt3', text: 'Caballo' },
                    { id: 'opt4', text: 'Hámster' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🦋 ¿Cómo se llama el proceso de cambio de una oruga a mariposa?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1457195740896-7f345efef228?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Metamorfosis' },
                    { id: 'opt2', text: 'Evolución' },
                    { id: 'opt3', text: 'Hibernación' },
                    { id: 'opt4', text: 'Fotosíntesis' }
                ],
                correctOptionId: 'opt1',
                correctOptionIds: ['opt1']
            },
            {
                id: uuid(),
                text: "🦈 ¿Los tiburones tienen huesos?",
                questionType: QUESTION_TYPES.TRUE_FALSE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Verdadero' },
                    { id: 'opt2', text: 'Falso (Tienen cartílago)' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🦘 ¿Qué animal lleva a sus crías en una bolsa?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                imageUrl: "https://images.unsplash.com/photo-1528036239909-668972e61a5f?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Canguro' },
                    { id: 'opt2', text: 'Koala' },
                    { id: 'opt3', text: 'Wombat' },
                    { id: 'opt4', text: 'Todos los anteriores' }
                ],
                correctOptionId: 'opt4',
                correctOptionIds: ['opt4']
            },
            {
                id: uuid(),
                text: "🐝 ¿Qué insecto produce miel?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Avispa' },
                    { id: 'opt2', text: 'Abeja' },
                    { id: 'opt3', text: 'Hormiga' },
                    { id: 'opt4', text: 'Mosca' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🦎 ¿Qué animal puede cambiar de color?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1555675685-6e4b9f2373f0?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Iguana' },
                    { id: 'opt2', text: 'Camaleón' },
                    { id: 'opt3', text: 'Gecko' },
                    { id: 'opt4', text: 'Serpiente' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🐘 ¿Cuál es la característica más distintiva del elefante?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Su cola' },
                    { id: 'opt2', text: 'Su trompa' },
                    { id: 'opt3', text: 'Sus garras' },
                    { id: 'opt4', text: 'Su melena' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🦉 ¿Qué animal es símbolo de sabiduría?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Águila' },
                    { id: 'opt2', text: 'Búho' },
                    { id: 'opt3', text: 'Cuervo' },
                    { id: 'opt4', text: 'Loro' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🐬 ¿Los delfines son peces?",
                questionType: QUESTION_TYPES.TRUE_FALSE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Verdadero' },
                    { id: 'opt2', text: 'Falso (Son mamíferos)' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🐒 ¿Cuál es el primate más grande?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                imageUrl: "https://images.unsplash.com/photo-1544977936-a23232694776?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Chimpancé' },
                    { id: 'opt2', text: 'Orangután' },
                    { id: 'opt3', text: 'Gorila' },
                    { id: 'opt4', text: 'Mandril' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🐍 ¿Qué serpiente es famosa por su cascabel?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'Cobra' },
                    { id: 'opt2', text: 'Pitón' },
                    { id: 'opt3', text: 'Boa' },
                    { id: 'opt4', text: 'Serpiente de cascabel' }
                ],
                correctOptionId: 'opt4',
                correctOptionIds: ['opt4']
            },
            {
                id: uuid(),
                text: "🐢 ¿Qué animal lleva su casa a cuestas?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Cangrejo' },
                    { id: 'opt2', text: 'Tortuga' },
                    { id: 'opt3', text: 'Caracol' },
                    { id: 'opt4', text: 'Todas las anteriores' }
                ],
                correctOptionId: 'opt4',
                correctOptionIds: ['opt4']
            },
            {
                id: uuid(),
                text: "🦞 ¿Cuántas pinzas tiene un cangrejo típicamente?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: '1' },
                    { id: 'opt2', text: '2' },
                    { id: 'opt3', text: '4' },
                    { id: 'opt4', text: '6' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🦩 ¿De qué color son los flamencos?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                imageUrl: "https://images.unsplash.com/photo-1516666993297-393273e04746?auto=format&fit=crop&w=800&q=80",
                options: [
                    { id: 'opt1', text: 'Blanco' },
                    { id: 'opt2', text: 'Azul' },
                    { id: 'opt3', text: 'Rosa' },
                    { id: 'opt4', text: 'Verde' }
                ],
                correctOptionId: 'opt3',
                correctOptionIds: ['opt3']
            },
            {
                id: uuid(),
                text: "🐠 ¿Dónde vive Nemo?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'En una piña' },
                    { id: 'opt2', text: 'En una anémona' },
                    { id: 'opt3', text: 'En una cueva' },
                    { id: 'opt4', text: 'En la arena' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🐄 ¿Qué animal nos da leche?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 15,
                options: [
                    { id: 'opt1', text: 'Cerdo' },
                    { id: 'opt2', text: 'Vaca' },
                    { id: 'opt3', text: 'Pollo' },
                    { id: 'opt4', text: 'Caballo' }
                ],
                correctOptionId: 'opt2',
                correctOptionIds: ['opt2']
            },
            {
                id: uuid(),
                text: "🐎 ¿Cómo duermen los caballos?",
                questionType: QUESTION_TYPES.MULTIPLE_CHOICE,
                timeLimit: 20,
                options: [
                    { id: 'opt1', text: 'De pie' },
                    { id: 'opt2', text: 'Boca arriba' },
                    { id: 'opt3', text: 'Colgados' },
                    { id: 'opt4', text: 'No duermen' }
                ],
                correctOptionId: 'opt1',
                correctOptionIds: ['opt1']
            }
        ]
    }
];
