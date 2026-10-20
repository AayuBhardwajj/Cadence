import React from 'react';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    // Process markdown text into structured elements
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];
    let inList = false;

    const flushList = (key: number) => {
        if (currentList.length > 0) {
            elements.push(
                <ul key={`ul-${key}`} className="space-y-2 my-4 list-disc list-inside text-neutral-700 dark:text-neutral-300">
                    {currentList.map((item, idx) => (
                        <li key={idx} className="leading-relaxed pl-1">
                            {formatInline(item)}
                        </li>
                    ))}
                </ul>
            );
            currentList = [];
            inList = false;
        }
    };

    const formatInline = (text: string): React.ReactNode => {
        // Handle bold **text** and code `text`
        const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return (
                    <strong key={i} className="font-bold text-neutral-900 dark:text-neutral-100">
                        {part.slice(2, -2)}
                    </strong>
                );
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return (
                    <code key={i} className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-brand font-mono text-xs">
                        {part.slice(1, -1)}
                    </code>
                );
            }
            return part;
        });
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            inList = true;
            currentList.push(trimmed.slice(2));
            return;
        }

        if (inList) {
            flushList(index);
        }

        if (!trimmed) {
            return;
        }

        if (trimmed.startsWith('### ')) {
            elements.push(
                <h4 key={index} className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-6 mb-2">
                    {formatInline(trimmed.slice(4))}
                </h4>
            );
        } else if (trimmed.startsWith('## ')) {
            elements.push(
                <h3 key={index} className="text-xl font-extrabold text-neutral-900 dark:text-neutral-100 mt-8 mb-3 pb-1 border-b border-neutral-200 dark:border-neutral-800">
                    {formatInline(trimmed.slice(3))}
                </h3>
            );
        } else if (trimmed.startsWith('# ')) {
            elements.push(
                <h2 key={index} className="text-2xl font-black text-brand mt-6 mb-4">
                    {formatInline(trimmed.slice(2))}
                </h2>
            );
        } else if (trimmed.startsWith('> ')) {
            elements.push(
                <blockquote key={index} className="border-l-4 border-brand pl-4 py-2 my-4 bg-brand/5 dark:bg-brand/10 rounded-r-lg italic text-neutral-700 dark:text-neutral-300">
                    {formatInline(trimmed.slice(2))}
                </blockquote>
            );
        } else {
            elements.push(
                <p key={index} className="my-3 text-neutral-700 dark:text-neutral-300 leading-relaxed text-sm sm:text-base">
                    {formatInline(trimmed)}
                </p>
            );
        }
    });

    if (inList) {
        flushList(lines.length);
    }

    return <div className={`prose-like space-y-2 ${className}`}>{elements}</div>;
};
