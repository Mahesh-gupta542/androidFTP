import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Explorer from './components/Explorer';

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const Sidebar = styled.div`
  width: 250px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Title = styled.h1`
  font-size: 1.2rem;
  margin-bottom: 20px;
  color: var(--accent-color);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DeviceItem = styled.div`
  padding: 10px;
  background: ${props => props.$active ? 'var(--bg-tertiary)' : 'transparent'};
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  &:hover {
    background: var(--bg-tertiary);
  }
`;

const Status = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$connected ? '#22c55e' : '#ef4444'};
  margin-right: 10px;
`;

function App() {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);

    const refreshDevices = async () => {
        if (window.electron) {
            try {
                // Add logging to see what we get
                const devs = await window.electron.getDevices();
                console.log("Devices response:", devs);

                if (Array.isArray(devs)) {
                    setDevices(devs);
                    if (devs.length > 0 && !selectedDevice) {
                        setSelectedDevice(devs[0]);
                    }
                } else {
                    console.error("Received invalid devices data:", devs);
                    // Optional: setDevices([]) or show error state
                }
            } catch (e) {
                console.error("Failed to get devices", e);
            }
        }
    };

    useEffect(() => {
        refreshDevices();
        const interval = setInterval(refreshDevices, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <AppContainer>
            <Sidebar>
                <Title>🤖 Android Manager</Title>
                <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Devices</div>
                {devices.map(dev => (
                    <DeviceItem
                        key={dev.id}
                        $active={selectedDevice?.id === dev.id}
                        onClick={() => setSelectedDevice(dev)}
                    >
                        <Status $connected={true} />
                        <div>
                            <div>{dev.id}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{dev.type}</div>
                        </div>
                    </DeviceItem>
                ))}
                {devices.length === 0 && (
                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No devices found</div>
                )}
            </Sidebar>
            <Content>
                {selectedDevice ? (
                    <Explorer deviceId={selectedDevice.id} />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>Select a device to browse files</p>
                    </div>
                )}
            </Content>
        </AppContainer>
    );
}

export default App;
