
import React, { useEffect, useState } from 'react';
import { ClassGroup } from '../../types';
import { getTeacherClasses, createClassGroup, updateClassGroup, deleteClassGroup } from '../../services/classService';
import { CyberButton, CyberCard, CyberInput, CyberTextArea } from '../ui/CyberUI';
import { ArrowLeft, Users, Plus, Save, Trash2, Edit3, UserCheck, GraduationCap } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface ClassesManagerProps {
    onBack: () => void;
}

export const ClassesManager: React.FC<ClassesManagerProps> = ({ onBack }) => {
    const [classes, setClasses] = useState<ClassGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Form State
    const [formName, setFormName] = useState("");
    const [formStudentsStr, setFormStudentsStr] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const toast = useToast();

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = async () => {
        setLoading(true);
        try {
            const data = await getTeacherClasses();
            setClasses(data);
        } catch (e) {
            toast.error("Error al cargar las clases.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setEditingClass(null);
        setFormName("");
        setFormStudentsStr("");
        setIsCreating(true);
    };

    const handleEdit = (c: ClassGroup) => {
        setEditingClass(c);
        setFormName(c.name);
        setFormStudentsStr(c.students.join("\n"));
        setIsCreating(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar esta clase?")) return;
        try {
            await deleteClassGroup(id);
            setClasses(prev => prev.filter(c => c.id !== id));
            toast.success("Clase eliminada.");
        } catch (e) {
            toast.error("Error al eliminar.");
        }
    };

    const handleSave = async () => {
        if (!formName.trim()) { toast.warning("El nombre de la clase es obligatorio."); return; }
        
        setIsSaving(true);
        const studentsList = formStudentsStr.split('\n').map(s => s.trim()).filter(s => s.length > 0);

        try {
            if (editingClass && editingClass.id) {
                // Update
                await updateClassGroup(editingClass.id, formName, studentsList);
                setClasses(prev => prev.map(c => c.id === editingClass.id ? { ...c, name: formName, students: studentsList } : c));
                toast.success("Clase actualizada.");
            } else {
                // Create
                const id = await createClassGroup(formName, studentsList);
                const newClass: ClassGroup = {
                    id, teacherId: "me", name: formName, students: studentsList, createdAt: new Date()
                };
                setClasses(prev => [newClass, ...prev]);
                toast.success("Nueva clase creada.");
            }
            setIsCreating(false);
        } catch (e) {
            toast.error("Error al guardar.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 pt-20 animate-in fade-in">
            <div className="max-w-5xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                    <div className="flex items-center gap-4">
                        <CyberButton variant="ghost" onClick={onBack} className="pl-0 gap-2">
                            <ArrowLeft className="w-4 h-4" /> VOLVER
                        </CyberButton>
                        <h2 className="text-3xl font-cyber text-cyan-400">GESTIÓN DE CLASES</h2>
                    </div>
                    {!isCreating && (
                        <CyberButton onClick={handleCreateNew} className="text-sm">
                            <Plus className="w-4 h-4 mr-2" /> NUEVA CLASE
                        </CyberButton>
                    )}
                </div>

                {isCreating ? (
                    /* --- EDITOR MODE --- */
                    <CyberCard className="max-w-2xl mx-auto border-cyan-500/50">
                        <div className="flex items-center gap-2 mb-6 text-cyan-400">
                            <GraduationCap className="w-6 h-6" />
                            <h3 className="text-xl font-bold font-cyber">
                                {editingClass ? "EDITAR CLASE" : "NUEVA CLASE"}
                            </h3>
                        </div>

                        <div className="space-y-6">
                            <CyberInput 
                                label="NOMBRE DE LA CLASE" 
                                placeholder="Ej: Matemáticas 3º B" 
                                value={formName} 
                                onChange={(e) => setFormName(e.target.value)}
                            />

                            <div className="space-y-2">
                                <label className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest">
                                    LISTA DE ALUMNOS (Uno por línea)
                                </label>
                                <CyberTextArea 
                                    className="min-h-[300px] font-mono text-sm"
                                    placeholder={`Juan Pérez\nMaría López\nCarlos Ruiz...`}
                                    value={formStudentsStr}
                                    onChange={(e) => setFormStudentsStr(e.target.value)}
                                />
                                <p className="text-xs text-gray-500">
                                    Total detectados: {formStudentsStr.split('\n').filter(s => s.trim().length > 0).length}
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-gray-800">
                                <CyberButton variant="ghost" onClick={() => setIsCreating(false)} disabled={isSaving}>
                                    CANCELAR
                                </CyberButton>
                                <CyberButton onClick={handleSave} isLoading={isSaving} className="flex-1">
                                    <Save className="w-4 h-4 mr-2" /> GUARDAR CLASE
                                </CyberButton>
                            </div>
                        </div>
                    </CyberCard>
                ) : (
                    /* --- LIST MODE --- */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <div className="col-span-full text-center py-20 text-gray-500">Cargando clases...</div>
                        ) : classes.length === 0 ? (
                            <div className="col-span-full text-center py-20 border-2 border-dashed border-gray-800 rounded-lg">
                                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">No tienes clases creadas.</p>
                                <p className="text-xs text-gray-600 mt-2">Crea una para asignar evaluaciones y nombres reales.</p>
                            </div>
                        ) : (
                            classes.map(c => (
                                <CyberCard key={c.id} className="group hover:border-cyan-500/50 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold text-xl text-white font-cyber truncate">{c.name}</h3>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(c)} className="p-1.5 text-cyan-400 hover:bg-cyan-900/30 rounded"><Edit3 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(c.id!)} className="p-1.5 text-red-400 hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-black/40 p-4 rounded border border-gray-800 mb-4 h-32 overflow-y-auto custom-scrollbar">
                                        <ul className="text-xs font-mono text-gray-400 space-y-1">
                                            {c.students.slice(0, 10).map((s, i) => (
                                                <li key={i} className="flex items-center gap-2">
                                                    <UserCheck className="w-3 h-3 text-cyan-700" /> {s}
                                                </li>
                                            ))}
                                            {c.students.length > 10 && <li className="text-gray-600 italic">... y {c.students.length - 10} más</li>}
                                            {c.students.length === 0 && <li className="text-gray-600 italic">Sin alumnos asignados</li>}
                                        </ul>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-gray-800 pt-3">
                                        <Users className="w-4 h-4" />
                                        <span className="font-bold text-white">{c.students.length}</span> Estudiantes registrados
                                    </div>
                                </CyberCard>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
