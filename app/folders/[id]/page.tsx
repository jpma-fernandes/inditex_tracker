'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { Folder, RefreshCw, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProductList from '@/components/ProductList';
import SearchInput from '@/components/SearchInput';

interface FolderData {
    id: string;
    name: string;
    productCount: number;
}

export default function FolderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [folder, setFolder] = useState<FolderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    useEffect(() => {
        async function fetchFolder() {
            try {
                const res = await fetch(`/api/folders/${id}`);
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || 'Failed to load folder');
                    return;
                }

                setFolder(data.folder);
                setEditName(data.folder.name);
            } catch {
                setError('Failed to load folder');
            } finally {
                setLoading(false);
            }
        }

        fetchFolder();
    }, [id, refreshTrigger]);

    const handleRename = async () => {
        if (!editName.trim() || editName === folder?.name) {
            setIsEditing(false);
            return;
        }

        try {
            const res = await fetch(`/api/folders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName.trim() }),
            });

            if (res.ok) {
                setRefreshTrigger(prev => prev + 1);
            }
        } catch {
            console.error('Failed to rename folder');
        }
        setIsEditing(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin"><RefreshCw className="h-6 w-6" /></div>
            </div>
        );
    }

    if (error || !folder) {
        return (
            <div className="text-center py-12">
                <p className="text-destructive mb-4">{error || 'Folder not found'}</p>
                <Button asChild variant="link">
                    <Link href="/">
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back to home
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/" className="hover:text-foreground transition-colors">
                    Home
                </Link>
                <span>/</span>
                <span className="flex items-center gap-1.5 text-foreground">
                    <Folder className="h-4 w-4" />
                    {folder.name}
                </span>
            </nav>

            {/* Folder header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Folder className="h-8 w-8 text-muted-foreground" />
                    {isEditing ? (
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            className="text-2xl font-bold h-auto py-0 border-0 border-b-2 rounded-none focus-visible:ring-0"
                            autoFocus
                        />
                    ) : (
                        <h1
                            className="text-2xl font-bold cursor-pointer hover:text-muted-foreground transition-colors"
                            onClick={() => setIsEditing(true)}
                            title="Click to rename"
                        >
                            {folder.name}
                        </h1>
                    )}
                    <span className="text-muted-foreground text-sm">
                        ({folder.productCount} products)
                    </span>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRefreshTrigger(prev => prev + 1)}
                    className="gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Search bar */}
            <div className="max-w-md">
                <SearchInput onSearch={handleSearch} placeholder="Search by product name..." />
            </div>

            {/* Products in this folder */}
            <ProductList
                refreshTrigger={refreshTrigger}
                folderId={id}
                searchQuery={searchQuery}
            />
        </div>
    );
}
