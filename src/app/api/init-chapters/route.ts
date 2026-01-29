import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const chapter1 = await fs.readFile(
            path.join(process.cwd(), 'seed-content', 'chapter-01.md'),
            'utf-8'
        );
        const chapter2 = await fs.readFile(
            path.join(process.cwd(), 'seed-content', 'chapter-02.md'),
            'utf-8'
        );

        return NextResponse.json({
            chapters: [
                { id: 1, title: '失业者的末日', content: chapter1 },
                { id: 2, title: '环球中心的低语', content: chapter2 }
            ]
        });
    } catch (error) {
        console.error('Failed to load seed chapters:', error);
        return NextResponse.json({ error: 'Failed to load seed chapters' }, { status: 500 });
    }
}
