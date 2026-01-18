import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
`;

const Toolbar = styled.div`
  padding: 10px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 10px;
  align-items: center;
`;

const PathBar = styled.input`
  flex: 1;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 8px 12px;
  border-radius: 6px;
  outline: none;
  font-family: 'Consolas', monospace;
  
  &:focus {
    border-color: var(--accent-color);
  }
`;

const Button = styled.button`
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: 6px;
  &:hover {
    background: var(--bg-secondary); 
    color: var(--accent-color);
  }
`;

// Table Styles
const Table = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const HeaderRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr; /* Name, Type, Size, Date */
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-secondary);
  position: sticky;
  top: 0;
`;

const HeaderCell = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  &:hover {
    color: var(--text-primary);
  }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.9rem;
  cursor: pointer;
  align-items: center;
  
  &:hover {
    background: var(--bg-tertiary);
  }
`;

const Cell = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DropZone = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  z-index: 100;
  pointer-events: none;
`;

// Helper Functions
const formatSize = (sizeStr, isDir) => {
  if (isDir) return '--';
  const bytes = parseInt(sizeStr, 10);
  if (isNaN(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateStr) => {
  // adb ls -l typically returns "YYYY-MM-DD HH:MM"
  return dateStr;
};

const getFileType = (name, isDir) => {
  if (isDir) return 'Folder';
  const parts = name.split('.');
  if (parts.length > 1) {
    return parts.pop().toUpperCase();
  }
  return 'File';
};

// Grid Styles
const GridList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  grid-gap: 10px;
  align-content: start;
`;

const GridItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  
  &:hover {
    background: var(--bg-tertiary);
  }
`;

const GridIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 5px;
  color: ${props => props.$isDir ? '#fbbf24' : '#94a3b8'};
`;

const GridName = styled.div`
  font-size: 0.85rem;
  word-break: break-word;
  max-width: 100%;
  line-height: 1.2;
`;

const Explorer = ({ deviceId }) => {
  const [currentPath, setCurrentPath] = useState('/sdcard');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sortOption, setSortOption] = useState('name'); // name, size, date
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [viewMode, setViewMode] = useState('details'); // details, icons

  const parseSize = (sizeStr) => {
    const parsed = parseInt(sizeStr, 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseDate = (dateStr) => {
    return new Date(dateStr).getTime();
  };

  const sortFiles = (fileList, criterion, order) => {
    const sorted = [...fileList].sort((a, b) => {
      if (a.isDir !== b.isDir) {
        return a.isDir ? -1 : 1; // Dirs always first
      }
      let comparison = 0;
      if (criterion === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (criterion === 'size') {
        comparison = parseSize(a.size) - parseSize(b.size);
      } else if (criterion === 'date') {
        comparison = parseDate(a.date) - parseDate(b.date);
      }
      return order === 'asc' ? comparison : -comparison;
    });
    return sorted;
  };

  const loadFiles = async (path) => {
    if (!window.electron) return;
    setLoading(true);
    try {
      const result = await window.electron.listDir(path);
      const sorted = sortFiles(result, sortOption, sortOrder);
      setFiles(sorted);
      setCurrentPath(path);
    } catch (e) {
      console.error("Failed to list files", e);
      alert("Failed to list directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFiles(prev => sortFiles(prev, sortOption, sortOrder));
  }, [sortOption, sortOrder]);

  useEffect(() => {
    loadFiles(currentPath);
  }, [deviceId]); // Reload if device changes, but ideally we retain path or reset to /sdcard

  const handleNavigate = async (file) => {
    if (file.isDir) {
      // Clean path join
      const newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      loadFiles(newPath);
    } else {
      // Open file logic
      console.log("Opening file:", file.path);
      try {
        const result = await window.electron.openFile(file.path);
        if (result.error) {
          alert(`Error opening file: ${result.error}`);
        }
      } catch (e) {
        console.error("Failed to open file", e);
        alert("Failed to open file");
      }
    }
  };

  const handleUp = () => {
    if (currentPath === '/') return;
    const parent = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    loadFiles(parent);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    // We need the PATH of the dropped file.
    // In Electron, File object exposes 'path' property which is the absolute path on FS.
    for (const file of droppedFiles) {
      if (file.path) {
        console.log("Uploading", file.path, "to", currentPath);
        try {
          await window.electron.pushFile(file.path, `${currentPath}/${file.name}`);
        } catch (err) {
          console.error("Upload failed", err);
          alert(`Failed to upload ${file.name}`);
        }
      }
    }
    // Refresh
    loadFiles(currentPath);
  };

  const handleSort = (field) => {
    if (sortOption === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(field);
      setSortOrder('asc');
    }
  };

  const renderSortArrow = (field) => {
    if (sortOption !== field) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <Container onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Toolbar>
        <Button onClick={handleUp} disabled={currentPath === '/'}>⬆️ Up</Button>
        <PathBar
          value={currentPath}
          onChange={(e) => setCurrentPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadFiles(currentPath)}
        />
        <Button onClick={() => setViewMode(prev => prev === 'details' ? 'icons' : 'details')} title="Toggle View">
          {viewMode === 'details' ? '🖼️ Icons' : '📝 List'}
        </Button>
        <Button onClick={() => loadFiles(currentPath)}>🔄 Refresh</Button>
      </Toolbar>

      {viewMode === 'details' ? (
        <Table>
          <HeaderRow>
            <HeaderCell onClick={() => handleSort('name')}>Name {renderSortArrow('name')}</HeaderCell>
            <HeaderCell>Type</HeaderCell>
            <HeaderCell onClick={() => handleSort('size')}>Size {renderSortArrow('size')}</HeaderCell>
            <HeaderCell onClick={() => handleSort('date')}>Date {renderSortArrow('date')}</HeaderCell>
          </HeaderRow>
          {loading ? <div style={{ padding: 20 }}>Loading...</div> : files.map((file, idx) => (
            <Row key={idx} onDoubleClick={() => handleNavigate(file)}>
              <Cell>
                <span style={{ marginRight: 5 }}>{file.isDir ? '📁' : '📄'}</span>
                {file.name}
              </Cell>
              <Cell>{getFileType(file.name, file.isDir)}</Cell>
              <Cell>{formatSize(file.size, file.isDir)}</Cell>
              <Cell>{formatDate(file.date)}</Cell>
            </Row>
          ))}
        </Table>
      ) : (
        <GridList>
          {loading ? <div style={{ padding: 20 }}>Loading...</div> : files.map((file, idx) => (
            <GridItem key={idx} onDoubleClick={() => handleNavigate(file)}>
              <GridIcon $isDir={file.isDir}>{file.isDir ? '📁' : '📄'}</GridIcon>
              <GridName>{file.name}</GridName>
            </GridItem>
          ))}
        </GridList>
      )}

      {isDragging && <DropZone>Drop files to upload to Android</DropZone>}
    </Container >
  );
};

export default Explorer;

