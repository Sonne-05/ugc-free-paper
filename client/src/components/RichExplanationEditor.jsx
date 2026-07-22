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
    try {
      const response = await fetch(`${API_BASE_URL}/api/questions/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionContext })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to generate explanation');
      }

      const data = await response.json();
      if (data.explanation) {
        onChange(data.explanation);
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
