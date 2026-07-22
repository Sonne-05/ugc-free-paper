import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { API_BASE_URL } from '../services/api';

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ]
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'script',
  'color', 'background',
  'clean'
];

const RichExplanationEditor = ({ value = '', onChange, placeholder = 'Write detailed explanation...', questionContext }) => {
  const [showHtml, setShowHtml] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAiExplain = async () => {
    if (!questionContext || !questionContext.text || !questionContext.text.trim()) {
      alert('Please fill in the question text first before generating an explanation.');
      return;
    }

    setIsGenerating(true);
    onChange(''); // Clear existing explanation
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionContext })
      });

      if (!response.ok) {
        let errMsg = 'Failed to generate explanation';
        try {
          const err = await response.json();
          errMsg = err.message || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let accumulatedText = '';
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          
          let lineIndex;
          while ((lineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, lineIndex).trim();
            buffer = buffer.slice(lineIndex + 1);
            
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(dataStr);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  accumulatedText += content;
                  
                  // Clean up markdown wrappers on-the-fly
                  let cleaned = accumulatedText.trim();
                  if (cleaned.startsWith('```html')) {
                    cleaned = cleaned.replace(/^```html\s*/, '');
                  } else if (cleaned.startsWith('```')) {
                    cleaned = cleaned.replace(/^```\s*/, '');
                  }
                  cleaned = cleaned.replace(/\s*```$/, '');
                  
                  onChange(cleaned);
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON lines
              }
            }
          }
        }
      }

      // Process any trailing data in buffer
      if (buffer.trim().startsWith('data: ')) {
        const line = buffer.trim();
        const dataStr = line.slice(6).trim();
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              accumulatedText += content;
              let cleaned = accumulatedText.trim();
              if (cleaned.startsWith('```html')) {
                cleaned = cleaned.replace(/^```html\s*/, '');
              } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```\s*/, '');
              }
              cleaned = cleaned.replace(/\s*```$/, '');
              onChange(cleaned);
            }
          } catch (_) {}
        }
      }
    } catch (error) {
      console.error('AI Explanation Error:', error);
      alert(`Error generating explanation: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rich-explanation-editor" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
      {/* Editor Header Bar with HTML Toggle & AI generate */}
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        padding: '6px 12px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        fontSize: '0.8rem',
        fontWeight: '600',
        color: '#475569'
      }}>
        <span>Explanation Editor (MS Word Style)</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {questionContext && (
            <button
              type="button"
              onClick={handleAiExplain}
              disabled={isGenerating}
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                opacity: isGenerating ? 0.7 : 1,
                boxShadow: '0 1px 3px rgba(79, 70, 229, 0.2)'
              }}
              title="Automatically generate explanation using AI"
            >
              <span>{isGenerating ? '⏳' : '✨'}</span>
              <span>{isGenerating ? 'Generating...' : 'AI Explain'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowHtml(!showHtml)}
            style={{
              background: showHtml ? '#1e293b' : '#e2e8f0',
              color: showHtml ? '#ffffff' : '#334155',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s'
            }}
            title="Toggle Raw HTML View"
          >
            <span>&lt;/&gt;</span>
            <span>{showHtml ? 'Visual Mode' : 'HTML Mode'}</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      {showHtml ? (
        <div style={{ padding: '8px' }}>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Edit raw HTML code here..."
            rows={5}
            style={{
              width: '100%',
              minHeight: '120px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              padding: '10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              boxSizing: 'border-box',
              resize: 'vertical',
              background: '#0f172a',
              color: '#38bdf8'
            }}
          />
        </div>
      ) : (
        <div className="quill-wrapper">
          <ReactQuill
            theme="snow"
            value={value || ''}
            onChange={onChange}
            modules={modules}
            formats={formats}
            placeholder={placeholder}
            style={{ minHeight: '120px' }}
          />
        </div>
      )}
    </div>
  );
};

export default RichExplanationEditor;
