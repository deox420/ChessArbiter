
import React, { useState, useEffect, useCallback } from 'react';
import { Tournament } from '@/api/entities';
import { Player } from '@/api/entities';
import { Match } from '@/api/entities';
import { FairPlayIncident } from '@/api/entities';
import { useParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Swords, Trophy, ExternalLink, Clock, ShieldCheck, ArrowUp, ArrowDown, ShieldAlert, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import PlayerListSummary from '../components/tournament/PlayerListSummary';
import RoundsManager from '../components/tournament/RoundsManager';
import StandingsTable from '../components/tournament/StandingsTable';
import ByeManager from '../components/tournament/ByeManager';
import FairPlayManager from '../components/tournament/FairPlayManager';
import TournamentLogs from '../components/tournament/TournamentLogs'; // Import the new component

export default function TournamentPage() {
    const [urlParams] = useState(new URLSearchParams(window.location.search));
    const tournamentId = urlParams.get('id');
    const [tournament, setTournament] = useState(null);
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [fairPlayIncidents, setFairPlayIncidents] = useState([]); // New state for Fair Play Incidents
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('players');
    const [sortConfig, setSortConfig] = useState({ key: 'pairing_number', direction: 'asc' });
    const [hiddenRounds, setHiddenRounds] = useState(new Set()); // New state for hidden rounds

    const toggleRoundVisibility = (roundNum) => {
        setHiddenRounds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(roundNum)) {
                newSet.delete(roundNum);
            } else {
                newSet.add(roundNum);
            }
            return newSet;
        });
    };

    const loadTournamentData = useCallback(async (isInitialLoad = false) => {
        // Validación más estricta del ID
        if (!tournamentId ||
            tournamentId === 'null' ||
            tournamentId === 'undefined' ||
            tournamentId === '-' ||
            typeof tournamentId !== 'string' ||
            tournamentId.trim() === '' ||
            tournamentId.length < 5) { // Los IDs de base44 suelen ser más largos
            console.error("Invalid tournament ID provided:", tournamentId);
            if (isInitialLoad) { // Only update state if it's the initial load
                setTournament(null);
                setIsLoading(false);
            }
            return;
        }

        if (isInitialLoad) setIsLoading(true); // Only show spinner on initial load

        try {
            console.log("Loading tournament data for ID:", tournamentId);

            // Cargar tournament, players y matches concurrentemente
            const [tourneyData, playersData, rawMatchesData] = await Promise.all([
                Tournament.get(tournamentId),
                Player.filter({ tournament_id: tournamentId }, '-score', 1000),
                Match.filter({ tournament_id: tournamentId }, '-round_number', 1000)
            ]);

            if (!tourneyData) {
                console.error("Tournament not found with ID:", tournamentId);
                if (isInitialLoad) { // Only update state if it's the initial load
                    setTournament(null);
                    setIsLoading(false);
                }
                return;
            }

            // Aplicar orden secundario (por número de mesa) en el cliente
            const sortedMatches = (rawMatchesData || []).sort((a, b) => {
                if (a.round_number === b.round_number) {
                    return a.table_number - b.table_number;
                }
                return b.round_number - a.round_number;
            });

            // Actualización inteligente para evitar parpadeos
            setTournament(current => JSON.stringify(current) !== JSON.stringify(tourneyData) ? tourneyData : current);
            setPlayers(current => JSON.stringify(current) !== JSON.stringify(playersData || []) ? (playersData || []) : current);
            setMatches(current => JSON.stringify(current) !== JSON.stringify(sortedMatches) ? sortedMatches : current);

            console.log(`Loaded tournament: ${tourneyData.name} with ${playersData?.length || 0} players and ${sortedMatches?.length || 0} matches`);

        } catch (error) {
            console.error("Error loading tournament data:", error);
            if (isInitialLoad) setTournament(null); // Only update state if it's the initial load
        } finally {
            if (isInitialLoad) setIsLoading(false); // Only hide spinner on initial load
        }
    }, [tournamentId]);

    // Cargar incidencias Fair Play
    const loadFairPlayIncidents = useCallback(async () => {
        if (!tournament?.fair_play_mode || !tournament?.id) return;

        try {
            const data = await FairPlayIncident.filter({ tournament_id: tournament.id }, '', 100);
            setFairPlayIncidents(data || []);
        } catch (error) {
            console.error('Error loading Fair Play incidents:', error);
        }
    }, [tournament?.id, tournament?.fair_play_mode]);

    // Efecto para la carga inicial
    useEffect(() => {
        loadTournamentData(true);
    }, [loadTournamentData]);

    // Efecto para cargar incidencias Fair Play (cuando el torneo se carga o cambia el modo fair play)
    useEffect(() => {
        if (tournament?.fair_play_mode) {
            loadFairPlayIncidents();
        }
    }, [tournament?.fair_play_mode, loadFairPlayIncidents]);

    // Efecto para la sincronización en tiempo real (polling)
    useEffect(() => {
        const intervalId = setInterval(() => {
            // Llama a loadData en modo "silencioso" (sin spinner de carga)
            loadTournamentData(false);
            // También carga las incidencias de Fair Play si el modo está activado
            if (tournament?.fair_play_mode) {
                loadFairPlayIncidents();
            }
        }, 10000); // Cada 10 segundos

        // Limpia el intervalo cuando el componente se desmonta
        return () => clearInterval(intervalId);
    }, [loadTournamentData, loadFairPlayIncidents, tournament?.fair_play_mode]); // Dependencias para que se reinicie si cambian

    // Validación temprana mejorada
    if (!tournamentId ||
        tournamentId === 'null' ||
        tournamentId === 'undefined' ||
        tournamentId === '-' ||
        typeof tournamentId !== 'string' ||
        tournamentId.trim() === '' ||
        tournamentId.length < 5) {
        return (
            <div className="text-center py-16">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Error: Torneo no encontrado</h1>
                <p className="text-gray-600 mb-4">No se pudo cargar el torneo. El ID proporcionado no es válido.</p>
                <p className="text-sm text-gray-500 mb-4">ID recibido: "{String(tournamentId) || 'vacío'}" (tipo: {typeof tournamentId})</p>
                <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline">
                    <ArrowLeft className="mr-2 h-4 w-4 inline" />
                    Volver a todos los torneos
                </Link>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div>
                <Skeleton className="h-8 w-1/4 mb-2" />
                <Skeleton className="h-6 w-1/2 mb-6" />
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!tournament) {
        return (
            <div className="text-center py-16">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Torneo no encontrado</h1>
                <p className="text-gray-600 mb-4">El torneo que buscas no existe o no tienes permisos para verlo.</p>
                <p className="text-sm text-gray-500 mb-4">ID buscado: {tournamentId}</p>
                <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline">
                    <ArrowLeft className="mr-2 h-4 w-4 inline" />
                    Volver a todos los torneos
                </Link>
            </div>
        );
    }

    // Función para ordenar jugadores con dirección ascendente/descendente
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
                case 'federation_id': // Maps to federation_id in Player entity
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

    const sortedPlayers = sortPlayers(players, sortConfig);
    const pendingIncidentsCount = fairPlayIncidents.filter(i => i.status === 'pending').length; // Calculate pending incidents count

    return (
        <div className="px-2 sm:px-0">
            <Link to={createPageUrl('Dashboard')} className="flex items-center text-sm text-blue-600 hover:underline mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a todos los torneos
            </Link>

            <div className="mb-4 sm:mb-6 border-b pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 break-words">{tournament.name}</h1>
                    {tournament.fide_mode && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-sm w-fit">
                            <ShieldCheck className="mr-2 h-4 w-4"/> Modo FIDE
                        </Badge>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-x-6 sm:gap-y-2 text-xs sm:text-sm text-gray-500 mt-2">
                    <span className="truncate">Sistema: <span className="font-semibold text-gray-700 capitalize">{tournament.pairing_system.replace('_', ' ')} - {tournament.total_rounds} Rondas</span></span>
                    {tournament.event_location && <span className="truncate">Lugar: <span className="font-semibold text-gray-700">{tournament.event_location}</span></span>}
                    {tournament.time_control && <span className="truncate">Ritmo: <span className="font-semibold text-gray-700">{tournament.time_control} ({tournament.event_type})</span></span>}
                    {tournament.chief_arbiter_name && <span className="truncate">Arbitro: <span className="font-semibold text-gray-700">{tournament.chief_arbiter_name}</span></span>}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="overflow-x-auto">
                    <TabsList className={`grid w-full min-w-fit ${
                        tournament.pairing_system === 'swiss' && tournament.fair_play_mode
                            ? 'grid-cols-6'
                            : tournament.pairing_system === 'swiss' || tournament.fair_play_mode
                                ? 'grid-cols-5'
                                : 'grid-cols-4'
                    }`}>
                        <TabsTrigger value="players" className="text-xs sm:text-sm px-2 sm:px-3">
                            <Users className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Jugadores ({players.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="rounds" className="text-xs sm:text-sm px-2 sm:px-3">
                            <Swords className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Rondas</span>
                        </TabsTrigger>
                        <TabsTrigger value="standings" className="text-xs sm:text-sm px-2 sm:px-3">
                            <Trophy className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Clasificacion</span>
                        </TabsTrigger>
                        {tournament.pairing_system === 'swiss' && (
                            <TabsTrigger value="bye" className="text-xs sm:text-sm px-2 sm:px-3">
                                <Clock className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                <span>Gestion de BYE</span>
                            </TabsTrigger>
                        )}
                        {tournament.fair_play_mode && (
                            <TabsTrigger value="fair_play" className="text-xs sm:text-sm px-2 sm:px-3 relative">
                                <ShieldAlert className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                <span>Fair Play</span>
                                {/* Indicador de incidencias pendientes */}
                                {pendingIncidentsCount > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs min-w-[1.25rem] h-5 rounded-full flex items-center justify-center"
                                    >
                                        {pendingIncidentsCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        )}
                        <TabsTrigger value="logs" className="text-xs sm:text-sm px-2 sm:px-3">
                            <Shield className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                            <span>Logs</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="players" className="mt-4">
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-900 mb-2">📋 Gestion de Jugadores</h3>
                            <p className="text-sm text-blue-800">
                                Visualiza todos los jugadores inscritos en el torneo. Desde aqui puedes acceder a la gestion completa
                                para añadir, editar o eliminar jugadores, asignar numeros de emparejamiento y verificar datos FIDE.
                                {tournament?.fide_mode && " En modo FIDE se requieren datos adicionales como ID FIDE y federacion."}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                            <Button asChild className="w-full sm:w-auto">
                                <Link to={createPageUrl(`PlayerManagement?id=${tournament.id}`)}>
                                    Gestionar Jugadores <ExternalLink className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                        <PlayerListSummary players={sortedPlayers} isLoading={isLoading} sortConfig={sortConfig} setSortConfig={setSortConfig} />
                    </div>
                </TabsContent>
                <TabsContent value="rounds" className="mt-4">
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h3 className="font-semibold text-green-900 mb-2">⚔️ Gestion de Enfrentamientos</h3>
                            <p className="text-sm text-green-800">
                                Controla las rondas del torneo: genera emparejamientos automaticos, introduce resultados y confirma rondas.
                                Los emparejamientos siguen las reglas {tournament?.pairing_system === 'swiss' ? 'del sistema suizo' : 'de round robin'}.
                                Una vez confirmada una ronda, se actualizan automaticamente las puntuaciones y desempates.
                            </p>
                            {tournament?.fide_mode && (
                                <p className="text-xs text-green-700 mt-2 font-medium">
                                    🏅 Modo FIDE: Los emparejamientos y desempates siguen estrictamente las regulaciones FIDE.
                                </p>
                            )}
                        </div>
                        <RoundsManager 
                            tournament={tournament} 
                            players={sortedPlayers} 
                            matches={matches} 
                            onUpdate={loadTournamentData}
                            hiddenRounds={hiddenRounds}
                            toggleRoundVisibility={toggleRoundVisibility}
                        />
                    </div>
                </TabsContent>
                <TabsContent value="standings" className="mt-4">
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h3 className="font-semibold text-yellow-900 mb-2">🏆 Clasificacion General</h3>
                            <p className="text-sm text-yellow-800">
                                Clasificacion actualizada del torneo ordenada por puntos y sistemas de desempate.
                                Los desempates configurados son: {tournament?.tie_break_order?.map((tb, i) => (
                                    <span key={tb} className="font-medium">
                                        {tb === 'buchholz' ? 'Buchholz' :
                                         tb === 'sonneborn' ? 'Sonneborn-Berger' :
                                         tb === 'progressive' ? 'Progresivo' :
                                         tb === 'wins' ? 'Victorias' : tb}
                                        {i < tournament.tie_break_order.length - 1 ? ', ' : ''}
                                    </span>
                                )) || 'Buchholz, Sonneborn-Berger'}.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                                <div className="bg-white p-2 rounded">
                                    <span className="font-semibold text-green-700">Victoria:</span> {tournament?.points_win || 1} punto{(tournament?.points_win || 1) !== 1 ? 's' : ''}
                                </div>
                                <div className="bg-white p-2 rounded">
                                    <span className="font-semibold text-blue-700">Empate:</span> {tournament?.points_draw || 0.5} punto{(tournament?.points_draw || 0.5) !== 1 ? 's' : ''}
                                </div>
                                <div className="bg-white p-2 rounded">
                                    <span className="font-semibold text-red-700">Derrota:</span> {tournament?.points_loss || 0} punto{(tournament?.points_loss || 0) !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>
                        <StandingsTable players={sortedPlayers} tournament={tournament} />
                    </div>
                </TabsContent>
                {tournament.pairing_system === 'swiss' && (
                    <TabsContent value="bye" className="mt-4">
                        <div className="space-y-4">
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h3 className="font-semibold text-orange-900 mb-2">⏸️ Gestion de BYEs</h3>
                                <p className="text-sm text-orange-800">
                                    Configura los diferentes tipos de BYE para la proxima ronda. Los BYEs permiten que un jugador
                                    descanse sin enfrentar a un oponente. En torneos suizos, cuando hay un numero impar de jugadores,
                                    un jugador recibe automaticamente BYE.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
                                    <div className="bg-white p-2 rounded">
                                        <span className="font-semibold text-orange-700">BYE Automatico:</span> {tournament?.points_bye_automatic || 1} punto{(tournament?.points_bye_automatic || 1) !== 1 ? 's' : ''}
                                    </div>
                                    <div className="bg-white p-2 rounded">
                                        <span className="font-semibold text-blue-700">BYE Solicitado:</span> {tournament?.points_bye_requested || 0.5} punto{(tournament?.points_bye_requested || 0.5) !== 1 ? 's' : ''}
                                    </div>
                                    <div className="bg-white p-2 rounded">
                                        <span className="font-semibold text-red-700">Incomparecencia:</span> {tournament?.points_bye_absence || 0} punto{(tournament?.points_bye_absence || 0) !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>
                            <ByeManager tournament={tournament} players={players} onUpdate={loadTournamentData} sortConfig={sortConfig} setSortConfig={setSortConfig} />
                        </div>
                    </TabsContent>
                )}

                {tournament.fair_play_mode && (
                    <TabsContent value="fair_play" className="mt-4">
                        <div className="space-y-4">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <h3 className="font-semibold text-purple-900 mb-2">🛡️ Modulo Fair Play</h3>
                                <p className="text-sm text-purple-800">
                                    Supervisa la integridad del torneo. Aqui puedes ver las aceptaciones de la politica de juego limpio,
                                    revisar incidentes como perdidas de foco o reconexiones, y gestionar las resoluciones.
                                </p>
                            </div>
                            <FairPlayManager tournament={tournament} players={players} onUpdate={loadFairPlayIncidents} incidents={fairPlayIncidents} />
                        </div>
                    </TabsContent>
                )}

                <TabsContent value="logs" className="mt-4">
                    <div className="space-y-4">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                            <h3 className="font-semibold text-indigo-900 mb-2">🛡️ Auditoria del Torneo</h3>
                            <p className="text-sm text-indigo-800">
                                Registro completo de todas las acciones realizadas en el torneo. Gestiona usuarios y sus roles, 
                                y supervisa toda la actividad para garantizar la transparencia y trazabilidad.
                            </p>
                        </div>
                        <TournamentLogs tournament={tournament} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
