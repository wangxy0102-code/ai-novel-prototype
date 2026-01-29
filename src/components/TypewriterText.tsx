'use client';

import { useState, useEffect, useRef } from 'react';

interface TypewriterProps {
    text: string;
    speed?: number;
    onComplete?: () => void;
    className?: string;
}

export default function Typewriter({
    text,
    speed = 25,
    onComplete,
    className = ''
}: TypewriterProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);
    const textRef = useRef(text);
    const indexRef = useRef(0);

    useEffect(() => {
        // 如果文本改变，重置
        if (text !== textRef.current) {
            textRef.current = text;
            indexRef.current = 0;
            setDisplayedText('');
            setIsComplete(false);
        }

        if (isComplete) return;

        const timer = setInterval(() => {
            if (indexRef.current < text.length) {
                indexRef.current++;
                setDisplayedText(text.slice(0, indexRef.current));
            } else {
                clearInterval(timer);
                setIsComplete(true);
                onComplete?.();
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed, onComplete, isComplete]);

    return (
        <span className={className}>
            {displayedText}
            {!isComplete && (
                <span className="inline-block w-0.5 h-[1em] bg-purple-400 ml-0.5 animate-pulse align-middle" />
            )}
        </span>
    );
}
