import React, { useState } from 'react';
import { Reservation } from '../types';
import CustomerVoiceWidget from './CustomerVoiceWidget';
import { Utensils, Music, Star, ArrowLeft, Calendar, Clock, Users, Phone, CheckCircle, ChevronRight, Mail, X, Sparkles, Edit2 } from 'lucide-react';

interface DemoWebsiteProps {
    onBack: () => void;
    onReservationCreate: (res: Partial<Reservation>) => string;
    onReservationUpdate: (id: string, updates: Partial<Reservation>) => void;
    reservations: Reservation[];
}

const DemoWebsite: React.FC<DemoWebsiteProps> = ({ onBack, onReservationCreate, onReservationUpdate, reservations }) => {
    const [activePage, setActivePage] = useState<'home' | 'reservations'>('home');
    const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        guests: 2,
        phone: '',
        email: '',
        notes: ''
    });

    // New state for Review Modal
    const [reviewData, setReviewData] = useState<Partial<Reservation> | null>(null);
    const [reviewEmail, setReviewEmail] = useState('');

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const id = onReservationCreate({
            customerName: formData.name,
            date: formData.date,
            time: formData.time,
            size: Number(formData.guests),
            phone: formData.phone,
            email: formData.email,
            notes: formData.notes
        });
        setBookingSuccess(id);
    };

    const handleReviewSubmit = () => {
        if (!reviewData || !reviewEmail) return;
        
        const id = onReservationCreate({
            ...reviewData,
            email: reviewEmail
        });
        
        setReviewData(null); // Close modal
        setBookingSuccess(id); // Show success
        setActivePage('reservations'); // Ensure we are on a page where success is visible
    };

    const resetForm = () => {
        setBookingSuccess(null);
        setFormData({
            name: '',
            date: new Date().toISOString().split('T')[0],
            time: '19:00',
            guests: 2,
            phone: '',
            email: '',
            notes: ''
        });
        setReviewData(null);
        setReviewEmail('');
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white text-slate-900 font-sans">
            {/* Navigation Bar - Fixed at top */}
            <nav className="flex-none bg-white/90 backdrop-blur-md border-b border-slate-100 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
                <div 
                    className="flex items-center gap-2 cursor-pointer" 
                    onClick={() => setActivePage('home')}
                >
                    <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-white font-bold">R</div>
                    <span className="font-bold text-lg tracking-tight">RestoSync Bistro</span>
                </div>
                
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
                    <button onClick={() => setActivePage('home')} className={`hover:text-slate-900 transition-colors ${activePage === 'home' ? 'text-slate-900 font-bold' : ''}`}>Home</button>
                    <button className="hover:text-slate-900 transition-colors">Menu</button>
                    <button className="hover:text-slate-900 transition-colors">Events</button>
                    <button 
                        onClick={() => setActivePage('reservations')}
                        className={`hover:text-slate-900 transition-colors ${activePage === 'reservations' ? 'text-slate-900 font-bold' : ''}`}
                    >
                        Reservations
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setActivePage('reservations')}
                        className="hidden md:block px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-colors"
                    >
                        Book Table
                    </button>
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                    >
                        <ArrowLeft size={12} /> Exit Demo
                    </button>
                </div>
            </nav>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto pb-40">
                {activePage === 'home' ? (
                    <>
                        {/* Hero Section */}
                        <header className="relative h-[500px] flex items-center justify-center bg-slate-900 text-white overflow-hidden">
                            <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
                            <div className="relative z-10 text-center space-y-6 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">Taste the Future.</h1>
                                <p className="text-lg md:text-xl text-slate-200 max-w-lg mx-auto font-light">Experience culinary excellence powered by intelligence. Book your table with our AI hostess today.</p>
                                <div className="pt-4 flex justify-center gap-4">
                                    <button className="px-8 py-3 bg-white text-slate-900 font-bold rounded-full hover:bg-slate-100 transition-colors shadow-lg">
                                        View Menu
                                    </button>
                                    <button 
                                        onClick={() => setActivePage('reservations')}
                                        className="px-8 py-3 bg-transparent border border-white text-white font-bold rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        Book Now
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Features / Events Teaser */}
                        <section className="py-20 px-6 max-w-6xl mx-auto">
                            <h2 className="text-3xl font-bold text-center mb-12">Experience Dining</h2>
                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="p-8 bg-slate-50 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                                        <Utensils className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">Modern Cuisine</h3>
                                    <p className="text-slate-600 leading-relaxed">Locally sourced ingredients crafted into masterpieces by our award-winning chefs. Seasonal menus change weekly.</p>
                                </div>
                                <div className="p-8 bg-slate-50 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                                        <Music className="w-6 h-6 text-purple-600" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">Live Atmosphere</h3>
                                    <p className="text-slate-600 leading-relaxed">Enjoy live jazz and acoustic sets every weekend in our dedicated lounge area. No cover charge for diners.</p>
                                </div>
                                <div className="p-8 bg-slate-50 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mb-6">
                                        <Star className="w-6 h-6 text-yellow-600" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">Private Events</h3>
                                    <p className="text-slate-600 leading-relaxed">Host your special occasions with us. Custom menus and private rooms available for groups of 10 to 50.</p>
                                </div>
                            </div>
                        </section>

                        {/* AI Call to Action */}
                        <section className="bg-slate-900 text-white py-24 px-6 text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-slate-900"></div>
                            <div className="max-w-3xl mx-auto space-y-8 relative z-10">
                                <h2 className="text-4xl font-bold">Talk to Bella, our AI Hostess</h2>
                                <p className="text-slate-300 text-lg leading-relaxed">
                                    Forget filling out forms. Just tap the microphone icon in the bottom right corner and tell Bella when you want to come in. She handles the rest instantly.
                                </p>
                                <div className="inline-block px-6 py-3 border border-slate-700 rounded-full bg-slate-800/50 backdrop-blur text-sm font-medium">
                                    Try saying: <span className="text-indigo-300">"Book a table for 4 people this Friday at 7 PM"</span>
                                </div>
                            </div>
                        </section>
                    </>
                ) : (
                    /* Reservations Page */
                    <div className="min-h-full bg-slate-50 py-12 px-4 md:px-8">
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center mb-12">
                                <h1 className="text-4xl font-bold text-slate-900 mb-4">Make a Reservation</h1>
                                <p className="text-slate-600">Reserve your spot at RestoSync Bistro. For parties larger than 10, please call us directly.</p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8">
                                {/* Contact Info Sidebar */}
                                <div className="md:col-span-1 space-y-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                        <h3 className="font-bold text-slate-900 mb-4">Opening Hours</h3>
                                        <div className="space-y-2 text-sm text-slate-600">
                                            <div className="flex justify-between"><span>Mon-Thu</span> <span>5pm - 10pm</span></div>
                                            <div className="flex justify-between font-medium text-slate-900"><span>Fri-Sat</span> <span>5pm - 11pm</span></div>
                                            <div className="flex justify-between"><span>Sunday</span> <span>4pm - 9pm</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group cursor-pointer" onClick={() => onBack()}>
                                         <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                                         <h3 className="font-bold text-lg mb-2 relative z-10">Prefer to call?</h3>
                                         <p className="text-indigo-200 text-sm mb-4 relative z-10">Talk to Bella, our AI agent, right here on the screen!</p>
                                         <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider relative z-10">
                                             Use Mic Button <ChevronRight size={14} />
                                         </div>
                                    </div>
                                </div>

                                {/* Booking Form */}
                                <div className="md:col-span-2">
                                    {bookingSuccess ? (
                                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center animate-in zoom-in-95 duration-300">
                                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <CheckCircle size={32} />
                                            </div>
                                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Reservation Confirmed!</h2>
                                            <p className="text-slate-600 mb-8">We look forward to seeing you. A confirmation has been sent to your email.</p>
                                            <p className="text-xs text-slate-400 mb-8 font-mono">Reference ID: {bookingSuccess}</p>
                                            <button 
                                                onClick={resetForm}
                                                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                                            >
                                                Make Another Booking
                                            </button>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleManualSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
                                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-3 top-3 text-slate-400" size={16} />
                                                        <input 
                                                            type="date" 
                                                            required
                                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                            value={formData.date}
                                                            onChange={e => setFormData({...formData, date: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                                                    <div className="relative">
                                                        <Clock className="absolute left-3 top-3 text-slate-400" size={16} />
                                                        <select 
                                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all appearance-none"
                                                            value={formData.time}
                                                            onChange={e => setFormData({...formData, time: e.target.value})}
                                                        >
                                                            {['17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00'].map(t => (
                                                                <option key={t} value={t}>{t}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Guests</label>
                                                    <div className="relative">
                                                        <Users className="absolute left-3 top-3 text-slate-400" size={16} />
                                                        <select 
                                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all appearance-none"
                                                            value={formData.guests}
                                                            onChange={e => setFormData({...formData, guests: Number(e.target.value)})}
                                                        >
                                                            {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                                                <option key={n} value={n}>{n} {n === 1 ? 'Person' : 'People'}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                                                    <input 
                                                        type="text" 
                                                        required
                                                        placeholder="John Doe"
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                        value={formData.name}
                                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                                                    <div className="relative">
                                                        <Phone className="absolute left-3 top-3 text-slate-400" size={16} />
                                                        <input 
                                                            type="tel" 
                                                            placeholder="(555) 000-0000"
                                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                            value={formData.phone}
                                                            onChange={e => setFormData({...formData, phone: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-3 text-slate-400" size={16} />
                                                        <input 
                                                            type="email" 
                                                            placeholder="john@example.com"
                                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                            value={formData.email}
                                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-8">
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Special Requests (Optional)</label>
                                                <textarea 
                                                    rows={3}
                                                    placeholder="Allergies, high chair needed, anniversary..."
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                                    value={formData.notes}
                                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                                />
                                            </div>

                                            <button 
                                                type="submit"
                                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                                            >
                                                Confirm Reservation
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* REVIEW MODAL OVERLAY */}
            {reviewData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="bg-slate-900 p-4 flex justify-between items-center text-white flex-none">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Sparkles size={18} className="text-yellow-400" />
                                Review & Edit Details
                            </h3>
                            <button onClick={() => setReviewData(null)} className="hover:text-slate-300">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                             <div className="flex items-start gap-3 mb-4 p-3 bg-indigo-50 text-indigo-800 rounded-lg text-xs">
                                <Edit2 size={16} className="mt-0.5" />
                                <p>Bella prepared this for you. Feel free to edit any mistakes before confirming.</p>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                                    <input 
                                        type="text"
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-slate-900"
                                        value={reviewData.customerName || ''}
                                        onChange={(e) => setReviewData({...reviewData, customerName: e.target.value})}
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                                        <input 
                                            type="date"
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-slate-900"
                                            value={reviewData.date || ''}
                                            onChange={(e) => setReviewData({...reviewData, date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Time</label>
                                        <input 
                                            type="time"
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-slate-900"
                                            value={reviewData.time || ''}
                                            onChange={(e) => setReviewData({...reviewData, time: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Party Size</label>
                                    <select
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm text-slate-900"
                                        value={reviewData.size || 2}
                                        onChange={(e) => setReviewData({...reviewData, size: Number(e.target.value)})}
                                    >
                                        {[1,2,3,4,5,6,7,8,9,10,12,15].map(n => (
                                            <option key={n} value={n}>{n} People</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mb-6 pt-4 border-t border-slate-100">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Enter Email to Confirm <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-slate-400" size={16} />
                                    <input 
                                        type="email" 
                                        required
                                        autoFocus
                                        placeholder="your@email.com"
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                                        value={reviewEmail}
                                        onChange={e => setReviewEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleReviewSubmit}
                                disabled={!reviewEmail.includes('@')}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg transition-all active:scale-95"
                            >
                                {reviewEmail.includes('@') ? "Confirm Booking" : "Enter Email to Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            {activePage === 'home' && (
                <footer className="bg-white border-t border-slate-100 py-10 text-center text-slate-500 text-sm">
                    <p>&copy; 2024 RestoSync Bistro. Powered by Gemini AI.</p>
                </footer>
            )}

            {/* Voice Widget Injection - Always visible */}
            <CustomerVoiceWidget 
                onReservationCreate={onReservationCreate} 
                onReservationUpdate={onReservationUpdate}
                onReviewReservation={(res) => {
                    console.log("Setting Review Data in DemoWebsite:", res);
                    setReviewData(res);
                }}
                reservations={reservations}
            />
        </div>
    );
};

export default DemoWebsite;