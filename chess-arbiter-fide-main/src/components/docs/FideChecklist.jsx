
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

const DocHeader = ({ version, date }) => (
  <div className="mb-4 text-xs text-gray-500">
    <p>Version: <Badge variant="outline">{version}</Badge> | Fecha de ultima actualizacion: <Badge variant="outline">{date}</Badge></p>
  </div>
);

const ChecklistItem = ({ children, required = false }) => (
    <li className="flex items-start gap-3">
        {required ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />}
        <span className="text-sm text-gray-800">{children}</span>
    </li>
);

export default function FideChecklist() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist para Torneos y Exportacion FIDE</CardTitle>
        <CardDescription>Requisitos esenciales para la correcta gestion y reporte de torneos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DocHeader version="1.0.1" date="19/09/2025" />

        <div>
            <h3 className="font-semibold text-lg mb-3">Requisitos Minimos para Empezar un Torneo</h3>
            <ul className="space-y-2">
                <ChecklistItem required><strong>Nombre del Torneo:</strong> Debe ser unico y descriptivo.</ChecklistItem>
                <ChecklistItem required><strong>Sistema de Emparejamiento:</strong> Seleccionar "Suizo" o "Round Robin".</ChecklistItem>
                <ChecklistItem required><strong>Numero Total de Rondas:</strong> Define la duracion del torneo.</ChecklistItem>
                <ChecklistItem required><strong>Al menos 2 jugadores inscritos:</strong> Es imposible generar emparejamientos con menos de dos jugadores.</ChecklistItem>
            </ul>
        </div>

        <div>
            <h3 className="font-semibold text-lg mb-3">Checklist para Exportacion FIDE (Formato TRF)</h3>
            <p className="text-sm text-gray-600 mb-4">Para generar un archivo TRF valido para la FIDE, asegurate de que el <strong>Modo FIDE</strong> este activado y que los siguientes campos del torneo esten completos:</p>
            <ul className="space-y-2">
                <ChecklistItem required><strong>Lugar del evento:</strong> Ciudad y pais donde se celebra el torneo.</ChecklistItem>
                <ChecklistItem required><strong>Ritmo FIDE:</strong> Standard, Rapido o Blitz.</ChecklistItem>
                <ChecklistItem required><strong>Control de Tiempo:</strong> Notacion oficial, ej: "90'+30''".</ChecklistItem>
                <ChecklistItem required><strong>Nombre del Arbitro Principal.</strong></ChecklistItem>
                <ChecklistItem required><strong>FIDE ID del Arbitro Principal:</strong> Debe ser un numero valido de 8 digitos.</ChecklistItem>
                <ChecklistItem required><strong>Nombre del Organizador.</strong></ChecklistItem>
            </ul>
        </div>
        
        <div>
            <h3 className="font-semibold text-lg mb-3">Checklist de Datos de Jugadores para TRF</h3>
            <p className="text-sm text-gray-600 mb-4">Cada jugador que participe en un torneo valido para ELO debe tener los siguientes datos completos:</p>
             <ul className="space-y-2">
                <ChecklistItem required><strong>Nombre Completo:</strong> "Apellidos, Nombre".</ChecklistItem>
                <ChecklistItem required><strong>ID FIDE:</strong> Numero de identificacion FIDE del jugador. Si no tiene, se debe indicar '0'.</ChecklistItem>
                <ChecklistItem required><strong>Federacion:</strong> Codigo de 3 letras de la federacion del jugador (ej: ESP, FRA, ARG).</ChecklistItem>
                <ChecklistItem required><strong>Rating:</strong> Rating FIDE del jugador. Si no tiene, se puede usar un rating nacional o estimado.</ChecklistItem>
            </ul>
        </div>
        
        <div>
            <h3 className="font-semibold text-lg mb-3">Formatos de Exportacion Disponibles</h3>
            <p className="text-sm text-gray-600 mb-4">ChessArbiter ofrece varios formatos de exportacion para diferentes propositos:</p>
             <ul className="space-y-2">
                <ChecklistItem><strong>PDF:</strong> Informes visuales para impresion y distribucion. Incluye emparejamientos y clasificaciones.</ChecklistItem>
                <ChecklistItem><strong>TRF:</strong> Formato oficial FIDE para reporte de rating. Solo disponible en Modo FIDE.</ChecklistItem>
                <ChecklistItem><strong>PGN (Portable Game Notation):</strong> Formato estandar internacional para partidas de ajedrez. Compatible con todos los programas de ajedrez (ChessBase, Lichess, SCID, etc.).</ChecklistItem>
            </ul>
            
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-semibold text-green-900 mb-2">🎯 Uso Recomendado de PGN</h4>
                <ul className="text-sm text-green-800 space-y-1">
                    <li><strong>• Para jugadores:</strong> Descarga el PGN del torneo para tener un registro oficial de tus partidas.</li>
                    <li><strong>• Para organizadores:</strong> Distribuye el archivo PGN como registro oficial de todas las partidas del evento.</li>
                    <li><strong>• Para arbitros:</strong> Usa el PGN junto con el TRF para envios oficiales a federaciones.</li>
                    <li><strong>• Para analisis:</strong> Importa el archivo en programas de ajedrez para revision posterior.</li>
                </ul>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-semibold text-blue-900 mb-2">📝 Contenido de los archivos PGN</h4>
                <p className="text-sm text-blue-800">
                    Los archivos PGN generados por ChessArbiter contienen informacion completa de cabecera 
                    (Event, Site, Date, Round, White, Black, Result, WhiteElo, BlackElo) y el resultado final 
                    de cada partida. Esto proporciona un registro oficial valido para todos los usos administrativos 
                    y estadisticos del torneo.
                </p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
