import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JoditEditor from 'jodit-react';
import { paper1NotesData } from '../data/paper1NotesData';
import { API_BASE_URL } from '../services/api';
import './AdminNoteEditor.css';

const AdminNoteEditor = () => {
  const { unitId } = useParams();
  const navigate = useNavigate();
  
  const [unitTitle, setUnitTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/notes/${unitId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setUnitTitle(data.unitTitle || '');
        setSubtitle(data.subtitle || '');
        setContent(data.htmlContent || '');
        setLoading(false);
      })
      .catch(() => {
        // Initialize from existing data if available
        const cleanedId = unitId?.replace('unit-', '') || '';
        const existingData = paper1NotesData[cleanedId];
        
        if (existingData) {
          setUnitTitle(existingData.title || '');
          setSubtitle(existingData.overview || '');
          
          let initialHtml = '';
          if (existingData.overview) {
            initialHtml += `<h2>Overview</h2><p>${existingData.overview}</p>`;
          }
          if (existingData.topics && existingData.topics.length > 0) {
            initialHtml += `<h2>Core Topics</h2>`;
            existingData.topics.forEach(t => {
              initialHtml += `<h3>${t.title}</h3><p>${t.content}</p>`;
            });
          }
          if (existingData.tips && existingData.tips.length > 0) {
            initialHtml += `<h2>Preparation Tips</h2><ul>`;
            existingData.tips.forEach(tip => {
              initialHtml += `<li>${tip}</li>`;
            });
            initialHtml += `</ul>`;
          }
          
          setContent(initialHtml);
        } else {
          setUnitTitle('');
          setSubtitle('');
          setContent('');
        }
        setLoading(false);
      });
  }, [unitId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToSave = {
        unitId,
        unitTitle,
        subtitle,
        htmlContent: content
      };
      
      const res = await fetch(`${API_BASE_URL}/api/notes/${unitId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      
      if (res.ok) {
        alert('Notes saved successfully!');
        navigate('/profile');
      } else {
        alert('Failed to save.');
      }
    } catch (err) {
      alert('Error saving data.');
    }
    setSaving(false);
  };

  const getWordCount = (html) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, ' ').trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  };

  const config = {
    readonly: false,
    height: 700,
    toolbarAdaptive: false,
    uploader: {
      insertImageAsBase64URI: true
    },
    buttons: [
      'paragraph', 'font', 'fontsize', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', '|',
      'brush', 'table', 'link', 'image', '|',
      'align', 'undo', 'redo', '|',
      'hr', 'eraser', 'fullsize'
    ],
    controls: {
      paragraph: {
        list: {
          p: 'Normal (Ctrl+Shift+0)',
          h1: 'Heading 1 (Ctrl+Shift+1)',
          h2: 'Heading 2 (Ctrl+Shift+2)',
          h3: 'Heading 3 (Ctrl+Shift+3)',
          h4: 'Heading 4 (Ctrl+Shift+4)'
        }
      }
    },
    events: {
      keydown: function (event) {
        const isCtrl = event.ctrlKey || event.metaKey;
        const isShift = event.shiftKey;
        const isAlt = event.altKey;
        const code = event.code;
        const key = event.key ? event.key.toLowerCase() : '';
        const keyCode = event.keyCode || event.which;

        if (!isCtrl && !isAlt) return;

        const checkDigit = (digitChar, keyCodeNum) => {
          if (keyCode === keyCodeNum) return true;
          if (code === `Digit${digitChar}` || code === `Numpad${digitChar}`) return true;
          if (key === digitChar) return true;
          if (digitChar === '1' && (key === '!' || keyCode === 49)) return true;
          if (digitChar === '2' && (key === '@' || keyCode === 50)) return true;
          if (digitChar === '3' && (key === '#' || keyCode === 51)) return true;
          if (digitChar === '4' && (key === '$' || keyCode === 52)) return true;
          if (digitChar === '0' && (key === ')' || keyCode === 48)) return true;
          return false;
        };

        const applyFormatBlock = (editor, tag) => {
          if (!editor) return;
          try {
            if (editor.s && typeof editor.s.format === 'function') {
              editor.s.format(tag);
            }
          } catch (e) {}
          try {
            editor.execCommand('formatBlock', false, tag);
          } catch (e) {}
          try {
            editor.execCommand('formatBlock', false, tag.toUpperCase());
          } catch (e) {}
        };

        // Headings: Ctrl + Shift + 1/2/3/4/0 or Ctrl + Alt + 1/2/3/4/0 or Ctrl + 1/2/3/4/0
        let targetTag = null;
        if (checkDigit('1', 49)) targetTag = 'h1';
        else if (checkDigit('2', 50)) targetTag = 'h2';
        else if (checkDigit('3', 51)) targetTag = 'h3';
        else if (checkDigit('4', 52)) targetTag = 'h4';
        else if (checkDigit('0', 48)) targetTag = 'p';

        if (targetTag) {
          event.preventDefault();
          event.stopPropagation();
          applyFormatBlock(this, targetTag);
          return false;
        }

        // Bold: Ctrl+B
        if (isCtrl && !isShift && !isAlt && (key === 'b' || keyCode === 66)) {
          event.preventDefault();
          this.execCommand('bold');
          return false;
        }

        // Italic: Ctrl+I
        if (isCtrl && !isShift && !isAlt && (key === 'i' || keyCode === 73)) {
          event.preventDefault();
          this.execCommand('italic');
          return false;
        }

        // Underline: Ctrl+U
        if (isCtrl && !isShift && !isAlt && (key === 'u' || keyCode === 85)) {
          event.preventDefault();
          this.execCommand('underline');
          return false;
        }

        // Strikethrough: Ctrl+Shift+S or Ctrl+Alt+5
        if ((isCtrl && isShift && (key === 's' || keyCode === 83)) || (isCtrl && isAlt && checkDigit('5', 53))) {
          event.preventDefault();
          this.execCommand('strikethrough');
          return false;
        }

        // Bulleted List: Ctrl+Shift+L or Ctrl+Shift+7
        if (isCtrl && isShift && (key === 'l' || checkDigit('7', 55))) {
          event.preventDefault();
          this.execCommand('insertUnorderedList');
          return false;
        }

        // Numbered List: Ctrl+Shift+O or Ctrl+Shift+N or Ctrl+Shift+8
        if (isCtrl && isShift && (key === 'o' || key === 'n' || checkDigit('8', 56))) {
          event.preventDefault();
          this.execCommand('insertOrderedList');
          return false;
        }

        // Clear Formatting: Ctrl+Shift+C or Ctrl+\
        if ((isCtrl && isShift && (key === 'c' || keyCode === 67)) || (isCtrl && (key === '\\' || keyCode === 220))) {
          event.preventDefault();
          this.execCommand('removeFormat');
          return false;
        }
      }
    }
  };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f2f1', fontFamily: 'Segoe UI', color: '#185abd', fontWeight: 600 }}>Loading MS Word Editor...</div>;

  return (
    <div className="ms-word-editor-page">
      {/* MS Word Top Header */}
      <div className="ms-word-header">
        <div className="ms-word-header-title">
          <div className="ms-word-icon">W</div>
          <div className="ms-word-header-text">
            <h1>Unit {unitId} Note Editor - Word View</h1>
          </div>
        </div>
        <div className="ms-word-header-actions">
          <button onClick={() => navigate('/profile')} className="ms-word-btn-cancel">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="ms-word-btn-save">
            {saving ? 'Saving...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="ms-word-metadata-bar">
        <div className="ms-word-input-group">
          <label>Unit Title</label>
          <input 
            type="text" 
            value={unitTitle} 
            onChange={(e) => setUnitTitle(e.target.value)} 
            placeholder="e.g. Teaching Aptitude Notes"
            className="ms-word-input"
          />
        </div>
        <div className="ms-word-input-group">
          <label>Subtitle / Intro Overview</label>
          <input 
            type="text" 
            value={subtitle} 
            onChange={(e) => setSubtitle(e.target.value)} 
            placeholder="e.g. Complete study guide and breakdown"
            className="ms-word-input"
          />
        </div>
      </div>

      {/* Ribbon Shortcuts Guide */}
      <div className="ms-word-shortcuts-ribbon">
        <strong>⚡ MS Word Shortcuts:</strong>
        <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">1</kbd> Heading 1</span>
        <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">2</kbd> Heading 2</span>
        <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">3</kbd> Heading 3</span>
        <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">4</kbd> Heading 4</span>
        <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">0</kbd> Normal</span>
        <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">B</kbd> Bold</span>
        <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">I</kbd> Italic</span>
        <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">U</kbd> Underline</span>
        <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">S</kbd> Strikethrough</span>
        <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">L</kbd> Bullets</span>
      </div>

      {/* Main Canvas with A4 Paper Sheet */}
      <div className="ms-word-canvas">
        <div className="ms-word-document-paper">
          <JoditEditor
            value={content}
            config={config}
            tabIndex={1}
            onBlur={newContent => setContent(newContent)}
            onChange={newContent => {}}
          />
        </div>
      </div>

      {/* MS Word Bottom Status Bar */}
      <div className="ms-word-status-bar">
        <div>Page 1 of 1 &nbsp;|&nbsp; Words: {getWordCount(content)}</div>
        <div>UGC NET Unit {unitId} Notes &nbsp;|&nbsp; MS Word Full Screen Mode</div>
      </div>
    </div>
  );
};

export default AdminNoteEditor;
