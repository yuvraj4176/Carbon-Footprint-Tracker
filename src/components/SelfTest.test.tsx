import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SelfTest from './SelfTest';

describe('SelfTest', () => {
  it('renders correctly', () => {
    render(<SelfTest />);
    expect(screen.getByText(/Interactive Calculator Testbench & Verification/i)).toBeInTheDocument();
  });

  it('runs unit tests on button click', async () => {
    render(<SelfTest />);
    
    expect(screen.getByText(/Assertions log empty/i)).toBeInTheDocument();
    
    const runButton = screen.getByRole('button', { name: /Run Calculus Suite/i });
    fireEvent.click(runButton);
    
    expect(screen.getByText(/Analyzing Assertions.../i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/Motor Factor Assertions/i)).toBeInTheDocument();
      expect(screen.getByText(/Diet Baseline Assertions/i)).toBeInTheDocument();
      expect(screen.getByText(/Solar Tariff Offset Factor Assertions/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows persona details when a persona is selected', () => {
    render(<SelfTest />);
    
    expect(screen.queryByText(/Persona Breakdown/i)).not.toBeInTheDocument();
    
    const select = screen.getByLabelText(/Select Scenario profile/i);
    fireEvent.change(select, { target: { value: 'suburbanCommuter' } });
    
    expect(screen.getByText(/Persona Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Suburban high-driver, balanced diet/i)).toBeInTheDocument();
  });
});
