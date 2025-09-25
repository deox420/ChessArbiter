import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const allTiebreaks = [
    { id: 'buchholz', name: 'Buchholz Total' },
    { id: 'sonneborn', name: 'Sonneborn-Berger' },
    { id: 'progressive', name: 'Progresivo' },
    { id: 'wins', name: 'N\u00famero de Victorias' },
    { id: 'mutual', name: 'Resultado Particular' },
];

export default function TiebreakSelector({ order, setOrder }) {
    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(order);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setOrder(items);
    };

    const unusedTiebreaks = allTiebreaks.filter(tb => !order.includes(tb.id));

    const addTiebreak = (tiebreakId) => {
        if (!order.includes(tiebreakId)) {
            setOrder([...order, tiebreakId]);
        }
    };
    
    const removeTiebreak = (index) => {
        const newOrder = [...order];
        newOrder.splice(index, 1);
        setOrder(newOrder);
    };

    return (
        <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Orden de Desempates</p>
            <p className="text-xs text-gray-500">Arrastra para reordenar la prioridad de los desempates.</p>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="tiebreaks">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 rounded-md border p-2 bg-gray-50 min-h-[100px]">
                            {order.map((tiebreakId, index) => {
                                const tiebreak = allTiebreaks.find(t => t.id === tiebreakId);
                                return (
                                    <Draggable key={tiebreak.id} draggableId={tiebreak.id} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm border"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="h-5 w-5 text-gray-400" />
                                                    <span className="font-medium text-sm">{tiebreak.name}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTiebreak(index)}
                                                    className="text-red-500 hover:text-red-700 text-xs font-semibold"
                                                >
                                                    Quitar
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {unusedTiebreaks.length > 0 && (
                 <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Desempates disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                        {unusedTiebreaks.map(tb => (
                            <Badge 
                                key={tb.id}
                                variant="outline"
                                onClick={() => addTiebreak(tb.id)}
                                className="cursor-pointer hover:bg-gray-100"
                            >
                                + {tb.name}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}