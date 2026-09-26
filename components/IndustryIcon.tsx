'use client';

import React from 'react';
import { 
  Pickaxe, Building2, Stethoscope, Utensils, Cpu, 
  Truck, Shield, BookOpen, Scale, Layers, HelpCircle
} from 'lucide-react';
import { IndustryVertical } from '@/lib/types';

interface IndustryIconProps {
  id: IndustryVertical | string;
  className?: string;
}

export const IndustryIcon: React.FC<IndustryIconProps> = ({ id, className = 'h-3.5 w-3.5' }) => {
  switch (id) {
    case 'mining':
      return <Pickaxe className={className} />;
    case 'construction':
      return <Building2 className={className} />;
    case 'medical':
      return <Stethoscope className={className} />;
    case 'food':
      return <Utensils className={className} />;
    case 'it':
      return <Cpu className={className} />;
    case 'transport':
      return <Truck className={className} />;
    case 'facility':
      return <Shield className={className} />;
    case 'stationery':
      return <BookOpen className={className} />;
    case 'consulting':
      return <Scale className={className} />;
    case 'all':
      return <Layers className={className} />;
    default:
      return <Layers className={className} />;
  }
};
