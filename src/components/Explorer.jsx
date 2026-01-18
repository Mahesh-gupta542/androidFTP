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

const FileList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  grid-gap: 10px;
  align-content: start;
`;

const FileItem = styled.div`
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
  
  &.selected {
    background: rgba(56, 189, 248, 0.2);
  }
`;

const Icon = styled.div`
  font-size: 2rem;
  margin-bottom: 5px;
  color: ${props => props.$isDir ? '#fbbf24' : '#94a3b8'};
`;

const FileName = styled.div`
  font-size: 0.85rem;
  word-break: break-word;
  max-width: 100%;
  line-height: 1.2;
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

const Explorer = ({ deviceId }) => {
  const [currentPath, setCurrentPath] = useState('/sdcard');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const loadFiles = async (path) => {
    if (!window.electron) return;
    setLoading(true);
    try {
      const result = await window.electron.listDir(path);
      // Sort: Directories first, then files
      result.sort((a, b) => {
        if (a.isDir === b.isDir) return a.name.localeCompare(b.name);
        return a.isDir ? -1 : 1;
      });
      setFiles(result);
      setCurrentPath(path);
    } catch (e) {
      console.error("Failed to list files", e);
      alert("Failed to list directory");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <Container onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <Toolbar>
        <Button onClick={handleUp} disabled={currentPath === '/'}>⬆️ Up</Button>
        <PathBar
          value={currentPath}
          onChange={(e) => setCurrentPath(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadFiles(currentPath)}
        />
        <Button onClick={() => loadFiles(currentPath)}>🔄 Refresh</Button>
      </Toolbar>
      <FileList>
        {loading ? <div style={{ padding: 20 }}>Loading...</div> : files.map((file, idx) => (
          <FileItem key={idx} onClick={() => { }} onDoubleClick={() => handleNavigate(file)} $isDir={file.isDir}>
            <Icon $isDir={file.isDir}>{file.isDir ? '📁' : '📄'}</Icon>
            <FileName>{file.name}</FileName>
          </FileItem>
        ))}
      </FileList>
      {isDragging && <DropZone>Drop files to upload to Android</DropZone>}
    </Container>
  );
};

export default Explorer;
