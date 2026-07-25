import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

  // HTML Table Insertion states
  const [showHtmlTableModal, setShowHtmlTableModal] = useState(false);
  const [rawTableHtml, setRawTableHtml] = useState('');
  const joditInstanceRef = useRef(null);
  const savedSelectionRef = useRef(null);

  // Table Control States
  const [activeTable, setActiveTable] = useState(null);
  const [activeCell, setActiveCell] = useState(null);

  // Selected Table Properties
  const [tableWidth, setTableWidth] = useState('70%');
  const [tableHeight, setTableHeight] = useState('auto');
  const [tableAlign, setTableAlign] = useState('center');
  const [tableBorderCollapse, setTableBorderCollapse] = useState('separate');
  const [tableBorderStyle, setTableBorderStyle] = useState('solid');
  const [tableBorderWidth, setTableBorderWidth] = useState('1px');
  const [tableBorderColor, setTableBorderColor] = useState('#cbd5e1');
  const [tableCellPadding, setTableCellPadding] = useState('8px 12px');
  const [tableHasZebra, setTableHasZebra] = useState(false);
  const [tableHasStyledHeader, setTableHasStyledHeader] = useState(false);

  // Selected Cell Properties
  const [cellBgColor, setCellBgColor] = useState('#ffffff');
  const [cellTextAlign, setCellTextAlign] = useState('center');
  const [cellVerticalAlign, setCellVerticalAlign] = useState('middle');

  // Stable callback to parse active element styles and set React states
  const updateTableState = useCallback((tableEl, cellEl) => {
    if (tableEl) {
      setTableWidth(tableEl.style.width || '70%');
      setTableHeight(tableEl.style.height || 'auto');
      
      const ml = tableEl.style.marginLeft;
      const mr = tableEl.style.marginRight;
      if (ml === '0px' || ml === '0') {
        setTableAlign('left');
      } else if (mr === '0px' || mr === '0') {
        setTableAlign('right');
      } else {
        setTableAlign('center');
      }

      setTableBorderCollapse(tableEl.style.borderCollapse || 'separate');
      setTableBorderStyle(tableEl.style.borderStyle || 'solid');
      setTableBorderWidth(tableEl.style.borderWidth || '1px');
      setTableBorderColor(tableEl.style.borderColor || '#cbd5e1');

      const firstCell = tableEl.querySelector('td, th');
      if (firstCell) {
        setTableCellPadding(firstCell.style.padding || '8px 12px');
      } else {
        setTableCellPadding('8px 12px');
      }

      setTableHasZebra(tableEl.classList.contains('table-zebra'));
      setTableHasStyledHeader(tableEl.classList.contains('table-header-styled'));
    }

    if (cellEl) {
      setCellBgColor(cellEl.style.backgroundColor || '#ffffff');
      setCellTextAlign(cellEl.style.textAlign || 'center');
      setCellVerticalAlign(cellEl.style.verticalAlign || 'middle');
    }
  }, []);

  const triggerChange = () => {
    if (joditInstanceRef.current) {
      joditInstanceRef.current.events.fire('change');
      setContent(joditInstanceRef.current.value);
    }
  };

  const handleTablePropChange = (property, value) => {
    if (!activeTable) return;

    switch (property) {
      case 'width':
        activeTable.style.width = value;
        setTableWidth(value);
        break;
      case 'height':
        activeTable.style.height = value;
        setTableHeight(value);
        break;
      case 'align':
        if (value === 'left') {
          activeTable.style.marginLeft = '0';
          activeTable.style.marginRight = 'auto';
        } else if (value === 'right') {
          activeTable.style.marginLeft = 'auto';
          activeTable.style.marginRight = '0';
        } else {
          activeTable.style.marginLeft = 'auto';
          activeTable.style.marginRight = 'auto';
        }
        setTableAlign(value);
        break;
      case 'borderCollapse':
        activeTable.style.borderCollapse = value;
        setTableBorderCollapse(value);
        break;
      case 'borderStyle':
        activeTable.style.borderStyle = value;
        setTableBorderStyle(value);
        activeTable.querySelectorAll('td, th').forEach(c => {
          c.style.borderStyle = value;
        });
        break;
      case 'borderWidth':
        activeTable.style.borderWidth = value;
        setTableBorderWidth(value);
        activeTable.querySelectorAll('td, th').forEach(c => {
          c.style.borderWidth = value;
        });
        break;
      case 'borderColor':
        activeTable.style.borderColor = value;
        setTableBorderColor(value);
        activeTable.querySelectorAll('td, th').forEach(c => {
          c.style.borderColor = value;
        });
        break;
      case 'padding':
        activeTable.querySelectorAll('td, th').forEach(c => {
          c.style.padding = value;
        });
        setTableCellPadding(value);
        break;
      case 'zebra':
        activeTable.classList.toggle('table-zebra', value);
        setTableHasZebra(value);
        break;
      case 'headerStyled':
        activeTable.classList.toggle('table-header-styled', value);
        setTableHasStyledHeader(value);
        break;
      default:
        break;
    }
    triggerChange();
  };

  const handleCellPropChange = (property, value) => {
    if (!activeCell) return;

    switch (property) {
      case 'backgroundColor':
        activeCell.style.backgroundColor = value;
        setCellBgColor(value);
        break;
      case 'textAlign':
        activeCell.style.textAlign = value;
        setCellTextAlign(value);
        break;
      case 'verticalAlign':
        activeCell.style.verticalAlign = value;
        setCellVerticalAlign(value);
        break;
      default:
        break;
    }
    triggerChange();
  };

  const insertRow = (above) => {
    if (!activeCell || !activeTable) return;
    const row = activeCell.parentNode;
    const newRow = activeTable.insertRow(above ? row.rowIndex : row.rowIndex + 1);
    const cellCount = row.cells.length;
    for (let i = 0; i < cellCount; i++) {
      const newCell = newRow.insertCell(i);
      newCell.innerHTML = '<br>';
      newCell.style.padding = activeCell.style.padding || '8px 12px';
      newCell.style.borderColor = activeTable.style.borderColor || '#cbd5e1';
      newCell.style.borderWidth = activeTable.style.borderWidth || '1px';
      newCell.style.borderStyle = activeTable.style.borderStyle || 'solid';
    }
    triggerChange();
  };

  const insertColumn = (left) => {
    if (!activeCell || !activeTable) return;
    const cellIndex = activeCell.cellIndex;
    const targetIndex = left ? cellIndex : cellIndex + 1;
    Array.from(activeTable.rows).forEach(row => {
      const isHeader = row.cells[cellIndex] ? row.cells[cellIndex].tagName === 'TH' : false;
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.innerHTML = '<br>';
      newCell.style.padding = activeCell.style.padding || '8px 12px';
      newCell.style.borderColor = activeTable.style.borderColor || '#cbd5e1';
      newCell.style.borderWidth = activeTable.style.borderWidth || '1px';
      newCell.style.borderStyle = activeTable.style.borderStyle || 'solid';
      if (targetIndex >= row.cells.length) {
        row.appendChild(newCell);
      } else {
        row.insertBefore(newCell, row.cells[targetIndex]);
      }
    });
    triggerChange();
  };

  const deleteRow = () => {
    if (!activeCell || !activeTable) return;
    const rowIndex = activeCell.parentNode.rowIndex;
    activeTable.deleteRow(rowIndex);
    setActiveCell(null);
    if (activeTable.rows.length === 0) {
      activeTable.remove();
      setActiveTable(null);
    }
    triggerChange();
  };

  const deleteColumn = () => {
    if (!activeCell || !activeTable) return;
    const cellIndex = activeCell.cellIndex;
    Array.from(activeTable.rows).forEach(row => {
      if (row.cells[cellIndex]) {
        row.deleteCell(cellIndex);
      }
    });
    setActiveCell(null);
    if (activeTable.rows.length === 0 || activeTable.rows[0].cells.length === 0) {
      activeTable.remove();
      setActiveTable(null);
    }
    triggerChange();
  };

  const deleteTable = () => {
    if (!activeTable) return;
    activeTable.remove();
    setActiveTable(null);
    setActiveCell(null);
    triggerChange();
  };

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
      const videoHtml = `<div class="responsive-video-container" style="width: 60%; max-width: 480px; margin: 1.25rem auto; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); border: 1px solid #cbd5e1; background: #000000;"><iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width: 100%; height: 270px; border: 0; border-radius: 10px; display: block;"></iframe></div><p><br></p>`;
      
      if (joditInstanceRef.current) {
        joditInstanceRef.current.selection.insertHTML(videoHtml);
        triggerChange();
      } else {
        setContent(prev => prev + videoHtml);
      }
    } else {
      alert('Invalid YouTube URL or Video ID. Please check the URL and try again.');
    }
  };

  const handleInsertHtmlTable = () => {
    if (!rawTableHtml.trim()) {
      alert('Please enter some HTML content.');
      return;
    }
    
    if (!rawTableHtml.toLowerCase().includes('<table')) {
      if (!confirm('The entered HTML does not appear to contain a <table> element. Insert anyway?')) {
        return;
      }
    }

    if (joditInstanceRef.current) {
      const editor = joditInstanceRef.current;
      editor.focus();
      if (savedSelectionRef.current) {
        try {
          editor.selection.restore(savedSelectionRef.current);
        } catch (e) {
          console.warn('Selection restore failed:', e);
        }
        savedSelectionRef.current = null;
      }
      editor.selection.insertHTML(rawTableHtml);
      if (editor.synchronizeValues) {
        editor.synchronizeValues();
      }
      editor.events.fire('change');
      setContent(editor.value);
    } else {
      setContent(prev => prev + rawTableHtml);
    }
    setShowHtmlTableModal(false);
    setRawTableHtml('');
  };

  const config = useMemo(() => ({
    readonly: false,
    height: 'auto',
    minHeight: 500,
    toolbarAdaptive: false,
    toolbarSticky: false,
    toolbarStickyOffset: 0,
    tableAllowCellResize: true,
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
        joditInstanceRef.current = editor;
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

        const detectTable = () => {
          if (!editor) return;
          let node = editor.selection.current();
          let cellNode = null;
          let tableNode = null;
          
          while (node && node !== editor.container && node !== document.body) {
            if (node.nodeName === 'TD' || node.nodeName === 'TH') {
              cellNode = node;
            }
            if (node.nodeName === 'TABLE') {
              tableNode = node;
              break;
            }
            node = node.parentNode;
          }
          
          setActiveTable(tableNode);
          setActiveCell(cellNode);
          if (tableNode) {
            updateTableState(tableNode, cellNode);
          }
        };

        if (editor.events) {
          editor.events.on('changeSelection click keyup change afterProcessPaste cursorActivity', detectTable);
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
              onMouseDown={(e) => {
                e.preventDefault();
                setRawTableHtml('');
                if (joditInstanceRef.current) {
                  try {
                    savedSelectionRef.current = joditInstanceRef.current.selection.save();
                  } catch (err) {
                    console.warn('Could not save selection:', err);
                  }
                }
                setShowHtmlTableModal(true);
              }} 
              className="ms-word-btn-cancel"
              style={{ fontSize: '0.8rem', padding: '5px 12px', background: 'rgba(24, 90, 189, 0.25)', border: '1px solid rgba(255, 255, 255, 0.4)', color: '#ffffff' }}
              title="Insert custom table via raw HTML"
            >
              🌐 HTML Table
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
            <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">L</kbd> Bullets</span>
            <span><kbd className="ms-word-kbd">Tab</kbd> Multilevel Indent (a. b. c.)</span>
            <span><kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">Tab</kbd> Outdent (1. 2. 3.)</span>
            <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">S</kbd> Strikethrough</span>
            <span><kbd className="ms-word-kbd">Ctrl</kbd>+<kbd className="ms-word-kbd">Shift</kbd>+<kbd className="ms-word-kbd">L</kbd> Bullets</span>
          </div>
        )}
      </div>

      {/* Main Canvas + Sidebar Wrapper */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
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

        {/* Floating Table Tools Sidebar */}
        {activeTable && (
          <div className="ms-word-table-sidebar">
            <div className="ms-word-sidebar-header">
              <h3><span>📋</span> Table Design & Layout</h3>
              <button className="ms-word-sidebar-close" onClick={() => { setActiveTable(null); setActiveCell(null); }}>✕</button>
            </div>
            
            <div className="ms-word-sidebar-content">
              {/* Section 1: Dimensions */}
              <div className="ms-word-sidebar-section">
                <div className="ms-word-sidebar-section-title">Dimensions & Alignment</div>
                <div className="ms-word-sidebar-row">
                  <span className="ms-word-sidebar-label">Table Width</span>
                  <input 
                    type="text" 
                    value={tableWidth} 
                    onChange={(e) => handleTablePropChange('width', e.target.value)} 
                    className="ms-word-sidebar-input"
                    placeholder="e.g., 70% or 600px"
                  />
                </div>
                <div className="ms-word-sidebar-row">
                  <span className="ms-word-sidebar-label">Table Height</span>
                  <input 
                    type="text" 
                    value={tableHeight} 
                    onChange={(e) => handleTablePropChange('height', e.target.value)} 
                    className="ms-word-sidebar-input"
                    placeholder="e.g., auto"
                  />
                </div>
                <div className="ms-word-sidebar-row">
                  <span className="ms-word-sidebar-label">Alignment</span>
                  <div className="ms-word-sidebar-btn-group">
                    <button 
                      type="button"
                      onClick={() => handleTablePropChange('align', 'left')}
                      className={`ms-word-sidebar-btn-item ${tableAlign === 'left' ? 'active' : ''}`}
                    >
                      Left
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleTablePropChange('align', 'center')}
                      className={`ms-word-sidebar-btn-item ${tableAlign === 'center' ? 'active' : ''}`}
                    >
                      Center
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleTablePropChange('align', 'right')}
                      className={`ms-word-sidebar-btn-item ${tableAlign === 'right' ? 'active' : ''}`}
                    >
                      Right
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Quick Styles */}
              <div className="ms-word-sidebar-section">
                <div className="ms-word-sidebar-section-title">Table Styles</div>
                <label className="ms-word-sidebar-toggle-row">
                  <input 
                    type="checkbox" 
                    checked={tableHasZebra} 
                    onChange={(e) => handleTablePropChange('zebra', e.target.checked)} 
                  />
                  <span className="ms-word-sidebar-label">Zebra Stripes</span>
                </label>
                <label className="ms-word-sidebar-toggle-row">
                  <input 
                    type="checkbox" 
                    checked={tableHasStyledHeader} 
                    onChange={(e) => handleTablePropChange('headerStyled', e.target.checked)} 
                  />
                  <span className="ms-word-sidebar-label">Blue Header Row</span>
                </label>
              </div>

              {/* Section 3: Borders & Padding */}
              <div className="ms-word-sidebar-section">
                <div className="ms-word-sidebar-section-title">Borders & Spacing</div>
                <div className="ms-word-sidebar-row">
                  <span className="ms-word-sidebar-label">Cell Padding</span>
                  <select 
                    value={tableCellPadding} 
                    onChange={(e) => handleTablePropChange('padding', e.target.value)} 
                    className="ms-word-sidebar-select"
                  >
                    <option value="4px 6px">Compact (4px)</option>
                    <option value="8px 12px">Normal (8px)</option>
                    <option value="12px 18px">Spacious (12px)</option>
                    <option value="16px 24px">Extra (16px)</option>
                  </select>
                </div>
                <div className="ms-word-sidebar-row">
                  <span className="ms-word-sidebar-label">Border Style</span>
                  <select 
                    value={tableBorderStyle} 
                    onChange={(e) => handleTablePropChange('borderStyle', e.target.value)} 
                    className="ms-word-sidebar-select"
                  >
                    <option value="none">None</option>
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                    <option value="double">Double</option>
                  </select>
                </div>
                <div className="ms-word-sidebar-row">
                  <span className="ms-word-sidebar-label">Border Width</span>
                  <select 
                    value={tableBorderWidth} 
                    onChange={(e) => handleTablePropChange('borderWidth', e.target.value)} 
                    className="ms-word-sidebar-select"
                  >
                    <option value="1px">Thin (1px)</option>
                    <option value="2px">Medium (2px)</option>
                    <option value="3px">Thick (3px)</option>
                    <option value="4px">Extra Thick (4px)</option>
                  </select>
                </div>
                <div className="ms-word-sidebar-row">
                  <span className="ms-word-sidebar-label">Border Color</span>
                  <div className="ms-word-sidebar-color-picker">
                    <input 
                      type="color" 
                      value={tableBorderColor.startsWith('#') ? tableBorderColor : '#cbd5e1'} 
                      onChange={(e) => handleTablePropChange('borderColor', e.target.value)} 
                      className="ms-word-sidebar-color-input"
                    />
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{tableBorderColor}</span>
                  </div>
                </div>
                <div className="ms-word-sidebar-row">
                  <span className="ms-word-sidebar-label">Borders Collapse</span>
                  <div className="ms-word-sidebar-btn-group">
                    <button 
                      type="button"
                      onClick={() => handleTablePropChange('borderCollapse', 'collapse')}
                      className={`ms-word-sidebar-btn-item ${tableBorderCollapse === 'collapse' ? 'active' : ''}`}
                    >
                      Collapse
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleTablePropChange('borderCollapse', 'separate')}
                      className={`ms-word-sidebar-btn-item ${tableBorderCollapse === 'separate' ? 'active' : ''}`}
                    >
                      Separate
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 4: Cell Styling */}
              <div className="ms-word-sidebar-section">
                <div className="ms-word-sidebar-section-title">Cell Properties ({activeCell ? activeCell.tagName : 'None Selected'})</div>
                <div className="ms-word-sidebar-row">
                  <span className="ms-word-sidebar-label">Cell Shading</span>
                  <div className="ms-word-sidebar-color-picker">
                    <input 
                      type="color" 
                      value={cellBgColor.startsWith('#') ? cellBgColor : '#ffffff'} 
                      onChange={(e) => handleCellPropChange('backgroundColor', e.target.value)} 
                      className="ms-word-sidebar-color-input"
                    />
                    <button 
                      type="button" 
                      onClick={() => handleCellPropChange('backgroundColor', 'transparent')}
                      className="ms-word-sidebar-btn-item"
                      style={{ padding: '2px 5px', fontSize: '0.7rem' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {activeCell && (
                  <>
                    <div className="ms-word-sidebar-row">
                      <span className="ms-word-sidebar-label">Text Align</span>
                      <div className="ms-word-sidebar-btn-group">
                        <button 
                          type="button"
                          onClick={() => handleCellPropChange('textAlign', 'left')}
                          className={`ms-word-sidebar-btn-item ${cellTextAlign === 'left' ? 'active' : ''}`}
                        >
                          Left
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleCellPropChange('textAlign', 'center')}
                          className={`ms-word-sidebar-btn-item ${cellTextAlign === 'center' ? 'active' : ''}`}
                        >
                          Center
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleCellPropChange('textAlign', 'right')}
                          className={`ms-word-sidebar-btn-item ${cellTextAlign === 'right' ? 'active' : ''}`}
                        >
                          Right
                        </button>
                      </div>
                    </div>
                    <div className="ms-word-sidebar-row">
                      <span className="ms-word-sidebar-label">Vertical Align</span>
                      <div className="ms-word-sidebar-btn-group">
                        <button 
                          type="button"
                          onClick={() => handleCellPropChange('verticalAlign', 'top')}
                          className={`ms-word-sidebar-btn-item ${cellVerticalAlign === 'top' ? 'active' : ''}`}
                        >
                          Top
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleCellPropChange('verticalAlign', 'middle')}
                          className={`ms-word-sidebar-btn-item ${cellVerticalAlign === 'middle' ? 'active' : ''}`}
                        >
                          Mid
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleCellPropChange('verticalAlign', 'bottom')}
                          className={`ms-word-sidebar-btn-item ${cellVerticalAlign === 'bottom' ? 'active' : ''}`}
                        >
                          Bot
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Section 5: Layout Modifiers */}
              <div className="ms-word-sidebar-section">
                <div className="ms-word-sidebar-section-title">Modify Layout</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button type="button" onClick={() => insertRow(true)} className="ms-word-sidebar-btn-action">
                    ➕ Row Above
                  </button>
                  <button type="button" onClick={() => insertRow(false)} className="ms-word-sidebar-btn-action">
                    ➕ Row Below
                  </button>
                  <button type="button" onClick={() => insertColumn(true)} className="ms-word-sidebar-btn-action">
                    ➕ Col Left
                  </button>
                  <button type="button" onClick={() => insertColumn(false)} className="ms-word-sidebar-btn-action">
                    ➕ Col Right
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <button type="button" onClick={deleteRow} className="ms-word-sidebar-btn-action" style={{ color: '#d32f2f' }}>
                    ➖ Delete Row
                  </button>
                  <button type="button" onClick={deleteColumn} className="ms-word-sidebar-btn-action" style={{ color: '#d32f2f' }}>
                    ➖ Delete Col
                  </button>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <button type="button" onClick={deleteTable} className="ms-word-sidebar-btn-danger">
                    🗑️ Delete Table
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* HTML Table Input Modal */}
      {showHtmlTableModal && (
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
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#185abd',
              color: '#ffffff',
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🌐</span> Insert Table via Raw HTML
              </div>
              <button 
                onClick={() => setShowHtmlTableModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '2px 8px',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
                Paste your custom HTML table code below. You can include standard styling tags (e.g. <code>style="..."</code> or classes like <code>table-zebra</code>).
              </div>
              <textarea
                value={rawTableHtml}
                onChange={(e) => setRawTableHtml(e.target.value)}
                placeholder='e.g., <table style="width: 100%; border: 2px dashed #185abd;">
  <tr>
    <th style="padding: 10px; background: #e0f2fe;">Header 1</th>
    <th style="padding: 10px; background: #e0f2fe;">Header 2</th>
  </tr>
  <tr>
    <td style="padding: 10px;">Data A</td>
    <td style="padding: 10px;">Data B</td>
  </tr>
</table>'
                style={{
                  width: '100%',
                  height: '240px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '0.85rem',
                  padding: '10px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{
              background: '#f8fafc',
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              borderTop: '1px solid #edebe9'
            }}>
              <button
                type="button"
                onClick={() => setShowHtmlTableModal(false)}
                className="ms-word-btn-cancel"
                style={{ background: '#ffffff', color: '#323130', border: '1px solid #c8c6c4', padding: '6px 16px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertHtmlTable}
                className="ms-word-btn-save"
                style={{ padding: '6px 20px' }}
              >
                Insert Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNoteEditor;
