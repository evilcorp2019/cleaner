import React, { useState, useMemo } from 'react';
import './FileTable.css';

function FileTable({ files, selectedFiles, onFileSelect, onSelectAll, onOpenLocation }) {
  const [sortColumn, setSortColumn] = useState('size');
  const [sortDirection, setSortDirection] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'size' ? 'desc' : 'asc');
    }
  };

  const sortedFiles = useMemo(() => {
    const sorted = [...files];
    sorted.sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'modified':
          aValue = a.modified;
          bValue = b.modified;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'path':
          aValue = a.directory.toLowerCase();
          bValue = b.directory.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [files, sortColumn, sortDirection]);

  const paginatedFiles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedFiles.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedFiles, currentPage]);

  const totalPages = Math.ceil(sortedFiles.length / itemsPerPage);

  const getFileIcon = (type) => {
    switch (type) {
      case 'videos':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        );
      case 'images':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        );
      case 'documents':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      case 'archives':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        );
      case 'applications':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
            <rect x="9" y="9" width="6" height="6" />
            <line x1="9" y1="1" x2="9" y2="4" />
            <line x1="15" y1="1" x2="15" y2="4" />
            <line x1="9" y1="20" x2="9" y2="23" />
            <line x1="15" y1="20" x2="15" y2="23" />
            <line x1="20" y1="9" x2="23" y2="9" />
            <line x1="20" y1="14" x2="23" y2="14" />
            <line x1="1" y1="9" x2="4" y2="9" />
            <line x1="1" y1="14" x2="4" y2="14" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
        );
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 1) {
      return `${years} years ago`;
    } else if (years === 1) {
      return '1 year ago';
    } else if (months > 1) {
      return `${months} months ago`;
    } else if (months === 1) {
      return '1 month ago';
    } else if (days > 1) {
      return `${days} days ago`;
    } else if (days === 1) {
      return '1 day ago';
    } else {
      return 'Today';
    }
  };

  const isVeryOld = (timestamp) => {
    const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
    return timestamp < oneYearAgo;
  };

  const allSelected = paginatedFiles.length > 0 && paginatedFiles.every(f => selectedFiles.has(f.path));
  const someSelected = paginatedFiles.some(f => selectedFiles.has(f.path)) && !allSelected;

  return (
    <div className="file-table-container">
      <div className="file-table-wrapper">
        <table className="file-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <button
                  className={`checkbox-header ${allSelected ? 'checked' : ''} ${someSelected ? 'partial' : ''}`}
                  onClick={() => onSelectAll(paginatedFiles, !allSelected)}
                  title={allSelected ? 'Deselect all on page' : 'Select all on page'}
                >
                  {allSelected ? '' : someSelected ? '−' : ''}
                </button>
              </th>
              <th className="icon-column"></th>
              <th
                className={`sortable ${sortColumn === 'name' ? 'active' : ''}`}
                onClick={() => handleSort('name')}
              >
                Name
                <span className={`sort-indicator ${sortDirection}`}>
                  {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </th>
              <th
                className={`sortable ${sortColumn === 'size' ? 'active' : ''}`}
                onClick={() => handleSort('size')}
              >
                Size
                <span className={`sort-indicator ${sortDirection}`}>
                  {sortColumn === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </th>
              <th
                className={`sortable ${sortColumn === 'modified' ? 'active' : ''}`}
                onClick={() => handleSort('modified')}
              >
                Modified
                <span className={`sort-indicator ${sortDirection}`}>
                  {sortColumn === 'modified' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </th>
              <th
                className={`sortable ${sortColumn === 'type' ? 'active' : ''}`}
                onClick={() => handleSort('type')}
              >
                Type
                <span className={`sort-indicator ${sortDirection}`}>
                  {sortColumn === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </th>
              <th
                className={`sortable ${sortColumn === 'path' ? 'active' : ''}`}
                onClick={() => handleSort('path')}
              >
                Path
                <span className={`sort-indicator ${sortDirection}`}>
                  {sortColumn === 'path' && (sortDirection === 'asc' ? '↑' : '↓')}
                </span>
              </th>
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFiles.map((file) => {
              const isSelected = selectedFiles.has(file.path);
              const oldFile = isVeryOld(file.modified);

              return (
                <tr
                  key={file.path}
                  className={`file-row ${isSelected ? 'selected' : ''} ${oldFile ? 'very-old' : ''}`}
                >
                  <td className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onFileSelect(file.path)}
                      className="file-checkbox"
                    />
                  </td>
                  <td className="icon-column">
                    <div className={`file-icon ${file.type}`}>
                      {getFileIcon(file.type)}
                    </div>
                  </td>
                  <td className="name-column">
                    <span className="file-name" title={file.name}>
                      {file.name}
                    </span>
                    {oldFile && (
                      <span className="old-indicator" title="More than 1 year old">
                        ⏱
                      </span>
                    )}
                  </td>
                  <td className="size-column">{file.sizeFormatted}</td>
                  <td className="modified-column">
                    <span title={new Date(file.modified).toLocaleString()}>
                      {formatDate(file.modified)}
                    </span>
                  </td>
                  <td className="type-column">
                    <span className={`type-badge ${file.type}`}>
                      {file.type}
                    </span>
                  </td>
                  <td className="path-column" title={file.path}>
                    {file.directory}
                  </td>
                  <td className="actions-column">
                    <button
                      className="action-button"
                      onClick={() => onOpenLocation(file.path)}
                      title="Open in Finder/Explorer"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            ««
          </button>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ‹
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            ›
          </button>
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            »»
          </button>
        </div>
      )}
    </div>
  );
}

export default FileTable;
