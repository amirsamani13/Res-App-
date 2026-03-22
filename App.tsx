import React, { useState, useEffect } from 'react';
import CalendarView from './components/CalendarView';
import EventModal from './components/EventModal';
import ChatAssistant from './components/ChatAssistant';
import ApiSettingsModal from './components/ApiSettingsModal';
import ReservationList from './components/ReservationList';
import DemoWebsite from './components/DemoWebsite';
import { CalendarEvent, Reservation, ViewMode } from './types';
import { LayoutDashboard, Globe, CheckCircle2, Settings, Calendar as CalendarIcon, Users, Store, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.CALENDAR);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const savedEvents = localStorage.getItem('resto_events');
    if (savedEvents) setEvents(JSON.parse(savedEvents));
    else setEvents([{ id: '1', title: 'Jazz Night', date: format(new Date(), 'yyyy-MM-dd'), startTime: '19:00', endTime: '22:00', description: 'Live Jazz band', type: 'music' }]);

    const savedRes = localStorage.getItem('resto_reservations');
    if (savedRes) setReservations(JSON.parse(savedRes));
    else setReservations([{ id: '101', customerName: 'John Doe', size: 4, date: format(new Date(), 'yyyy-MM-dd'), time: '19:00', status: 'pending', notes: 'Anniversary' }]);

    setApiEndpoint(localStorage.getItem('resto_api_endpoint') || '');
    setApiKey(localStorage.getItem('resto_api_key') || '');
    
    if (window.innerWidth >= 1280) setShowChat(true);
  }, []);

  const syncToWeb = async (newEvents: CalendarEvent[], newReservations: Reservation[]) => {
      setIsSyncing(true);
      localStorage.setItem('resto_events', JSON.stringify(newEvents));
      localStorage.setItem('resto_reservations', JSON.stringify(newReservations));
      const endpoint = localStorage.getItem('resto_api_endpoint');
      if (endpoint) {
        try {
            await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ events: newEvents, reservations: newReservations }) });
        } catch (error) { console.error(error); }
      }
      setTimeout(() => setIsSyncing(false), 800);
  };

  const handleUpdateEvent = (partialEvent: Partial<CalendarEvent>): string => {
      let eventId = partialEvent.id || crypto.randomUUID();
      const newEvents = [...events];
      const idx = events.findIndex(e => e.id === eventId);
      if (idx >= 0) newEvents[idx] = { ...newEvents[idx], ...partialEvent as any };
      else newEvents.push({ ...partialEvent as any, id: eventId });
      setEvents(newEvents);
      syncToWeb(newEvents, reservations);
      setSelectedEvent(null);
      return eventId;
  };

  const handleDeleteEvent = (id: string) => {
      const newEvents = events.filter(e => e.id !== id);
      setEvents(newEvents);
      syncToWeb(newEvents, reservations);
      setSelectedEvent(null);
  };

  const handleCreateReservation = (res: Partial<Reservation>): string => {
      const id = crypto.randomUUID();
      const newRes = { id, status: 'pending', customerName: 'New Guest', ...res } as Reservation;
      const newReservations = [...reservations, newRes];
      setReservations(newReservations);
      syncToWeb(events, newReservations);
      return id;
  };

  const handleUpdateReservation = (id: string, updates: Partial<Reservation>) => {
      const newReservations = reservations.map(r => r.id === id ? { ...r, ...updates } : r);
      setReservations(newReservations);
      syncToWeb(events, newReservations);
  };

  if (viewMode === ViewMode.WEBSITE_DEMO) return <DemoWebsite onBack={() => setViewMode(ViewMode.CALENDAR)} onReservationCreate={handleCreateReservation} onReservationUpdate={handleUpdateReservation} reservations={reservations} />;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      <nav className="w-16 md:w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 md:py-6 gap-4 shrink-0 z-50">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-2 shrink-0">
            <LayoutDashboard className="text-white w-5 h-5 md:w-6 md:h-6" />
        </div>
        
        <button className={`p-2 rounded-lg transition-colors ${viewMode === ViewMode.CALENDAR ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`} onClick={() => setViewMode(ViewMode.CALENDAR)}>
            <CalendarIcon size={22} />
        </button>
        <button className={`p-2 rounded-lg transition-colors ${viewMode === ViewMode.RESERVATIONS ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`} onClick={() => setViewMode(ViewMode.RESERVATIONS)}>
            <Users size={22} />
        </button>
        <button className="p-2 rounded-lg text-slate-500 hover:text-green-400 transition-colors" onClick={() => setViewMode(ViewMode.WEBSITE_DEMO)}>
            <Store size={22} />
        </button>
        <button className={`p-2 rounded-lg transition-colors md:hidden ${showChat ? 'bg-slate-800 text-indigo-400' : 'text-slate-500'}`} onClick={() => setShowChat(!showChat)}>
            <MessageSquare size={22} />
        </button>

        <div className="mt-auto flex flex-col items-center gap-4 pb-2">
            <button className="p-2 text-slate-500 hover:text-slate-300" onClick={() => setShowSettings(true)}><Settings size={22} /></button>
            <div className={`w-2.5 h-2.5 rounded-full ${apiEndpoint ? 'bg-green-500' : 'bg-slate-700'}`} />
        </div>
      </nav>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
            <h1 className="font-black text-lg tracking-tight uppercase">RestoSync</h1>
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs text-slate-400">
                <Globe size={12} /> <span className="hidden sm:inline">Connect Site</span>
            </button>
        </header>

        <main className="flex-1 flex overflow-hidden relative">
            {viewMode === ViewMode.CALENDAR && (
                <CalendarView 
                    mode="events" events={events} currentDate={currentDate} onDateChange={setCurrentDate}
                    onSelectEvent={setSelectedEvent} onSelectSlot={(date) => setSelectedEvent({ date, startTime: '18:00', endTime: '21:00' })}
                />
            )}
            
            {viewMode === ViewMode.RESERVATIONS && (
                <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
                    <div className="flex-[2] border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden h-1/2 lg:h-full">
                        <CalendarView 
                            mode="reservations" reservations={reservations} currentDate={currentDate} 
                            selectedDate={new Date(selectedDate)} onDateChange={setCurrentDate} onSelectSlot={setSelectedDate}
                        />
                    </div>
                    <div className="flex-1 overflow-hidden h-1/2 lg:h-full">
                        <ReservationList reservations={reservations} filterDate={selectedDate} onUpdateReservation={handleUpdateReservation} onAdd={() => setSelectedEvent({ type: 'booking', date: selectedDate, startTime: '19:00' })} />
                    </div>
                </div>
            )}

            {showChat && (
                <ChatAssistant 
                    events={events} reservations={reservations} 
                    onEventUpdate={handleUpdateEvent} onEventDelete={() => {}} 
                    onReservationCreate={handleCreateReservation} onReservationUpdate={handleUpdateReservation} 
                    onClose={() => setShowChat(false)}
                />
            )}
        </main>
      </div>

      {selectedEvent && <EventModal event={selectedEvent} onSave={handleUpdateEvent} onSaveReservation={(res) => { handleCreateReservation(res); setSelectedEvent(null); }} onDelete={handleDeleteEvent} onClose={() => setSelectedEvent(null)} />}
      {showSettings && <ApiSettingsModal currentEndpoint={apiEndpoint} currentKey={apiKey} onSave={(e,k) => { setApiEndpoint(e); setApiKey(k); setShowSettings(false); }} onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default App;