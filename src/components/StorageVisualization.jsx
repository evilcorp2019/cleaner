import React, { useState, useMemo } from 'react';
import './StorageVisualization.css';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

function StorageVisualization({ analysis }) {
  const [view, setView] = useState('treemap'); // 'treemap' or 'list'

  // Transform analysis data for treemap
  const treemapData = useMemo(() => {
    if (!analysis || analysis.length === 0) return [];

    const data = [];

    analysis.forEach(browserAnalysis => {
      const browserChildren = [];

      Object.entries(browserAnalysis.dataTypes).forEach(([dataType, typeData]) => {
        browserChildren.push({
          name: dataType.charAt(0).toUpperCase() + dataType.slice(1),
          size: typeData.size,
          sizeFormatted: typeData.sizeFormatted,
          browser: browserAnalysis.browserName
        });
      });

      if (browserChildren.length > 0) {
        data.push({
          name: browserAnalysis.browserName,
          children: browserChildren
        });
      }
    });

    return data;
  }, [analysis]);

  // Get top 10 space hogs
  const topSpaceHogs = useMemo(() => {
    if (!analysis || analysis.length === 0) return [];

    const allItems = [];

    analysis.forEach(browserAnalysis => {
      Object.entries(browserAnalysis.dataTypes).forEach(([dataType, typeData]) => {
        allItems.push({
          browser: browserAnalysis.browserName,
          type: dataType.charAt(0).toUpperCase() + dataType.slice(1),
          size: typeData.size,
          sizeFormatted: typeData.sizeFormatted
        });
      });
    });

    // Sort by size descending and take top 10
    return allItems.sort((a, b) => b.size - a.size).slice(0, 10);
  }, [analysis]);

  // Custom tooltip for treemap
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="treemap-tooltip">
          <p className="tooltip-label">{data.name}</p>
          {data.browser && <p className="tooltip-browser">{data.browser}</p>}
          <p className="tooltip-size">{data.sizeFormatted}</p>
        </div>
      );
    }
    return null;
  };

  // Custom content for treemap cells
  const CustomContent = ({ root, depth, x, y, width, height, index, name, sizeFormatted }) => {
    const fontSize = Math.max(10, Math.min(14, width / 8));
    const showText = width > 40 && height > 30;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: depth === 1 ? getDataTypeColor(index) : getBrowserColor(index),
            stroke: 'var(--bg-primary)',
            strokeWidth: 2,
            opacity: depth === 1 ? 0.9 : 0.7
          }}
        />
        {showText && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 8}
              textAnchor="middle"
              fill="white"
              fontSize={fontSize}
              fontWeight="600"
            >
              {name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 8}
              textAnchor="middle"
              fill="white"
              fontSize={fontSize - 2}
              opacity="0.9"
            >
              {sizeFormatted}
            </text>
          </>
        )}
      </g>
    );
  };

  // Helper functions for colors
  const getBrowserColor = (index) => {
    const colors = ['#4A9EFF', '#FF7139', '#006CFF', '#FF1B2D', '#FB542B', '#0078D7'];
    return colors[index % colors.length];
  };

  const getDataTypeColor = (index) => {
    const colors = ['#5856D6', '#FF9500', '#FF3B30', '#34C759', '#00C7BE', '#AF52DE'];
    return colors[index % colors.length];
  };

  if (!analysis || analysis.length === 0) return null;

  return (
    <div className="storage-visualization">
      <div className="viz-header">
        <h3>Storage Breakdown</h3>
        <div className="view-toggle">
          <button
            className={view === 'treemap' ? 'active' : ''}
            onClick={() => setView('treemap')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
            Treemap
          </button>
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Top 10
          </button>
        </div>
      </div>

      {view === 'treemap' ? (
        <div className="treemap-container">
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="var(--bg-primary)"
              content={<CustomContent />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
          <p className="viz-hint">
            Click and drag to explore. Larger boxes = more storage used.
          </p>
        </div>
      ) : (
        <div className="space-hogs-list">
          {topSpaceHogs.map((item, index) => (
            <div key={index} className="space-hog-item">
              <div className="hog-rank">#{index + 1}</div>
              <div className="hog-info">
                <div className="hog-name">
                  <span className="hog-type">{item.type}</span>
                  <span className="hog-browser">{item.browser}</span>
                </div>
                <div className="hog-bar">
                  <div
                    className="hog-bar-fill"
                    style={{
                      width: `${(item.size / topSpaceHogs[0].size) * 100}%`,
                      background: getDataTypeColor(index)
                    }}
                  />
                </div>
              </div>
              <div className="hog-size">{item.sizeFormatted}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StorageVisualization;
