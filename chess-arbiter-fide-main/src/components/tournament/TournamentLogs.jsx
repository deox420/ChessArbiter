import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from "@/components/ui/use-toast";
import { ArbiterLog } from '@/api/entities';
import { TournamentUser } from '@/api/entities';
import { User } from '@/api/entities';
import { Shield, Users, Clock, Search, Plus, Trash2, Eye } from 'lucide-react';

const roleLabels = {
    'owner': 'Propietario',
    'chief_arbiter': 'Arbitro Principal', 
    'deputy_arbiter': 'Arbitro Adjunto',
    'organizer': 'Organizador',
    'observer': 'Observador'
};

const roleColors = {
    'owner': 'bg-purple-100 text-purple-800',
    'chief_arbiter': 'bg-blue-100 text-blue-800',
    'deputy_arbiter': 'bg-green-100 text-green-800', 
    'organizer': 'bg-yellow-100 text-yellow-800',
    'observer': 'bg-gray-100 text-gray-800'
};

const actionLabels = {
    'tournament_created': 'Torneo Creado',
    'tournament_started': 'Torneo Iniciado',
    'tournament_completed': 'Torneo Completado',
    'round_generated': 'Ronda Generada',
    'round_confirmed': 'Ronda Confirmada', 
    'result_updated': 'Resultado Actualizado',
    'player_added': 'Jugador Añadido',
    'player_removed': 'Jugador Eliminado',
    'player_withdrawn': 'Jugador Retirado',
    'incident_created': 'Incidencia Creada',
    'incident_resolved': 'Incidencia Resuelta',
    'user_role_assigned': 'Rol Asignado',
    'user_role_removed': 'Rol Removido',
    'trf_exported': 'TRF Exportado'
};

export default function TournamentLogs({ tournament }) {
    const [logs, setLogs] = useState([]);
    const [tournamentUsers, setTournamentUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('observer');
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        try {
            const [logsData, usersData] = await Promise.all([
                ArbiterLog.filter({ tournament_id: tournament.id }, '-created_date', 500),
                TournamentUser.filter({ tournament_id: tournament.id }, 'created_date', 100)
            ]);
            setLogs(logsData || []);
            setTournamentUsers(usersData || []);
        } catch (error) {
            console.error('Error loading logs:', error);
        } finally {
            setIsLoading(false);
        }
    }, [tournament.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddUser = async () => {
        if (!newUserEmail.trim()) {
            toast({ title: "Error", description: "Ingresa un email valido.", variant: "destructive" });
            return;
        }

        try {
            const currentUser = await User.me();
            await TournamentUser.create({
                tournament_id: tournament.id,
                user_email: newUserEmail.trim(),
                user_name: newUserEmail.split('@')[0], // Usar parte del email como nombre temporal
                role: newUserRole,
                assigned_by: currentUser.email,
                assigned_at: new Date().toISOString(),
                permissions: newUserRole === 'observer' ? ['read'] : ['read', 'write'],
                is_active: true
            });

            toast({ title: "Usuario Agregado", description: `Usuario ${newUserEmail} agregado con rol ${roleLabels[newUserRole]}.` });
            setNewUserEmail('');
            setNewUserRole('observer');
            setIsAddUserOpen(false);
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo agregar el usuario.", variant: "destructive" });
        }
    };

    const handleRemoveUser = async (userId) => {
        try {
            await TournamentUser.delete(userId);
            toast({ title: "Usuario Eliminado", description: "Usuario eliminado del torneo." });
            loadData();
        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar el usuario.", variant: "destructive" });
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = searchTerm === '' || 
            log.action_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.user_name && log.user_name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
        
        return matchesSearch && matchesAction;
    });

    return (
        <div className="space-y-6">
            {/* Panel de Usuarios del Torneo */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Usuarios del Torneo ({tournamentUsers.length})
                        </CardTitle>
                        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Agregar Usuario
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Agregar Usuario al Torneo</DialogTitle>
                                    <DialogDescription>
                                        Asigna un rol a un usuario para este torneo específico.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="user-email">Email del Usuario</Label>
                                        <Input
                                            id="user-email"
                                            type="email"
                                            value={newUserEmail}
                                            onChange={(e) => setNewUserEmail(e.target.value)}
                                            placeholder="usuario@example.com"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="user-role">Rol</Label>
                                        <Select value={newUserRole} onValueChange={setNewUserRole}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="observer">Observador</SelectItem>
                                                <SelectItem value="organizer">Organizador</SelectItem>
                                                <SelectItem value="deputy_arbiter">Arbitro Adjunto</SelectItem>
                                                <SelectItem value="chief_arbiter">Arbitro Principal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleAddUser}>
                                        Agregar
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {tournamentUsers.length > 0 ? (
                        <div className="grid gap-2">
                            {tournamentUsers.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <div className="font-medium">{user.user_email}</div>
                                            {user.user_name && user.user_name !== user.user_email.split('@')[0] && (
                                                <div className="text-sm text-gray-500">{user.user_name}</div>
                                            )}
                                        </div>
                                        <Badge className={roleColors[user.role]}>
                                            {roleLabels[user.role]}
                                        </Badge>
                                    </div>
                                    {user.role !== 'owner' && (
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handleRemoveUser(user.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-4">No hay usuarios asignados a este torneo.</p>
                    )}
                </CardContent>
            </Card>

            {/* Panel de Logs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Registro de Actividad ({filteredLogs.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Filtros */}
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar en logs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filtrar por accion" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Acciones</SelectItem>
                                <SelectItem value="round_generated">Rondas Generadas</SelectItem>
                                <SelectItem value="result_updated">Resultados</SelectItem>
                                <SelectItem value="player_added">Jugadores</SelectItem>
                                <SelectItem value="incident_created">Incidencias</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tabla de Logs */}
                    {filteredLogs.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha/Hora</TableHead>
                                    <TableHead>Usuario</TableHead>
                                    <TableHead>Accion</TableHead>
                                    <TableHead>Descripcion</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                                {new Date(log.created_date).toLocaleString('es-ES', {
                                                    day: '2-digit',
                                                    month: '2-digit', 
                                                    year: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium text-sm">{log.user_name || 'Sistema'}</div>
                                                <div className="text-xs text-gray-500">{log.user_email}</div>
                                                {log.user_role && (
                                                    <Badge variant="outline" className="text-xs mt-1">
                                                        {roleLabels[log.user_role] || log.user_role}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {actionLabels[log.action_type] || log.action_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {log.action_description}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No se encontraron logs que coincidan con los filtros.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}