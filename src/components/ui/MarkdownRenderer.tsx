import React from 'react';

// A simple component to render markdown-like text from the AI.
// Handles: **bold**, list items starting with '-' or '*', and newlines.
export const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    const createMarkup = (line: string) => {
        // Sanitize to remove any unwanted HTML, just in case
        const sanitizedLine = line.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // Apply markdown
        const boldedLine = sanitizedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return { __html: boldedLine };
    };

    const lines = text.split('\n');

    return (
        <div className="prose prose-invert prose-sm text-white">
            {lines.map((line, index) => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
                    return (
                        <div key={index} className="flex items-start">
                           <span className="mr-2 mt-1">&bull;</span>
                           <span dangerouslySetInnerHTML={createMarkup(line.substring(2))} />
                        </div>
                    );
                }
                // Render a paragraph with a non-breaking space for empty lines to preserve spacing
                return <p key={index} className="my-0" dangerouslySetInnerHTML={createMarkup(line || '&nbsp;')} />;
            })}
        </div>
    );
};