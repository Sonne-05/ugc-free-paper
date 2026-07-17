const fs = require('fs');

const file = 'd:/New Website/client/src/pages/ManageSet.jsx';
let code = fs.readFileSync(file, 'utf-8');

// Add import
if (!code.includes("import './ManageSet.css'")) {
  code = code.replace("import './Profile.css'", "import './Profile.css'\nimport './ManageSet.css'");
}

// Replace the main layout
code = code.replace('<div className="profile-container">', '<div className="manage-set-page">\n    <div className="manage-set-container">');
code = code.replace('<div className="profile-header">', '<div className="manage-set-header">');
code = code.replace('<button className="pane-btn" onClick={() => navigate(\'/profile\')} style={{ marginTop: \'15px\' }}>&larr; Back to Profile</button>', '<button className="btn-back" onClick={() => navigate(\'/profile\')}>&larr; Back to Profile</button>');
code = code.replace('<div className="profile-content">', '<div className="manage-set-layout">');
code = code.replace('<div className="creator-grid" style={{ display: "block" }}>', '<div className="manage-set-left">');

// Form details update
code = code.replace('<form className="pane-form" onSubmit={handleCreateSet}>', '<form className="ms-card" onSubmit={handleCreateSet}>');
code = code.replace(/<div className="form-field"(.*?)>/g, '<div className="ms-form-field"$1>');
code = code.replace(/className="pane-select"/g, 'className="ms-input"');
code = code.replace(/className="pane-btn pane-btn--primary"/g, 'className="ms-btn ms-btn-primary"');
code = code.replace(/className="pane-btn"/g, 'className="ms-btn ms-btn-secondary"');
code = code.replace(/<input(.*?)className="ms-input"(.*?)>/g, '<input$1className="ms-input"$2>'); // just in case
code = code.replace(/<input(.*?)type="text"(.*?)>/g, function(match) {
  if (match.includes('className=')) return match;
  return match.replace('type="text"', 'type="text" className="ms-input"');
});

// Questions List pane
code = code.replace('<div className="pane-form" style={{ marginTop: \'20px\' }}>', '<div className="ms-card">');
code = code.replace('<div className="questions-list"', '<div className="ms-questions-list"');
// The Q mapped item
code = code.replace(/<div key=\{q\.id\} style=\{\{(.*?)\}\}>/g, '<div key={q.id} className={`ms-q-card ${editingQuestionId === (q.id || q._id) ? \'ms-q-card--editing\' : \'\'}`}>');
code = code.replace(/<strong>Q\{idx \+ 1\}\. \{q\.type\}<\/strong>/g, '<span className="ms-q-title">Q{idx + 1} <span className="ms-q-type">{q.type.replace(\'-\', \' \')}</span></span>');
code = code.replace(/className="table-btn table-btn--edit"/g, 'className="ms-action-btn ms-action-btn--edit"');
code = code.replace(/className="table-btn table-btn--delete"/g, 'className="ms-action-btn ms-action-btn--delete"');

// Replace form fields inside renderQuestionForm
code = code.replace(/<form className="pane-form"(.*?)>/g, '<form className="ms-add-form-wrapper"$1>');
code = code.replace(/className="pane-submit-btn"/g, 'className="ms-btn ms-btn-primary"');
code = code.replace(/<textarea(.*?)>/g, function(match) {
  if (match.includes('className=')) return match;
  return match.replace('<textarea', '<textarea className="ms-input"');
});

// Now, properly split into manage-set-left and manage-set-right
// We need to move the {renderQuestionForm(false)} to the right pane.
const formStr = `<div style={{ marginTop: '30px' }}>
                        {renderQuestionForm(false)}
                      </div>`;
if (code.includes(formStr)) {
  code = code.replace(formStr, '');
  
  // Close manage-set-left and open manage-set-right
  const endMarker = `                    )}
                  </div>
                </div>
      </div>
    </div>`;
  const replacement = `                    )}
                  </div>
                </div>
                <div className="manage-set-right">
                  {editingSetId ? renderQuestionForm(false) : (
                    <div className="ms-empty-state">
                      <h4>Select or Create a Set</h4>
                      <p>You need to create or select a set before adding questions.</p>
                    </div>
                  )}
                </div>
      </div>
    </div>
  </div>`;
  code = code.replace(endMarker, replacement);
}

fs.writeFileSync(file, code);
console.log("Refactored ManageSet.jsx");
