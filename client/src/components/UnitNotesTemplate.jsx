import React, { useEffect, useState, useRef } from 'react';
import './UnitNotesTemplate.css';

const UnitNotesTemplate = ({ data }) => {
  const contentRef = useRef(null);
  const [headings, setHeadings] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [data.unitId]);

  useEffect(() => {
    // Extract H2 headings from the rendered HTML for the sidebar
    if (contentRef.current) {
      const h2Elements = contentRef.current.querySelectorAll('h2');
      const extractedHeadings = Array.from(h2Elements).map((h2, index) => {
        // Assign an ID to the heading if it doesn't have one so we can link to it
        if (!h2.id) {
          h2.id = `topic-${index}`;
        }
        return {
          id: h2.id,
          text: h2.innerText
        };
      });
      setHeadings(extractedHeadings);
    }
  }, [data.htmlContent]);

  return (
    <div className="notes-template-layout">
      {/* Sidebar Navigation */}
      <nav className="notes-template-sidebar">
        <div className="notes-template-sidebar-brand">{data.unitTitle}</div>
        <ul className="notes-template-sidebar-nav">
          {headings.map((heading, index) => (
            <li key={index}>
              <a href={`#${heading.id}`}>
                <span className="num">{index === 0 ? '0' : index}</span> {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Document Pane */}
      <div className="notes-template-main">
        <div className="notes-template-page-header">
          <div>
            <h1>Unit {data.unitId}: <span>{data.unitTitle}</span></h1>
            <div className="notes-template-subtitle">{data.subtitle}</div>
          </div>
        </div>

        {/* Dynamic HTML Content from MS Word-style Editor */}
        <div 
          className="notes-template-rich-content"
          ref={contentRef}
          dangerouslySetInnerHTML={{ __html: data.htmlContent || '<p>No content available for this unit yet.</p>' }}
        />
      </div>
    </div>
  );
};

export default UnitNotesTemplate;
