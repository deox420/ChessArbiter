import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { FairPlayIncident } from '@/api/entities';
import { logArbiterAction } from '@/api/functions';
import { Loader2 } from 'lucide-react';

const incidentTypes = {
    // Incidencias para torneos presenciales
    'electronic_devices': 'Uso de Dispositivos Electronicos',
    'external_communication': 'Comunicacion Externa',
    'unauthorized_consultation': 'Consultas no Autorizadas',
    'prolonged_absence': 'Ausencia Prolongada de la Sala',
    'unsportsmanlike_conduct': 'Conducta Antideportiva',
    'piece_manipulation': 'Manipulacion de Piezas o Tablero',
    'repeated_delays': 'Retrasos Reiterados',
    'arbiter_disobedience': 'Negativa a Seguir Instrucciones del Arbitro',
    'identity_issues': 'Problemas de Identidad',
    
    // Incidencias para torneos online
    'focus_loss': 'Perdida de Foco (Online)',
    'reconnection': 'Reconexion (Online)',
    'suspicious_behavior': 'Comportamiento Sospechoso (Online)',
    'time_violation': 'Violacion de Tiempo',
    'other': 'Otro'
};

const severityLevels = {
    'low': 'Leve',
    'medium': 'Moderada',
    'high': 'Grave',
    'critical': 'Muy Grave'
};

export default function AddIncidentDialog({ 
    isOpen, 
    setIsOpen, 
    tournament, 
    players, 
    onIncidentCreated 
}) {
    const [formData, setFormData] = useState({
        player_id: '',
        incident_type: '',
        round_number: tournament?.current_round || 1,
        table_number: '',
        incident_time: '',
        description: '',
        severity: 'medium',
        witness_arbiter: '',
        evidence_notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // Función para obtener la hora actual en formato HH:MM
    const getCurrentTime = () => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Actualizar la hora cuando se abre el diálogo
    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                incident_time: getCurrentTime(),
                round_number: tournament?.current_round || 1
            }));
        }
    }, [isOpen, tournament?.current_round]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.player_id || !formData.incident_type || !formData.description.trim()) {
            toast({ 
                title: "Error", 
                description: "Por favor, completa todos los campos obligatorios.", 
                variant: "destructive" 
            });
            return;
        }

        const selectedPlayer = players.find(p => p.id === formData.player_id);
        if (!selectedPlayer) {
            toast({ title: "Error", description: "Jugador no encontrado.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const incidentData = {
                tournament_id: tournament.id,
                player_id: formData.player_id,
                player_name: selectedPlayer.full_name,
                incident_type: formData.incident_type,
                round_number: parseInt(formData.round_number),
                table_number: formData.table_number ? parseInt(formData.table_number) : null,
                incident_time: formData.incident_time || null,
                description: formData.description.trim(),
                severity: formData.severity,
                status: 'pending',
                occurrences_count: 1,
                witness_arbiter: formData.witness_arbiter || null,
                evidence_notes: formData.evidence_notes || null
            };

            const createdIncident = await FairPlayIncident.create(incidentData);

            // Registrar en el log de auditoría
            await logArbiterAction({
                tournamentId: tournament.id,
                actionType: 'incident_created',
                actionDescription: `Incidencia Fair Play registrada para ${selectedPlayer.full_name}: ${incidentTypes[formData.incident_type]}`,
                affectedEntityType: 'incident',
                affectedEntityId: createdIncident.id,
                newValue: incidentData
            });

            toast({ 
                title: "Incidencia Registrada", 
                description: `Se ha registrado la incidencia para ${selectedPlayer.full_name}.` 
            });

            // Reset form
            setFormData({
                player_id: '',
                incident_type: '',
                round_number: tournament?.current_round || 1,
                table_number: '',
                incident_time: getCurrentTime(), // Mantener hora actual
                description: '',
                severity: 'medium',
                witness_arbiter: '',
                evidence_notes: ''
            });

            setIsOpen(false);
            if (onIncidentCreated) onIncidentCreated();

        } catch (error) {
            console.error('Error creating incident:', error);
            toast({ 
                title: "Error", 
                description: "No se pudo registrar la incidencia.", 
                variant: "destructive" 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Registrar Nueva Incidencia Fair Play</DialogTitle>
                    <DialogDescription>
                        Complete los detalles de la incidencia detectada durante el torneo.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="player">Jugador *</Label>
                            <Select 
                                value={formData.player_id} 
                                onValueChange={(value) => setFormData({...formData, player_id: value})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar jugador" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {players.map((player) => (
                                        <SelectItem key={player.id} value={player.id}>
                                            {player.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="incident_type">Tipo de Incidencia *</Label>
                            <Select 
                                value={formData.incident_type} 
                                onValueChange={(value) => setFormData({...formData, incident_type: value})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {/* Torneos Presenciales */}
                                    <SelectItem value="electronic_devices">📱 Uso de Dispositivos Electronicos</SelectItem>
                                    <SelectItem value="external_communication">💬 Comunicacion Externa</SelectItem>
                                    <SelectItem value="unauthorized_consultation">📚 Consultas no Autorizadas</SelectItem>
                                    <SelectItem value="prolonged_absence">🚶 Ausencia Prolongada de la Sala</SelectItem>
                                    <SelectItem value="unsportsmanlike_conduct">😠 Conducta Antideportiva</SelectItem>
                                    <SelectItem value="piece_manipulation">♟️ Manipulacion de Piezas o Tablero</SelectItem>
                                    <SelectItem value="repeated_delays">⏰ Retrasos Reiterados</SelectItem>
                                    <SelectItem value="arbiter_disobedience">❌ Negativa a Seguir Instrucciones</SelectItem>
                                    <SelectItem value="identity_issues">🆔 Problemas de Identidad</SelectItem>
                                    
                                    {/* Separador visual */}
                                    <div className="border-t my-1"></div>
                                    
                                    {/* Torneos Online */}
                                    <SelectItem value="focus_loss">👁️ Perdida de Foco</SelectItem>
                                    <SelectItem value="reconnection">🔄 Reconexion</SelectItem>
                                    <SelectItem value="suspicious_behavior">⚠️ Comportamiento Sospechoso</SelectItem>
                                    <SelectItem value="time_violation">⏲️ Violacion de Tiempo</SelectItem>
                                    <SelectItem value="other">❓ Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="round_number">Ronda</Label>
                            <Select 
                                value={formData.round_number.toString()} 
                                onValueChange={(value) => setFormData({...formData, round_number: parseInt(value)})}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({length: tournament?.total_rounds || 5}, (_, i) => i + 1).map(round => (
                                        <SelectItem key={round} value={round.toString()}>
                                            Ronda {round}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="table_number">Mesa</Label>
                            <Input
                                type="number"
                                min="1"
                                value={formData.table_number}
                                onChange={(e) => setFormData({...formData, table_number: e.target.value})}
                                placeholder="Numero de mesa"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="incident_time">Hora (automatica)</Label>
                            <Input
                                type="time"
                                value={formData.incident_time}
                                onChange={(e) => setFormData({...formData, incident_time: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="severity">Severidad</Label>
                        <Select 
                            value={formData.severity} 
                            onValueChange={(value) => setFormData({...formData, severity: value})}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">🟢 Leve</SelectItem>
                                <SelectItem value="medium">🟡 Moderada</SelectItem>
                                <SelectItem value="high">🟠 Grave</SelectItem>
                                <SelectItem value="critical">🔴 Muy Grave</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripcion del Incidente *</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            placeholder="Describe detalladamente lo ocurrido..."
                            className="h-24"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="witness_arbiter">Arbitro Testigo</Label>
                        <Input
                            value={formData.witness_arbiter}
                            onChange={(e) => setFormData({...formData, witness_arbiter: e.target.value})}
                            placeholder="Nombre del arbitro testigo"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="evidence_notes">Notas sobre Evidencias</Label>
                        <Textarea
                            value={formData.evidence_notes}
                            onChange={(e) => setFormData({...formData, evidence_notes: e.target.value})}
                            placeholder="Fotos tomadas, testigos adicionales, objetos confiscados, etc."
                            className="h-20"
                        />
                    </div>
                </form>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Registrar Incidencia
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}