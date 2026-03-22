import React, { useState, useEffect } from 'react';
import { CalendarEvent, Reservation } from '../types';
import { X, Image as ImageIcon, Sparkles, Loader2, Wand2, Users, Phone, Mail, Clock, AlignLeft, Type } from 'lucide-react';
import { generateEventPoster, editEventPoster } from '../services/geminiService';

interface EventModalProps {
  event: Partial<CalendarEvent>;
  onSave: (e: CalendarEvent) => void;
  onSaveReservation: (r: Partial<Reservation>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, onSave, onSaveReservation, onClose, onDelete }) => {
  // Extended form state to handle both Event and Reservation fields
  const [formData, setFormData] = useState({
    title: event.title || '',
    date: event.date || new Date().toISOString().split('T')[0],
    startTime: event.startTime || '18:00',
    endTime: event.endTime || '21:00',
    description: event.description || '',
    type: (event.type as string) || 'food', // Can be 'booking' now
    posterUrl: event.posterUrl || '',
    id: event.id,
    // Reservation specific fields
    guestCount: 2,
    phone: '',
    email: ''
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [showImageEdit, setShowImageEdit] = useState(false);

  const isBooking = formData.type === 'booking';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBooking) {
      // Handle as Reservation
      onSaveReservation({
        customerName: formData.title, // Map title to customer name
        date: formData.date,
        time: formData.startTime,
        size: Number(formData.guestCount),
        phone: formData.phone,
        email: formData.email,
        notes: formData.description, // Map description to notes
        status: 'confirmed' // Manual entry assumed confirmed
      });
    } else {
      // Handle as Calendar Event
      onSave({
        id: formData.id || crypto.randomUUID(),
        title: formData.title,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        description: formData.description,
        type: formData.type as any,
        posterUrl: formData.posterUrl
      });
    }
  };

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    try {
      const prompt = `A professional, artistic promotional poster for a restaurant event: ${formData.title}. Description: ${formData.description}. Style: Modern, appetizing, vibrant.`;
      const url = await generateEventPoster(prompt, "1:1");
      setFormData(prev => ({ ...prev, posterUrl: url }));
    } catch (err) {
      console.error(err);
      alert("Failed to generate image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditImage = async () => {
    if (!formData.posterUrl || !editPrompt) return;
    setIsGenerating(true);
    try {
      const url = await editEventPoster(formData.posterUrl, editPrompt);
      setFormData(prev => ({ ...prev, posterUrl: url }));
      setShowImageEdit(false);
      setEditPrompt('');
    } catch (err) {
      console.error(err);
      alert("Failed to edit image.");
    } finally {
        setIsGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col md:flex-row max-h-[90vh]">
        
        {/* Image Section (Hidden for Booking mode to save space/relevance, or we could keep it for avatar?) */}
        {!isBooking && (
            <div className="md:w-1/3 bg-slate-900 p-6 flex flex-col items-center justify-center border-r border-slate-700 relative group">
            {formData.posterUrl ? (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-600">
                <img src={formData.posterUrl} alt="Event Poster" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                        onClick={() => setShowImageEdit(!showImageEdit)}
                        className="p-2 bg-indigo-600 rounded-full hover:bg-indigo-700 text-white"
                    >
                        <Wand2 size={16} />
                    </button>
                </div>
                </div>
            ) : (
                <div className="w-full aspect-square rounded-lg bg-slate-800 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center text-slate-500 gap-2">
                <ImageIcon className="w-8 h-8 opacity-50" />
                <span className="text-xs">No Poster</span>
                </div>
            )}
            
            {showImageEdit ? (
                <div className="mt-4 w-full">
                    <input 
                        type="text" 
                        value={editPrompt} 
                        onChange={e => setEditPrompt(e.target.value)}
                        placeholder="Add fireworks..."
                        className="w-full bg-slate-800 text-xs p-2 rounded mb-2 border border-slate-600 text-white"
                    />
                    <button
                        onClick={handleEditImage}
                        disabled={isGenerating}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1 rounded flex items-center justify-center gap-1"
                    >
                        {isGenerating ? <Loader2 className="animate-spin w-3 h-3"/> : "Update"}
                    </button>
                </div>
            ) : (
                <button 
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={isGenerating}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg text-xs font-semibold hover:opacity-90 transition-all w-full justify-center"
                >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {formData.posterUrl ? "Regenerate AI Art" : "Generate AI Art"}
                </button>
            )}
            </div>
        )}

        {/* Form Section */}
        <div className={`${isBooking ? 'w-full' : 'md:w-2/3'} p-6 relative overflow-y-auto`}>
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                {isBooking ? <Users className="text-indigo-400" /> : <Sparkles className="text-purple-400" />}
                {isBooking ? 'New Reservation' : 'Event Details'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Selection */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Entry Type</label>
                    <select 
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                        <optgroup label="Calendar Events">
                            <option value="food">Food Special</option>
                            <option value="music">Live Music</option>
                            <option value="special">Special Event</option>
                            <option value="private">Private Party</option>
                        </optgroup>
                        <optgroup label="Bookings">
                            <option value="booking">Table Reservation</option>
                        </optgroup>
                    </select>
                </div>

                {/* Name / Title */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                        {isBooking ? <Type size={12}/> : <Type size={12}/>}
                        {isBooking ? 'Customer Name' : 'Event Title'}
                    </label>
                    <input 
                        required
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        placeholder={isBooking ? "John Doe" : "Jazz Night"}
                    />
                </div>

                {/* Date & Time Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                        <input 
                            type="date"
                            required
                            className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={formData.date}
                            onChange={e => setFormData({...formData, date: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                            <Clock size={12}/>
                            {isBooking ? 'Time' : 'Start Time'}
                        </label>
                        <input 
                            type="time"
                            required
                            className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={formData.startTime}
                            onChange={e => setFormData({...formData, startTime: e.target.value})}
                        />
                    </div>
                </div>

                {/* Conditional Fields */}
                {!isBooking ? (
                    /* EVENT ONLY FIELDS */
                    <>
                         <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">End Time</label>
                            <input 
                                type="time"
                                required
                                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={formData.endTime}
                                onChange={e => setFormData({...formData, endTime: e.target.value})}
                            />
                        </div>
                    </>
                ) : (
                    /* RESERVATION ONLY FIELDS */
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                                    <Users size={12}/> Guests
                                </label>
                                <input 
                                    type="number"
                                    min="1"
                                    required
                                    className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    value={formData.guestCount}
                                    onChange={e => setFormData({...formData, guestCount: parseInt(e.target.value)})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                                    <Phone size={12}/> Phone
                                </label>
                                <input 
                                    type="tel"
                                    className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    placeholder="(555) 000-0000"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                                <Mail size={12}/> Email
                            </label>
                            <input 
                                type="email"
                                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                placeholder="customer@example.com"
                            />
                        </div>
                    </>
                )}

                {/* Common Description/Notes */}
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                         <AlignLeft size={12}/>
                         {isBooking ? 'Special Requests / Notes' : 'Description'}
                    </label>
                    <textarea 
                        rows={3}
                        className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder={isBooking ? "Allergies, high chair, birthday..." : "Event details..."}
                    />
                </div>

                <div className="flex gap-3 pt-2 mt-4 border-t border-slate-700">
                    <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded transition-colors">
                        {isBooking ? 'Save Reservation' : 'Save Event'}
                    </button>
                    {!isBooking && formData.id && (
                        <button 
                            type="button" 
                            onClick={() => onDelete(formData.id!)}
                            className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded transition-colors"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default EventModal;