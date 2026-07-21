import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import JoditEditor from 'jodit-react';
import { paper1NotesData } from '../data/paper1NotesData';
import { API_BASE_URL } from '../services/api';
import UnitNotesTemplate from '../components/UnitNotesTemplate';
import './AdminNoteEditor.css';

const AdminNoteEditor = () => {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  
  const [unitTitle, setUnitTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleInsertYouTube = () => {
    const input = prompt('Enter YouTube Video URL or Video ID:\n(Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ)');
    if (!input) return;
    const videoId = getYouTubeId(input.trim()) || input.trim();
    if (videoId) {
      const videoHtml = `<div class="responsive-video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 750px; margin: 1.75rem auto; border-radius: 10px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);"><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 10px;"></iframe></div><p><br></p>`;
      
      if (editorRef.current && editorRef.current.editor) {
        editorRef.current.editor.selection.insertHTML(videoHtml);
      } else {
        setContent(prev => prev + videoHtml);
      }
    } else {
      alert('Invalid YouTube URL or Video ID. Please check the URL and try again.');
    }
  };

  const config = useMemo(() => ({
    readonly: false,
    height: 'auto',
    minHeight: 500,
    toolbarAdaptive: false,
    toolbarSticky: false,
    toolbarStickyOffset: 0,
    uploader: {
      insertImageAsBase64URI: true
    },
    buttons: [
      'paragraph', 'font', 'fontsize', '|',
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', '|',
      'brush', 'table', 'link', 'image', 'video', '|',
      'align', 'undo', 'redo', '|',
      'hr', 'eraser'
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
      afterInit: function (editor) {
        const applyFormatBlock = (editorInst, tag) => {
          if (!editorInst) return;
          const uppercaseTag = tag.toUpperCase();
          const lowercaseTag = tag.toLowerCase();

          // 1. Try Jodit's selection format API
          try {
            if (editorInst.s && typeof editorInst.s.format === 'function') {
              editorInst.s.format(lowercaseTag);
            }
          } catch (e) {}

          // 2. Try execCommand formatBlock variants
          try {
            editorInst.execCommand('formatBlock', false, lowercaseTag);
          } catch (e) {}
          try {
            editorInst.execCommand('formatBlock', false, uppercaseTag);
          } catch (e) {}
          try {
            editorInst.execCommand('formatBlock', false, `<${uppercaseTag}>`);
          } catch (e) {}

          // 3. Fallback: Direct DOM node transform on active selection
          try {
            const win = editorInst.ed ? editorInst.ed.defaultView || window : window;
            const sel = editorInst.selection ? editorInst.selection.sel : win.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              let node = range.commonAncestorContainer;
              if (node.nodeType === 3) node = node.parentNode;
              
              const container = editorInst.editor || editorInst.container;
              while (node && node !== container && !['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'].includes(node.tagName)) {
                node = node.parentNode;
              }
              
              if (node && node !== container && node.tagName !== uppercaseTag) {
                const doc = editorInst.ed || document;
                const newEl = doc.createElement(lowercaseTag);
                newEl.innerHTML = node.innerHTML;
                node.parentNode.replaceChild(newEl, node);

                // Re-select text inside newly created element
                const newRange = doc.createRange();
                newRange.selectNodeContents(newEl);
                sel.removeAllRanges();
                sel.addRange(newRange);
              }
            }
          } catch (e) {
            console.error('DOM format fallback error:', e);
          }

          // Trigger change event to sync state immediately
          if (editorInst.events) {
            editorInst.events.fire('change');
          }
        };

        const handleShortcutKey = (event) => {
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

          let targetTag = null;
          if (checkDigit('1', 49)) targetTag = 'h1';
          else if (checkDigit('2', 50)) targetTag = 'h2';
          else if (checkDigit('3', 51)) targetTag = 'h3';
          else if (checkDigit('4', 52)) targetTag = 'h4';
          else if (checkDigit('0', 48)) targetTag = 'p';

          if (targetTag) {
            event.preventDefault();
            event.stopPropagation();
            applyFormatBlock(editor, targetTag);
            return false;
          }

          // Bold: Ctrl+B
          if (isCtrl && !isShift && !isAlt && (key === 'b' || keyCode === 66)) {
            event.preventDefault();
            editor.execCommand('bold');
            return false;
          }

          // Italic: Ctrl+I
          if (isCtrl && !isShift && !isAlt && (key === 'i' || keyCode === 73)) {
            event.preventDefault();
            editor.execCommand('italic');
            return false;
          }

          // Underline: Ctrl+U
          if (isCtrl && !isShift && !isAlt && (key === 'u' || keyCode === 85)) {
            event.preventDefault();
            editor.execCommand('underline');
            return false;
          }

          // Strikethrough: Ctrl+Shift+S or Ctrl+Alt+5
          if ((isCtrl && isShift && (key === 's' || keyCode === 83)) || (isCtrl && isAlt && checkDigit('5', 53))) {
            event.preventDefault();
            editor.execCommand('strikethrough');
            return false;
          }

          // Bulleted List: Ctrl+Shift+L or Ctrl+Shift+7
          if (isCtrl && isShift && (key === 'l' || checkDigit('7', 55))) {
            event.preventDefault();
            editor.execCommand('insertUnorderedList');
            return false;
          }

          // Numbered List: Ctrl+Shift+O or Ctrl+Shift+N or Ctrl+Shift+8
          if (isCtrl && isShift && (key === 'o' || key === 'n' || checkDigit('8', 56))) {
            event.preventDefault();
            editor.execCommand('insertOrderedList');
            return false;
          }

          // Clear Formatting: Ctrl+Shift+C or Ctrl+\
          if ((isCtrl && isShift && (key === 'c' || keyCode === 67)) || (isCtrl && (key === '\\' || keyCode === 220))) {
            event.preventDefault();
            editor.execCommand('removeFormat');
            return false;
          }
        };

        if (editor.editor) {
          editor.editor.addEventListener('keydown', handleShortcutKey, true);
        }
        if (editor.events) {
          editor.events.on('keydown', handleShortcutKey);
        }
      }
    }
  }), []);

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f2f1', fontFamily: 'Segoe UI', color: '#185abd', fontWeight: 600 }}>Loading MS Word Editor...</div>;

  return (
    <div className="ms-word-editor-page">
      {/* Top Fixed Section */}
      <div className="ms-word-top-section">
        {/* MS Word Single Compact Header */}
        <div className="ms-word-header">
          <div className="ms-word-header-left">
            <div className="ms-word-icon" title={`Unit ${unitId} Notes`}>W</div>
            <div className="ms-word-header-inputs">
              <input 
                type="text" 
                value={unitTitle} 
                onChange={(e) => setUnitTitle(e.target.value)} 
                placeholder="Unit Title (e.g. Teaching Aptitude Notes)"
                className="ms-word-header-input title-input"
              />
              <input 
                type="text" 
                value={subtitle} 
                onChange={(e) => setSubtitle(e.target.value)} 
                placeholder="Subtitle / Overview..."
                className="ms-word-header-input subtitle-input"
              />
            </div>
          </div>
          <div className="ms-word-header-actions">
            <button 
              onClick={handleInsertYouTube} 
              className="ms-word-btn-cancel"
              style={{ fontSize: '0.8rem', padding: '5px 12px', background: 'rgba(239, 68, 68, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)', color: '#ffffff' }}
              title="Insert YouTube Video directly into notes"
            >
              ▶️ YouTube
            </button>
            <button 
              onClick={() => setShowPreviewModal(true)} 
              className="ms-word-btn-cancel"
              style={{ fontSize: '0.8rem', padding: '5px 12px', background: 'rgba(255, 255, 255, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)' }}
              title="Preview Student View Live"
            >
              👁️ Preview
            </button>
            <button 
              onClick={() => setShowShortcuts(!showShortcuts)} 
              className="ms-word-btn-cancel"
              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              title="Toggle Shortcuts Help"
            >
              ⚡ Shortcuts {showShortcuts ? '▲' : '▼'}
            </button>
            <button onClick={() => navigate('/profile')} className="ms-word-btn-cancel">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="ms-word-btn-save">
              {saving ? 'Saving...' : 'Save & Publish'}
            </button>
          </div>
        </div>

        {/* Ribbon Shortcuts Guide (Collapsible) */}
        {showShortcuts && (
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
        )}
      </div>

      {/* Main Canvas with A4 Paper Sheet */}
      <div className="ms-word-canvas">
        <div className="ms-word-document-paper">
          <JoditEditor
            ref={editorRef}
            value={content}
            config={config}
            tabIndex={1}
            onBlur={newContent => setContent(newContent)}
            onChange={() => {}}
          />
        </div>
      </div>

      {/* MS Word Bottom Status Bar */}
      <div className="ms-word-status-bar">
        <div>Page 1 of 1 &nbsp;|&nbsp; Words: {getWordCount(content)}</div>
        <div>UGC NET Unit {unitId} Notes &nbsp;|&nbsp; MS Word Full Screen Mode</div>
      </div>

      {/* Student View Live Preview Modal */}
      {showPreviewModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '1250px',
            height: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              background: '#185abd',
              color: '#ffffff',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '0.95rem' }}>
                <span style={{ background: '#ffffff', color: '#185abd', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>STUDENT PREVIEW</span>
                <span>{unitTitle || `Unit ${unitId} Notes`}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  onClick={() => window.open(`/paper1-notes/unit-${unitId}`, '_blank')}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.35)',
                    padding: '5px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                  title="Open in new tab"
                >
                  🔗 Open in New Tab
                </button>
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    padding: '5px 14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  ✕ Close Preview
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
              <UnitNotesTemplate data={{ unitTitle, subtitle, htmlContent: content }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNoteEditor;
