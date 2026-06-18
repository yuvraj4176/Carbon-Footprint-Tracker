import { render, screen, fireEvent } from '@testing-library/react';
import CalculatorForm from './CalculatorForm';
import { describe, it, expect, vi } from 'vitest';
import { CarbonProfile } from '../types';

const defaultProfile: CarbonProfile = {
  carMilesPerWeek: 0,
  carType: "none",
  publicTransitHoursPerWeek: 0,
  flightsShortPerYear: 0,
  flightsLongPerYear: 0,
  electricityKwhPerMonth: 0,
  cleanEnergyPercentage: 0,
  householdSize: 1,
  heatingType: "none",
  dietType: "vegan",
  localFoodRatio: 0,
  foodWasteLevel: "low",
  shoppingFrequency: "minimal",
  recyclingHabit: "diligent",
};

describe('CalculatorForm', () => {
  it('renders correctly and has default tabs', () => {
    const onChange = vi.fn();
    render(<CalculatorForm profile={defaultProfile} onChange={onChange} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Home Energy')).toBeInTheDocument();
    expect(screen.getByText('Diet & Food')).toBeInTheDocument();
    expect(screen.getByText('Shopping & Waste')).toBeInTheDocument();
  });

  it('changes tabs properly', () => {
    const onChange = vi.fn();
    render(<CalculatorForm profile={defaultProfile} onChange={onChange} />);

    const energyTab = screen.getByRole('tab', { name: /energy/i });
    fireEvent.click(energyTab);
    expect(screen.getByText('Domestic Power and Heating')).toBeInTheDocument();

    const dietTab = screen.getByRole('tab', { name: /diet/i });
    fireEvent.click(dietTab);
    expect(screen.getByText('Dietary Decisions & Food Miles')).toBeInTheDocument();

    const goodsTab = screen.getByRole('tab', { name: /Shopping/i });
    fireEvent.click(goodsTab);
    expect(screen.getByText('Lifestyle Consumption & Recycling')).toBeInTheDocument();
  });

  it('calls onChange when car type is updated', () => {
    const onChange = vi.fn();
    render(<CalculatorForm profile={defaultProfile} onChange={onChange} />);

    const select = screen.getByLabelText(/Primary Motoring Engine/i);
    fireEvent.change(select, { target: { value: 'electric' } });
    
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ carType: 'electric' }));
  });
});

