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

  const config = {
    readonly: false,
    height: 500,
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
          p: 'Normal',
          h1: 'Heading 1',
          h2: 'Heading 2',
          h3: 'Heading 3',
          h4: 'Heading 4'
        }
      }
    },
    commandToHotkeys: {
      'formatH1': 'ctrl+shift+1',
      'formatH2': 'ctrl+shift+2',
      'formatH3': 'ctrl+shift+3',
      'formatH4': 'ctrl+shift+4'
    },
    events: {
      beforeCommand: function (command) {
        if (['formatH1', 'formatH2', 'formatH3', 'formatH4'].includes(command)) {
          const tag = command.substring(6).toLowerCase(); // 'h1', 'h2'
          this.execCommand('formatBlock', false, tag);
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

      <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
        <JoditEditor
          value={content}
          config={config}
          tabIndex={1}
          onBlur={newContent => setContent(newContent)}
          onChange={newContent => {}} // preferred to use onBlur for performance, but we can do both if needed
        />
      </div>
    </div>
  );
};

export default AdminNoteEditor;
