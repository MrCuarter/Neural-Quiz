
import React from 'react';
import { CyberButton, CyberCard } from './ui/CyberUI';
import { ArrowLeft, Shield, Lock, BrainCircuit } from 'lucide-react';

interface PrivacyViewProps {
  onBack: () => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-10 duration-500 pb-20">
      <CyberButton variant="ghost" onClick={onBack} className="pl-0 gap-2">
        <ArrowLeft className="w-4 h-4" /> VOLVER
      </CyberButton>

      <div className="text-center space-y-4">
        <div className="flex justify-center">
            <div className="p-4 rounded-full bg-cyan-950/30 border border-cyan-500/50">
                <Shield className="w-12 h-12 text-cyan-400" />
            </div>
        </div>
        <h2 className="text-3xl md:text-4xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">
          POLÍTICA DE PRIVACIDAD
        </h2>
        <p className="text-gray-400 font-mono text-sm">Última actualización: {new Date().toLocaleDateString()}</p>
      </div>

      <CyberCard className="bg-black/60 border-gray-800 text-gray-300 space-y-6 font-mono text-sm leading-relaxed">
        
        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-cyan-400 font-bold mb-2 font-cyber">1. Introducción</h3>
            <p>
              <strong>Neural Quiz Converter</strong> (en adelante, “la Aplicación”) es una herramienta web desarrollada por <strong>Norberto Cuartero</strong> destinada a ayudar a docentes y formadores a generar, convertir y exportar cuestionarios educativos mediante el uso de Inteligencia Artificial y formatos universales.
            </p>
            <p className="mt-2">
              La protección de su privacidad es una prioridad. A continuación, detallamos de forma transparente cómo se gestiona la información.
            </p>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-cyan-400 font-bold mb-2 font-cyber">2. Datos que recopilamos y uso</h3>
            <p>La Aplicación accede exclusivamente a los datos necesarios para ejecutar las funciones solicitadas.</p>
            
            <ul className="list-disc pl-5 mt-3 space-y-3">
                <li>
                    <strong>Procesamiento de Texto e Inteligencia Artificial (Google Gemini API):</strong>
                    <p className="text-xs text-gray-400 mt-1">
                       Uso: Envío de los temas, textos o URLs proporcionados por el usuario a la API de Google Gemini.<br/>
                       Finalidad: Generación automática de preguntas y respuestas o análisis de documentos.<br/>
                       Almacenamiento: No guardamos sus prompts ni resultados en servidores propios. La interacción es efímera durante la sesión.
                    </p>
                </li>
                <li>
                    <strong>Almacenamiento Local (Local Storage):</strong>
                    <p className="text-xs text-gray-400 mt-1">
                       Uso: Guardado temporal del cuestionario en curso en el navegador del usuario.<br/>
                       Finalidad: Evitar la pérdida de datos si se recarga la página. Estos datos permanecen en su dispositivo.
                    </p>
                </li>
                <li>
                    <strong>Integración con Google (Google Forms / Drive):</strong>
                    <p className="text-xs text-gray-400 mt-1">
                       Uso: (Funcionalidad bajo demanda) Creación de formularios en su cuenta de Google.<br/>
                       Finalidad: Exportar el cuestionario generado directamente a Google Forms.<br/>
                       Permisos: Se solicitará acceso específico y limitado para "ver y administrar" sus formularios y archivos relacionados durante la exportación.
                    </p>
                </li>
            </ul>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-cyan-400 font-bold mb-2 font-cyber">3. Compartición de datos</h3>
            <p>
              La Aplicación <strong>no comparte, vende ni transfiere</strong> información personal ni el contenido de sus cuestionarios a terceros con fines comerciales.
            </p>
            <p className="mt-2">
              Los datos se comparten estrictamente con <strong>Google Gemini API</strong> para el procesamiento del lenguaje natural necesario para la generación del contenido, sujeto a las políticas de privacidad de Google.
            </p>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-cyan-400 font-bold mb-2 font-cyber">4. Divulgación de uso limitado</h3>
            <p>
              El uso que realiza Neural Quiz Converter de la información obtenida a través de las API de Google cumple estrictamente con la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" className="text-pink-400 hover:underline">Política de datos de usuario de los servicios de API de Google</a>, incluidos los requisitos de Uso Limitado (Limited Use).
            </p>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-cyan-400 font-bold mb-2 font-cyber">5. Seguridad de los datos</h3>
            <p>
              La Aplicación opera principalmente en el lado del cliente (su navegador). Las comunicaciones con servicios externos (IA) se realizan mediante protocolos seguros (HTTPS). No mantenemos bases de datos de usuarios ni contraseñas.
            </p>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-cyan-400 font-bold mb-2 font-cyber">6. Cambios en esta política</h3>
            <p>
              Esta Política de Privacidad podrá actualizarse ocasionalmente. Cualquier modificación sustancial será publicada en esta misma página.
            </p>
        </div>

        <div>
            <h3 className="text-xl text-cyan-400 font-bold mb-2 font-cyber">7. Contacto</h3>
            <p>Para cualquier consulta relacionada con esta Política de Privacidad:</p>
            <p className="mt-2 text-pink-400 font-bold">Correo electrónico: n.cuartero.10@gmail.com</p>
        </div>

      </CyberCard>
    </div>
  );
};
