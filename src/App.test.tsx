import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Mock dependencies
vi.mock('./lib/firebase', () => ({
  auth: { currentUser: null },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('./lib/firestoreService', () => ({
  getUserDoc: vi.fn(),
  getProfileDoc: vi.fn(),
  getPledgesDoc: vi.fn(),
  getAIAnalysisDoc: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders auth page when not logged in', () => {
    (onAuthStateChanged as any).mockImplementation((auth: any, callback: any) => {
      callback(null);
      return vi.fn();
    });
    
    render(<App />);
    expect(screen.getByText(/Access Personal Dashboard/i)).toBeInTheDocument();
  });

  it('renders dashboard when logged in and allows tab switching', async () => {
    const mockUser = {
      email: 'test@test.com',
      name: 'Test User',
      passwordHash: '',
      createdAt: new Date().toISOString(),
      targetGoalTons: 4
    };
    
    localStorage.setItem('terra_active_user', JSON.stringify(mockUser));
    
    (onAuthStateChanged as any).mockImplementation((auth: any, callback: any) => {
      callback(null); // Will fallback to local storage
      return vi.fn();
    });

    render(<App />);
    
    // Wait for Dashboard to render (lazy loaded)
    await waitFor(() => {
      expect(screen.getByText(/Adjusted Baseline/i)).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    // Test tab switching
    fireEvent.click(screen.getByRole('button', { name: /Lifestyle Calculator/i }));
    await waitFor(() => {
      expect(screen.getByText(/Lifestyle Variables/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Take Action Pledges/i }));
    await waitFor(() => {
      expect(screen.getByText(/Ecological Habits & Pledges/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Personalized AI Advisor/i }));
    await waitFor(() => {
      expect(screen.getByText(/Personalized AI Climate Advisor/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Interactive Testbench/i }));
    await waitFor(() => {
      expect(screen.getByText(/Diagnostic Persona Simulator/i)).toBeInTheDocument();
    });
  });

  it('handles logout correctly', async () => {
    const mockUser = {
      email: 'test@test.com',
      name: 'Test User',
      passwordHash: '',
      createdAt: new Date().toISOString(),
      targetGoalTons: 4
    };
    
    localStorage.setItem('terra_active_user', JSON.stringify(mockUser));
    
    (onAuthStateChanged as any).mockImplementation((auth: any, callback: any) => {
      callback({ uid: '123', email: 'test@test.com', displayName: 'Test User' });
      return vi.fn();
    });

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    const logoutButton = screen.getByRole('button', { name: /Sign out of the workspace session/i });
    fireEvent.click(logoutButton);
    
    expect(signOut).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(screen.queryByText('Test User')).not.toBeInTheDocument();
      expect(screen.getByText(/Access Personal Dashboard/i)).toBeInTheDocument();
    });
  });
});
