import React from 'react';
import { CalendarEvent, Reservation } from '../types';
import { ChevronLeft, ChevronRight, Music, Utensils, Star, Lock, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';

interface CalendarViewProps {
  mode: 'events' | 'reservations';
  events?: CalendarEvent[];
  reservations?: Reservation[];
  currentDate: Date;
  selectedDate?: Date;
  onDateChange: (date: Date) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectSlot: (dateStr: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  mode,
  events = [], 
  reservations = [],
  currentDate, 
  selectedDate,
  onDateChange, 
  onSelectEvent, 
  onSelectSlot 
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDay = monthStart.getDay();
  const padding = Array(startDay).fill(null);

  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(parseISO(e.date), day));
  };

  const getReservationsForDay = (day: Date) => {
    return reservations.filter(r => isSameDay(parseISO(r.date), day));
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'music': return <Music size={10} className="text-purple-400" />;
          case 'food': return <Utensils size={10} className="text-orange-400" />;
          case 'special': return <Star size={10} className="text-yellow-400" />;
          case 'private': return <Lock size={10} className="text-red-400" />;
          default: return null;
      }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      <header className="flex items-center justify-between p-3 md:p-4 border-b border-slate-700 bg-slate-800 shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
            <h2 className="text-base md:text-2xl font-bold text-white whitespace-nowrap">{format(currentDate, 'MMM yyyy')}</h2>
            <div className="flex gap-1">
                <button onClick={() => onDateChange(subMonths(currentDate, 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronLeft className="text-slate-400 w-4 h-4 md:w-5 md:h-5" /></button>
                <button onClick={() => onDateChange(addMonths(currentDate, 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronRight className="text-slate-400 w-4 h-4 md:w-5 md:h-5" /></button>
            </div>
        </div>
        
        <div className="flex gap-2 text-[10px] md:text-xs text-slate-400">
            {mode === 'events' ? (
                <div className="hidden sm:flex gap-2">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Music</span>
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Food</span>
                </div>
            ) : (
                <span className="flex items-center gap-1"><Users size={12} className="text-indigo-400"/> <span className="hidden sm:inline">Management</span></span>
            )}
        </div>
      </header>

      <div className="grid grid-cols-7 bg-slate-800 border-b border-slate-700 shrink-0">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={idx} className="py-2 text-center text-[9px] md:text-xs font-semibold text-slate-500 uppercase tracking-widest">
                <span className="md:hidden">{day}</span>
                <span className="hidden md:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</span>
            </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
        {padding.map((_, i) => <div key={`pad-${i}`} className="bg-slate-900/30 border-r border-b border-slate-800" />)}
        
        {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            
            const dayEvents = mode === 'events' ? getEventsForDay(day) : [];
            const dayReservations = mode === 'reservations' ? getReservationsForDay(day) : [];
            const resCount = dayReservations.length;

            return (
                <div 
                    key={day.toISOString()} 
                    onClick={() => onSelectSlot(dateStr)}
                    className={`
                        min-h-[50px] md:min-h-[100px] p-0.5 md:p-2 border-r border-b border-slate-800 transition-colors cursor-pointer relative group
                        ${!isSameMonth(day, currentDate) ? 'opacity-20' : ''}
                        ${isSelected ? 'bg-indigo-900/20 ring-1 ring-inset ring-indigo-500/50' : 'hover:bg-slate-800/50'}
                    `}
                >
                    <div className={`text-[10px] md:text-sm font-medium mb-0.5 md:mb-1 ${isToday ? 'bg-indigo-600 text-white w-4 h-4 md:w-6 md:h-6 rounded-full flex items-center justify-center' : isSelected ? 'text-indigo-300' : 'text-slate-500'}`}>
                        {format(day, 'd')}
                    </div>

                    <div className="space-y-0.5">
                        {mode === 'events' && dayEvents.map(event => (
                            <div 
                                key={event.id}
                                onClick={(e) => { e.stopPropagation(); onSelectEvent && onSelectEvent(event); }}
                                className="px-1 py-0.5 rounded bg-slate-800 border-l border-indigo-500 text-[8px] md:text-[10px] truncate text-slate-200"
                            >
                                {event.startTime} <span className="hidden md:inline">{event.title}</span>
                            </div>
                        ))}

                        {mode === 'reservations' && resCount > 0 && (
                            <div className="flex flex-wrap gap-0.5">
                                <div className="px-1 bg-indigo-900/40 rounded text-[8px] md:text-[10px] text-indigo-300 font-bold">
                                    {resCount}<span className="hidden md:inline"> Bookings</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default CalendarView;