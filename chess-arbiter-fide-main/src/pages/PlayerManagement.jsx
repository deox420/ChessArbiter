
import React, { useState, useEffect, useCallback } from 'react';
import { Player } from '@/api/entities';
import { Tournament } from '@/api/entities';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, UserPlus, Trash2, Edit, Search, Loader2, ListOrdered, FileUp, UserMinus, Plus, Users, Shield } from 'lucide-react';

// Nueva función inteligente para parsear una fila de CSV, manejando comas dentro de comillas.
function parseCsvRow(row) {
    const values = [];
    let current_value = '';
    let in_quotes = false;
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') { // Toggle in_quotes, handle escaped quotes ""
            if (in_quotes && i + 1 < row.length && row[i + 1] === '"') { // Escaped double quote
                current_value += '"';
                i++; // Skip the next quote as it's part of the escape
            } else {
                in_quotes = !in_quotes;
            }
        } else if (char === ',' && !in_quotes) {
            values.push(current_value.trim());
            current_value = '';
        } else {
            current_value += char;
        }
    }
    values.push(current_value.trim());
    return values;
}

export default function PlayerManagement() {
    const [urlParams] = useState(new URLSearchParams(window.location.search));
    const tournamentId = urlParams.get('id');
    const { toast } = useToast();

    const [tournament, setTournament] = useState(null);
    const [players, setPlayers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const [isEditPlayerDialogOpen, setIsEditPlayerDialogOpen] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState(null);
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [playerToDelete, setPlayerToDelete] = useState(null);

    const loadData = useCallback(async (isInitialLoad = false) => {
        if (!tournamentId || tournamentId === 'null' || tournamentId === 'undefined' || tournamentId.trim() === '') {
            if (isInitialLoad) {
                console.error("Invalid tournament ID:", tournamentId);
                setTournament(null);
                setPlayers([]); // Clear players as well if tournamentId is invalid
                setIsLoading(false);
            }
            return;
        }

        if (isInitialLoad) setIsLoading(true);

        try {
            const [tourneyData, playersData] = await Promise.all([
                Tournament.get(tournamentId),
                Player.filter({ tournament_id: tournamentId }, 'pairing_number', 1000)
            ]);
            
            // Solo actualiza si los datos han cambiado para evitar re-renders innecesarios
            setTournament(current => JSON.stringify(current) !== JSON.stringify(tourneyData) ? tourneyData : current);
            setPlayers(current => JSON.stringify(current) !== JSON.stringify(playersData || []) ? (playersData || []) : current);

        } catch (error) {
            console.error("Error loading data:", error);
            if (isInitialLoad) {
                toast({ title: "Error", description: "No se pudieron cargar los datos del torneo.", variant: "destructive" });
                setTournament(null); // Set tournament to null on error
                setPlayers([]); // Clear players on error
            }
        } finally {
            if (isInitialLoad) setIsLoading(false);
        }
    }, [tournamentId, toast]); // Dependencies for useCallback

    // Efecto para la carga inicial
    useEffect(() => {
        loadData(true);
    }, [loadData]); // Dependency for useEffect is the memoized loadData function

    // Efecto para la sincronización en tiempo real (polling)
    useEffect(() => {
        const intervalId = setInterval(() => {
            // Llama a loadData en modo "silencioso" (sin spinner de carga)
            loadData(false);
        }, 10000); // Cada 10 segundos

        // Limpia el intervalo cuando el componente se desmonta
        return () => clearInterval(intervalId);
    }, [loadData]);


    // Validación temprana para mostrar un mensaje de error si el ID del torneo no es válido
    if (!tournamentId || tournamentId === 'null' || tournamentId === 'undefined' || tournamentId.trim() === '') {
        return (
            <div className="text-center py-16">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Error: Torneo no encontrado</h1>
                <p className="text-gray-600 mb-4">No se pudo cargar la gestión de jugadores. El ID del torneo no es válido.</p>
                <Link to={createPageUrl('Dashboard')} className="text-blue-600 hover:underline">
                    <ArrowLeft className="mr-2 h-4 w-4 inline" />
                    Volver al Dashboard
                </Link>
            </div>
        );
    }

    const assignPairingNumbers = async () => {
        setIsProcessing(true);
        try {
            const activePlayers = players.filter(p => p.status !== 'withdrawn');
            const sortedPlayers = [...activePlayers].sort((a, b) => {
                if (b.rating !== a.rating) return b.rating - a.rating;
                return a.full_name.localeCompare(b.full_name);
            });

            const updates = sortedPlayers.map((player, index) => 
                Player.update(player.id, { pairing_number: index + 1 })
            );

            const withdrawnPlayersUpdates = players.filter(p => p.status === 'withdrawn').map(p =>
                Player.update(p.id, { pairing_number: 0 })
            );

            await Promise.all([...updates, ...withdrawnPlayersUpdates]);
            toast({ title: "Éxito", description: "Números de emparejamiento asignados correctamente." });
            await loadData(true); // Force a full reload with spinner after assignment

        } catch (error) {
            console.error("Error assigning pairing numbers:", error);
            toast({ title: "Error", description: "No se pudieron asignar los números de emparejamiento.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdatePlayer = async (playerData) => {
        setIsProcessing(true);
        try {
            await Player.update(playerData.id, {
                full_name: playerData.full_name,
                rating: playerData.rating,
                club: playerData.club,
                federation_id: playerData.federation_id,
                federation: playerData.federation,
                title: playerData.title,
                status: playerData.status || 'active'
            });
            toast({ title: "Éxito", description: "Jugador actualizado." });
            setIsEditPlayerDialogOpen(false);
            setEditingPlayer(null);
            await loadData(true); // Force a full reload with spinner
            return true;
        } catch (error) {
            console.error("Error updating player:", error);
            toast({ title: "Error", description: "No se pudo actualizar el jugador.", variant: "destructive" });
            return false;
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddPlayer = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        
        const formData = new FormData(e.target);
        const playerData = {
            full_name: formData.get('full_name'),
            rating: parseInt(formData.get('rating')) || 0,
            club: formData.get('club'),
            federation_id: formData.get('federation_id'),
            federation: formData.get('federation'),
            title: formData.get('title'),
        };

        if (!playerData.full_name.trim()) {
            toast({ title: "Error de validación", description: "El nombre completo no puede estar vacío.", variant: "destructive" });
            setIsProcessing(false);
            return;
        }
        if (playerData.rating < 0 || playerData.rating > 3000) {
            toast({ title: "Error de validación", description: "El rating debe ser un número entre 0 y 3000.", variant: "destructive" });
            setIsProcessing(false);
            return;
        }

        try {
            const sameNamePlayers = players.filter(
                p => p.full_name.trim().toLowerCase() === playerData.full_name.trim().toLowerCase()
            );

            if (sameNamePlayers.length > 0) {
                let isDifferentPlayer = false;
                for (const p of sameNamePlayers) {
                    const ratingDiff = Math.abs(p.rating - playerData.rating);
                    const differentClub = p.club && playerData.club && 
                        p.club.trim().toLowerCase() !== playerData.club.trim().toLowerCase();
                    const differentFedId = p.federation_id && playerData.federation_id && 
                        p.federation_id.trim() !== playerData.federation_id.trim();
                    const differentFederation = p.federation && playerData.federation &&
                        p.federation.trim().toLowerCase() !== playerData.federation.trim().toLowerCase();
                    const differentTitle = p.title && playerData.title &&
                        p.title.trim().toLowerCase() !== playerData.title.trim().toLowerCase();
                    
                    if (ratingDiff > 200 || differentClub || differentFedId || differentFederation || differentTitle) {
                        isDifferentPlayer = true;
                        break;
                    }
                }

                if (!isDifferentPlayer && !playerData.federation_id && !playerData.club && !playerData.federation && !playerData.title) {
                    const exactMatch = sameNamePlayers.some(p => 
                        Math.abs(p.rating - playerData.rating) <= 50 && 
                        !p.club && !p.federation_id && !p.federation && !p.title
                    );
                    
                    if (exactMatch) {
                        toast({
                            title: "Posible jugador duplicado",
                            description: `Ya existe un jugador con el nombre "${playerData.full_name}" y rating similar. Si es una persona diferente, añade el club, ID de federación, federación o título para distinguirlos.`,
                            variant: "destructive",
                            duration: 8000
                        });
                        setIsProcessing(false);
                        return;
                    }
                }
            }
            
            await Player.create({
                ...playerData,
                tournament_id: tournamentId,
                status: 'active',
                pairing_number: 0
            });
            toast({ title: "Éxito", description: "Jugador añadido." });
            e.target.reset();
            await loadData(true); // Force a full reload with spinner
        } catch (error) {
            console.error("Error adding player:", error);
            toast({ title: "Error", description: "No se pudo añadir el jugador.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDeletePlayer = async () => {
        if (!playerToDelete) return;
        setIsProcessing(true);
        try {
            await Player.delete(playerToDelete.id);
            toast({ title: "Éxito", description: "Jugador eliminado." });
            setIsDeleteDialogOpen(false);
            setPlayerToDelete(null);
            await loadData(true); // Force a full reload with spinner
        } catch (error) {
            console.error("Error deleting player:", error);
            toast({ title: "Error", description: "No se pudo eliminar al jugador.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleWithdrawPlayer = async (player) => {
        setIsProcessing(true);
        try {
            await Player.update(player.id, { status: 'withdrawn', pairing_number: 0 });
            toast({ title: "Éxito", description: `Jugador ${player.full_name} retirado.` });
            await loadData(true); // Force a full reload with spinner
        } catch (error) {
            console.error("Error withdrawing player:", error);
            toast({ title: "Error", description: "No se pudo retirar al jugador.", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImportCsv = async () => {
        const fileInput = document.getElementById('csv-file');
        const file = fileInput?.files?.[0];
        if (!file) {
            toast({ title: "Advertencia", description: "Por favor, selecciona un archivo CSV para importar.", variant: "default" });
            return;
        }

        setIsProcessing(true);
        toast({ title: "Procesando archivo...", description: "Validando filas en el navegador." });

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            
            const playersToCreate = [];
            const errors = [];
            const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');

            if (rows.length < 2) {
                toast({ title: "Error de formato", description: "El archivo CSV está vacío o solo tiene la cabecera.", variant: "destructive" });
                setIsProcessing(false);
                if (fileInput) fileInput.value = '';
                return;
            }

            const header = parseCsvRow(rows[0]);
            const nameHeader = 'Apellidos, Nombre';
            const ratingHeader = 'Rating';
            const clubHeader = 'Club';
            const federationIdHeader = 'FIDE ID';
            const federationHeader = 'Federación';
            const titleHeader = 'Título';

            const nameIndex = header.indexOf(nameHeader);
            const ratingIndex = header.indexOf(ratingHeader);
            const clubIndex = header.indexOf(clubHeader);
            const federationIdIndex = header.indexOf(federationIdHeader);
            const federationIndex = header.indexOf(federationHeader);
            const titleIndex = header.indexOf(titleHeader);

            if (nameIndex === -1 || ratingIndex === -1) {
                toast({ 
                    title: "Error de cabecera", 
                    description: `La cabecera debe contener '${nameHeader}' y '${ratingHeader}'. Las columnas '${clubHeader}', '${federationIdHeader}', '${federationHeader}' y '${titleHeader}' son opcionales.`, 
                    variant: "destructive",
                    duration: 8000 
                });
                setIsProcessing(false);
                if (fileInput) fileInput.value = '';
                return;
            }

            const existingPlayersInDb = players;
            
            for (let i = 1; i < rows.length; i++) {
                const values = parseCsvRow(rows[i]);
                const full_name = values[nameIndex] ? values[nameIndex].trim() : '';
                const ratingStr = values[ratingIndex] ? values[ratingIndex].trim() : '';
                const club = clubIndex !== -1 && values[clubIndex] ? values[clubIndex].trim() : '';
                const federation_id = federationIdIndex !== -1 && values[federationIdIndex] ? values[federationIdIndex].trim() : '';
                const federation = federationIndex !== -1 && values[federationIndex] ? values[federationIndex].trim() : '';
                const title = titleIndex !== -1 && values[titleIndex] ? values[titleIndex].trim() : '';

                let currentRowErrors = [];
                if (!full_name) {
                    currentRowErrors.push(`El campo '${nameHeader}' no puede estar vacío.`);
                } else {
                    const currentNameLower = full_name.toLowerCase();
                    const currentRating = parseInt(ratingStr, 10) || 1500;
                    
                    const exactDuplicateInDb = existingPlayersInDb.some(p => {
                        return p.status !== 'withdrawn' && 
                               p.full_name.toLowerCase() === currentNameLower &&
                               Math.abs(p.rating - currentRating) <= 50 &&
                               ((!p.club && !club) || (p.club && club && p.club.toLowerCase() === club.toLowerCase())) &&
                               ((!p.federation_id && !federation_id) || (p.federation_id === federation_id)) &&
                               ((!p.federation && !federation) || (p.federation && federation && p.federation.toLowerCase() === federation.toLowerCase())) &&
                               ((!p.title && !title) || (p.title && title && p.title.toLowerCase() === title.toLowerCase()));
                    });
                    
                    const exactDuplicateInFile = playersToCreate.some(p => {
                        return p.full_name.toLowerCase() === currentNameLower &&
                               Math.abs(p.rating - currentRating) <= 50 &&
                               ((!p.club && !club) || (p.club === club)) &&
                               ((!p.federation_id && !federation_id) || (p.federation_id === federation_id)) &&
                               ((!p.federation && !federation) || (p.federation === federation)) &&
                               ((!p.title && !title) || (p.title === title));
                    });

                    if (exactDuplicateInDb) {
                        currentRowErrors.push(`El jugador "${full_name}" con rating ${currentRating} y club "${club}" ya existe en la base de datos (activo).`);
                    } else if (exactDuplicateInFile) {
                        currentRowErrors.push(`El jugador "${full_name}" con rating ${currentRating} y club "${club}" está duplicado en este archivo.`);
                    }
                }
                
                let ratingNum = parseInt(ratingStr, 10);
                if (isNaN(ratingNum) || ratingNum < 0 || ratingNum > 3000) {
                    currentRowErrors.push(`El Rating '${ratingStr}' no es un número válido entre 0 y 3000.`);
                }
                
                if (currentRowErrors.length > 0) {
                    errors.push(`Fila ${i + 1}: ${currentRowErrors.join(', ')}`);
                    continue;
                }

                playersToCreate.push({
                    tournament_id: tournamentId,
                    full_name: full_name,
                    rating: ratingNum,
                    club: club || '',
                    federation_id: federation_id || '',
                    federation: federation || '',
                    title: title || '',
                    status: 'active',
                    pairing_number: 0
                });
            }

            try {
                if (playersToCreate.length > 0) {
                    await Player.bulkCreate(playersToCreate);
                }

                if (errors.length > 0) {
                     toast({
                        title: `Importación parcial (${playersToCreate.length} jugadores añadidos)`,
                        description: `Se encontraron ${errors.length} errores. El primer error es: ${errors[0]}`,
                        variant: "default",
                        duration: 8000
                    });
                } else if (playersToCreate.length === 0) {
                    toast({
                        title: "No se importaron jugadores",
                        description: "No se encontraron jugadores válidos para importar en el archivo CSV.",
                        variant: "destructive"
                    });
                } else {
                     toast({
                        title: "¡Importación exitosa!",
                        description: `Se han añadido ${playersToCreate.length} jugadores correctamente.`,
                    });
                }
                await loadData(true); // Force a full reload with spinner

            } catch (dbError) {
                console.error("Database error during bulk create:", dbError);
                toast({ title: "Error en la base de datos", description: "No se pudieron guardar los jugadores.", variant: "destructive" });
            } finally {
                setIsProcessing(false);
                if (fileInput) fileInput.value = '';
            }
        };

        reader.onerror = () => {
            toast({ title: "Error", description: "No se pudo leer el archivo.", variant: "destructive" });
            setIsProcessing(false);
            if (fileInput) fileInput.value = '';
        };
        
        reader.readAsText(file);
    };

    const openEditPlayerDialog = (player) => {
        setEditingPlayer(player);
        setIsEditPlayerDialogOpen(true);
    };

    const openDeleteDialog = (player) => {
        setPlayerToDelete(player);
        setIsDeleteDialogOpen(true);
    };

    const filteredPlayers = players.filter(p => 
        (p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.club && p.club.toLowerCase().includes(searchTerm.toLowerCase())))
    );
    
    const isTournamentStarted = tournament?.status !== 'setup';

    return (
        <div className="max-w-6xl mx-auto space-y-4">
            <Link to={createPageUrl(`Tournament?id=${tournamentId}`)} className="flex items-center text-sm text-blue-600 hover:underline mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Torneo
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Añadir Jugador</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddPlayer} className="space-y-4">
                                <div>
                                    <Label htmlFor="full_name">Apellidos, Nombre</Label>
                                    <Input id="full_name" name="full_name" placeholder="Ej: Pérez García, Juan" required disabled={isProcessing || isTournamentStarted} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="rating">Rating</Label>
                                        <Input id="rating" name="rating" type="number" defaultValue="1500" min="0" max="3000" disabled={isProcessing || isTournamentStarted} />
                                    </div>
                                    <div>
                                        <Label htmlFor="title">Título</Label>
                                        <Input id="title" name="title" placeholder="GM, IM, FM..." disabled={isProcessing || isTournamentStarted} />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="club">Club</Label>
                                    <Input id="club" name="club" placeholder="Ej: Club Ajedrez Madrid" disabled={isProcessing || isTournamentStarted} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="federation">Federación</Label>
                                        <Input id="federation" name="federation" placeholder="ESP" defaultValue="ESP" maxLength={3} disabled={isProcessing || isTournamentStarted} />
                                    </div>
                                    <div>
                                        <Label htmlFor="federation_id">FIDE ID</Label>
                                        <Input id="federation_id" name="federation_id" placeholder="Ej: 123456" disabled={isProcessing || isTournamentStarted} />
                                    </div>
                                </div>
                                <div className="p-3 text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-md">
                                    💡 <strong>Consejo:</strong> Si hay jugadores con el mismo nombre, añade el club, ID de federación, federación o título para distinguirlos.
                                </div>
                                <Button type="submit" className="w-full" disabled={isProcessing || isTournamentStarted}>
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Añadir Jugador
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileUp className="h-5 w-5" />
                                Importar desde CSV
                            </CardTitle>
                            <CardDescription>
                                Añade múltiples jugadores de una vez subiendo un archivo CSV con el formato correcto.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-3 text-sm bg-gray-50 border rounded-md">
                                <p className="font-medium mb-2">Formato requerido del CSV:</p>
                                <code className="text-xs font-mono bg-white p-2 rounded border block">
                                    Apellidos, Nombre,Rating,Club,FIDE ID,Federación,Título
                                </code>
                                <p className="text-xs text-gray-600 mt-2">
                                    Solo "Apellidos, Nombre" y "Rating" son obligatorios. El resto son opcionales. Puedes usar comillas dobles para campos que contengan comas, por ejemplo: `"Pérez, Juan",1500,"Club de Ajedrez, Madrid"`.
                                </p>
                            </div>
                            
                            <Input 
                                id="csv-file" 
                                type="file" 
                                accept=".csv" 
                                disabled={isProcessing || isTournamentStarted} 
                                className="cursor-pointer"
                            />
                            
                            <Button 
                                onClick={handleImportCsv} 
                                disabled={isProcessing || isTournamentStarted}
                                className="w-full"
                                variant="outline"
                            >
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <FileUp className="mr-2 h-4 w-4" />
                                Procesar e Importar CSV
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl md:text-2xl">Jugadores ({players.length})</CardTitle>
                                {tournament?.pairing_system === 'swiss' && (
                                    <Button onClick={assignPairingNumbers} variant="outline" size="sm" disabled={isProcessing || isTournamentStarted}>
                                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <ListOrdered className="mr-2 h-4 w-4" />
                                        Asignar Nº Emparejamiento
                                    </Button>
                                )}
                            </div>
                            <CardDescription>
                                Gestiona los jugadores de tu torneo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    placeholder="Buscar por apellidos, nombre o club..."
                                    className="pl-8 w-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            
                            {isTournamentStarted && (
                                <div className="p-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md">
                                    El torneo ya ha comenzado. Las acciones de añadir y eliminar jugadores están deshabilitadas. Solo puedes editar el estado (retirar) de los jugadores existentes y otros datos.
                                </div>
                            )}

                            <PlayerTable
                                players={filteredPlayers}
                                onEdit={openEditPlayerDialog}
                                onDelete={openDeleteDialog}
                                onWithdraw={handleWithdrawPlayer}
                                isLoading={isLoading}
                                tournamentStatus={tournament?.status}
                                isProcessing={isProcessing}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <EditPlayerDialog
                isOpen={isEditPlayerDialogOpen}
                setIsOpen={setIsEditPlayerDialogOpen}
                player={editingPlayer}
                onSubmit={handleUpdatePlayer}
                isProcessing={isProcessing} 
                tournamentStatus={tournament?.status}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminará permanentemente al jugador "{playerToDelete?.full_name}" del torneo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePlayer} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Mover la constante fuera del componente para que sea una referencia estable.
const initialFormDataForEdit = { full_name: '', rating: 1500, club: '', federation_id: '', federation: '', title: '', status: 'active' };

function EditPlayerDialog({ isOpen, setIsOpen, player, onSubmit, isProcessing, tournamentStatus }) {
    const { toast } = useToast();
    const [formData, setFormData] = useState(initialFormDataForEdit);

    useEffect(() => {
        if (player) {
            setFormData(player);
        } else {
            // Al abrirse sin un jugador (aunque no debería pasar), se resetea.
            setFormData(initialFormDataForEdit);
        }
    }, [player]);

    if (!formData) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.full_name.trim()) {
            toast({
                title: "Error de validación",
                description: "El nombre completo no puede estar vacío.",
                variant: "destructive",
            });
            return;
        }
        if (formData.rating === null || formData.rating < 0 || formData.rating > 3000) {
            toast({
                title: "Error de validación",
                description: "El rating debe ser un número entre 0 y 3000.",
                variant: "destructive",
            });
            return;
        }
        onSubmit(formData);
    };

    const isTournamentStarted = tournamentStatus !== 'setup';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-4">
                    <DialogTitle className="text-lg">Editar Jugador</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name_edit">Apellidos, Nombre</Label>
                            <Input 
                                id="full_name_edit" 
                                value={formData.full_name} 
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} 
                                required 
                                placeholder="Ej: García López, Juan"
                                disabled={isProcessing || isTournamentStarted}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="rating_edit">Rating</Label>
                                <Input 
                                    id="rating_edit" 
                                    type="number" 
                                    min="0"
                                    max="3000"
                                    value={formData.rating} 
                                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 0 })} 
                                    disabled={isProcessing || isTournamentStarted}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title_edit">Título</Label>
                                <Input 
                                    id="title_edit" 
                                    value={formData.title || ''} 
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                                    placeholder="GM, IM, FM..."
                                    disabled={isProcessing || isTournamentStarted}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="club_edit">Club</Label>
                            <Input 
                                id="club_edit" 
                                value={formData.club || ''} 
                                onChange={(e) => setFormData({ ...formData, club: e.target.value })} 
                                placeholder="Ej: Club Ajedrez Madrid"
                                disabled={isProcessing || isTournamentStarted}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="federation_edit">Federación</Label>
                                <Input 
                                    id="federation_edit" 
                                    value={formData.federation || ''} 
                                    onChange={(e) => setFormData({ ...formData, federation: e.target.value })} 
                                    placeholder="ESP"
                                    maxLength={3}
                                    disabled={isProcessing || isTournamentStarted}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="federation_id_edit">FIDE ID</Label>
                                <Input 
                                    id="federation_id_edit" 
                                    value={formData.federation_id || ''} 
                                    onChange={(e) => setFormData({ ...formData, federation_id: e.target.value })} 
                                    placeholder="Ej: 123456"
                                    disabled={isProcessing || isTournamentStarted}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-6">
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto" disabled={isProcessing}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isProcessing || isTournamentStarted} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                           {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PlayerTable({ players, onEdit, onDelete, onWithdraw, isLoading, tournamentStatus, isProcessing }) {
    const isTournamentStarted = tournamentStatus !== 'setup';
    return (
        <div className="border rounded-md overflow-hidden">
            <div className="block md:hidden">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        <p className="text-sm text-gray-500 mt-2">Cargando jugadores...</p>
                    </div>
                ) : players.length > 0 ? (
                    <div className="divide-y">
                        {players.map((player) => (
                            <div key={player.id} className="p-4 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm truncate">
                                            {player.pairing_number ? `${player.pairing_number}. ` : ''}
                                            {player.full_name}
                                            {player.title && <span className="ml-1 text-xs font-semibold text-purple-600">{`(${player.title})`}</span>}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                Rating: {player.rating}
                                            </span>
                                            {player.club && (
                                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                    <Users className="inline-block h-3 w-3 mr-1" />
                                                    {player.club}
                                                </span>
                                            )}
                                            {player.federation && (
                                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                                    <Shield className="inline-block h-3 w-3 mr-1" />
                                                    {player.federation}
                                                </span>
                                            )}
                                            {player.federation_id && (
                                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                                    ID: {player.federation_id}
                                                </span>
                                            )}
                                            {player.status === 'withdrawn' && (
                                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                                    Retirado
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-2 flex-shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(player)} disabled={isProcessing}>
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        {!isTournamentStarted && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(player)} disabled={isProcessing}>
                                                <Trash2 className="h-3 w-3 text-red-500" />
                                            </Button>
                                        )}
                                        {player.status !== 'withdrawn' ? (
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onWithdraw(player)} disabled={isProcessing}>
                                                <UserMinus className="h-3 w-3 text-orange-500" />
                                            </Button>
                                        ) : (
                                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                                <UserMinus className="h-3 w-3 text-gray-300" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron jugadores.
                    </div>
                )}
            </div>

            <div className="hidden md:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Nº</TableHead>
                            <TableHead className="w-[200px]">Jugador</TableHead>
                            <TableHead className="w-[80px] text-center">Rating</TableHead>
                            <TableHead className="w-[80px]">Título</TableHead>
                            <TableHead className="w-[150px]">Club</TableHead>
                            <TableHead className="w-[80px]">Fed.</TableHead>
                            <TableHead className="w-[100px]">FIDE ID</TableHead>
                            <TableHead className="w-[80px]">Estado</TableHead>
                            <TableHead className="w-[150px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={9} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : players.length > 0 ? (
                            players.map((player) => (
                                <TableRow key={player.id} className={player.status === 'withdrawn' ? 'bg-red-50' : ''}>
                                    <TableCell className="font-medium">{player.pairing_number || '-'}</TableCell>
                                    <TableCell className="font-medium">{player.full_name}</TableCell>
                                    <TableCell className="text-center">{player.rating}</TableCell>
                                    <TableCell>{player.title || '-'}</TableCell>
                                    <TableCell>{player.club || '-'}</TableCell>
                                    <TableCell>{player.federation || '-'}</TableCell>
                                    <TableCell>{player.federation_id || '-'}</TableCell>
                                    <TableCell>{player.status === 'withdrawn' ? <span className="text-red-600 font-medium">Retirado</span> : 'Activo'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => onEdit(player)} disabled={isProcessing}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            {!isTournamentStarted && (
                                                <Button variant="ghost" size="icon" onClick={() => onDelete(player)} disabled={isProcessing}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                            {player.status !== 'withdrawn' ? (
                                                <Button variant="ghost" size="icon" onClick={() => onWithdraw(player)} disabled={isProcessing}>
                                                    <UserMinus className="h-4 w-4 text-orange-500" />
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" disabled>
                                                    <UserMinus className="h-4 w-4 text-gray-300" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={9} className="h-24 text-center">No se encontraron jugadores.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
