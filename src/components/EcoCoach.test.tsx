import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EcoCoach from './EcoCoach';
import { DEFAULT_CARBON_PROFILE } from '../utils/carbonCalculator';
import { AIAnalysisResult } from '../types';

const mockEmissions = { transport: 1000, home: 1000, food: 1000, shopping: 500, total: 3500 };

const mockAnalysis: AIAnalysisResult = {
  coachFeedback: 'Great job!',
  tailoredInsights: ['You use public transport often.'],
  roadmap: [
    {
      title: 'Use LED Bulbs',
      category: 'home',
      description: 'Switch to LED lighting.',
      potentialReductionKg: 100
    }
  ],
  personalizedQuiz: [
    {
      question: 'What is the biggest source of emissions?',
      options: ['Cars', 'Trains'],
      correctIndex: 0,
      explanation: 'Cars use fossil fuels directly.'
    }
  ]
};

describe('EcoCoach', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders initial chat message and triggers analysis', async () => {
    const mockSave = vi.fn();
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysis
    });

    render(<EcoCoach 
      profile={DEFAULT_CARBON_PROFILE} 
      emissions={mockEmissions} 
      onAddPledgeFromAI={vi.fn()} 
      savedAnalysis={null} 
      onSaveAnalysis={mockSave} 
    />);
    
    expect(screen.getByText(/Hello! I am your Climate Coach/i)).toBeInTheDocument();
    
    const analyzeButton = screen.getByRole('button', { name: /Start Profile Diagnostic/i });
    fireEvent.click(analyzeButton);
    
    expect(screen.getByText(/Connecting to Gemini/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(mockAnalysis);
    });
  });

  it('renders saved analysis correctly', () => {
    render(<EcoCoach 
      profile={DEFAULT_CARBON_PROFILE} 
      emissions={mockEmissions} 
      onAddPledgeFromAI={vi.fn()} 
      savedAnalysis={mockAnalysis} 
      onSaveAnalysis={vi.fn()} 
    />);
    
    expect(screen.getByText('Great job!')).toBeInTheDocument();
    expect(screen.getByText('You use public transport often.')).toBeInTheDocument();
    expect(screen.getByText('Use LED Bulbs')).toBeInTheDocument();
    expect(screen.getByText('What is the biggest source of emissions?')).toBeInTheDocument();
  });

  it('adds AI pledge from roadmap', () => {
    const mockAddPledge = vi.fn();
    render(<EcoCoach 
      profile={DEFAULT_CARBON_PROFILE} 
      emissions={mockEmissions} 
      onAddPledgeFromAI={mockAddPledge} 
      savedAnalysis={mockAnalysis} 
      onSaveAnalysis={vi.fn()} 
    />);
    
    const pledgeButton = screen.getByRole('button', { name: /Take Pledge/i });
    fireEvent.click(pledgeButton);
    
    expect(mockAddPledge).toHaveBeenCalledWith('Use LED Bulbs', 'home', 'Switch to LED lighting.', 100);
    expect(screen.getByText(/Pledged/i)).toBeInTheDocument();
  });

  it('handles chat messaging correctly', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'This is a test reply from AI.' })
    });

    render(<EcoCoach 
      profile={DEFAULT_CARBON_PROFILE} 
      emissions={mockEmissions} 
      onAddPledgeFromAI={vi.fn()} 
      savedAnalysis={null} 
      onSaveAnalysis={vi.fn()} 
    />);
    
    const input = screen.getByPlaceholderText(/Ask about reducing emissions/i);
    fireEvent.change(input, { target: { value: 'How do I reduce emissions?' } });
    
    const sendButton = screen.getByRole('button', { name: /Send message/i });
    fireEvent.click(sendButton);
    
    expect(screen.getByText('How do I reduce emissions?')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('This is a test reply from AI.')).toBeInTheDocument();
    });
  });

  it('handles quiz interactions', () => {
    render(<EcoCoach 
      profile={DEFAULT_CARBON_PROFILE} 
      emissions={mockEmissions} 
      onAddPledgeFromAI={vi.fn()} 
      savedAnalysis={mockAnalysis} 
      onSaveAnalysis={vi.fn()} 
    />);
    
    // Click wrong answer
    fireEvent.click(screen.getByText('Trains'));
    fireEvent.click(screen.getByRole('button', { name: /Submit Answer/i }));
    
    expect(screen.getByText(/Incorrect option matched/i)).toBeInTheDocument();
    expect(screen.getByText(/Cars use fossil fuels directly./i)).toBeInTheDocument();
  });
});
