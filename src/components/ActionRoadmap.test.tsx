import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ActionRoadmap from './ActionRoadmap';
import { PledgeAction } from '../types';

const mockPledges: PledgeAction[] = [
  {
    id: '1',
    title: 'Ride a Bike',
    category: 'transport',
    description: 'Bike to work instead of driving.',
    impactKg: 500,
    difficulty: 'medium',
    enrolled: true,
    completed: false
  },
  {
    id: '2',
    title: 'Eat Less Meat',
    category: 'food',
    description: 'Have 3 vegetarian days a week.',
    impactKg: 300,
    difficulty: 'hard',
    enrolled: true,
    completed: true
  }
];

describe('ActionRoadmap', () => {
  it('renders pledges and overview stats correctly', () => {
    render(<ActionRoadmap pledges={mockPledges} onTogglePledge={vi.fn()} onAddCustomPledge={vi.fn()} />);
    
    expect(screen.getByText('Ride a Bike')).toBeInTheDocument();
    expect(screen.getByText('Eat Less Meat')).toBeInTheDocument();
    
    // Stats: 2 enrolled, 1 completed, 300 savings
    expect(screen.getByText('2')).toBeInTheDocument(); // Enrolled
    expect(screen.getByText('1')).toBeInTheDocument(); // Completed
    expect(screen.getAllByText(/-300/)[0]).toBeInTheDocument(); // Savings
  });

  it('filters pledges by category', () => {
    render(<ActionRoadmap pledges={mockPledges} onTogglePledge={vi.fn()} onAddCustomPledge={vi.fn()} />);
    
    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.change(categorySelect, { target: { value: 'transport' } });
    
    expect(screen.getByText('Ride a Bike')).toBeInTheDocument();
    expect(screen.queryByText('Eat Less Meat')).not.toBeInTheDocument();
  });

  it('allows adding a custom pledge', () => {
    const mockAdd = vi.fn();
    render(<ActionRoadmap pledges={mockPledges} onTogglePledge={vi.fn()} onAddCustomPledge={mockAdd} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Create Custom Pledge/i }));
    
    fireEvent.change(screen.getByLabelText(/Pledge Name/i), { target: { value: 'Plant Trees' } });
    fireEvent.change(screen.getByLabelText(/Goal Description/i), { target: { value: 'Plant 5 trees in my backyard.' } });
    fireEvent.change(screen.getByLabelText(/Est. Annual Carbon Saved/i), { target: { value: '250' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Confirm Addition/i }));
    
    expect(mockAdd).toHaveBeenCalledWith({
      title: 'Plant Trees',
      category: 'home',
      description: 'Plant 5 trees in my backyard.',
      impactKg: 250,
      difficulty: 'easy'
    });
  });

  it('toggles completion state of a pledge', () => {
    const mockToggle = vi.fn();
    render(<ActionRoadmap pledges={mockPledges} onTogglePledge={mockToggle} onAddCustomPledge={vi.fn()} />);
    
    const toggleButton = screen.getByRole('button', { name: /Toggle completion state for "Ride a Bike"/i });
    fireEvent.click(toggleButton);
    
    expect(mockToggle).toHaveBeenCalledWith('1', 'completed');
  });
});
