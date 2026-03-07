import React, { useState, useRef, useEffect } from 'react';
import { askOpenAIVision, ChatMessage } from '../../services/openaiService';

// Ikonos (puedes usar lucide-react si lo tienes instalado o SVGs)

export const PoseAssistantWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Add an initial greeting message if the chat is opened and empty
        if (isOpen && messages.length === 0) {
            setMessages([
                {
                    role: 'assistant',
                    content: '¡Hola! Sube una foto de referencia y pregúntame cómo describir esa pose o el atuendo para generar un buen prompt.'
                }
            ]);
        }
    }, [isOpen, messages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const toggleWidget = () => setIsOpen(!isOpen);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedImage(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        setPreviewUrl(null);
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]); // remueve 'data:image/...;base64,'
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSendMessage = async (text: string) => {
        if (!text.trim() && !selectedImage) return;

        let base64Image: string | undefined = undefined;
        if (selectedImage) {
            base64Image = await fileToBase64(selectedImage);
        }

        const newUserMsg: ChatMessage = {
            role: 'user',
            content: text || 'Please describe the pose in this image.',
            imageBase64: base64Image
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInputText('');
        removeImage();
        setIsLoading(true);

        try {
            // Ocultar base64 interno cuando enviamos el historial completo a OpenAI
            // para evitar re-enviar gigabytes de data inútilmente.
            // El modelo vision de openai prefiere que la imagen se envíe en el último / actual prompt
            const historyForApi: ChatMessage[] = messages.map(m => ({
                role: m.role,
                content: m.content
                // Omite re-enviar las imagenes anteriores para no consumir demasiados tokens,
                // a menos que sea el mensaje actual.
            }));

            // Añadimos el nuevo mensaje con la imagen actual si la hay
            historyForApi.push({
                role: newUserMsg.role,
                content: newUserMsg.content,
                // Solo para este mensaje enviamos la imagen base64 original:
                imageBase64: base64Image
            });

            // System prompt con contexto de la app VIST Influencer Studio
            const systemPromptContent = `Estarás asistiendo a usuarios de la app "VIST Influencer Studio". 
En esta app, los usuarios suben una "Foto Base" (para definir la cara e identidad de su influencer de IA) y "Fotos de Referencia" secundarias (para la pose o la ropa).
Tu objetivo es analizar las fotos de referencia enviadas por el usuario y extraer descripciones textuales EXTREMADAMENTE PRECISAS de la ropa (outfits) o la postura corporal (poses).
Regla de ORO: ENFÓCATE SÓLO EN EL CUERPO Y LA ROPA. Omitir, ignorar y jamás describir el rostro, la cabeza, el pelo o el tipo físico de la persona en la foto de referencia, ya que la cara de la imagen final vendrá de la "Foto Base" del usuario.
Si te piden la ropa (outfit): Mándales un párrafo útil, directo al grano y muy descriptivo (color, corte, tela, textura) que puedan copiar y pegar en su parámetro "Outfit / Ropa".
Si te piden la pose: Mándales un párrafo útil y descriptivo (ej. "Mujer sentada en el suelo con las rodillas recogidas abrazadas") para que copien en su parámetro "Pose".`;

            const fullPrompt: ChatMessage[] = [
                { role: 'system', content: systemPromptContent },
                ...historyForApi
            ];

            const replyStr = await askOpenAIVision(fullPrompt);
            setMessages(prev => [...prev, { role: 'assistant', content: replyStr }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSendMessage(inputText);
        }
    };

    return (
        <div className="fixed bottom-20 right-6 z-40 flex flex-col items-end">
            {/* Botón Flotante */}
            <button
                onClick={toggleWidget}
                className="w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white transition-all transform hover:scale-110"
                style={{ background: '#1A1714', border: '1px solid #2A1F1C', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}
            >
                {isOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                )}
            </button>

            {/* Ventana de Chat */}
            {isOpen && (
                <div className="absolute bottom-14 right-0 w-80 md:w-96 h-[500px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                  style={{ background: '#0D0A0A', border: '1px solid #2A1F1C', boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}>
                    {/* Header */}
                    <div className="p-4 flex justify-between items-center" style={{ background: '#161110', borderBottom: '1px solid #2A1F1C' }}>
                        <div>
                            <h3 className="text-white font-medium">Asistente de Poses (GPT-5 Nano)</h3>
                            <p className="text-xs text-zinc-400">Sube fotos para describir ropa o poses</p>
                        </div>
                        <button onClick={toggleWidget} className="text-zinc-400 hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Historial de Chat */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : 'bg-zinc-800 text-zinc-200 border border-white/5 rounded-tl-sm'
                                    }`}>
                                    {msg.role === 'user' && msg.imageBase64 && (
                                        <img
                                            src={`data:image/jpeg;base64,${msg.imageBase64}`}
                                            alt="Uploaded ref"
                                            className="w-full h-auto rounded-lg mb-2 border border-white/20"
                                        />
                                    )}
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-zinc-800 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-2">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-zinc-800 border-t border-white/10">
                        {/* Pre-baked action buttons */}
                        <div className="flex space-x-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
                            <button
                                onClick={() => setInputText("Describe detalladamente la pose en esta imagen (posición brazos, piernas, ángulo).")}
                                className="text-xs whitespace-nowrap bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded-full"
                            >
                                🔍 Describir Pose
                            </button>
                            <button
                                onClick={() => setInputText("Describe la ropa en esta imagen para poder replicarla.")}
                                className="text-xs whitespace-nowrap bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded-full"
                            >
                                👗 Describir Ropa
                            </button>
                        </div>

                        {/* Preview img */}
                        {previewUrl && (
                            <div className="relative inline-block mb-2">
                                <img src={previewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                                <button
                                    onClick={removeImage}
                                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5"
                                >
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        )}

                        <div className="flex items-center space-x-2 relative">
                            <input
                                type="text"
                                placeholder="Pregunta o describe algo..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="flex-1 bg-zinc-900 border border-white/10 text-white text-sm rounded-full pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />

                            <label className="absolute right-12 cursor-pointer text-zinc-400 hover:text-white p-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </label>

                            <button
                                onClick={() => handleSendMessage(inputText)}
                                disabled={isLoading || (!inputText.trim() && !selectedImage)}
                                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed p-2.5 rounded-full text-white transition-colors"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
