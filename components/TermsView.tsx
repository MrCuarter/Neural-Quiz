
import React from 'react';
import { CyberButton, CyberCard } from './ui/CyberUI';
import { ArrowLeft, Scale, FileSignature } from 'lucide-react';

interface TermsViewProps {
  onBack: () => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-10 duration-500 pb-20">
      <CyberButton variant="ghost" onClick={onBack} className="pl-0 gap-2">
        <ArrowLeft className="w-4 h-4" /> VOLVER
      </CyberButton>

      <div className="text-center space-y-4">
        <div className="flex justify-center">
            <div className="p-4 rounded-full bg-pink-950/30 border border-pink-500/50">
                <Scale className="w-12 h-12 text-pink-400" />
            </div>
        </div>
        <h2 className="text-3xl md:text-4xl font-cyber text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-white">
          CONDICIONES DEL SERVICIO
        </h2>
        <p className="text-gray-400 font-mono text-sm">Última actualización: {new Date().toLocaleDateString()}</p>
      </div>

      <CyberCard className="bg-black/60 border-gray-800 text-gray-300 space-y-6 font-mono text-sm leading-relaxed">
        
        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-pink-400 font-bold mb-2 font-cyber">1. Aceptación de los términos</h3>
            <p>
              Al acceder y utilizar la aplicación web <strong>Neural Quiz Converter</strong> (en adelante, “el Servicio”), usted acepta quedar legalmente vinculado por los presentes Términos del Servicio. Si no está de acuerdo con alguno de estos términos, no deberá utilizar la Aplicación.
            </p>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-pink-400 font-bold mb-2 font-cyber">2. Descripción del servicio</h3>
            <p>
              Neural Quiz Converter es una herramienta web que permite a los usuarios generar, formatear y exportar cuestionarios educativos utilizando Inteligencia Artificial para su uso en diversas plataformas (Kahoot!, Wooclap, Google Forms, etc.).
            </p>
            <p className="mt-2 text-yellow-500/80">
              <strong>Aviso sobre IA:</strong> El contenido generado automáticamente es producido por Inteligencia Artificial. Aunque nos esforzamos por la calidad, la IA puede cometer errores o "alucinaciones". Es responsabilidad del usuario revisar y verificar todo el contenido antes de su uso en el aula.
            </p>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-pink-400 font-bold mb-2 font-cyber">3. Uso y conducta del usuario</h3>
            <ul className="list-disc pl-5 space-y-2">
                <li>El usuario es responsable del contenido que procese a través del Servicio.</li>
                <li>El usuario conserva la propiedad intelectual de sus datos y cuestionarios originales.</li>
                <li>El usuario se compromete a no utilizar el Servicio para fines ilegales o para generar contenido ofensivo o dañino.</li>
                <li>El usuario es responsable de la seguridad de su cuenta de Google si decide vincularla para funciones de exportación.</li>
            </ul>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-pink-400 font-bold mb-2 font-cyber">4. Propiedad intelectual</h3>
            <p>
              El código fuente, el diseño y la funcionalidad de Neural Quiz Converter son propiedad del desarrollador, <strong>Norberto Cuartero</strong>.
            </p>
            <p className="mt-2">
              La Aplicación no reclama ningún derecho de propiedad sobre los materiales educativos procesados o creados por el usuario.
            </p>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-pink-400 font-bold mb-2 font-cyber">5. Servicios de terceros</h3>
            <p>
              La Aplicación genera archivos compatibles con plataformas externas (Kahoot!, Wooclap, etc.) e interactúa con APIs de terceros (Google Gemini).
            </p>
            <p className="mt-2">
              <strong>No afiliación:</strong> La Aplicación no está patrocinada, avalada ni afiliada oficialmente con dichas plataformas externas. No garantizamos que los formatos de exportación funcionen indefinidamente si dichas plataformas cambian sus requisitos.
            </p>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-pink-400 font-bold mb-2 font-cyber">6. Exclusión de garantías</h3>
            <p>
              El Servicio se ofrece "tal cual" (as-is), sin garantías de ningún tipo. El desarrollador no garantiza que el servicio sea ininterrumpido o libre de errores, ni la exactitud absoluta de los datos generados por la IA.
            </p>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-pink-400 font-bold mb-2 font-cyber">7. Limitación de responsabilidad</h3>
            <p>
              En la máxima medida permitida por la ley, el desarrollador no será responsable de daños directos, indirectos o consecuentes derivados del uso o imposibilidad de uso del Servicio, ni de la pérdida de datos.
            </p>
        </div>

        <div className="border-b border-gray-800 pb-4">
            <h3 className="text-xl text-pink-400 font-bold mb-2 font-cyber">8. Modificaciones</h3>
            <p>
              El desarrollador se reserva el derecho de modificar estos Términos en cualquier momento. El uso continuado del Servicio tras los cambios constituye su aceptación.
            </p>
        </div>

        <div>
            <h3 className="text-xl text-pink-400 font-bold mb-2 font-cyber">9. Contacto</h3>
            <p>Para cualquier consulta sobre estos Términos:</p>
            <p className="mt-2 text-cyan-400 font-bold">Correo electrónico: n.cuartero.10@gmail.com</p>
        </div>

      </CyberCard>
    </div>
  );
};
