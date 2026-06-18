import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AuthPage from './AuthPage';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn()
}));

vi.mock('../lib/firestoreService', () => ({
  getUserDoc: vi.fn().mockResolvedValue({
    name: 'Test User',
    targetGoalTons: 4.0,
    createdAt: new Date().toISOString()
  }),
  saveUserDoc: vi.fn().mockResolvedValue(true)
}));

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', () => {
    render(<AuthPage onLogin={vi.fn()} />);
    expect(screen.getByText(/Access Personal Dashboard/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter security passphrase/i)).toBeInTheDocument();
  });

  it('toggles to sign up form', () => {
    render(<AuthPage onLogin={vi.fn()} />);
    fireEvent.click(screen.getByText(/Sign Up for free registration/i));
    expect(screen.getByText(/Create a Free Account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
  });

  it('shows error when login fields are empty', async () => {
    render(<AuthPage onLogin={vi.fn()} />);
    fireEvent.submit(screen.getByText(/Access Climate Canvas/i).closest('form')!);
    expect(await screen.findByText(/Please fill in all standard credentials./i)).toBeInTheDocument();
  });

  it('calls login handler on successful sign in', async () => {
    const mockLogin = vi.fn();
    (signInWithEmailAndPassword as any).mockResolvedValueOnce({
      user: { uid: '123', email: 'test@example.com', displayName: 'Test User' }
    });

    render(<AuthPage onLogin={mockLogin} />);
    
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter security passphrase/i), { target: { value: 'password123' } });
    
    fireEvent.submit(screen.getByText(/Access Climate Canvas/i).closest('form')!);
    
    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, 'test@example.com', 'password123');
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });
  });

  it('shows error on invalid email format during signup', async () => {
    render(<AuthPage onLogin={vi.fn()} />);
    fireEvent.click(screen.getByText(/Sign Up for free registration/i));
    
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'invalid-email' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter security passphrase/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/Retype password/i), { target: { value: 'password123' } });
    
    fireEvent.submit(screen.getByText(/Register Carbon Account/i).closest('form')!);
    
    expect(await screen.findByText(/Please provide a valid email structure/i)).toBeInTheDocument();
  });
});
