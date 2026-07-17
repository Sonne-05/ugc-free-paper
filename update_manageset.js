const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'pages', 'ManageSet.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Extract the form content from line 600 to 760 (approx)
const formStartMarker = `<form className="pane-form" onSubmit={handleCreateQuestion}>
                        <h3>Add Question to PYQ Set</h3>`;
const formEndMarker = `                      </form>
                    )}
                  </div>`;
                  
const startIndex = content.indexOf(formStartMarker);
const endIndex = content.indexOf('                      </form>', startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find form block.");
  process.exit(1);
}

let formBlock = content.substring(startIndex, endIndex + '                      </form>'.length);

// Remove the base indentation (24 spaces)
formBlock = formBlock.split('\n').map(line => line.replace(/^ {24}/, '')).join('\n');

// Wrap it in the function
let newRenderFunc = `  const renderQuestionForm = (isInline = false) => (
    ${formBlock.replace(/<h3>Add Question to PYQ Set<\/h3>/g, '{!isInline && <h3>Add Question to PYQ Set</h3>}')}
  )
`;

// Also we need to conditionally render the Target PYQ Set field if it's not inline
newRenderFunc = newRenderFunc.replace(
  /<div className="form-field" style={{ marginBottom: '12px' }}>\s*<label>Target PYQ Set<\/label>/g,
  `{!isInline && (
      <div className="form-field" style={{ marginBottom: '12px' }}>
        <label>Target PYQ Set</label>`
);
newRenderFunc = newRenderFunc.replace(
  /<\/select>\s*<\/div>/g,
  `</select>
      </div>
    )}`
);

// We need to fix the indentation inside the function and insert it before \`return (\`
content = content.replace('  return (', newRenderFunc + '\\n  return (');

// 2. Replace the form at the bottom with a call to the new function
content = content.substring(0, startIndex) + '{renderQuestionForm(false)}' + content.substring(endIndex + '                      </form>'.length);

// 3. Update the questions list to render the inline form
const listRenderMarker = `                          <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '15px' }}>`;
const listReplacement = `                          <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '15px', ...(editingQuestionId === (q.id || q._id) ? {background: 'var(--bg-card)'} : {}) }}>
                            {editingQuestionId === (q.id || q._id) ? (
                              renderQuestionForm(true)
                            ) : (
                              <>`;

content = content.replace(listRenderMarker, listReplacement);

// Close the <> around the normal card render
const listEndMarker = `                            {q.options && q.options.length > 0 && (
                              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                                {q.options.map((opt, oIdx) => (
                                  <li key={oIdx} style={{ padding: '4px 0', color: q.correct === (oIdx + 1) ? 'var(--success)' : 'inherit', fontWeight: q.correct === (oIdx + 1) ? 'bold' : 'normal' }}>
                                    ({oIdx + 1}) {opt}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>`;
const listEndReplacement = `                            {q.options && q.options.length > 0 && (
                              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                                {q.options.map((opt, oIdx) => (
                                  <li key={oIdx} style={{ padding: '4px 0', color: q.correct === (oIdx + 1) ? 'var(--success)' : 'inherit', fontWeight: q.correct === (oIdx + 1) ? 'bold' : 'normal' }}>
                                    ({oIdx + 1}) {opt}
                                  </li>
                                ))}
                              </ul>
                            )}
                            </>
                            )}
                          </div>`;

content = content.replace(listEndMarker, listEndReplacement);

// 4. In \`handleEditQuestion\`, DO NOT scroll to bottom if we want inline editing
content = content.replace("window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })", "// window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })");


fs.writeFileSync(filePath, content, 'utf-8');
console.log("Successfully updated ManageSet.jsx for inline editing.");
