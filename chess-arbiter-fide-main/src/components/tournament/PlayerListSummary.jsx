import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export default function PlayerListSummary({ players, isLoading, sortConfig, setSortConfig }) {
    const getFideUrl = (fideId) => {
        if (!fideId || fideId === '0' || fideId.trim() === '') return null;
        return `https://ratings.fide.com/profile/${fideId.trim()}`;
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Jugadores</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const SortableHeader = ({ children, sortKey }) => (
        <TableHead
            onClick={() => handleSort(sortKey)}
            className="cursor-pointer hover:bg-gray-50 transition-colors select-none"
        >
            <div className="flex items-center gap-2">
                {children}
                {sortConfig.key === sortKey ? (
                    sortConfig.direction === 'asc' ? 
                        <ArrowUp className="h-4 w-4 text-blue-600" /> : 
                        <ArrowDown className="h-4 w-4 text-blue-600" />
                ) : (
                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                )}
            </div>
        </TableHead>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lista de Jugadores ({players.length})</CardTitle>
            </CardHeader>
            <CardContent>
                {players.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                        {/* Vista móvil */}
                        <div className="block md:hidden">
                            <div className="divide-y">
                                {players.map((player) => (
                                    <div key={player.id} className="p-4 space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium flex items-center gap-2">
                                                    {player.full_name}
                                                    {getFideUrl(player.federation_id) && (
                                                        <a 
                                                            href={getFideUrl(player.federation_id)} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 transition-colors"
                                                            title={`Ver perfil FIDE de ${player.full_name}`}
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                        Rating: {player.rating}
                                                    </span>
                                                    {player.title && (
                                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium">
                                                            {player.title}
                                                        </span>
                                                    )}
                                                    {player.club && (
                                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                                            {player.club}
                                                        </span>
                                                    )}
                                                    {player.federation_id && player.federation_id !== '0' && (
                                                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                                            FIDE: {player.federation_id}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Vista escritorio */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <SortableHeader sortKey="full_name">Jugador</SortableHeader>
                                        <SortableHeader sortKey="rating">Rating</SortableHeader>
                                        <SortableHeader sortKey="club">Club</SortableHeader>
                                        <SortableHeader sortKey="federation_id">FIDE ID</SortableHeader>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {players.map((player) => (
                                        <TableRow key={player.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {player.full_name}
                                                    {player.title && (
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                                                            {player.title}
                                                        </span>
                                                    )}
                                                    {getFideUrl(player.federation_id) && (
                                                        <a 
                                                            href={getFideUrl(player.federation_id)} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 transition-colors"
                                                            title={`Ver perfil FIDE de ${player.full_name}`}
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                                {player.federation && player.federation !== 'ESP' && (
                                                    <div className="text-xs text-gray-500">{player.federation}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>{player.rating}</TableCell>
                                            <TableCell>{player.club || '-'}</TableCell>
                                            <TableCell>
                                                {player.federation_id && player.federation_id !== '0' ? (
                                                    <a 
                                                        href={getFideUrl(player.federation_id)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 underline transition-colors"
                                                    >
                                                        {player.federation_id}
                                                    </a>
                                                ) : (
                                                    '-'
                                                )}
                                            </TableCell>
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