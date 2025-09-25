
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from "@/components/ui/use-toast";
import { Tournament } from '@/api/entities';
import { Match } from '@/api/entities';
import { Player } from '@/api/entities';
import { Play, FileText, Download, CheckCircle, Loader2, Info, Square } from 'lucide-react';
import { generateRoundPdf } from '@/api/functions';
import { generateRoundPgn } from '@/api/functions';
import { generateSwissPairings } from '@/api/functions';
import { generateRoundRobinPairings } from '@/api/functions';
import { calculateAdvancedTiebreaks } from '@/api/functions';

export default function RoundsManager({ tournament, players, matches, onUpdate, hiddenRounds, toggleRoundVisibility }) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [pendingRoundToConfirm, setPendingRoundToConfirm] = useState(null);
    // Introduce local state for matches to allow optimistic updates
    const [localMatches, setLocalMatches] = useState(matches);

    // Update localMatches when the matches prop changes (e.g., after onUpdate or polling)
    useEffect(() => {
        setLocalMatches(matches);
    }, [matches]);

    const handleStartTournament = async () => {
        setIsProcessing(true);
        try {
            await Tournament.update(tournament.id, { status: 'running' });
            toast({ title: "Torneo Iniciado", description: "El torneo ha comenzado oficialmente." });
            onUpdate();
        } catch (error) {
            toast({ title: "Error", description: "Error al iniciar el torneo.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGenerateRound = async (roundNumber) => {
        setIsProcessing(true);
        try {
            const pairingFunction = tournament.pairing_system === 'swiss' ? generateSwissPairings : generateRoundRobinPairings;
            await pairingFunction({ tournamentId: tournament.id, roundNumber });
            toast({ title: "Ronda Generada", description: `Ronda ${roundNumber} generada exitosamente.` });
            onUpdate();
        } catch (error) {
            toast({ title: "Error", description: `Error al generar la ronda ${roundNumber}: ${error.message}`, variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateResult = async (matchId, result) => {
        // Find the original match to revert if necessary
        const originalMatch = localMatches.find(m => m.id === matchId);
        if (!originalMatch) return; // Should not happen

        try {
            // Optimistic update: update the local state immediately
            setLocalMatches(prevMatches =>
                prevMatches.map(match =>
                    match.id === matchId ? { ...match, result } : match
                )
            );

            // Update in the database in the background
            await Match.update(matchId, { result });
            toast({ title: "Resultado Actualizado", description: "El resultado se ha guardado correctamente." });
            
            // NO se llama a onUpdate() para evitar recarga completa. El polling se encargará de la sincronización.
        } catch (error) {
            // If it fails, revert the optimistic change
            setLocalMatches(prevMatches =>
                prevMatches.map(match =>
                    match.id === matchId ? { ...match, result: originalMatch.result } : match
                )
            );
            toast({ title: "Error", description: "Error al actualizar el resultado.", variant: "destructive" });
        }
    };

    const handleConfirmRound = async (roundNumber) => {
        setIsProcessing(true);
        try {
            // La función de backend ahora calcula Y GUARDA los resultados.
            // Ya no es necesario procesar la respuesta y hacer actualizaciones manuales.
            await calculateAdvancedTiebreaks({ tournamentId: tournament.id });
            
            // Marcar ronda como confirmada
            const currentConfirmedRounds = tournament.confirmed_rounds || [];
            const updatedConfirmedRounds = [...currentConfirmedRounds, roundNumber];
            
            const updateData = { confirmed_rounds: updatedConfirmedRounds };
            
            // Si es la última ronda, marcar torneo como completado
            if (roundNumber === tournament.total_rounds) {
                updateData.status = 'completed';
            }
            
            await Tournament.update(tournament.id, updateData);
            
            toast({ 
                title: "Ronda Confirmada", 
                description: `Ronda ${roundNumber} confirmada. Puntuaciones y desempates actualizados.` 
            });
            // Recargar todos los datos para reflejar los cambios
            onUpdate();
        } catch (error) {
            toast({ title: "Error", description: `Error al confirmar la ronda: ${error.message || 'Error desconocido'}.`, variant: "destructive" });
        } finally {
            setIsProcessing(false);
            setShowConfirmDialog(false);
            setPendingRoundToConfirm(null); 
        }
    };

    const handleExportRoundPdf = async (roundNumber) => {
        setIsExporting(true);
        try {
            const response = await generateRoundPdf({ tournamentId: tournament.id, roundNumber });
            const blob = new Blob([response.data], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_R${roundNumber}.html`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "PDF Exportado", description: `PDF de la ronda ${roundNumber} generado correctamente.` });
        } catch (error) {
            toast({ title: "Error", description: "Error al exportar PDF: " + error.message, variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportRoundPgn = async (roundNumber, includeMoves = false) => {
        setIsExporting(true);
        try {
            const response = await generateRoundPgn({ 
                tournamentId: tournament.id, 
                round: roundNumber,
                includeMoves 
            });
            const blob = new Blob([response.data], { type: 'application/x-chess-pgn; charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_R${roundNumber}.pgn`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ 
                title: "PGN de Ronda Exportado", 
                description: `PGN de la ronda ${roundNumber} ${includeMoves ? 'con jugadas' : 'solo resultados'} generado correctamente.` 
            });
        } catch (error) {
            toast({ title: "Error", description: "Error al exportar PGN de ronda: " + error.message, variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };
    
    // Lógica para determinar si se puede generar la siguiente ronda
    const canGenerateNextRound = tournament.status === 'running' && 
                                 tournament.current_round < tournament.total_rounds &&
                                 (tournament.current_round === 0 || (tournament.confirmed_rounds || []).includes(tournament.current_round));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Gestión de Rondas</span>
                    {tournament.status === 'setup' && (
                        <Button 
                            onClick={handleStartTournament} 
                            disabled={isProcessing || players.length < 2}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            Empezar Torneo
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {tournament.status === 'setup' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p className="text-sm text-yellow-800">
                            El torneo está en preparación. Para generar la primera ronda, inicia el torneo haciendo clic en "Empezar Torneo".
                        </p>
                    </div>
                )}

                {tournament.status === 'running' && tournament.current_round < tournament.total_rounds && (
                    <div className="flex flex-col items-center justify-center gap-2">
                        <Button 
                            onClick={() => handleGenerateRound(tournament.current_round + 1)}
                            disabled={isProcessing || !canGenerateNextRound}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Generar Ronda {tournament.current_round + 1}
                        </Button>
                        {!canGenerateNextRound && tournament.current_round > 0 && (
                            <p className="text-xs text-yellow-800 bg-yellow-50 p-2 rounded-md flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                Debes confirmar la Ronda {tournament.current_round} para poder generar la siguiente.
                            </p>
                        )}
                    </div>
                )}

                <div className="space-y-6">
                    {Array.from({ length: tournament.current_round }, (_, i) => i + 1).reverse().map(roundNum => {
                        // Use localMatches for filtering and display
                        const roundMatches = localMatches.filter(m => m.round_number === roundNum);
                        const isRoundConfirmed = tournament.confirmed_rounds?.includes(roundNum) || false;
                        const allResultsEntered = roundMatches.length > 0 && roundMatches.every(m => m.result !== 'PENDING');
                        
                        // Separar partidas normales de BYEs y ordenar
                        const normalMatches = roundMatches.filter(m => m.black_player_id !== null).sort((a, b) => a.table_number - b.table_number);
                        const byeMatches = roundMatches.filter(m => m.black_player_id === null);
                        const allSortedMatches = [...normalMatches, ...byeMatches];

                        const isHidden = hiddenRounds?.has(roundNum);
                        
                        return (
                            <div key={roundNum} className="border rounded-lg p-4 sm:p-6 bg-white shadow-sm">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xl font-semibold">Ronda {roundNum}</h4>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleRoundVisibility(roundNum)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                {isHidden ? 'Mostrar' : 'Ocultar'}
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant={isRoundConfirmed ? "default" : allResultsEntered ? "secondary" : "outline"}>
                                                {isRoundConfirmed ? "Confirmada" : allResultsEntered ? "Resultados Completos" : "En curso"}
                                            </Badge>
                                            {tournament?.fide_mode && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                    FIDE
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Botones de exportación y acciones */}
                                    <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handleExportRoundPdf(roundNum)}
                                            disabled={isExporting}
                                            className="text-xs"
                                            title={tournament?.fide_mode ? "Exportar PDF de ronda con información FIDE completa" : "Exportar PDF de ronda"}
                                        >
                                            <FileText className="mr-1 h-3 w-3" />
                                            {isExporting ? "Generando..." : "PDF Ronda"}
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => handleExportRoundPgn(roundNum, false)}
                                            disabled={isExporting}
                                            className="text-xs"
                                            title="Exportar partidas de ronda en formato PGN estándar"
                                        >
                                            <Download className="mr-1 h-3 w-3" />
                                            {isExporting ? "Generando..." : "PGN Ronda"}
                                        </Button>
                                        {allResultsEntered && !isRoundConfirmed && (
                                            <Button 
                                                size="sm" 
                                                onClick={() => {
                                                    setPendingRoundToConfirm(roundNum);
                                                    setShowConfirmDialog(true);
                                                }}
                                                disabled={isProcessing}
                                                className="bg-green-600 hover:bg-green-700"
                                                title="Confirmar ronda y actualizar clasificación"
                                            >
                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                {isProcessing ? "Confirmando..." : "Confirmar Ronda"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Solo mostrar el contenido de la ronda si no está oculta */}
                                {!isHidden && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {allSortedMatches.map((match) => (
                                            <Card key={match.id} className="border-2 hover:shadow-md transition-shadow">
                                                <CardHeader className="text-center py-2">
                                                    <CardTitle className="text-sm font-bold">
                                                        {match.table_number > 0 ? `Mesa ${match.table_number}` : 'BYE'}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="py-4 px-4">
                                                    {/* Jugador con blancas */}
                                                    <div className="text-center mb-3">
                                                        <div className="flex items-center justify-center gap-2 mb-1">
                                                            <Square className="w-4 h-4 fill-white border border-gray-400" />
                                                            <span className="text-xs text-gray-500">Blancas</span>
                                                        </div>
                                                        <div className="font-semibold text-sm">
                                                            {match.white_player_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            ({match.white_player_rating})
                                                        </div>
                                                    </div>

                                                    {/* Botones de resultado en el centro */}
                                                    {match.black_player_id ? (
                                                        <div className="flex justify-center gap-1 my-4">
                                                            {['1-0', '1/2-1/2', '0-1'].map((result) => (
                                                                <Button
                                                                    key={result}
                                                                    size="sm"
                                                                    variant={match.result === result ? "default" : "outline"}
                                                                    onClick={() => handleUpdateResult(match.id, result)}
                                                                    disabled={isRoundConfirmed}
                                                                    className="text-xs px-2"
                                                                >
                                                                    {result === '1/2-1/2' ? '½-½' : result}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center my-4">
                                                            <Badge variant="outline" className="text-xs">
                                                                {match.result === 'BYE_AUTOMATIC' ? 'BYE Automático' : 
                                                                 match.result === 'BYE_REQUESTED' ? 'BYE Solicitado' : 
                                                                 match.result === 'BYE_ABSENCE' ? 'BYE Ausencia' : 'BYE'}
                                                            </Badge>
                                                        </div>
                                                    )}

                                                    {/* Jugador con negras */}
                                                    <div className="text-center mt-3">
                                                        <div className="flex items-center justify-center gap-2 mb-1">
                                                            <Square className="w-4 h-4 fill-black" />
                                                            <span className="text-xs text-gray-500">Negras</span>
                                                        </div>
                                                        <div className="font-semibold text-sm">
                                                            {match.black_player_name || '-'}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {match.black_player_rating ? `(${match.black_player_rating})` : ''}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Ronda</AlertDialogTitle>
                            <AlertDialogDescription>
                                ¿Estás seguro de que quieres confirmar la ronda {pendingRoundToConfirm}? 
                                Esta acción actualizará las puntuaciones y desempates, y no podrás modificar los resultados después.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setPendingRoundToConfirm(null)}>
                                Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={() => handleConfirmRound(pendingRoundToConfirm)}
                                disabled={isProcessing}
                            >
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirmar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
