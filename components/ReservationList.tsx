import React from 'react';
import { Reservation } from '../types';
import { Check, X, Users, Clock, Calendar as CalendarIcon, Phone, Mail, Filter, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ReservationListProps {
  reservations: Reservation[];
  filterDate?: string; // YYYY-MM-DD
  onUpdateReservation: (id: string, updates: Partial<Reservation>) => void;
  onAdd?: () => void;
}

const ReservationList: React.FC<ReservationListProps> = ({ reservations, filterDate, onUpdateReservation, onAdd }) => {
  // Filter by date if provided
  const filteredReservations = filterDate 
    ? reservations.filter(r => r.date === filterDate)
    : reservations;

  const sorted = [...filteredReservations].sort((a, b) => 
    new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
  );

  return (
    <div className="flex-1 bg-slate-900 flex flex-col h-full border-l border-slate-800">
      <header className="p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {filterDate ? (
                    <>
                        <span className="text-slate-400 font-normal">{format(parseISO(filterDate), 'EEE, MMM d')}</span>
                    </>
                ) : 'All Reservations'}
            </h2>
            
            {onAdd && (
                <button 
                    onClick={onAdd}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={16} />
                    New Booking
                </button>
            )}
        </div>
        
        <div className="flex gap-2">
            <div className="px-3 py-1 bg-slate-800 rounded-full text-xs text-slate-400 border border-slate-700">
                Total: {sorted.length}
            </div>
            {sorted.filter(r => r.status === 'pending').length > 0 && (
                <div className="px-3 py-1 bg-orange-900/30 text-orange-200 rounded-full text-xs border border-orange-900/50 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                    Pending: {sorted.filter(r => r.status === 'pending').length}
                </div>
            )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sorted.map(res => (
            <div key={res.id} className={`bg-slate-800 rounded-lg p-4 border border-slate-700 flex flex-col gap-3 transition-all hover:border-slate-600 ${res.status === 'cancelled' ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            {res.customerName}
                        </h3>
                        <div className="flex items-center gap-2 text-xs mt-1">
                            <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                                res.status === 'confirmed' ? 'bg-green-900/50 text-green-300' :
                                res.status === 'cancelled' ? 'bg-red-900/50 text-red-300' :
                                'bg-orange-900/50 text-orange-300'
                            }`}>{res.status}</span>
                            <span className="text-slate-400 flex items-center gap-1"><Clock size={12} /> {res.time}</span>
                            <span className="text-slate-400 flex items-center gap-1"><Users size={12} /> {res.size}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-700/50">
                     {res.phone && <div className="text-xs text-slate-400 flex items-center gap-2"><Phone size={12} /> {res.phone}</div>}
                     {res.email && <div className="text-xs text-slate-400 flex items-center gap-2"><Mail size={12} /> {res.email}</div>}
                     {res.notes && <div className="text-xs text-indigo-300 italic mt-1 bg-indigo-900/20 p-1.5 rounded">"{res.notes}"</div>}
                </div>

                <div className="flex gap-2 pt-2">
                    {res.status === 'pending' && (
                        <>
                            <button 
                                onClick={() => onUpdateReservation(res.id, { status: 'confirmed' })}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-medium transition-colors"
                            >
                                <Check size={12} /> Confirm
                            </button>
                            <button 
                                onClick={() => onUpdateReservation(res.id, { status: 'cancelled' })}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-700 hover:bg-red-600 hover:text-white text-slate-300 rounded text-xs font-medium transition-colors"
                            >
                                <X size={12} /> Decline
                            </button>
                        </>
                    )}
                    {res.status === 'confirmed' && (
                        <button 
                            onClick={() => onUpdateReservation(res.id, { status: 'cancelled' })}
                            className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
                        >
                            Cancel Booking
                        </button>
                    )}
                     {res.status === 'cancelled' && (
                        <button 
                            onClick={() => onUpdateReservation(res.id, { status: 'pending' })}
                            className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
                        >
                            Re-open
                        </button>
                    )}
                </div>
            </div>
        ))}

        {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-center px-4 border-2 border-dashed border-slate-800 rounded-lg">
                <Users size={24} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">No reservations</p>
                {filterDate && <p className="text-xs">for {format(parseISO(filterDate), 'MMM d')}</p>}
                
                {onAdd && (
                    <button onClick={onAdd} className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 hover:underline">
                        Create one manually
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default ReservationList;