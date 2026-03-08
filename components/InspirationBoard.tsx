import React, { useState, useRef, useEffect } from 'react';
import { InspirationImage } from '../types';

interface InspirationBoardProps {
    images: InspirationImage[];
    onAdd: (file: File, name: string) => void;
    onDelete: (id: string) => void;
    onUse: (image: InspirationImage, target: 'model' | 'outfit' | 'pose' | 'scenario' | 'accessory') => void;
}

const InspirationBoard: React.FC<InspirationBoardProps> = ({ images, onAdd, onDelete, onUse }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Inline modal for naming the inspiration image
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingName, setPendingName] = useState('');
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Focus input when modal appears
    useEffect(() => {
        if (pendingFile) {
            nameInputRef.current?.focus();
        }
    }, [pendingFile]);

    const openNamingModal = (file: File) => {
        setPendingFile(file);
        setPendingName(file.name.split('.')[0]);
    };

    const confirmAdd = () => {
        if (pendingFile && pendingName.trim()) {
            onAdd(pendingFile, pendingName.trim());
            setPendingFile(null);
            setPendingName('');
        }
    };

    const cancelAdd = () => {
        setPendingFile(null);
        setPendingName('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            openNamingModal(file);
        }
        // Clear input so the same file can be selected again
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            openNamingModal(file);
        }
    };

    // Close menu if clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenFor(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleUseClick = (image: InspirationImage, target: 'model' | 'outfit' | 'pose' | 'scenario' | 'accessory') => {
        onUse(image, target);
        setMenuOpenFor(null);
    };

    return (
        <div
            className="w-full h-full"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-2xl">
                    <div className="p-8 border-2 border-dashed border-purple-500 rounded-xl text-center">
                        <h3 className="text-xl font-bold text-white">Drop to add to Inspiration</h3>
                        <p className="text-zinc-400">The image will be saved to your board.</p>
                    </div>
                </div>
            )}

            {/* Inline modal for naming the image */}
            {pendingFile && (
                <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="naming-modal-title"
                        className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                    >
                        <h2 id="naming-modal-title" className="text-base font-semibold text-white mb-4">Name this inspiration image</h2>
                        <input
                            ref={nameInputRef}
                            type="text"
                            value={pendingName}
                            onChange={(e) => setPendingName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') cancelAdd(); }}
                            placeholder="Image name..."
                            aria-label="Inspiration image name"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={confirmAdd}
                                disabled={!pendingName.trim()}
                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium text-sm rounded-lg transition-colors"
                            >
                                Add
                            </button>
                            <button
                                onClick={cancelAdd}
                                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {images.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                    <div className="w-16 h-16 mb-4 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                    </div>
                    <h3 className="text-sm font-medium text-zinc-400 mb-2 text-center">Your inspiration board is empty</h3>
                    <p className="text-xs max-w-xs text-center px-2 text-zinc-500">Drag images here or use the button to start collecting ideas.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                    {images.map((image, index) => (
                        <div
                          key={image.id}
                          className="relative group aspect-square rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg isolate overflow-hidden animate-in fade-in zoom-in-95 duration-300"
                          style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: 'backwards' }}
                        >
                            <img src={image.url} alt={image.name} className="w-full h-full object-cover" />

                            {/* Overlay: always visible on mobile, hover on desktop */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                <h4 className="text-sm font-bold text-white drop-shadow-md truncate mb-2">{image.name}</h4>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <button
                                            onClick={() => setMenuOpenFor(image.id === menuOpenFor ? null : image.id)}
                                            aria-label={`Use ${image.name} as...`}
                                            aria-expanded={menuOpenFor === image.id}
                                            className="w-full px-2 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-md shadow transition-colors flex items-center justify-center gap-1"
                                        >
                                            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0L15.3 9.3"/><path d="m21.3 2.7-9.1 9.1"/><path d="m11.9 2.7 3.4 3.4"/></svg>
                                            Use
                                        </button>
                                        {menuOpenFor === image.id && (
                                            <div ref={menuRef} className="absolute bottom-full mb-2 left-0 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                                               <button onClick={() => handleUseClick(image, 'model')} className="w-full text-left text-xs px-2 py-1.5 hover:bg-zinc-700 rounded text-zinc-200">Model (Face)</button>
                                               <button onClick={() => handleUseClick(image, 'outfit')} className="w-full text-left text-xs px-2 py-1.5 hover:bg-zinc-700 rounded text-zinc-200">Outfit (Clothing)</button>
                                               <button onClick={() => handleUseClick(image, 'pose')} className="w-full text-left text-xs px-2 py-1.5 hover:bg-zinc-700 rounded text-zinc-200">Pose</button>
                                               <button onClick={() => handleUseClick(image, 'scenario')} className="w-full text-left text-xs px-2 py-1.5 hover:bg-zinc-700 rounded text-zinc-200">Scenario</button>
                                               <button onClick={() => handleUseClick(image, 'accessory')} className="w-full text-left text-xs px-2 py-1.5 hover:bg-zinc-700 rounded text-zinc-200">Accessory</button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Delete button with confirmation */}
                                    {deleteConfirmId === image.id ? (
                                        <div
                                          role="alertdialog"
                                          aria-label="Confirm inspiration image deletion"
                                          className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-md px-1.5 py-1 animate-in fade-in zoom-in-95 duration-150"
                                          onClick={e => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => { onDelete(image.id); setDeleteConfirmId(null); }}
                                                aria-label="Confirm deletion"
                                                className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded transition-colors"
                                            >Yes</button>
                                            <button
                                                onClick={() => setDeleteConfirmId(null)}
                                                aria-label="Cancel"
                                                className="px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-white text-[10px] font-bold rounded transition-colors"
                                            >No</button>
                                        </div>
                                    ) : (
                                        <button
                                          onClick={() => setDeleteConfirmId(image.id)}
                                          aria-label={`Delete ${image.name}`}
                                          className="p-2 bg-red-600/80 hover:bg-red-500 text-white rounded-md shadow transition-colors"
                                        >
                                            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-6 w-full flex justify-center">
                <div className="relative">
                    <button className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-xl border border-zinc-700 hover:border-zinc-600 shadow transition-all">
                        Add Inspiration
                    </button>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        aria-label="Select inspiration image"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
};

export default InspirationBoard;
