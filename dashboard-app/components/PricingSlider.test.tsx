/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PricingSlider from './PricingSlider';

jest.mock('framer-motion', () => {
  const React = require('react');

  const createMotionComponent = (tag: 'div' | 'span') =>
    React.forwardRef(
      (
        {
          children,
          initial,
          animate,
          exit,
          transition,
          whileHover,
          ...domProps
        }: Record<string, unknown>,
        ref: React.Ref<HTMLElement>,
      ) => React.createElement(tag, { ref, ...domProps }, children),
    );

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: createMotionComponent('div'),
      span: createMotionComponent('span'),
    },
  };
});

describe('PricingSlider', () => {
  beforeEach(() => {
    global.fetch = jest.fn(
      () => new Promise(() => undefined),
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('updates selected minutes when a valid value is typed', () => {
    render(<PricingSlider />);

    const input = screen.getByLabelText('Dakikayi Klavyeyle Gir');
    fireEvent.change(input, { target: { value: '1250' } });

    expect(input).toHaveValue('1250');
    expect(screen.getByText('1250 Dakika')).toBeInTheDocument();
  });

  it('clamps typed values to the allowed range on blur', () => {
    render(<PricingSlider />);

    const input = screen.getByLabelText('Dakikayi Klavyeyle Gir');
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.blur(input);

    expect(input).toHaveValue('200');
    expect(screen.getByText('200 Dakika')).toBeInTheDocument();
  });
});
