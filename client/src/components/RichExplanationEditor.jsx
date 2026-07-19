import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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

const RichExplanationEditor = ({ value = '', onChange, placeholder = 'Write detailed explanation...' }) => {
  const [showHtml, setShowHtml] = useState(false);

  return (
    <div className="rich-explanation-editor" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
      {/* Editor Header Bar with HTML Toggle */}
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
