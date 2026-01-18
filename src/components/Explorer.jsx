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

// Context Menu Styles
const Menu = styled.div`
  position: fixed;
  top: ${props => props.$y}px;
  left: ${props => props.$x}px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  z-index: 1000;
  min-width: 150px;
  display: flex;
  flex-direction: column;
`;

const MenuItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-primary);
  &:hover {
    background: var(--bg-tertiary);
  }
`;

// Modal Styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const Modal = styled.div`
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  border: 1px solid var(--border-color);
  box-shadow: 0 10px 15px rgba(0,0,0,0.3);
`;

const ModalTitle = styled.h3`
  margin-top: 0;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
`;

const ModalContent = styled.div`
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ModalRow = styled.div`
  display: flex;
  justify-content: space-between;
`;

const Explorer = ({ deviceId }) => {
  const [currentPath, setCurrentPath] = useState('/sdcard');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sortOption, setSortOption] = useState('name'); // name, size, date
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [viewMode, setViewMode] = useState('details'); // details, icons
  const [contextMenu, setContextMenu] = useState(null); // { x, y, file }
  const [infoModal, setInfoModal] = useState(null); // file object

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

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      file: file
    });
  };

  const handleMenuAction = async (action) => {
    // contextMenu might be null or { file: null } for background
    // If file is null, it means background click (for Upload Here)
    const file = contextMenu?.file;
    setContextMenu(null);

    switch (action) {
      case 'open':
        handleNavigate(file);
        break;
      case 'open_with':
        // For now, same as open but maybe log or prompt later
        handleNavigate(file);
        break;
      case 'info':
        setInfoModal(file);
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(file.path);
          alert("Path copied to clipboard!");
        } catch (err) {
          console.error("Failed to copy", err);
        }
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete ${file.name}?`)) {
          try {
            await window.electron.deleteFile(file.path);
            loadFiles(currentPath);
          } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete file");
          }
        }
        break;
      case 'save_to_mac':
        try {
          const localPath = await window.electron.selectDirectory();
          if (localPath) {
            const fileName = file.name;
            // For directory pull, we might need adjustments in backend or assume adb pull handles it (it does recursive)
            // We construct target path: localPath + / + fileName
            // Actually adb pull <remote> <local_dir> pulls INTO dir or AS new name?
            // "adb pull /sdcard/foo /tmp/bar" copies foo INTO bar if bar is dir.
            // Let's pass the destination directory.
            await window.electron.pullFile(file.path, localPath);
            alert(`Saved to ${localPath}`);
          }
        } catch (err) {
          console.error("Save failed", err);
          alert("Failed to save to Mac");
        }
        break;
      case 'upload_here':
        // This action is usually for the background, but if clicked on a folder, we upload INTO it.
        // If clicked on a file, we probably upload into currentPath.
        // Let's assume this action is triggered on a folder or background.
        {
          const targetDir = file && file.isDir ? file.path : currentPath;
          try {
            const filesToUpload = await window.electron.selectFiles();
            if (filesToUpload && filesToUpload.length > 0) {
              for (const localFilePath of filesToUpload) {
                // Push to targetDir/Filename (adb push <local> <remote_dir> works)
                await window.electron.pushFile(localFilePath, targetDir);
              }
              loadFiles(currentPath);
              alert("Upload complete");
            }
          } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload");
          }
        }
        break;
      default:
        break;
    }
  };

  return (
    <Container
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => {
        e.preventDefault();
        // Background click
        if (e.target === e.currentTarget || e.target.closest('div[id^="explorer-bg"]')) {
          setContextMenu({
            x: e.pageX,
            y: e.pageY,
            file: null // Represents current directory background
          });
        }
      }}
    >
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
            <Row key={idx} onDoubleClick={() => handleNavigate(file)} onContextMenu={(e) => handleContextMenu(e, file)}>
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
            <GridItem key={idx} onDoubleClick={() => handleNavigate(file)} onContextMenu={(e) => handleContextMenu(e, file)}>
              <GridIcon $isDir={file.isDir}>{file.isDir ? '📁' : '📄'}</GridIcon>
              <GridName>{file.name}</GridName>
            </GridItem>
          ))}
        </GridList>
      )}

      {isDragging && <DropZone>Drop files to upload to Android</DropZone>}

      {contextMenu && (
        <Menu $x={contextMenu.x} $y={contextMenu.y} onClick={(e) => e.stopPropagation()}>
          {contextMenu.file ? (
            <>
              <MenuItem onClick={() => handleMenuAction('open')}>Open</MenuItem>
              <MenuItem onClick={() => handleMenuAction('info')}>Get Info</MenuItem>
              <MenuItem onClick={() => handleMenuAction('copy')}>Copy Path</MenuItem>
              <MenuItem onClick={() => handleMenuAction('save_to_mac')}>Save to Mac...</MenuItem>
              {contextMenu.file.isDir && <MenuItem onClick={() => handleMenuAction('upload_here')}>Upload Files Here...</MenuItem>}
              <MenuItem style={{ color: '#ef4444' }} onClick={() => handleMenuAction('delete')}>Delete</MenuItem>
            </>
          ) : (
            <>
              <MenuItem onClick={() => handleMenuAction('upload_here')}>Upload Files Here...</MenuItem>
            </>
          )}
        </Menu>
      )}

      {infoModal && (
        <ModalOverlay onClick={() => setInfoModal(null)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalTitle>File Info</ModalTitle>
            <ModalContent>
              <ModalRow><strong>Name:</strong> <span>{infoModal.name}</span></ModalRow>
              <ModalRow><strong>Type:</strong> <span>{infoModal.isDir ? 'Directory' : 'File'}</span></ModalRow>
              <ModalRow><strong>Path:</strong> <span style={{ fontSize: '0.8rem' }}>{infoModal.path}</span></ModalRow>
              <ModalRow><strong>Size:</strong> <span>{formatSize(infoModal.size, infoModal.isDir)}</span></ModalRow>
              <ModalRow><strong>Date:</strong> <span>{formatDate(infoModal.date)}</span></ModalRow>
            </ModalContent>
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <Button onClick={() => setInfoModal(null)}>Close</Button>
            </div>
          </Modal>
        </ModalOverlay>
      )}
    </Container >
  );
};

export default Explorer;

