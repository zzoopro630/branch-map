import { useState, useEffect } from 'react';
import markers from '../data/branches.json';

// Custom hook to check for media queries
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Set initial state
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    // Listen for changes
    const listener = () => {
      setMatches(media.matches);
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export default function InteractiveMapPage() {
  const [svgContent, setSvgContent] = useState('');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [popupBranch, setPopupBranch] = useState(null);

  // --- Data Processing for Branch List ---
  const allBranchesRaw = markers.flatMap(marker => marker.branches ? marker.branches : marker);
  const haesungEntry = { id: 'first-haesung-unified', name: '퍼스트해성' };
  const otherBranches = allBranchesRaw.filter(branch => !branch.name.startsWith('퍼스트해성'));
  const processedBranches = [haesungEntry, ...otherBranches];
  const sortedBranches = processedBranches.sort((a, b) => {
    const nameA = a.name.replace('퍼스트', '');
    const nameB = b.name.replace('퍼스트', '');
    return nameA.localeCompare(nameB);
  });

  const generateListHTML = (branches) => {
    const listItems = branches.map(branch => {
      const style = `margin-bottom: 5px; font-size: 7px; color: #333; word-break: break-all;`;
      const nameHTML = branch.name.startsWith('퍼스트')
        ? `퍼스트<strong style="font-weight: bold;">${branch.name.substring(3)}</strong>`
        : `<strong style="font-weight: bold;">${branch.name}</strong>`;
      return `<li style="${style}">${nameHTML}</li>`;
    }).join('');

    return (
      `<div xmlns="http://www.w3.org/1999/xhtml">
        <div style="margin: 10px; height: calc(100% - 20px); background-color: rgba(255, 255, 255, 0.1); padding: 8px; border-radius: 8px; backdrop-filter: blur(5px); box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.1); overflow-y: auto; border: 1px solid rgba(0, 0, 0, 0.1);">
          <h6 style="margin-top: 0; margin-bottom: 5px; color: #304d83;">지사 목록</h6>
          <ul style="list-style: none; padding: 0; margin: 0; padding-bottom: 0px;">
            ${listItems}
          </ul>
        </div>
      </div>`
    );
  };

  const listHTML = generateListHTML(sortedBranches);
  // --- End Data Processing ---

  useEffect(() => {
    fetch('/korea2.svg')
      .then(response => response.text())
      .then(data => {
        const cleanSvg = data.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<circle class="st0"[^>]*\/>/g, '');
        setSvgContent(cleanSvg);
      })
      .catch(error => console.error('Error loading SVG:', error));
  }, []);

  const getSVGPoint = (event) => {
    const svg = event.currentTarget;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM();
    return ctm ? point.matrixTransform(ctm.inverse()) : null;
  };

  const handleSvgClick = (event) => {
    const transformedPoint = getSVGPoint(event);
    if (!transformedPoint) return;
    const { x, y } = transformedPoint;
    console.log('Click coordinates:', x, y);
    const clickedMarker = markers.find(marker => Math.sqrt(Math.pow(x - marker.cx, 2) + Math.pow(y - marker.cy, 2)) <= 12.6);
    setPopupBranch(clickedMarker || null);
  };

  const closePopup = () => setPopupBranch(null);

  const handleSvgMouseMove = (event) => {
    const transformedPoint = getSVGPoint(event);
    if (!transformedPoint) return;
    const { x, y } = transformedPoint;
    const hoveredMarker = markers.find(marker => Math.sqrt(Math.pow(x - marker.cx, 2) + Math.pow(y - marker.cy, 2)) <= 12.6);
    setSelectedBranch(hoveredMarker ? { ...hoveredMarker, mouseX: event.clientX, mouseY: event.clientY } : null);
  };

  return (
    <div style={{ backgroundColor: 'white', width: '100vw', height: '100vh' }}>
      {svgContent ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 294.8 413.86"
            style={{ display: 'block' }}
            onClick={handleSvgClick}
            onMouseMove={handleSvgMouseMove}
          >
            <style>{`
              @keyframes ripple-scale { from { transform: scale(0.5); opacity: 1; } to { transform: scale(2.5); opacity: 0; } }
              @keyframes bobbing { 0% { transform: translateY(0); } 50% { transform: translateY(-2px); } 100% { transform: translateY(0); } }
              .map-land { fill: #304d83; }
              .ripple-circle { fill: #4dabf7; animation: ripple-scale 1.5s infinite; animation-timing-function: ease-out; transform-origin: center; transform-box: fill-box; pointer-events: none; }
              .marker-dot { fill: #4dabf7; cursor: pointer; transition: fill 0.2s; }
              .marker-group { animation: bobbing 3s infinite ease-in-out; }
              .marker-group:hover .marker-dot { fill: #339af0; }
              .marker-group:hover .ripple-circle { animation-play-state: paused; }
              .marker-group:hover { animation-play-state: paused; }
            `}</style>
            <g dangerouslySetInnerHTML={{ __html: svgContent.replace(/<\?xml[^>]*\?>/g, '').replace(/<svg[^>]*>/g, '').replace(/<\/svg>/g, '').replace(/class="st1"/g, 'class="map-land"') }} />
            {markers.map(marker => (
              <g key={marker.id} className="marker-group">
                <circle className="ripple-circle" cx={marker.cx} cy={marker.cy} r={10.6} />
                <circle className="marker-dot" cx={marker.cx} cy={marker.cy} r={8} />
              </g>
            ))}
            {/* <foreignObject x="10" y="140" width="100" height="240">
              <div dangerouslySetInnerHTML={{ __html: listHTML }} />
            </foreignObject> */}
          </svg>

          {selectedBranch && (
            <div style={{ position: 'fixed', left: selectedBranch.mouseX + 10, top: selectedBranch.mouseY - 40, backgroundColor: 'rgba(0,0,0,0.9)', color: 'white', padding: '8px 12px', borderRadius: '6px', fontSize: '14px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', zIndex: 1000, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
              {selectedBranch.name}
            </div>
          )}

          {popupBranch && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }} onClick={closePopup}>
              <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', minWidth: '320px', maxWidth: '400px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                <button onClick={closePopup} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                <div style={{ marginBottom: '20px' }}>
                  {popupBranch.branches ? (
                    <div>
                      <div style={{ marginBottom: '16px' }}>
                        {popupBranch.branches.map((branch) => (
                          <div key={branch.id} style={{ padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '6px', marginBottom: '12px', borderLeft: '4px solid #304d83', display: 'flex', gap: '12px' }}>
                            <img src={`/images/branches/${branch.id}.jpg`} alt={`${branch.name} 지사장`} style={{ width: '60px', height: '80px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #eee' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>{branch.name}</div>
                              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{branch.region}</div>
                              {branch.manager && <><div style={{ fontSize: '14px', fontWeight: 'bold', color: '#304d83', marginBottom: '2px' }}>{branch.manager.name} {branch.manager.title}</div><div style={{ fontSize: '13px', color: '#888', fontFamily: 'monospace' }}><a href={`tel:${branch.manager.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{branch.manager.phone}</a></div></>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <img src={`/images/branches/${popupBranch.id}.jpg`} alt={`${popupBranch.name} 지사장`} style={{ width: '80px', height: '106px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #eee' }} onError={(e) => e.currentTarget.style.display = 'none'} />
                      <div style={{ flex: 1 }}>
                        <h2 style={{ margin: 0, marginBottom: '8px', color: '#304d83', fontSize: '24px', fontWeight: 'bold' }}>{popupBranch.name}</h2>
                        <p style={{ margin: 0, color: '#666', fontSize: '16px', marginBottom: '12px' }}>{popupBranch.region}</p>
                        {popupBranch.manager && <div><div style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#304d83', marginBottom: '4px' }}>{popupBranch.manager.name} {popupBranch.manager.title}</div><p style={{ margin: 0, color: '#888', fontSize: '14px', fontFamily: 'monospace' }}><a href={`tel:${popupBranch.manager.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{popupBranch.manager.phone}</a></p></div>}
                      </div>
                    </div>
                  )}
                </div>
                
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'white', color: '#666' }}>
          지도 로딩 중...
        </div>
      )}
    </div>
  );
}
