
import React, { useState, useEffect } from 'react';
import { Player } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { UserMinus, Save, RefreshCw, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export default function ByeManager({ tournament, players, onUpdate, sortConfig, setSortConfig }) {
    const [byeRequests, setByeRequests] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Inicializar el estado con las solicitudes de BYE actuales
        const currentByeRequests = {};
        players.forEach(player => {
            // Si ya había solicitud de BYE, mantenerla, sino 'none'
            currentByeRequests[player.id] = player.bye_next_round ? 'requested' : 'none';
        });
        setByeRequests(currentByeRequests);
    }, [players]);

    const handleByeChange = (playerId, byeType) => {
        setByeRequests(prev => ({
            ...prev,
            [playerId]: byeType
        }));
    };

    const handleSaveByeRequests = async () => {
        setIsLoading(true);
        try {
            const updates = [];
            
            for (const [playerId, byeType] of Object.entries(byeRequests)) {
                const player = players.find(p => p.id === playerId);
                const shouldHaveBye = byeType !== 'none';
                
                if (player && player.bye_next_round !== shouldHaveBye) {
                    updates.push(Player.update(playerId, { bye_next_round: shouldHaveBye }));
                }
            }

            await Promise.all(updates);
            
            toast({ 
                title: "Solicitudes de BYE actualizadas", 
                description: `Se han guardado las solicitudes para la ronda ${tournament.current_round + 1}.` 
            });
            
            await onUpdate();
        } catch (error) {
            console.error("Error saving bye requests:", error);
            toast({ 
                title: "Error", 
                description: "No se pudieron guardar las solicitudes de BYE.", 
                variant: "destructive" 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const resetByeRequests = () => {
        const resetRequests = {};
        players.forEach(player => {
            resetRequests[player.id] = 'none';
        });
        setByeRequests(resetRequests);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        // Ensure sortConfig is not undefined before accessing its properties
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Función para ordenar jugadores
    const sortPlayers = (players, config) => {
        const sorted = [...players];
        if (!config || !config.key) {
            // Default sort if no config is provided or key is missing
            return sorted.sort((a, b) => (a.pairing_number || 999) - (b.pairing_number || 999));
        }

        const { key, direction } = config;

        return sorted.sort((a, b) => {
            let valA, valB;

            switch (key) {
                case 'full_name':
                    valA = a.full_name || '';
                    valB = b.full_name || '';
                    break;
                case 'rating':
                    valA = a.rating === null || a.rating === undefined ? -Infinity : a.rating;
                    valB = b.rating === null || b.rating === undefined ? -Infinity : b.rating;
                    break;
                case 'score':
                    valA = a.score === null || a.score === undefined ? -Infinity : a.score;
                    valB = b.score === null || b.score === undefined ? -Infinity : b.score;
                    break;
                case 'club':
                    valA = a.club || '';
                    valB = b.club || '';
                    break;
                case 'fide_id': // Maps to federation_id in Player entity
                    valA = a.federation_id || '';
                    valB = b.federation_id || '';
                    break;
                case 'pairing_number':
                    valA = a.pairing_number || 999;
                    valB = b.pairing_number || 999;
                    break;
                default:
                    valA = a[key];
                    valB = b[key];
            }

            let comparison = 0;
            if (typeof valA === 'string' && typeof valB === 'string') {
                comparison = valA.localeCompare(valB);
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                comparison = valA - valB;
            }

            return direction === 'asc' ? comparison : -comparison;
        });
    };

    const activePlayers = sortPlayers(players.filter(p => !p.is_withdrawn), sortConfig);
    const playersWithBye = activePlayers.filter(p => byeRequests[p.id] !== 'none');
    const hasChanges = players.some(p => {
        const shouldHaveBye = byeRequests[p.id] !== 'none';
        return (p.bye_next_round || false) !== shouldHaveBye;
    });

    // Determinar qué jugador recibirá BYE automático
    const playersForAutomatic = activePlayers.filter(p => byeRequests[p.id] === 'none');
    const willNeedAutomaticBye = (playersForAutomatic.length % 2 !== 0);
    
    let automaticByePlayer = null;
    if (willNeedAutomaticBye) {
        // Encontrar al jugador elegible para BYE:
        // 1. Filtra por los que NO tienen el BYE solicitado/ausente.
        // 2. Ordena por:
        //    a. Menor número de BYEs recibidos.
        //    b. Menor puntuación.
        //    c. Menor rating (como desempate final).
        automaticByePlayer = playersForAutomatic
            .sort((a, b) => {
                const byesA = a.rounds_with_bye?.length || 0;
                const byesB = b.rounds_with_bye?.length || 0;
                if (byesA !== byesB) return byesA - byesB;

                const scoreA = a.score || 0;
                const scoreB = b.score || 0;
                if (scoreA !== scoreB) return scoreA - scoreB;

                return (a.rating || 0) - (b.rating || 0);
            })[0];
    }

    const getByeTypeDisplay = (type) => {
        switch (type) {
            case 'requested': return { text: 'Solicitado', color: 'bg-blue-100 text-blue-800', points: tournament.points_bye_requested };
            case 'absence': return { text: 'Incomparecencia', color: 'bg-red-100 text-red-800', points: tournament.points_bye_absence };
            default: return { text: 'Sin BYE', color: 'bg-gray-100 text-gray-600', points: 0 };
        }
    };

    const SortableHeader = ({ children, sortKey, className = '' }) => (
        <TableHead
            onClick={() => handleSort(sortKey)}
            className={`cursor-pointer hover:bg-gray-50 transition-colors select-none ${className}`}
        >
            <div className="flex items-center gap-2">
                {children}
                {/* Add a check for sortConfig here to prevent errors if it's undefined */}
                {sortConfig && sortConfig.key === sortKey ? (
                    sortConfig.direction === 'asc' ? 
                        <ArrowUp className="h-4 w-4 text-blue-600" /> : 
                        <ArrowDown className="h-4 w-4 text-blue-600" />
                ) : (
                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                )}
            </div>
        </TableHead>
    );

    if (tournament.status === 'completed') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserMinus className="h-5 w-5" />
                        Gestión de BYEs
                    </CardTitle>
                    <CardDescription>El torneo ha finalizado. No se pueden gestionar más BYEs.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (tournament.current_round >= tournament.total_rounds) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserMinus className="h-5 w-5" />
                        Gestión de BYEs
                    </CardTitle>
                    <CardDescription>No hay más rondas programadas.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <UserMinus className="h-5 w-5" />
                            Gestión de BYEs - Ronda {tournament.current_round + 1}
                        </CardTitle>
                        <CardDescription>
                            Gestiona los diferentes tipos de BYE para la próxima ronda.
                            {playersWithBye.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {playersWithBye.length} BYE{playersWithBye.length !== 1 ? 's' : ''} configurado{playersWithBye.length !== 1 ? 's' : ''}
                                </Badge>
                            )}
                        </CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={resetByeRequests}
                            disabled={isLoading}
                            className="w-full sm:w-auto"
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Limpiar
                        </Button>
                        <Button 
                            onClick={handleSaveByeRequests}
                            disabled={!hasChanges || isLoading}
                            size="sm"
                            className="w-full sm:w-auto"
                        >
                            <Save className="h-4 w-4 mr-1" />
                            {isLoading ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {hasChanges && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 font-medium">
                            ⚠️ Tienes cambios sin guardar. Recuerda guardar antes de generar la próxima ronda.
                        </p>
                    </div>
                )}

                {willNeedAutomaticBye && automaticByePlayer && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-medium text-orange-900">BYE Automático Necesario</p>
                                <p className="text-sm text-orange-800">
                                    Número impar de jugadores. <strong>{automaticByePlayer.full_name}</strong> recibirá 
                                    BYE automático (+{tournament.points_bye_automatic} punto{tournament.points_bye_automatic !== 1 ? 's' : ''}).
                                </p>
                                <p className="text-xs text-orange-700 mt-1">
                                    Se asigna al jugador con menos BYEs previos y menor puntuación.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="border rounded-md overflow-x-auto">
                    {/* Vista móvil */}
                    <div className="block lg:hidden">
                        {activePlayers.length > 0 ? (
                            <div className="divide-y">
                                {activePlayers.map((player) => {
                                    const isAutomaticBye = automaticByePlayer?.id === player.id;
                                    const byeType = byeRequests[player.id] || 'none';
                                    const byeDisplay = getByeTypeDisplay(byeType);
                                    const byesSoFar = player.rounds_with_bye?.length || 0;
                                    const byeLimit = tournament.max_requested_byes ?? 1;
                                    const canRequestBye = byesSoFar < byeLimit;
                                    
                                    return (
                                        <div key={player.id} className={`p-4 space-y-3 ${isAutomaticBye ? "bg-orange-50" : ""}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium flex items-center gap-2 text-sm">
                                                        {player.full_name}
                                                        {isAutomaticBye && (
                                                            <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300">
                                                                BYE Auto
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {player.club && (
                                                        <div className="text-xs text-gray-500 mt-1">{player.club}</div>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs space-y-1">
                                                    <div>Rating: {player.rating}</div>
                                                    <div className="font-semibold">Puntos: {(player.score || 0).toFixed(1)}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex justify-between items-center">
                                                <div className="text-xs text-gray-600">
                                                    BYEs anteriores: {byesSoFar} / {byeLimit}
                                                </div>
                                                <div className="text-xs font-semibold">
                                                    {isAutomaticBye ? (
                                                        <span className="text-orange-600">
                                                            +{tournament.points_bye_automatic}
                                                        </span>
                                                    ) : byeType !== 'none' ? (
                                                        <span className={byeType === 'requested' ? 'text-blue-600' : 'text-red-600'}>
                                                            +{byeDisplay.points}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">0</span>
                                                    )}
                                                </div>
                                            </div>

                                            {isAutomaticBye ? (
                                                <Badge className="bg-orange-100 text-orange-800 w-full justify-center">
                                                    Automático
                                                </Badge>
                                            ) : (
                                                <Select
                                                    value={byeType}
                                                    onValueChange={(value) => handleByeChange(player.id, value)}
                                                    disabled={isLoading}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Sin BYE</SelectItem>
                                                        <SelectItem value="requested" disabled={!canRequestBye}>
                                                          BYE Solicitado {!canRequestBye && `(Límite: ${byesSoFar}/${byeLimit})`}
                                                        </SelectItem>
                                                        <SelectItem value="absence">Incomparecencia</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                No hay jugadores activos.
                            </div>
                        )}
                    </div>

                    {/* Vista escritorio */}
                    <div className="hidden lg:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHeader sortKey="full_name">Jugador</SortableHeader>
                                    <SortableHeader sortKey="rating" className="text-center">Rating</SortableHeader>
                                    <SortableHeader sortKey="score" className="text-center">Puntos</SortableHeader>
                                    <TableHead className="text-center">BYEs Anteriores</TableHead>
                                    <TableHead className="text-center w-[200px]">Tipo de BYE</TableHead>
                                    <TableHead className="text-center">Puntos a Recibir</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activePlayers.length > 0 ? (
                                    activePlayers.map((player) => {
                                        const isAutomaticBye = automaticByePlayer?.id === player.id;
                                        const byeType = byeRequests[player.id] || 'none';
                                        const byeDisplay = getByeTypeDisplay(byeType);
                                        const byesSoFar = player.rounds_with_bye?.length || 0;
                                        const byeLimit = tournament.max_requested_byes ?? 1;
                                        const canRequestBye = byesSoFar < byeLimit;
                                        
                                        return (
                                            <TableRow key={player.id} className={isAutomaticBye ? "bg-orange-50" : ""}>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium flex items-center gap-2">
                                                            {player.full_name}
                                                            {isAutomaticBye && (
                                                                <Badge variant="outline" className="text-xs bg-orange-100 border-orange-300">
                                                                    BYE Auto
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {player.club && (
                                                            <div className="text-sm text-gray-500">{player.club}</div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">{player.rating}</TableCell>
                                                <TableCell className="text-center font-semibold">
                                                    {(player.score || 0).toFixed(1)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="text-xs">
                                                        {byesSoFar}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {isAutomaticBye ? (
                                                        <Badge className="bg-orange-100 text-orange-800">
                                                            Automático
                                                        </Badge>
                                                    ) : (
                                                        <Select
                                                            value={byeType}
                                                            onValueChange={(value) => handleByeChange(player.id, value)}
                                                            disabled={isLoading}
                                                        >
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">Sin BYE</SelectItem>
                                                                <SelectItem value="requested" disabled={!canRequestBye}>
                                                                  BYE Solicitado {!canRequestBye && `(Límite)`}
                                                                </SelectItem>
                                                                <SelectItem value="absence">Incomparecencia</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center font-semibold">
                                                    {isAutomaticBye ? (
                                                        <span className="text-orange-600">
                                                            +{tournament.points_bye_automatic}
                                                        </span>
                                                    ) : byeType !== 'none' ? (
                                                        <span className={byeType === 'requested' ? 'text-blue-600' : 'text-red-600'}>
                                                            +{byeDisplay.points}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">0</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No hay jugadores activos.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <h4 className="font-medium text-orange-900 mb-1 text-sm">BYE Automático</h4>
                        <p className="text-xs text-orange-800">Por número impar: <strong>+{tournament.points_bye_automatic} punto{tournament.points_bye_automatic !== 1 ? 's' : ''}</strong></p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-1 text-sm">BYE Solicitado</h4>
                        <p className="text-xs text-blue-800">Descanso voluntario: <strong>+{tournament.points_bye_requested} punto{tournament.points_bye_requested !== 1 ? 's' : ''}</strong></p>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <h4 className="font-medium text-red-900 mb-1 text-sm">BYE por Incomparecencia</h4>
                        <p className="text-xs text-red-800">No se presentó: <strong>+{tournament.points_bye_absence} punto{tournament.points_bye_absence !== 1 ? 's' : ''}</strong></p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
