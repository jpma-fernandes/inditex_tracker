'use client';

import Link from 'next/link';
import { Folder } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface FolderItem {
    id: string;
    name: string;
    productCount: number;
}

interface FolderGridProps {
    folders: FolderItem[];
}

export default function FolderGrid({ folders }: FolderGridProps) {
    if (folders.length === 0) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-8 text-center bg-accent/20 rounded-lg border border-dashed border-accent">
                <h3 className="text-xl font-semibold mb-2">My Folders</h3>
                <p className="text-muted-foreground mb-8">
                    You don't have any unassigned products. Check your folders below.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
                    {folders.map(folder => (
                        <Link key={folder.id} href={`/folders/${folder.id}`} className="block group">
                            <Card className="h-full transition-all hover:border-primary/50 hover:bg-accent/50">
                                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                        <Folder className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                            {folder.name}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            {folder.productCount} products
                                        </p>
                                    </div>
                                </CardHeader>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
