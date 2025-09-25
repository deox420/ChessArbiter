
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";

const DocHeader = ({ version, date }) => (
  <div className="mb-4 text-xs text-gray-500">
    <p>Version: <Badge variant="outline">{version}</Badge> | Fecha de ultima actualizacion: <Badge variant="outline">{date}</Badge></p>
  </div>
);

const CodeBlock = ({ children }) => (
    <pre className="bg-gray-100 p-3 rounded-md text-xs whitespace-pre-wrap"><code>{children}</code></pre>
);

export default function PairingAlgorithm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Algoritmos de Emparejamiento</CardTitle>
      </CardHeader>
      <CardContent className="prose prose-blue max-w-none text-sm text-gray-700 space-y-6">
        <DocHeader version="1.0.1" date="19/09/2025" />

        <div>
            <h3 className="font-semibold text-xl mb-3 border-b pb-2">Sistema Suizo (Variante Dutch)</h3>
            <p>El sistema de emparejamiento suizo implementado en ChessArbiter sigue las directrices del <strong>FIDE Handbook, C.04.1 (Dutch System)</strong>. Es un algoritmo robusto disenado para manejar un gran numero de jugadores en relativamente pocas rondas, asegurando que los jugadores se enfrenten a oponentes con una puntuacion similar.</p>

            <h4 className="font-semibold text-lg mt-4">Paso 1: Agrupacion por Puntuacion (Score Brackets)</h4>
            <p>Los jugadores se dividen en grupos segun su puntuacion actual. Todos los jugadores con la misma puntuacion pertenecen al mismo grupo.</p>

            <h4 className="font-semibold text-lg mt-4">Paso 2: Ordenacion Dentro de los Grupos</h4>
            <p>Dentro de cada grupo de puntuacion, los jugadores se ordenan de forma descendente segun su ranking inicial (basado en rating).</p>

            <h4 className="font-semibold text-lg mt-4">Paso 3: Emparejamiento Inicial y Floaters</h4>
            <p>El algoritmo intenta emparejar al jugador de la mitad superior de un grupo (`S1`) con un jugador de la mitad inferior (`S2`).</p>
            <CodeBlock>{`Grupo de 10 jugadores:
S1 = [Jugador 1, Jugador 2, Jugador 3, Jugador 4, Jugador 5]
S2 = [Jugador 6, Jugador 7, Jugador 8, Jugador 9, Jugador 10]

Emparejamientos iniciales: 1-6, 2-7, 3-8, 4-9, 5-10.`}</CodeBlock>
            <p>Si un jugador no puede ser emparejado (por ejemplo, ya ha jugado contra todos los oponentes posibles), se convierte en un <strong>floater</strong> y "flota" hacia el siguiente grupo de puntuacion inferior para encontrar un oponente.</p>

            <h4 className="font-semibold text-lg mt-4">Paso 4: Asignacion de Colores</h4>
            <p>La asignacion de colores sigue un sistema de prioridades para garantizar la equidad:</p>
            <ul className="list-disc list-inside space-y-2">
                <li>Se intenta alternar los colores (B-N-B-N...).</li>
                <li>Un jugador no puede recibir el mismo color 3 veces seguidas.</li>
                <li>La diferencia entre partidas jugadas con blancas y negras no puede ser mayor de 2 o menor de -2.</li>
                <li>Si ambos jugadores tienen la misma preferencia de color, el de mayor ranking obtiene su color preferido.</li>
            </ul>
        </div>

        <div>
            <h3 className="font-semibold text-xl mb-3 border-b pb-2">Sistema Round Robin (Berger)</h3>
            <p>El sistema Round Robin (o "todos contra todos") garantiza que cada jugador se enfrente a todos los demas exactamente una vez. ChessArbiter utiliza el <strong>algoritmo de circulo</strong>, una variante del sistema Berger.</p>
            
            <h4 className="font-semibold text-lg mt-4">Funcionamiento</h4>
            <ol className="list-decimal list-inside space-y-2">
                <li><strong>Numero Par de Jugadores:</strong> Un jugador (normalmente el de mayor ranking) se mantiene en una posicion fija, mientras que los demas rotan a su alrededor en cada ronda, ocupando las posiciones restantes.</li>
                <li><strong>Numero Impar de Jugadores:</strong> Para que el algoritmo funcione, se anade un <strong>jugador "fantasma" o "dummy"</strong>. El jugador que se empareja con este jugador fantasma en una ronda determinada recibe un <strong>BYE</strong> (descanso con puntuacion).</li>
                <li><strong>Asignacion de Colores:</strong> El sistema alterna los colores en las mesas para asegurar un balance equitativo de partidas con blancas y negras para cada jugador a lo largo del torneo.</li>
            </ol>
            <CodeBlock>{`Ejemplo de rotacion con 6 jugadores:

Ronda 1:   Ronda 2:   Ronda 3:
1 vs 6     1 vs 5     1 vs 4
2 vs 5     6 vs 4     5 vs 3
3 vs 4     2 vs 3     6 vs 2`}</CodeBlock>
        </div>

      </CardContent>
    </Card>
  );
}
