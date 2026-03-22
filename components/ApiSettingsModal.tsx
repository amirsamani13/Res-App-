
import React, { useState } from 'react';
import { X, Globe, Lock, Check, AlertCircle, Copy, Server } from 'lucide-react';

interface ApiSettingsModalProps {
  onClose: () => void;
  onSave: (endpoint: string, key: string) => void;
  currentEndpoint: string;
  currentKey: string;
}

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ onClose, onSave, currentEndpoint, currentKey }) => {
  const [endpoint, setEndpoint] = useState(currentEndpoint);
  const [apiKey, setApiKey] = useState(currentKey);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleSave = () => {
    onSave(endpoint, apiKey);
  };

  const handleTest = async () => {
    if (!endpoint) return;
    setTestStatus('testing');
    try {
        // We attempt a simple GET or OPTIONS (simulated by a fetch) to check connectivity
        // Note: In a real scenario, you might have a specific /health endpoint
        await fetch(endpoint, {
            method: 'OPTIONS', // Or HEAD/GET depending on server support
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        // If fetch doesn't throw network error, we assume connectivity is okay for now
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 2000);
    } catch (e) {
        console.error(e);
        // Even if 404/500, we connected. Only network error throws.
        // For this demo, let's assume if it fails it fails.
        setTestStatus('error');
    }
  };

  const copyCode = () => {
    const code = `
// Add this to your website to fetch events
async function loadEvents() {
  const response = await fetch('${endpoint || 'YOUR_API_ENDPOINT'}', {
    headers: { 'Authorization': 'Bearer ${apiKey || 'YOUR_API_KEY'}' }
  });
  const events = await response.json();
  renderCalendar(events);
}`;
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg">
                    <Globe className="text-white" size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Website Integration</h2>
                    <p className="text-xs text-slate-400">Connect RestoSync to your live website</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
            
            {/* Configuration Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Server size={14} /> Connection Settings
                </h3>
                
                <div className="grid gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">API Endpoint URL (Webhook)</label>
                        <input 
                            type="url"
                            placeholder="https://api.your-website.com/v1/events"
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm"
                            value={endpoint}
                            onChange={(e) => setEndpoint(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-500 mt-1">The app will send POST requests with the full event JSON to this URL whenever the calendar changes.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">API Secret Key (Bearer Token)</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-slate-500" size={16} />
                            <input 
                                type="password"
                                placeholder="sk_live_..."
                                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <button 
                        onClick={handleTest}
                        className={`text-xs px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                            testStatus === 'error' ? 'text-red-400 bg-red-900/20' : 
                            testStatus === 'success' ? 'text-green-400 bg-green-900/20' : 
                            'text-slate-400 hover:bg-slate-800'
                        }`}
                    >
                        {testStatus === 'testing' ? <div className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" /> : 
                         testStatus === 'success' ? <Check size={14} /> : 
                         testStatus === 'error' ? <AlertCircle size={14} /> : <Globe size={14} />}
                        {testStatus === 'success' ? 'Connection Active' : testStatus === 'error' ? 'Connection Failed' : 'Test Connection'}
                    </button>
                </div>
            </div>

            {/* Integration Guide Section */}
            <div className="bg-slate-950 rounded-lg border border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-slate-300">Frontend Integration Code</h3>
                    <button onClick={copyCode} className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                        <Copy size={12} /> Copy
                    </button>
                </div>
                <div className="bg-black/50 rounded p-3 overflow-x-auto">
                    <pre className="text-[10px] md:text-xs text-slate-400 font-mono leading-relaxed">
{`// 1. Add this function to your website's JavaScript
async function fetchCalendarEvents() {
  try {
    const res = await fetch('${endpoint || 'YOUR_API_ENDPOINT'}', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ${apiKey || 'YOUR_API_KEY'}',
        'Content-Type': 'application/json'
      }
    });
    const events = await res.json();
    console.log("Loaded events:", events);
    return events;
  } catch (err) {
    console.error("Failed to load calendar", err);
    return [];
  }
}

// 2. Call it when your page loads
document.addEventListener('DOMContentLoaded', fetchCalendarEvents);`}
                    </pre>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
                Save Integration
            </button>
        </div>
      </div>
    </div>
  );
};

export default ApiSettingsModal;
