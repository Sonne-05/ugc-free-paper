import React, { useState, useEffect } from 'react';

const NoteBuilderModal = ({ noteId, onClose }) => {
  const [data, setData] = useState({
    unitId: noteId,
    unitTitle: '',
    subtitle: '',
    sections: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:5000/api/notes/${noteId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(fetched => {
        setData(fetched);
        setLoading(false);
      })
      .catch(() => {
        // Init empty
        setData({
          unitId: noteId,
          unitTitle: '',
          subtitle: '',
          sections: []
        });
        setLoading(false);
      });
  }, [noteId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/notes/${noteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert('Saved successfully!');
        onClose();
      } else {
        alert('Failed to save.');
      }
    } catch (err) {
      alert('Error saving data.');
    }
    setSaving(false);
  };

  const addSection = () => {
    setData(prev => ({
      ...prev,
      sections: [...prev.sections, { title: '', subNodes: [] }]
    }));
  };

  const addSubNode = (sIndex) => {
    const newSections = [...data.sections];
    newSections[sIndex].subNodes.push({ title: '', blocks: [] });
    setData({ ...data, sections: newSections });
  };

  const addTextBlock = (sIndex, snIndex) => {
    const newSections = [...data.sections];
    newSections[sIndex].subNodes[snIndex].blocks.push({ type: 'text', content: '' });
    setData({ ...data, sections: newSections });
  };

  const addTableBlock = (sIndex, snIndex) => {
    const newSections = [...data.sections];
    newSections[sIndex].subNodes[snIndex].blocks.push({ 
      type: 'table', 
      headers: ['Col 1', 'Col 2'], 
      rows: [['Val 1', 'Val 2']] 
    });
    setData({ ...data, sections: newSections });
  };

  const updateSectionTitle = (sIndex, val) => {
    const newSections = [...data.sections];
    newSections[sIndex].title = val;
    setData({ ...data, sections: newSections });
  };

  const updateSubNodeTitle = (sIndex, snIndex, val) => {
    const newSections = [...data.sections];
    newSections[sIndex].subNodes[snIndex].title = val;
    setData({ ...data, sections: newSections });
  };

  const updateTextBlock = (sIndex, snIndex, bIndex, val) => {
    const newSections = [...data.sections];
    newSections[sIndex].subNodes[snIndex].blocks[bIndex].content = val;
    setData({ ...data, sections: newSections });
  };

  if (loading) return <div style={overlayStyle}><div style={modalStyle}>Loading...</div></div>;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h2>No-Code Note Builder - Unit {noteId}</h2>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label>Unit Title</label>
            <input required type="text" value={data.unitTitle} onChange={e => setData({...data, unitTitle: e.target.value})} style={inputStyle} />
          </div>
          <div>
            <label>Subtitle / Intro</label>
            <input required type="text" value={data.subtitle} onChange={e => setData({...data, subtitle: e.target.value})} style={inputStyle} />
          </div>

          <hr/>
          <h3>Sections</h3>
          {data.sections.map((section, sIndex) => (
            <div key={sIndex} style={sectionStyle}>
              <input type="text" placeholder="Section Title (e.g. Teaching Aptitude)" value={section.title} onChange={e => updateSectionTitle(sIndex, e.target.value)} style={inputStyle} />
              
              <div style={{ marginLeft: '20px', marginTop: '10px' }}>
                {section.subNodes.map((subNode, snIndex) => (
                  <div key={snIndex} style={subNodeStyle}>
                    <input type="text" placeholder="Sub-topic Title" value={subNode.title} onChange={e => updateSubNodeTitle(sIndex, snIndex, e.target.value)} style={inputStyle} />
                    
                    {subNode.blocks.map((block, bIndex) => (
                      <div key={bIndex} style={blockStyle}>
                        {block.type === 'text' && (
                          <textarea 
                            placeholder="Type paragraph text here... (Lines will be separated automatically)" 
                            value={block.content} 
                            onChange={e => updateTextBlock(sIndex, snIndex, bIndex, e.target.value)} 
                            style={{ ...inputStyle, minHeight: '80px', fontFamily: 'inherit' }}
                          />
                        )}
                        {block.type === 'table' && (
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>[Table Block Editor (Advanced editing via raw JSON or implement rows/cols UI here)]</div>
                        )}
                      </div>
                    ))}
                    
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button type="button" onClick={() => addTextBlock(sIndex, snIndex)} style={btnStyle}>+ Add Text</button>
                      <button type="button" onClick={() => addTableBlock(sIndex, snIndex)} style={btnStyle}>+ Add Table Placeholder</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => addSubNode(sIndex)} style={{ ...btnStyle, marginTop: '10px', background: '#e2e8f0' }}>+ Add Sub-topic</button>
              </div>
            </div>
          ))}
          
          <button type="button" onClick={addSection} style={btnStyle}>+ Add Section</button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{ ...btnStyle, background: '#fee2e2', color: '#ef4444' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ ...btnStyle, background: '#2563eb', color: '#fff' }}>
              {saving ? 'Saving...' : 'Save Notes Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Simple styles for modal
const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
  background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
};
const modalStyle = {
  background: '#fff', width: '90%', maxWidth: '800px', maxHeight: '90vh', 
  overflowY: 'auto', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
};
const inputStyle = { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '5px' };
const sectionStyle = { border: '1px solid #94a3b8', padding: '15px', borderRadius: '8px', marginBottom: '15px', background: '#f8fafc' };
const subNodeStyle = { borderLeft: '3px solid #7c3aed', paddingLeft: '15px', marginBottom: '15px' };
const blockStyle = { background: '#fff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '4px', marginTop: '10px' };
const btnStyle = { padding: '6px 12px', border: 'none', background: '#e2e8f0', color: '#334155', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 };

export default NoteBuilderModal;
