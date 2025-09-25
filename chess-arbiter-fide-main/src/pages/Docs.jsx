import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import UserManual from '../components/docs/UserManual';
import PairingAlgorithm from '../components/docs/PairingAlgorithm';
import FideTiebreaks from '../components/docs/FideTiebreaks';
import FideChecklist from '../components/docs/FideChecklist';

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <Link to={createPageUrl('Dashboard')} className="flex items-center text-sm text-blue-600 hover:underline mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Dashboard
      </Link>
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Documentación Oficial de ChessArbiter</h1>
        <p className="mt-2 text-base text-gray-600">
          Guías, algoritmos y checklists para la gestión profesional de torneos.
        </p>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <div className="overflow-x-auto">
            <TabsList className="grid w-full min-w-fit grid-cols-4">
                <TabsTrigger value="manual">Manual de Usuario</TabsTrigger>
                <TabsTrigger value="algorithm">Algoritmos</TabsTrigger>
                <TabsTrigger value="tiebreaks">Desempates FIDE</TabsTrigger>
                <TabsTrigger value="checklist">Checklist FIDE</TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="manual" className="mt-6">
          <UserManual />
        </TabsContent>
        <TabsContent value="algorithm" className="mt-6">
          <PairingAlgorithm />
        </TabsContent>
        <TabsContent value="tiebreaks" className="mt-6">
          <FideTiebreaks />
        </TabsContent>
        <TabsContent value="checklist" className="mt-6">
          <FideChecklist />
        </TabsContent>
      </Tabs>
    </div>
  );
}