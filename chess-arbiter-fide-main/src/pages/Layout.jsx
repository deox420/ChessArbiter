
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ShieldCheck, BookOpen } from 'lucide-react';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col">
      <header className="bg-white shadow-md">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <ShieldCheck className="h-7 w-7 text-blue-600" />
              <span>ChessArbiter</span>
            </Link>
            <div className="flex items-center">
              {/* This could be a user menu in the future */}
            </div>
          </div>
        </nav>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow">
        {children}
      </main>
      <footer className="text-center py-4 text-sm text-gray-500 border-t bg-white">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center px-4">
            <p>&copy; {new Date().getFullYear()} ChessArbiter. Creado por deox420.</p>
            <Link to={createPageUrl('Docs')} className="flex items-center gap-1 hover:text-blue-600 transition-colors mt-2 sm:mt-0">
                <BookOpen className="h-4 w-4" />
                Documentación
            </Link>
        </div>
      </footer>
    </div>
  );
}
