import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JoditEditor from 'jodit-react';
import { paper1NotesData } from '../data/paper1NotesData';
import { API_BASE_URL } from '../services/api';

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
          
          // Construct HTML from JSON topics and tips
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

  const kbdStyle = {
    background: '#e2e8f0',
    color: '#1e293b',
    padding: '2px 5px',
    borderRadius: '3px',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    border: '1px solid #cbd5e1'
  };

  const config = {
    readonly: false,
    height: 550,
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

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Loading Editor...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontFamily: 'Outfit', color: '#0f172a' }}>
          Edit Note <span style={{ color: '#7c3aed' }}>Unit {unitId}</span>
        </h1>
        <div>
          <button 
            onClick={() => navigate('/profile')} 
            style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            style={{ padding: '8px 16px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            {saving ? 'Saving...' : 'Save & Publish'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Unit Title</label>
          <input 
            type="text" 
            value={unitTitle} 
            onChange={(e) => setUnitTitle(e.target.value)} 
            placeholder="e.g. Research Aptitude"
            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Subtitle / Intro</label>
          <input 
            type="text" 
            value={subtitle} 
            onChange={(e) => setSubtitle(e.target.value)} 
            placeholder="e.g. Complete topic-wise breakdown"
            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Helper Banner */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: '6px',
        padding: '8px 12px',
        marginBottom: '12px',
        fontSize: '0.78rem',
        color: '#334155',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 14px',
        alignItems: 'center'
      }}>
        <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ⚡ MS Word Keyboard Shortcuts:
        </strong>
        <span><kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>1</kbd> Heading 1</span>
        <span><kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>2</kbd> Heading 2</span>
        <span><kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>3</kbd> Heading 3</span>
        <span><kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>4</kbd> Heading 4</span>
        <span><kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>0</kbd> Normal</span>
        <span><kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>B</kbd> Bold</span>
        <span><kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>I</kbd> Italic</span>
        <span><kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>U</kbd> Underline</span>
        <span><kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>S</kbd> Strikethrough</span>
        <span><kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>L</kbd> Bullets</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
        <JoditEditor
          value={content}
          config={config}
          tabIndex={1}
          onBlur={newContent => setContent(newContent)}
          onChange={newContent => {}}
        />
      </div>
    </div>
  );
};

export default AdminNoteEditor;
