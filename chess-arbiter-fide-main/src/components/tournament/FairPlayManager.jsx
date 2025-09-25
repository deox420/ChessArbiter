import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";
import { FairPlayIncident } from '@/api/entities';
import { logArbiterAction } from '@/api/functions';
import { generateFairPlayReport } from '@/api/functions';
import { Shield, AlertTriangle, CheckCircle, FileDown, Eye, Plus, Search, Filter } from 'lucide-react';
import AddIncidentDialog from './AddIncidentDialog';

export default function FairPlayManager({ tournament, players, onUpdate }) {
    const [incidents, setIncidents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
    const [isAddIncidentOpen, setIsAddIncidentOpen] = useState(false);
    const [resolution, setResolution] = useState({ decision: '', penalty: 'none' });
    const [isExporting, setIsExporting] = useState(false);
    
    // New states for filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'created_date', direction: 'desc' });
    
    const { toast } = useToast();

    const getIncidentTypeDisplay = (type) => {
        const types = {
            // Torneos presenciales
            'electronic_devices': { text: 'Dispositivos Electronicos', icon: '📱', color: 'bg-red-100 text-red-800' },
            'external_communication': { text: 'Comunicacion Externa', icon: '💬', color: 'bg-orange-100 text-orange-800' },
            'unauthorized_consultation': { text: 'Consultas no Autorizadas', icon: '📚', color: 'bg-purple-100 text-purple-800' },
            'prolonged_absence': { text: 'Ausencia Prolongada', icon: '🚶', color: 'bg-yellow-100 text-yellow-800' },
            'unsportsmanlike_conduct': { text: 'Conducta Antideportiva', icon: '😠', color: 'bg-red-100 text-red-800' },
            'piece_manipulation': { text: 'Manipulacion de Piezas', icon: '♟️', color: 'bg-orange-100 text-orange-800' },
            'repeated_delays': { text: 'Retrasos Reiterados', icon: '⏰', color: 'bg-yellow-100 text-yellow-800' },
            'arbiter_disobedience': { text: 'Desobediencia al Arbitro', icon: '❌', color: 'bg-red-100 text-red-800' },
            'identity_issues': { text: 'Problemas de Identidad', icon: '🆔', color: 'bg-red-100 text-red-800' },
            
            // Torneos online
            'focus_loss': { text: 'Perdida de Foco', icon: '👁️', color: 'bg-blue-100 text-blue-800' },
            'reconnection': { text: 'Reconexion', icon: '🔄', color: 'bg-blue-100 text-blue-800' },
            'suspicious_behavior': { text: 'Comportamiento Sospechoso', icon: '⚠️', color: 'bg-orange-100 text-orange-800' },
            'time_violation': { text: 'Violacion de Tiempo', icon: '⏲️', color: 'bg-yellow-100 text-yellow-800' },
            'other': { text: 'Otro', icon: '❓', color: 'bg-gray-100 text-gray-800' }
        };
        return types[type] || types['other'];
    };

    const loadFairPlayData = useCallback(async () => {
        try {
            const incidentsData = await FairPlayIncident.filter({ tournament_id: tournament.id }, '-created_date', 1000);
            setIncidents(incidentsData || []);
        } catch (error) {
            toast({ title: "Error", description: "Error al cargar datos Fair Play.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [tournament.id, toast]);

    useEffect(() => {
        loadFairPlayData();
    }, [loadFairPlayData]);

    const handleResolveIncident = async () => {
        if (!selectedIncident || !resolution.decision) {
            toast({ title: "Error", description: "Debe proporcionar una decision.", variant: "destructive" });
            return;
        }

        try {
            // Capture the old state before update for logging
            const oldValue = { ...selectedIncident };
            const updatedData = {
                status: 'resolved',
                arbiter_decision: resolution.decision,
                penalty_applied: resolution.penalty,
                resolved_by: 'current_user@email.com', // Se reemplazaría con user actual
                resolved_at: new Date().toISOString()
            };

            await FairPlayIncident.update(selectedIncident.id, updatedData);

            // Log the arbiter action
            await logArbiterAction({
                tournamentId: tournament.id,
                actionType: 'incident_resolved',
                actionDescription: `Incidencia Fair Play resuelta para ${selectedIncident.player_name}: ${resolution.decision}`,
                affectedEntityType: 'incident',
                affectedEntityId: selectedIncident.id,
                oldValue: oldValue,
                newValue: { ...oldValue, ...updatedData }
            });

            toast({ title: "Incidente Resuelto", description: "El incidente ha sido procesado correctamente." });
            setIsResolveDialogOpen(false);
            setSelectedIncident(null);
            setResolution({ decision: '', penalty: 'none' });
            loadFairPlayData();
        } catch (error) {
            toast({ title: "Error", description: "Error al resolver el incidente.", variant: "destructive" });
        }
    };

    const handleExportFairPlayReport = async (format = 'pdf') => {
        setIsExporting(true);
        try {
            const response = await generateFairPlayReport({ 
                tournamentId: tournament.id, 
                format 
            });
            const blob = new Blob([response.data], { 
                type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_fair_play_report.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "Informe Exportado", description: `Informe Fair Play generado en formato ${format.toUpperCase()}.` });
        } catch (error) {
            toast({ title: "Error", description: "Error al exportar informe Fair Play.", variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    // New filtering and sorting logic
    const filteredAndSortedIncidents = React.useMemo(() => {
        let filtered = incidents.filter(incident => {
            const matchesSearch = searchTerm === '' || 
                incident.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                incident.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || incident.status === statusFilter;
            const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
            const matchesType = typeFilter === 'all' || incident.incident_type === typeFilter;
            
            return matchesSearch && matchesStatus && matchesSeverity && matchesType;
        });

        // Sort
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                
                // Special handling for date strings
                if (sortConfig.key === 'created_date') {
                    aValue = new Date(aValue);
                    bValue = new Date(bValue);
                }
                
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }, [incidents, searchTerm, statusFilter, severityFilter, typeFilter, sortConfig]);

    const getIncidentSeverityColor = (severity) => {
        switch (severity) {
            case 'low': return 'bg-blue-100 text-blue-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800'; 
            case 'high': return 'bg-orange-100 text-orange-800';
            case 'critical': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'reviewing': return 'bg-blue-100 text-blue-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            case 'dismissed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const pendingIncidentsCount = incidents.filter(i => i.status === 'pending').length;

    return (
        <div className="space-y-6">
            {/* Panel Fair Play */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-600" />
                            Panel Fair Play
                            {pendingIncidentsCount > 0 && (
                                <Badge variant="destructive" className="ml-2">
                                    {pendingIncidentsCount} pendientes
                                </Badge>
                            )}
                        </CardTitle>
                        <Button onClick={() => setIsAddIncidentOpen(true)} className="bg-red-600 hover:bg-red-700">
                            <Plus className="mr-2 h-4 w-4" />
                            Registrar Incidencia
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-700">{pendingIncidentsCount}</div>
                            <div className="text-sm text-yellow-600">Incidentes Pendientes</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-red-700">
                                {incidents.filter(i => i.severity === 'high' || i.severity === 'critical').length}
                            </div>
                            <div className="text-sm text-red-600">Incidentes Criticos</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">
                                {incidents.filter(i => i.status === 'resolved').length}
                            </div>
                            <div className="text-sm text-blue-600">Incidentes Resueltos</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button 
                            onClick={() => handleExportFairPlayReport('pdf')}
                            disabled={isExporting}
                            variant="outline"
                            size="sm"
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            Exportar Informe PDF
                        </Button>
                        <Button 
                            onClick={() => handleExportFairPlayReport('csv')}
                            disabled={isExporting}
                            variant="outline"
                            size="sm"
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            Exportar Datos CSV
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Incidentes Fair Play */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Incidentes Fair Play ({filteredAndSortedIncidents.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Filtros y búsqueda */}
                    <div className="space-y-4 mb-6">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por jugador o descripcion..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        
                        <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-gray-500" />
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los Estados</SelectItem>
                                        <SelectItem value="pending">Pendientes</SelectItem>
                                        <SelectItem value="reviewing">En Revision</SelectItem>
                                        <SelectItem value="resolved">Resueltos</SelectItem>
                                        <SelectItem value="dismissed">Desestimados</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Severidad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las Severidades</SelectItem>
                                        <SelectItem value="low">Bajo</SelectItem>
                                        <SelectItem value="medium">Medio</SelectItem>
                                        <SelectItem value="high">Alto</SelectItem>
                                        <SelectItem value="critical">Critico</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Tipo de Incidente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los Tipos</SelectItem>
                                        <SelectItem value="electronic_devices">Dispositivos Electronicos</SelectItem>
                                        <SelectItem value="external_communication">Comunicacion Externa</SelectItem>
                                        <SelectItem value="unauthorized_consultation">Consultas no Autorizadas</SelectItem>
                                        <SelectItem value="prolonged_absence">Ausencia Prolongada</SelectItem>
                                        <SelectItem value="unsportsmanlike_conduct">Conducta Antideportiva</SelectItem>
                                        <SelectItem value="piece_manipulation">Manipulacion de Piezas</SelectItem>
                                        <SelectItem value="repeated_delays">Retrasos Reiterados</SelectItem>
                                        <SelectItem value="arbiter_disobedience">Desobediencia al Arbitro</SelectItem>
                                        <SelectItem value="identity_issues">Problemas de Identidad</SelectItem>
                                        <SelectItem value="focus_loss">Perdida de Foco</SelectItem>
                                        <SelectItem value="reconnection">Reconexion</SelectItem>
                                        <SelectItem value="suspicious_behavior">Comportamiento Sospechoso</SelectItem>
                                        <SelectItem value="time_violation">Violacion de Tiempo</SelectItem>
                                        <SelectItem value="other">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {filteredAndSortedIncidents.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {incidents.length === 0 ? (
                                <>
                                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                                    <p>No hay incidentes Fair Play registrados.</p>
                                    <p className="text-sm">¡El torneo se desarrolla con total integridad!</p>
                                </>
                            ) : (
                                <p>No se encontraron incidentes que coincidan con los filtros.</p>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead 
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => setSortConfig({ key: 'player_name', direction: sortConfig.key === 'player_name' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                                    >
                                        Jugador
                                    </TableHead>
                                    <TableHead>Mesa</TableHead>
                                    <TableHead>Hora del Incidente</TableHead>
                                    <TableHead 
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => setSortConfig({ key: 'incident_type', direction: sortConfig.key === 'incident_type' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                                    >
                                        Tipo de Incidente
                                    </TableHead>
                                    <TableHead 
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => setSortConfig({ key: 'severity', direction: sortConfig.key === 'severity' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                                    >
                                        Severidad
                                    </TableHead>
                                    <TableHead>Ronda</TableHead>
                                    <TableHead 
                                        className="cursor-pointer hover:bg-gray-50"
                                        onClick={() => setSortConfig({ key: 'status', direction: sortConfig.key === 'status' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                                    >
                                        Estado
                                    </TableHead>
                                    <TableHead>Testigo</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAndSortedIncidents.map((incident) => {
                                    const typeDisplay = getIncidentTypeDisplay(incident.incident_type);
                                    return (
                                        <TableRow key={incident.id}>
                                            <TableCell className="font-medium">{incident.player_name}</TableCell>
                                            <TableCell>
                                                {incident.table_number ? `Mesa ${incident.table_number}` : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {incident.incident_time || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={typeDisplay.color}>
                                                    {typeDisplay.icon} {typeDisplay.text}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getIncidentSeverityColor(incident.severity)}>
                                                    {incident.severity.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>R{incident.round_number}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(incident.status)}>
                                                    {incident.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {incident.witness_arbiter || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedIncident(incident);
                                                        setIsResolveDialogOpen(true);
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    {incident.status === 'resolved' ? 'Ver' : 'Resolver'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog para añadir incidencia */}
            <AddIncidentDialog
                isOpen={isAddIncidentOpen}
                setIsOpen={setIsAddIncidentOpen}
                tournament={tournament}
                players={players}
                onIncidentCreated={loadFairPlayData}
            />

            {/* Dialog para resolver incidentes - with enhanced information */}
            <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedIncident?.status === 'resolved' ? 'Ver' : 'Resolver'} Incidente Fair Play
                        </DialogTitle>
                        <DialogDescription>
                            Incidente de {selectedIncident?.player_name} en la ronda {selectedIncident?.round_number}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedIncident && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Tipo de Incidente:</label>
                                    <div className="mt-1">
                                        {(() => {
                                            const typeDisplay = getIncidentTypeDisplay(selectedIncident.incident_type);
                                            return (
                                                <Badge className={typeDisplay.color}>
                                                    {typeDisplay.icon} {typeDisplay.text}
                                                </Badge>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Severidad:</label>
                                    <div className="mt-1">
                                        <Badge className={getIncidentSeverityColor(selectedIncident.severity)}>
                                            {selectedIncident.severity.toUpperCase()}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Mesa:</label>
                                    <p className="text-sm bg-gray-50 p-2 rounded mt-1">
                                        {selectedIncident.table_number ? `Mesa ${selectedIncident.table_number}` : 'No especificada'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Hora:</label>
                                    <p className="text-sm bg-gray-50 p-2 rounded mt-1">
                                        {selectedIncident.incident_time || 'No especificada'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700">Descripcion:</label>
                                <p className="text-sm bg-gray-50 p-3 rounded mt-1">{selectedIncident.description}</p>
                            </div>

                            {selectedIncident.witness_arbiter && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Arbitro Testigo:</label>
                                    <p className="text-sm bg-gray-50 p-2 rounded mt-1">{selectedIncident.witness_arbiter}</p>
                                </div>
                            )}

                            {selectedIncident.evidence_notes && (
                                <div>
                                    <label className="text-sm font-medium text-gray-700">Evidencias:</label>
                                    <p className="text-sm bg-gray-50 p-3 rounded mt-1">{selectedIncident.evidence_notes}</p>
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-medium text-gray-700">Numero de Reincidencias:</label>
                                <p className="text-sm bg-gray-50 p-2 rounded mt-1">{selectedIncident.occurrences_count}</p>
                            </div>

                            {selectedIncident.status !== 'resolved' && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Decision del Arbitro:</label>
                                        <Textarea
                                            value={resolution.decision}
                                            onChange={(e) => setResolution({ ...resolution, decision: e.target.value })}
                                            placeholder="Describa la decision tomada y la justificacion..."
                                            className="mt-1"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Penalizacion Aplicada:</label>
                                        <Select value={resolution.penalty} onValueChange={(value) => setResolution({ ...resolution, penalty: value })}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Seleccionar penalizacion" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sin Penalizacion</SelectItem>
                                                <SelectItem value="warning">Advertencia</SelectItem>
                                                <SelectItem value="time_penalty">Sancion de Tiempo</SelectItem>
                                                <SelectItem value="forfeit">Perdida de Partida</SelectItem>
                                                <SelectItem value="expulsion">Expulsion del Torneo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}

                            {selectedIncident.status === 'resolved' && (
                                <>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Decision del Arbitro:</label>
                                        <p className="text-sm bg-gray-50 p-3 rounded mt-1">{selectedIncident.arbiter_decision}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Penalizacion Aplicada:</label>
                                        <div className="mt-1">
                                            <Badge variant="outline">{selectedIncident.penalty_applied.replace(/_/g, ' ').toUpperCase()}</Badge>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Resuelto por {selectedIncident.resolved_by} el {new Date(selectedIncident.resolved_at).toLocaleString()}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
                            {selectedIncident?.status === 'resolved' ? 'Cerrar' : 'Cancelar'}
                        </Button>
                        {selectedIncident?.status !== 'resolved' && (
                            <Button onClick={handleResolveIncident}>
                                Resolver Incidente
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}