import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export const WysiwygEditor = ({ 
  value, 
  onChange, 
  placeholder = "Start writing your article...", 
  className,
  readOnly = false 
}: WysiwygEditorProps) => {
  const [ReactQuill, setReactQuill] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    // Dynamic import for client-side only
    const loadQuill = async () => {
      try {
        const { default: QuillComponent } = await import('react-quill');
        await import('react-quill/dist/quill.snow.css');
        setReactQuill(() => QuillComponent);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load ReactQuill:', error);
      }
    };

    if (typeof window !== 'undefined') {
      loadQuill();
    }
  }, []);

  // Enhanced toolbar with WordPress-compatible formatting options
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
    clipboard: {
      // Toggle to add extra line breaks when pasting HTML:
      matchVisual: false,
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 
    'color', 'background',
    'script',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  // Handle change to ensure WordPress compatibility
  const handleChange = (content: string) => {
    // Convert Quill's HTML to WordPress-friendly format
    let processedContent = content;
    
    // Ensure proper paragraph tags
    processedContent = processedContent.replace(/<div>/g, '<p>');
    processedContent = processedContent.replace(/<\/div>/g, '</p>');
    
    // Clean up empty paragraphs
    processedContent = processedContent.replace(/<p><br><\/p>/g, '<p>&nbsp;</p>');
    
    // Ensure proper line breaks
    processedContent = processedContent.replace(/<br\s*\/?>/g, '<br />');
    
    onChange(processedContent);
  };

  if (!isLoaded || !ReactQuill) {
    // Fallback for server-side rendering or while loading
    return (
      <div className={cn("min-h-[300px] border rounded-md p-3 bg-background", className)}>
        <div className="text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={cn("wysiwyg-wrapper", className)}>
      <style dangerouslySetInnerHTML={{
        __html: `
          .wysiwyg-wrapper .ql-editor {
            min-height: 300px;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.6;
          }
          
          .wysiwyg-wrapper .ql-toolbar {
            border-top: 1px solid hsl(var(--border));
            border-left: 1px solid hsl(var(--border));
            border-right: 1px solid hsl(var(--border));
            background: hsl(var(--background));
          }
          
          .wysiwyg-wrapper .ql-container {
            border-bottom: 1px solid hsl(var(--border));
            border-left: 1px solid hsl(var(--border));
            border-right: 1px solid hsl(var(--border));
            background: hsl(var(--background));
          }
          
          .wysiwyg-wrapper .ql-editor.ql-blank::before {
            color: hsl(var(--muted-foreground));
            font-style: normal;
          }
          
          .wysiwyg-wrapper .ql-editor h1 {
            font-size: 2em;
            font-weight: bold;
            margin: 0.67em 0;
          }
          
          .wysiwyg-wrapper .ql-editor h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.75em 0;
          }
          
          .wysiwyg-wrapper .ql-editor h3 {
            font-size: 1.3em;
            font-weight: bold;
            margin: 0.83em 0;
          }
          
          .wysiwyg-wrapper .ql-editor blockquote {
            border-left: 4px solid hsl(var(--border));
            margin: 1em 0;
            padding: 0.5em 10px;
            background: hsl(var(--muted) / 0.3);
          }
          
          .wysiwyg-wrapper .ql-editor code {
            background: hsl(var(--muted));
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          
          .wysiwyg-wrapper .ql-editor pre {
            background: hsl(var(--muted));
            padding: 1em;
            border-radius: 6px;
            overflow-x: auto;
          }
          
          .wysiwyg-wrapper .ql-editor img {
            max-width: 100%;
            height: auto;
          }
          
          .wysiwyg-wrapper .ql-editor a {
            color: hsl(var(--primary));
            text-decoration: underline;
          }
          
          .wysiwyg-wrapper .ql-editor ul, .wysiwyg-wrapper .ql-editor ol {
            padding-left: 1.5em;
          }
          
          .wysiwyg-wrapper .ql-toolbar .ql-formats {
            margin-right: 15px;
          }
          
          .wysiwyg-wrapper .ql-toolbar button:hover {
            color: hsl(var(--primary));
          }
          
          .wysiwyg-wrapper .ql-toolbar button.ql-active {
            color: hsl(var(--primary));
          }
        `
      }} />
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={{
          height: '300px',
          marginBottom: '42px' // Account for toolbar height
        }}
      />
    </div>
  );
};

// Utility function to convert rich text to plain text for previews
export const stripHtml = (html: string): string => {
  if (typeof window === 'undefined') return html;
  
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

// Utility function to extract first paragraph for excerpts
export const extractExcerpt = (html: string, maxLength: number = 150): string => {
  const plainText = stripHtml(html);
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength).trim() + '...';
};

// Utility function to convert to WordPress-compatible format
export const formatForWordPress = (content: string): string => {
  let formatted = content;
  
  // Ensure proper WordPress paragraph structure
  formatted = formatted.replace(/<div>/g, '<p>');
  formatted = formatted.replace(/<\/div>/g, '</p>');
  
  // Convert Quill's image handling to WordPress format
  formatted = formatted.replace(/<img([^>]*)>/g, (match, attrs) => {
    // Ensure images have proper WordPress classes and attributes
    if (!attrs.includes('class=')) {
      return `<img${attrs} class="wp-image aligncenter">`;
    }
    return match;
  });
  
  // Ensure proper line break format
  formatted = formatted.replace(/<br\s*\/?>/g, '<br />');
  
  // Clean up excessive whitespace
  formatted = formatted.replace(/\n\s*\n/g, '\n');
  
  return formatted;
};