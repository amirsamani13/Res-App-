import { GoogleGenAI, Type, FunctionDeclaration, Modality, Schema } from "@google/genai";
import { CalendarEvent, Reservation } from "../types";

// --- Initialization ---
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Image Generation (Nano Banana) ---
export const generateEventPoster = async (prompt: string, aspectRatio: "1:1" | "16:9" = "1:1") => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: { aspectRatio }
    }
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

// --- Image Editing ---
export const editEventPoster = async (base64Image: string, prompt: string) => {
  const ai = getAI();
  // Remove data URL prefix if present for the API call
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
        { text: prompt }
      ]
    }
  });

   for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No edited image generated");
};

// --- Thinking Mode Chat ---
export const askBusinessAnalyst = async (history: string[], question: string, events: CalendarEvent[], reservations: Reservation[]) => {
  const ai = getAI();
  const eventsContext = JSON.stringify(events.map(e => ({ title: e.title, date: e.date, type: e.type })));
  const resContext = JSON.stringify(reservations.map(r => ({ date: r.date, time: r.time, size: r.size, status: r.status })));
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
      Context: You are a strategic restaurant consultant.
      Current Events Schedule: ${eventsContext}
      Current Reservations: ${resContext}
      Conversation History: ${history.join('\n')}
      User Question: ${question}
    `,
    config: {
      thinkingConfig: { thinkingBudget: 32768 }, // Max thinking
    }
  });
  
  return response.text;
};

// --- Fast Chat ---
export const fastChat = async (question: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite', // Using Flash-Lite for speed
        contents: question
    });
    return response.text;
}

// --- Tools Definition for Live API ---
export const upsertEventTool: FunctionDeclaration = {
  name: 'upsertEvent',
  description: 'Add or update an event in the calendar. Use for special nights, music, or food specials.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: 'ID of the existing event to update (optional)' },
      title: { type: Type.STRING, description: 'Name of the event' },
      date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' },
      startTime: { type: Type.STRING, description: 'Start time in HH:mm' },
      endTime: { type: Type.STRING, description: 'End time in HH:mm' },
      description: { type: Type.STRING, description: 'Short description' },
      type: { type: Type.STRING, enum: ['special', 'music', 'food', 'private'] }
    },
    required: ['title', 'date', 'startTime']
  }
};

export const deleteEventTool: FunctionDeclaration = {
    name: 'deleteEvent',
    description: 'Remove an event from the calendar based on title or date.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            date: { type: Type.STRING, description: 'Date of event to remove' },
            titleKeyword: { type: Type.STRING, description: 'Keyword to identify the event' }
        },
        required: ['date']
    }
}

// ADMIN Tool: Creates immediately
export const createReservationTool: FunctionDeclaration = {
  name: 'createReservation',
  description: 'Create a new table reservation immediately. Use this for ADMIN requests.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: 'Name of the customer' },
      size: { type: Type.NUMBER, description: 'Number of people' },
      date: { type: Type.STRING, description: 'Date in YYYY-MM-DD' },
      time: { type: Type.STRING, description: 'Time in HH:mm' },
      phone: { type: Type.STRING, description: 'Phone number (optional)' },
      email: { type: Type.STRING, description: 'Email (optional)' },
      notes: { type: Type.STRING, description: 'Special requests (optional)' }
    },
    required: ['customerName', 'size', 'date', 'time']
  }
};

// CUSTOMER Tool: Presents review form
export const presentBookingReviewTool: FunctionDeclaration = {
    name: 'presentBookingReview',
    description: 'TRIGGERS UI MODAL: Call this IMMEDIATELY once you have Name, Date, Time, and Size. DO NOT wait for user confirmation. Call this tool to show the details on the screen.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            customerName: { type: Type.STRING, description: 'Name of the customer' },
            size: { type: Type.NUMBER, description: 'Number of people' },
            date: { type: Type.STRING, description: 'Date in YYYY-MM-DD' },
            time: { type: Type.STRING, description: 'Time in HH:mm' },
            notes: { type: Type.STRING, description: 'Special requests (optional)' }
        },
        required: ['customerName', 'size', 'date', 'time']
    }
};

export const updateReservationTool: FunctionDeclaration = {
  name: 'updateReservation',
  description: 'Update a reservation. IMPORTANT: You MUST provide the "id" returned from createReservation. Use this for corrections (wrong time, size, etc).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: 'The UUID of the reservation to update. If you just created one, use that ID.' },
      status: { type: Type.STRING, enum: ['confirmed', 'cancelled', 'pending'], description: 'New status' },
      date: { type: Type.STRING, description: 'New date YYYY-MM-DD' },
      time: { type: Type.STRING, description: 'New time HH:mm' },
      size: { type: Type.NUMBER, description: 'New party size' },
      customerName: { type: Type.STRING, description: 'Corrected name' },
      notes: { type: Type.STRING, description: 'Updated notes' }
    },
    required: ['id']
  }
};