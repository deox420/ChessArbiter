
import React, { useState, useEffect, useCallback } from 'react';
import { Tournament } from '@/api/entities';
import { Match } from '@/api/entities'; // Import Match entity
import { Player } from '@/api/entities'; // Import Player entity
import { FairPlayIncident } from '@/api/entities'; // Import FairPlayIncident entity
import { FairPlayAcceptance } from '@/api/entities'; // Import FairPlayAcceptance entity
import { logArbiterAction } from '@/api/functions'; // Import logArbiterAction
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Plus, ChevronRight, Users, Hash, Shield, MoreVertical, Edit, Trash2, Loader2, Info, FileUp, Key } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import TiebreakSelector from '../components/tournament/TiebreakSelector';

const initialTournamentState = { 
    name: '', 
    pairing_system: 'swiss', 
    total_rounds: 5, 
    fide_mode: false, 
    fair_play_mode: false, // New field
    event_type: 'STD', 
    event_location: '',
    time_control: '',
    organizer_name: '',
    chief_arbiter_name: '',
    chief_arbiter_fide_id: '',
    master_seed: '', // New field
    tie_break_order: ["buchholz", "sonneborn", "progressive", "wins"],
    max_requested_byes: 1
};

export default function Dashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [newTournament, setNewTournament] = useState(initialTournamentState);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const fetchTournaments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await Tournament.list('-created_date');
      setTournaments(data || []);
    } catch (e) {
      console.error("Error fetching tournaments:", e);
      setTournaments([]);
      toast({ 
        title: "Error de Carga", 
        description: "No se pudieron cargar los torneos. Revisa tu conexión.", 
        variant: "destructive" 
      });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const handleCreateTournament = async () => {
    if (!newTournament.name || !newTournament.total_rounds) {
      toast({ title: "Error", description: "Por favor, completa los campos obligatorios (Nombre, Rondas).", variant: "destructive" });
      return;
    }

    if (newTournament.chief_arbiter_fide_id && !/^\d{8}$/.test(newTournament.chief_arbiter_fide_id)) {
        toast({ title: "ID de Árbitro no válido", description: "El FIDE ID del árbitro debe ser un número de 8 dígitos.", variant: "destructive" });
        return;
    }

    if (newTournament.fide_mode) {
        const requiredFideFields = {
            event_location: "Lugar del evento",
            time_control: "Control de Tiempo",
            chief_arbiter_name: "Árbitro Principal",
            chief_arbiter_fide_id: "FIDE ID Árbitro"
        };
        for (const [field, name] of Object.entries(requiredFideFields)) {
            if (!newTournament[field]) {
                toast({ title: "Modo FIDE Activado", description: `El campo "${name}" es obligatorio.`, variant: "destructive" });
                return;
            }
        }
    }

    setIsProcessing(true);
    try {
      const created = await Tournament.create(newTournament);
      // Log the creation action
      await logArbiterAction({
          tournamentId: created.id,
          actionType: 'tournament_created',
          actionDescription: `Torneo "${newTournament.name}" creado.`,
          newValue: newTournament
      });
      // Reset newTournament state to its initial comprehensive defaults
      setNewTournament(initialTournamentState);
      setIsCreateDialogOpen(false); 
      toast({ title: "Torneo Creado", description: `El torneo "${newTournament.name}" ha sido creado.` });
      fetchTournaments(); 
    } catch (error) {
      console.error("Error creating tournament:", error);
      toast({ title: "Error", description: "Error al crear el torneo.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditTournament = async () => {
    if (!editingTournament.name || !editingTournament.total_rounds) {
      toast({ title: "Error", description: "Por favor, completa los campos obligatorios (Nombre, Rondas).", variant: "destructive" });
      return;
    }

    if (editingTournament.chief_arbiter_fide_id && !/^\d{8}$/.test(editingTournament.chief_arbiter_fide_id)) {
        toast({ title: "ID de Árbitro no válido", description: "El FIDE ID del árbitro debe ser un número de 8 dígitos.", variant: "destructive" });
        return;
    }

    if (editingTournament.fide_mode) {
        const requiredFideFields = {
            event_location: "Lugar del evento",
            time_control: "Control de Tiempo",
            chief_arbiter_name: "Árbitro Principal",
            chief_arbiter_fide_id: "FIDE ID Árbitro"
        };
        for (const [field, name] of Object.entries(requiredFideFields)) {
            if (!editingTournament[field]) {
                toast({ title: "Modo FIDE Activado", description: `El campo "${name}" es obligatorio.`, variant: "destructive" });
                return;
            }
        }
    }

    setIsProcessing(true);
    try {
      const { id, ...dataToUpdate } = editingTournament; 
      await Tournament.update(id, dataToUpdate);
      // Log the edit action
      await logArbiterAction({
          tournamentId: id,
          actionType: 'tournament_edited',
          actionDescription: `Torneo "${editingTournament.name}" editado.`,
          newValue: dataToUpdate
      });
      setIsEditDialogOpen(false);
      setEditingTournament(null);
      toast({ title: "Torneo Actualizado", description: "Los cambios han sido guardados." }); 
      fetchTournaments(); 
    } catch (error) {
      console.error("Error updating tournament:", error);
      toast({ title: "Error", description: "Error al actualizar el torneo.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!tournamentToDelete) return;
    setIsProcessing(true);
    try {
        const tournamentId = tournamentToDelete.id;
        
        // 1. Eliminar todas las entidades relacionadas
        const [allMatches, allPlayers, allIncidents, allAcceptances] = await Promise.all([
            Match.filter({ tournament_id: tournamentId }, '', 5000),
            Player.filter({ tournament_id: tournamentId }, '', 5000),
            FairPlayIncident.filter({ tournament_id: tournamentId }, '', 5000),
            FairPlayAcceptance.filter({ tournament_id: tournamentId }, '', 5000)
        ]);

        await Promise.all([
            ...allMatches.map(m => Match.delete(m.id)),
            ...allPlayers.map(p => Player.delete(p.id)),
            ...allIncidents.map(i => FairPlayIncident.delete(i.id)),
            ...allAcceptances.map(a => FairPlayAcceptance.delete(a.id))
        ]);

        // 2. Finalmente eliminar el torneo
        await Tournament.delete(tournamentId);

        // 3. Registrar la acción
        await logArbiterAction({
            tournamentId: tournamentId,
            actionType: 'tournament_deleted',
            actionDescription: `Torneo "${tournamentToDelete.name}" y todos sus ${allPlayers.length} jugadores, ${allMatches.length} partidas, ${allIncidents.length} incidencias y ${allAcceptances.length} aceptaciones han sido eliminados.`,
            oldValue: tournamentToDelete
        });
      
        setIsDeleteDialogOpen(false);
        setTournamentToDelete(null);
        toast({ 
            title: "Torneo Eliminado", 
            description: `El torneo "${tournamentToDelete.name}" y todos sus datos asociados han sido eliminados permanentemente.` 
        });
        fetchTournaments();
    } catch (error) {
        console.error("Error deleting tournament:", error);
        toast({ title: "Error", description: "Error al eliminar el torneo.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const openEditDialog = (tournament) => {
    // Ensure all fields are present for editing, even if null/undefined from backend
    // Merge with initialTournamentState to ensure new fields (like fair_play_mode, master_seed) are present
    setEditingTournament({ ...initialTournamentState, ...tournament });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (tournament) => {
    setTournamentToDelete(tournament);
    setIsDeleteDialogOpen(true);
  };
  
  const statusColors = {
    setup: 'bg-blue-100 text-blue-800',
    running: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
  };

  const statusText = {
    setup: 'Preparación',
    running: 'En curso',
    completed: 'Finalizado',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Mis Torneos</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Gestiona tus torneos de ajedrez de forma profesional</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Crear Torneo
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Torneo</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 py-4">
              {/* Columna Izquierda: Información Básica */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Información Básica</h3>
                <div className="grid gap-2">
                  <Label htmlFor="create-name">Nombre del Torneo *</Label>
                  <Input 
                    id="create-name" 
                    value={newTournament.name} 
                    onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })} 
                    placeholder="Ej: Abierto de Primavera" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="create-pairing">Sistema</Label>
                    <Select value={newTournament.pairing_system} onValueChange={(value) => setNewTournament({ ...newTournament, pairing_system: value })}>
                      <SelectTrigger><SelectValue placeholder="Sistema de emparejamiento" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="swiss">Suizo</SelectItem>
                        <SelectItem value="round_robin">Round Robin (Liga)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="create-rounds">Rondas *</Label>
                    <Input 
                      id="create-rounds" 
                      type="number" 
                      value={newTournament.total_rounds} 
                      onChange={(e) => setNewTournament({ ...newTournament, total_rounds: parseInt(e.target.value) || 1 })} 
                      min="1" 
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Límite de BYEs Solicitados</Label>
                  <Input 
                    type="number"
                    value={newTournament.max_requested_byes}
                    onChange={(e) => setNewTournament({ ...newTournament, max_requested_byes: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full"
                  />
                   <p className="text-xs text-gray-500 mt-1">Número máximo de BYEs voluntarios por jugador.</p>
                </div>
                <div>
                  <Label className="text-sm">Ritmo FIDE</Label>
                    <Select value={newTournament.event_type} onValueChange={(v) => setNewTournament({ ...newTournament, event_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STD">Standard</SelectItem><SelectItem value="RPD">Rapid</SelectItem><SelectItem value="BLZ">Blitz</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                <div>
                  <Label className="text-sm">Control de Tiempo</Label>
                  <Input value={newTournament.time_control || ''} onChange={(e) => setNewTournament({ ...newTournament, time_control: e.target.value })} placeholder="90'+30''" />
                </div>
              </div>

              {/* Columna Derecha: Configuración Avanzada */}
              <div className="space-y-4 lg:border-l lg:pl-8">
                 <h3 className="text-lg font-semibold text-gray-800 -ml-8 lg:ml-0">Configuración FIDE y Avanzada</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center space-x-2 rounded-md border p-3">
                      <Switch id="fide-mode" checked={newTournament.fide_mode} onCheckedChange={(checked) => setNewTournament({ ...newTournament, fide_mode: checked })} />
                      <Label htmlFor="fide-mode" className="flex flex-col gap-1 cursor-pointer">
                        <span className="font-semibold text-sm">Modo FIDE</span>
                        <span className="font-normal text-xs text-gray-600">Aplica reglas y validaciones estrictas de la FIDE.</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-md border p-3">
                      <Switch id="fair-play-mode" checked={newTournament.fair_play_mode} onCheckedChange={(checked) => setNewTournament({ ...newTournament, fair_play_mode: checked })} />
                      <Label htmlFor="fair-play-mode" className="flex flex-col gap-1 cursor-pointer">
                        <span className="font-semibold text-sm">Modo Fair Play</span>
                        <span className="font-normal text-xs text-gray-600">Activa el módulo de monitoreo de integridad.</span>
                      </Label>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm flex items-center gap-2"><Key className="h-4 w-4"/> Semilla Maestra (Opcional)</Label>
                    <Input value={newTournament.master_seed || ''} onChange={(e) => setNewTournament({ ...newTournament, master_seed: e.target.value })} placeholder="Para emparejamientos reproducibles" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-sm">Lugar</Label><Input value={newTournament.event_location || ''} onChange={(e) => setNewTournament({ ...newTournament, event_location: e.target.value })} placeholder="Ciudad, País" /></div>
                    <div><Label className="text-sm">Organizador</Label><Input value={newTournament.organizer_name || ''} onChange={(e) => setNewTournament({ ...newTournament, organizer_name: e.target.value })} /></div>
                    <div><Label className="text-sm">Árbitro Principal</Label><Input value={newTournament.chief_arbiter_name || ''} onChange={(e) => setNewTournament({ ...newTournament, chief_arbiter_name: e.target.value })} /></div>
                    <div><Label className="text-sm">FIDE ID Árbitro</Label><Input value={newTournament.chief_arbiter_fide_id || ''} onChange={(e) => setNewTournament({ ...newTournament, chief_arbiter_fide_id: e.target.value })} placeholder="8 dígitos" maxLength="8" pattern="[0-9]{8}" /></div>
                  </div>
                  <TiebreakSelector 
                    order={newTournament.tie_break_order} 
                    setOrder={(order) => setNewTournament({ ...newTournament, tie_break_order: order })} 
                  />
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
              <Button onClick={handleCreateTournament} disabled={isProcessing} className="w-full sm:w-auto">
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(3)].map((_, i) => (
             <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3 mt-2" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
          ))}
        </div>
      ) : tournaments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {tournaments.map((tournament) => {
            const isValidId = typeof tournament.id === 'string' && tournament.id.trim() !== '';
            return (
              <Card key={tournament.id || Math.random()} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate text-lg sm:text-xl">{tournament.name || 'Sin nombre'}</CardTitle>
                      <CardDescription className="capitalize text-sm">{(tournament.pairing_system || 'swiss').replace('_', ' ')}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-2 flex-shrink-0 h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(tournament)} disabled={!isValidId}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(tournament)}
                          className="text-red-600 focus:text-red-600"
                          disabled={!isValidId}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow pb-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 flex-shrink-0" />
                            <span>Estado</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tournament.status]}`}>
                            {statusText[tournament.status]}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 flex-shrink-0" />
                            <span>Rondas</span>
                        </div>
                        <span>{tournament.current_round} / {tournament.total_rounds}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  {isValidId ? (
                    <Link to={createPageUrl(`Tournament?id=${encodeURIComponent(tournament.id)}`)} className="w-full">
                      <Button variant="outline" className="w-full text-sm">
                        Gestionar Torneo <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <div className="w-full">
                      <Button variant="outline" className="w-full" disabled>
                        Error: ID no válido
                      </Button>
                      <p className="text-xs text-red-500 mt-1 text-center">
                        ID: {String(tournament.id) || 'vacío'}
                      </p>
                    </div>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : null}

      {tournaments.length === 0 && !isLoading ? (
        <div className="text-center py-12 sm:py-16 border-2 border-dashed rounded-lg mx-4 sm:mx-0">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700">¡Bienvenido a ChessArbiter!</h3>
            <p className="text-gray-500 mt-2 text-sm sm:text-base px-4">Crea tu primer torneo para empezar a gestionar emparejamientos profesionalmente.</p>
            <p className="text-sm text-blue-600 mt-4 px-4">✓ Emparejamientos automáticos ✓ Gestión de resultados ✓ Clasificaciones en tiempo real ✓ Reportes PDF</p>
        </div>
      ) : null}

      {/* Edit Tournament Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Torneo</DialogTitle>
            <DialogDescription>
              Modifica los detalles de tu torneo.
            </DialogDescription>
          </DialogHeader>
          {editingTournament && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 py-4">
              {/* Columna Izquierda: Información Básica */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Información Básica</h3>
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Nombre del Torneo *</Label>
                  <Input 
                    id="edit-name" 
                    value={editingTournament.name} 
                    onChange={(e) => setEditingTournament({ ...editingTournament, name: e.target.value })} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-pairing">Sistema</Label>
                        <Select 
                        value={editingTournament.pairing_system} 
                        onValueChange={(value) => setEditingTournament({ ...editingTournament, pairing_system: value })}
                        disabled={editingTournament.status !== 'setup'}
                        >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="swiss">Suizo</SelectItem>
                            <SelectItem value="round_robin">Round Robin (Liga)</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-rounds">Rondas *</Label>
                        <Input 
                        id="edit-rounds" 
                        type="number" 
                        value={editingTournament.total_rounds} 
                        onChange={(e) => setEditingTournament({ ...editingTournament, total_rounds: parseInt(e.target.value) || 1 })} 
                        min="1"
                        disabled={editingTournament.status !== 'setup'}
                        />
                    </div>
                </div>
                 <div>
                  <Label className="text-sm">Límite de BYEs Solicitados</Label>
                  <Input 
                    type="number"
                    value={editingTournament.max_requested_byes}
                    onChange={(e) => setEditingTournament({ ...editingTournament, max_requested_byes: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full"
                    disabled={editingTournament.status !== 'setup'}
                  />
                   <p className="text-xs text-gray-500 mt-1">Número máximo de BYEs voluntarios por jugador.</p>
                </div>
                <div>
                  <Label className="text-sm">Ritmo FIDE</Label>
                    <Select 
                      value={editingTournament.event_type} 
                      onValueChange={(v) => setEditingTournament({ ...editingTournament, event_type: v })} 
                      disabled={editingTournament.status !== 'setup'}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar ritmo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STD">Standard</SelectItem><SelectItem value="RPD">Rapid</SelectItem><SelectItem value="BLZ">Blitz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Control de Tiempo</Label>
                    <Input value={editingTournament.time_control || ''} onChange={(e) => setEditingTournament({ ...editingTournament, time_control: e.target.value })} placeholder="Ej: 90'+30''" />
                  </div>
              </div>

              {/* Columna Derecha: Configuración Avanzada */}
              <div className="space-y-4 lg:border-l lg:pl-8">
                <h3 className="text-lg font-semibold text-gray-800 -ml-8 lg:ml-0">Configuración FIDE y Avanzada</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <Switch 
                      id="fide-mode-edit" 
                      checked={editingTournament.fide_mode} 
                      onCheckedChange={(checked) => setEditingTournament({ ...editingTournament, fide_mode: checked })} 
                      disabled={editingTournament.status !== 'setup'} 
                    />
                    <Label htmlFor="fide-mode-edit" className="flex flex-col gap-1 cursor-pointer">
                      <span className="font-semibold text-sm">Modo FIDE</span>
                      <span className="font-normal text-xs text-gray-600">Aplica reglas y validaciones estrictas de la FIDE.</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-md border p-3">
                    <Switch 
                      id="fair-play-mode-edit" 
                      checked={editingTournament.fair_play_mode} 
                      onCheckedChange={(checked) => setEditingTournament({ ...editingTournament, fair_play_mode: checked })} 
                      disabled={editingTournament.status !== 'setup'} 
                    />
                    <Label htmlFor="fair-play-mode-edit" className="flex flex-col gap-1 cursor-pointer">
                      <span className="font-semibold text-sm">Modo Fair Play</span>
                      <span className="font-normal text-xs text-gray-600">Activa el módulo de monitoreo de integridad.</span>
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm flex items-center gap-2"><Key className="h-4 w-4"/> Semilla Maestra</Label>
                    <Input 
                      value={editingTournament.master_seed || ''} 
                      onChange={(e) => setEditingTournament({ ...editingTournament, master_seed: e.target.value })} 
                      disabled={editingTournament.status !== 'setup'} 
                    />
                  </div>
                  <div><Label className="text-sm">Lugar</Label><Input value={editingTournament.event_location || ''} onChange={(e) => setEditingTournament({ ...editingTournament, event_location: e.target.value })} placeholder="Ciudad, País" /></div>
                  <div><Label className="text-sm">Organizador</Label><Input value={editingTournament.organizer_name || ''} onChange={(e) => setEditingTournament({ ...editingTournament, organizer_name: e.target.value })} /></div>
                  <div><Label className="text-sm">Árbitro Principal</Label><Input value={editingTournament.chief_arbiter_name || ''} onChange={(e) => setEditingTournament({ ...editingTournament, chief_arbiter_name: e.target.value })} /></div>
                  <div><Label className="text-sm">FIDE ID Árbitro</Label><Input value={editingTournament.chief_arbiter_fide_id || ''} onChange={(e) => setEditingTournament({ ...editingTournament, chief_arbiter_fide_id: e.target.value })} placeholder="8 dígitos" maxLength="8" pattern="[0-9]{8}" /></div>
                </div>
                <TiebreakSelector 
                  order={editingTournament.tie_break_order || []} 
                  setOrder={(order) => setEditingTournament({ ...editingTournament, tie_break_order: order })} 
                  disabled={editingTournament.status !== 'setup'}
                />
              </div>

              {editingTournament.status !== 'setup' && (
                <p className="lg:col-span-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md flex items-start gap-2">
                  <Info className="h-5 w-5 flex-shrink-0 mt-0.5"/>
                  <span>El torneo ya ha comenzado. Solo se pueden editar el nombre y los datos informativos. Las reglas (sistema, rondas, etc.) están bloqueadas.</span>
                </p>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleEditTournament} disabled={isProcessing} className="w-full sm:w-auto">
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tournament Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el torneo <strong>"{tournamentToDelete?.name}"</strong> y todos sus datos:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Jugadores</li>
                <li>Partidas y resultados</li>
                <li>Incidencias de Fair Play</li>
                <li>Aceptaciones de política</li>
              </ul>
              {tournamentToDelete?.status !== 'setup' && (
                <span className="block mt-3 font-semibold text-red-600">
                  ⚠️ Este torneo ya ha comenzado. Se perderá todo el progreso.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTournament} 
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sí, eliminar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
