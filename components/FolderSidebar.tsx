'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Folder, FolderPlus, Home, ChevronDown, Trash2, Check, X } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FolderItem {
    id: string;
    name: string;
    productCount?: number;
}

interface FolderSidebarProps {
    onFolderCreated?: () => void;
}

export default function FolderSidebar({ onFolderCreated }: FolderSidebarProps) {
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewInput, setShowNewInput] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const fetchFolders = async () => {
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

    useEffect(() => {
        fetchFolders();
    }, []);

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
                setNewFolderName('');
                setShowNewInput(false);
                await fetchFolders();
                onFolderCreated?.();
            }
        } catch (err) {
            console.error('Failed to create folder', err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteFolder = async (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Delete folder "${name}"? Products won't be deleted.`)) return;

        try {
            const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchFolders();
            }
        } catch (err) {
            console.error('Failed to delete folder', err);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Folder className="h-4 w-4" />
                    <span>Folders</span>
                    <span className="text-muted-foreground">({folders.length})</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
                {/* Create folder */}
                <div className="border-b p-2">
                    {showNewInput ? (
                        <div className="flex gap-1">
                            <Input
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Folder name..."
                                className="h-8 text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                autoFocus
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={handleCreateFolder}
                                disabled={isCreating || !newFolderName.trim()}
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                    setShowNewInput(false);
                                    setNewFolderName('');
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start gap-2"
                            onClick={() => setShowNewInput(true)}
                        >
                            <FolderPlus className="h-4 w-4" />
                            New Folder
                        </Button>
                    )}
                </div>

                {/* Folder list */}
                <div className="max-h-64 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : folders.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No folders yet</div>
                    ) : (
                        folders.map((folder) => {
                            const isActive = pathname === `/folders/${folder.id}`;
                            return (
                                <div
                                    key={folder.id}
                                    className={`group flex items-center justify-between px-2 py-1.5 hover:bg-accent ${isActive ? 'bg-accent' : ''
                                        }`}
                                >
                                    <Link
                                        href={`/folders/${folder.id}`}
                                        className="flex flex-1 items-center gap-2 text-sm"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <Folder className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="flex-1 truncate">{folder.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {folder.productCount || 0}
                                        </span>
                                    </Link>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                                        onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                                    >
                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Home link */}
                <div className="border-t p-2">
                    <Link
                        href="/"
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${pathname === '/' ? 'bg-accent' : ''
                            }`}
                        onClick={() => setIsOpen(false)}
                    >
                        <Home className={`h-4 w-4 ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span>All Unassigned</span>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
