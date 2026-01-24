'use client';

import { useState, useEffect } from 'react';
import { FolderPlus, Plus, Check, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface Folder {
    id: string;
    name: string;
    productCount?: number;
}

interface AddToFolderModalProps {
    productId: string;
    productName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function AddToFolderModal({
    productId,
    productName,
    isOpen,
    onClose,
    onSuccess,
}: AddToFolderModalProps) {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchFolders();
            setSelectedFolders(new Set());
            setShowNewFolderInput(false);
            setNewFolderName('');
        }
    }, [isOpen]);

    const fetchFolders = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/folders');
            const data = await res.json();
            if (res.ok) {
                setFolders(data.folders || []);
            }
        } catch (err) {
            console.error('Failed to fetch folders', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFolder = (folderId: string) => {
        setSelectedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        setIsCreating(true);
        try {
            const res = await fetch('/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFolderName.trim() }),
            });

            if (res.ok) {
                const data = await res.json();
                // Add the new folder and select it
                setFolders(prev => [...prev, data.folder]);
                setSelectedFolders(prev => new Set(prev).add(data.folder.id));
                setNewFolderName('');
                setShowNewFolderInput(false);
            }
        } catch (err) {
            console.error('Failed to create folder', err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleSave = async () => {
        if (selectedFolders.size === 0) {
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            const promises = Array.from(selectedFolders).map(folderId =>
                fetch(`/api/folders/${folderId}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ productIds: [productId] }),
                })
            );

            await Promise.all(promises);
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Failed to add to folders', err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderPlus className="h-5 w-5" />
                        Add to Folder
                    </DialogTitle>
                    <DialogDescription className="truncate">
                        {productName}
                    </DialogDescription>
                </DialogHeader>

                <Separator />

                <div className="space-y-4">
                    {/* Folder List */}
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                        {isLoading ? (
                            <div className="py-8 text-center text-muted-foreground">Loading folders...</div>
                        ) : folders.length === 0 && !showNewFolderInput ? (
                            <div className="py-8 text-center text-muted-foreground">
                                No folders yet. Create one below.
                            </div>
                        ) : (
                            folders.map(folder => (
                                <label
                                    key={folder.id}
                                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                                >
                                    <Checkbox
                                        checked={selectedFolders.has(folder.id)}
                                        onCheckedChange={() => toggleFolder(folder.id)}
                                    />
                                    <span className="flex-1">{folder.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {folder.productCount || 0}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>

                    {/* Create New Folder */}
                    {showNewFolderInput ? (
                        <div className="flex gap-2">
                            <Input
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New folder name..."
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                autoFocus
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleCreateFolder}
                                disabled={isCreating || !newFolderName.trim()}
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                    setShowNewFolderInput(false);
                                    setNewFolderName('');
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setShowNewFolderInput(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Folder
                        </Button>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || selectedFolders.size === 0}>
                            {isSaving ? 'Adding...' : `Add to ${selectedFolders.size} folder(s)`}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
