
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";

const DocHeader = ({ version, date }) => (
  <div className="mb-4 text-xs text-gray-500">
    <p>Version: <Badge variant="outline">{version}</Badge> | Fecha de ultima actualizacion: <Badge variant="outline">{date}</Badge></p>
  </div>
);

const Tiebreak = ({ name, description }) => (
    <div>
        <h4 className="font-semibold text-md text-gray-800">{name}</h4>
        <p className="text-sm text-gray-700">{description}</p>
    </div>
);

export default function FideTiebreaks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sistemas de Desempate FIDE</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <DocHeader version="1.0.1" date="19/09/2025" />
        <p className="text-sm text-gray-600">ChessArbiter calcula automaticamente los siguientes sistemas de desempate basados en las regulaciones de la FIDE. El orden en que se aplican se define al crear o editar un torneo.</p>

        <div className="space-y-4">
            <Tiebreak name="Buchholz Total" description="Suma de las puntuaciones de todos los oponentes a los que se ha enfrentado un jugador. Un valor mas alto indica que el jugador se ha enfrentado a oponentes mas fuertes." />
            <Tiebreak name="Sonneborn-Berger" description="Se calcula de la siguiente manera: la suma de las puntuaciones de los oponentes a los que el jugador ha ganado, mas la mitad de la suma de las puntuaciones de los oponentes con los que ha empatado." />
            <Tiebreak name="Progresivo" description="Suma acumulativa de la puntuacion del jugador al final de cada ronda. Premia a los jugadores que puntuaron mejor en las primeras rondas." />
            <Tiebreak name="Numero de Victorias" description="Simple conteo del numero total de partidas ganadas. Un desempate util para torneos con muchos empates en los primeros puestos." />
            <Tiebreak name="Resultado Particular (Mutual Result)" description="Si todos los jugadores empatados a puntos han jugado entre si, se tiene en cuenta el resultado directo de esas partidas. Nota: Este desempate es complejo y el sistema lo usa como consideracion final, priorizando los sistemas numericos." />
        </div>
      </CardContent>
    </Card>
  );
}
