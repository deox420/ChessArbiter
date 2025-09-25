import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowUpDown, Download, FileText } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { generateTrf16 } from '@/api/functions';
import { generateFullReportPdf } from '@/api/functions';
import { generatePgn } from '@/api/functions';

const TIEBREAK_NAMES = {
    buchholz: 'Buchholz',
    sonneborn: 'Sonneborn-Berger',
    progressive: 'Progresivo',
    wins: 'Victorias',
    mutual: 'Resultado Particular'
};

export default function StandingsTable({ players, tournament }) {
    const tiebreakOrder = tournament?.tie_break_order || ['buchholz', 'sonneborn'];
    const { toast } = useToast();
    const [isExporting, setIsExporting] = React.useState(false);

    const sortedPlayers = [...players].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        
        for (const tiebreak of tiebreakOrder) {
            const aValue = a[`tie_break_${tiebreak}`] || 0;
            const bValue = b[`tie_break_${tiebreak}`] || 0;
            if (bValue !== aValue) return bValue - aValue;
        }
        
        return b.rating - a.rating;
    });

    const handleExportTrf = async () => {
        setIsExporting(true);
        try {
            const response = await generateTrf16({ tournamentId: tournament.id });
            const blob = new Blob([response.data], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}.trf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "TRF Exportado", description: "Archivo TRF generado correctamente." });
        } catch (error) {
            toast({ title: "Error", description: "Error al exportar TRF: " + error.message, variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPdf = async () => {
        setIsExporting(true);
        try {
            const response = await generateFullReportPdf({ tournamentId: tournament.id });
            const blob = new Blob([response.data], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}_reporte_completo.html`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ title: "PDF Exportado", description: "Reporte completo generado correctamente." });
        } catch (error) {
            toast({ title: "Error", description: "Error al exportar PDF: " + error.message, variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPgn = async (includeMoves = false) => {
        setIsExporting(true);
        try {
            const response = await generatePgn({ 
                tournamentId: tournament.id, 
                includeMoves 
            });
            const blob = new Blob([response.data], { type: 'application/x-chess-pgn' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${tournament.name.replace(/[^a-zA-Z0-9]/g, '_')}.pgn`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            toast({ 
                title: "PGN Exportado", 
                description: `PGN del torneo generado correctamente.` 
            });
        } catch (error) {
            toast({ title: "Error", description: "Error al exportar PGN: " + error.message, variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <CardTitle className="text-lg sm:text-xl">Clasificación General</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2">
                        {tournament?.status === 'completed' && (
                            <Badge variant="outline" className="text-green-600 border-green-600 w-fit">
                                🏆 Torneo Finalizado
                            </Badge>
                        )}
                        
                        {/* Botones de exportación - Siempre visibles cuando hay al menos una ronda jugada */}
                        {tournament?.current_round > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {/* PDF Completo - Disponible para todos los torneos */}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleExportPdf}
                                    disabled={isExporting}
                                    className="text-xs"
                                    title={tournament?.fide_mode ? 
                                        "Exportar reporte completo del torneo con información FIDE" : 
                                        "Exportar reporte completo del torneo en PDF"
                                    }
                                >
                                    <FileText className="mr-1 h-3 w-3" />
                                    {isExporting ? "Generando..." : "PDF Completo"}
                                </Button>
                                
                                {/* PGN del torneo - Disponible para todos los torneos */}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleExportPgn(false)}
                                    disabled={isExporting}
                                    className="text-xs"
                                    title="Exportar todas las partidas del torneo en formato PGN"
                                >
                                    <Download className="mr-1 h-3 w-3" />
                                    {isExporting ? "Generando..." : "PGN Torneo"}
                                </Button>
                                
                                {/* TRF16 - Solo disponible en modo FIDE */}
                                {tournament?.fide_mode && (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handleExportTrf}
                                        disabled={isExporting}
                                        className="text-xs"
                                        title="Exportar archivo TRF16 para envío oficial a la FIDE"
                                    >
                                        <Download className="mr-1 h-3 w-3" />
                                        {isExporting ? "Generando..." : "TRF16"}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {players.length > 0 ? (
                    <div className="space-y-4">
                        {/* Vista móvil */}
                        <div className="block lg:hidden">
                            <div className="space-y-3">
                                {sortedPlayers.map((player, index) => (
                                    <div key={player.id} className="border rounded-lg p-4 bg-gray-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">#{index + 1}</span>
                                                <div>
                                                    <div className="font-medium">{player.full_name}</div>
                                                    {player.club && <div className="text-xs text-gray-500">{player.club}</div>}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-bold">{player.score.toFixed(1)}</div>
                                                <div className="text-xs text-gray-500">Rating: {player.rating}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1 text-xs text-gray-600">
                                            {tiebreakOrder.map(tiebreak => (
                                                <span key={tiebreak}>
                                                    {TIEBREAK_NAMES[tiebreak]}: {(player[`tie_break_${tiebreak}`] || 0).toFixed(1)}
                                                </span>
                                            )).reduce((prev, curr) => [prev, ' • ', curr])}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Vista escritorio */}
                        <div className="hidden lg:block border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-center w-16">#</TableHead>
                                        <TableHead>Jugador</TableHead>
                                        <TableHead className="text-center w-20">Rating</TableHead>
                                        <TableHead className="text-center w-20">Puntos</TableHead>
                                        {tiebreakOrder.map(tiebreak => (
                                            <TableHead key={tiebreak} className="text-center w-24">
                                                {TIEBREAK_NAMES[tiebreak]}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedPlayers.map((player, index) => (
                                        <TableRow key={player.id}>
                                            <TableCell className="text-center font-bold">{index + 1}</TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{player.full_name}</div>
                                                    {player.club && <div className="text-xs text-gray-500">{player.club}</div>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">{player.rating}</TableCell>
                                            <TableCell className="text-center font-bold">{player.score.toFixed(1)}</TableCell>
                                            {tiebreakOrder.map(tiebreak => (
                                                <TableCell key={tiebreak} className="text-center">
                                                    {(player[`tie_break_${tiebreak}`] || 0).toFixed(1)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No hay jugadores registrados en este torneo.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}