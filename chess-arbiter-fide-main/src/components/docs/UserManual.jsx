
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const DocHeader = ({ version, date }) => (
    <div className="mb-4 text-xs text-gray-500">
        <p>Version: <Badge variant="outline">{version}</Badge> | Fecha de ultima actualizacion: <Badge variant="outline">{date}</Badge></p>
    </div>
);

const Section = ({ title, children }) => (
    <div className="prose prose-blue max-w-none">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <div className="text-sm text-gray-700 space-y-2">{children}</div>
    </div>
);

export default function UserManual() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manual de Usuario de ChessArbiter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <DocHeader version="1.0.1" date="19/09/2025" />

                <p className="text-sm text-gray-600">Esta guia describe el flujo de trabajo completo para gestionar un torneo de ajedrez, desde la configuracion hasta la exportacion de informes finales, incluyendo las funcionalidades FIDE y Fair Play.</p>

                <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Paso 1: Creacion del Torneo</AccordionTrigger>
                        <AccordionContent>
                            <Section title="Flujo de Trabajo">
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Desde el "Dashboard", haz clic en <strong>"Crear Torneo"</strong>.</li>
                                    <li>Rellena los campos basicos: Nombre, Sistema y Rondas.</li>
                                    <li>En "Configuracion Avanzada":
                                        <ul className="list-disc list-inside ml-4 mt-1">
                                            <li>Activa el <strong>"Modo FIDE"</strong> para torneos oficiales. Esto hara obligatorios campos como Lugar, Ritmo y datos del Arbitro.</li>
                                            <li>Activa el <strong>"Modo Fair Play"</strong> para habilitar el monitoreo de integridad y la politica de juego limpio.</li>
                                            <li>Introduce una <strong>Semilla Maestra (opcional)</strong> para generar emparejamientos Suizos reproducibles. Si la dejas en blanco, se generara una aleatoria.</li>
                                            <li>Personaliza el orden de <strong>desempates</strong> y el limite de <strong>BYEs</strong>.</li>
                                        </ul>
                                    </li>
                                    <li>Haz clic en "Crear". Cada accion clave quedara registrada en un log de auditoria.</li>
                                </ol>
                            </Section>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2">
                        <AccordionTrigger>Paso 2: Gestion de Jugadores</AccordionTrigger>
                        <AccordionContent>
                            <Section title="Flujo de Trabajo">
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Una vez creado el torneo, accede a el y ve a la pestana <strong>"Jugadores"</strong>.</li>
                                    <li>Haz clic en <strong>"Gestionar Jugadores"</strong>.</li>
                                    <li>En esta nueva pagina, puedes:
                                        <ul className="list-disc list-inside ml-4 mt-1">
                                            <li><strong>Inscribir manualmente</strong>: Rellena el formulario con los datos del jugador (nombre, rating, club, ID FIDE, etc.) y haz clic en "Anadir Jugador".</li>
                                            <li><strong>Importar desde CSV</strong>: Descarga la plantilla, rellenala con los datos de tus jugadores y subela. El sistema los inscribira automaticamente.</li>
                                        </ul>
                                    </li>
                                    <li>Al inscribir jugadores, se les asigna automaticamente un <strong>numero de orden inicial</strong> basado en su rating (de mayor a menor). Este numero es crucial para los emparejamientos iniciales.</li>
                                </ol>
                            </Section>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3">
                        <AccordionTrigger>Paso 3: Generacion de Rondas y Resultados</AccordionTrigger>
                        <AccordionContent>
                            <Section title="Flujo de Trabajo">
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Ve a la pestana <strong>"Rondas"</strong>. Antes de la primera ronda, si es un sistema suizo, puedes ir a la pestana <strong>"BYE"</strong> para marcar que jugadores han solicitado un descanso en la primera ronda.</li>
                                    <li>Haz clic en <strong>"Empezar Torneo"</strong> si es la primera vez.</li>
                                    <li>Luego, pulsa <strong>"Generar Ronda 1"</strong>. El sistema aplicara el algoritmo de emparejamiento correspondiente (Suizo o Round Robin) y mostrara las mesas.</li>
                                    <li>Introduce los resultados en cada tarjeta de enfrentamiento usando los botones <Badge>1-0</Badge>, <Badge>1/2-1/2</Badge>, <Badge>0-1</Badge>.</li>
                                    <li>Una vez introducidos todos los resultados de la ronda, el estado cambiara a "Completada" y se activara el boton <strong>"Confirmar Ronda"</strong>.</li>
                                    <li>Al confirmar, los puntos se asignan a los jugadores, se actualizan las clasificaciones y se activa el boton para generar la siguiente ronda.</li>
                                </ol>
                            </Section>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-fairplay">
                        <AccordionTrigger>Paso Opcional: Gestion Fair Play</AccordionTrigger>
                        <AccordionContent>
                            <Section title="Flujo de Trabajo">
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>Si el "Modo Fair Play" esta activado, aparecera una nueva pestana <strong>"Fair Play"</strong> en el torneo.</li>
                                    {/* Removed: Los jugadores (en un entorno online) deberan aceptar una politica de integridad antes de empezar. Las aceptaciones se registran. */}
                                    <li>El sistema puede detectar incidencias como perdida de foco del navegador o reconexiones, generando alertas en esta pestana.</li>
                                    <li>Como arbitro, puedes revisar cada incidencia, anadir notas y tomar una decision (advertencia, anular partida, etc.).</li>
                                    <li>Al final, puedes exportar un <strong>informe Fair Play</strong> en PDF con el resumen de incidencias.</li>
                                </ol>
                            </Section>
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4">
                        <AccordionTrigger>Paso 4: Clasificacion y Exportacion Final</AccordionTrigger>
                        <AccordionContent>
                            <Section title="Flujo de Trabajo">
                                <ol className="list-decimal list-inside space-y-2">
                                    <li>En la pestana <strong>"Clasificacion"</strong>, encontraras los botones para exportar el torneo completo:
                                        <ul className="list-disc list-inside ml-4 mt-1">
                                            <li><strong>PDF Completo</strong>: Informe final con clasificacion y resultados.</li>
                                            <li><strong>PGN Torneo</strong>: Archivo estandar con todas las partidas.</li>
                                            <li><strong>Exportar TRF16</strong>: (Solo en Modo FIDE y visible para el Arbitro Principal) Genera el archivo oficial para la FIDE.</li>
                                            <li><strong>Informe Fair Play</strong>: (Solo en Modo Fair Play) Exporta el informe de integridad.</li>
                                        </ul>
                                    </li>
                                    <li>Solo los usuarios con rol de Arbitro Principal (o admin) pueden borrar torneos, garantizando la integridad de los datos.</li>
                                </ol>
                            </Section>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
