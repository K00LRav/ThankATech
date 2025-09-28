// Technician categories configuration
export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  subcategories: string[];
}

export const TECHNICIAN_CATEGORIES: Category[] = [
  {
    id: 'information-technology',
    name: 'Information Technology (IT)',
    icon: '💻',
    description: 'Computer repair, networking, cybersecurity, and user support',
    subcategories: [
      'Computer repair and diagnostics',
      'Network setup and troubleshooting',
      'Cybersecurity support',
      'Help desk and user support',
      'Server administration',
      'Cloud services setup'
    ]
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: '⚡',
    description: 'Wiring, circuits, panels, and electrical systems',
    subcategories: [
      'Wiring and circuit installation',
      'Panel upgrades and diagnostics',
      'Industrial electrical systems',
      'Residential electrical systems',
      'Renewable energy systems (solar, wind)',
      'Generator installation and maintenance'
    ]
  },
  {
    id: 'mechanical',
    name: 'Mechanical',
    icon: '🔧',
    description: 'HVAC, automotive, industrial machinery, and mechanical systems',
    subcategories: [
      'HVAC systems',
      'Automotive repair and diagnostics',
      'Industrial machinery maintenance',
      'Robotics and automation',
      'Pneumatic and hydraulic systems',
      'Precision machining'
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: '🔌',
    description: 'PCB repair, audio/visual, consumer electronics, and embedded systems',
    subcategories: [
      'PCB repair and soldering',
      'Audio/visual systems',
      'Consumer electronics servicing',
      'Embedded systems',
      'Circuit design and testing',
      'Component-level repair'
    ]
  },
  {
    id: 'telecommunications',
    name: 'Telecommunications',
    icon: '📡',
    description: 'Fiber optics, cables, satellite, and communication systems',
    subcategories: [
      'Fiber optic and cable installation',
      'Signal testing and troubleshooting',
      'Satellite and radio systems',
      'Mobile infrastructure support',
      'Network infrastructure',
      'Communication towers'
    ]
  },
  {
    id: 'medical-equipment',
    name: 'Medical Equipment',
    icon: '🏥',
    description: 'Medical devices, imaging systems, and healthcare technology',
    subcategories: [
      'Imaging systems (X-ray, MRI, CT)',
      'Patient monitoring devices',
      'Lab equipment calibration',
      'Surgical tool maintenance',
      'Dental equipment',
      'Rehabilitation equipment'
    ]
  },
  {
    id: 'field-service',
    name: 'Field Service',
    icon: '🚛',
    description: 'On-site diagnostics, installation, and customer support',
    subcategories: [
      'On-site diagnostics and repair',
      'Equipment installation',
      'Customer training and support',
      'Multi-domain troubleshooting',
      'Emergency repair services',
      'Preventive maintenance'
    ]
  },
  {
    id: 'building-systems',
    name: 'Building Systems',
    icon: '🏢',
    description: 'Fire alarms, security, elevators, and building automation',
    subcategories: [
      'Fire alarms and security systems',
      'Elevator and escalator maintenance',
      'Smart building integration',
      'Lighting and climate control',
      'Access control systems',
      'Building automation'
    ]
  },
  {
    id: 'creative-tech',
    name: 'Creative Tech & Makers',
    icon: '🎨',
    description: 'Custom designs, PC modding, AV installation, and prototyping',
    subcategories: [
      'Custom merch designers',
      'PC modders and airflow engineers',
      'AV installers and stage techs',
      '3D printing and prototyping',
      'Custom fabrication',
      'Maker space equipment'
    ]
  },
  {
    id: 'software-web',
    name: 'Software & Web',
    icon: '🌐',
    description: 'Website maintenance, apps, CMS, and digital solutions',
    subcategories: [
      'Website maintenance and updates',
      'CMS troubleshooting',
      'App deployment and bug fixing',
      'UI/UX testing and optimization',
      'Database administration',
      'API integration and testing'
    ]
  }
];

// Helper functions
export const getCategoryById = (id: string): Category | undefined => {
  return TECHNICIAN_CATEGORIES.find(cat => cat.id === id);
};

export const getCategoryByName = (name: string): Category | undefined => {
  return TECHNICIAN_CATEGORIES.find(cat => 
    cat.name.toLowerCase().includes(name.toLowerCase())
  );
};

export const getAllMainCategories = (): string[] => {
  return TECHNICIAN_CATEGORIES.map(cat => cat.name);
};

export const getSubcategoriesForCategory = (categoryId: string): string[] => {
  const category = getCategoryById(categoryId);
  return category ? category.subcategories : [];
};

// Legacy category mapping for existing data
export const mapLegacyCategoryToNew = (legacyCategory: string): string => {
  const legacy = legacyCategory.toLowerCase();
  
  if (legacy.includes('auto') || legacy.includes('mechanic') || legacy.includes('car')) return 'mechanical';
  if (legacy.includes('electric') || legacy.includes('electrical')) return 'electrical';
  if (legacy.includes('plumb') || legacy.includes('pipe')) return 'mechanical';
  if (legacy.includes('hvac') || legacy.includes('air') || legacy.includes('heat')) return 'mechanical';
  if (legacy.includes('computer') || legacy.includes('tech') || legacy.includes('it')) return 'information-technology';
  if (legacy.includes('software') || legacy.includes('web') || legacy.includes('app')) return 'software-web';
  if (legacy.includes('network') || legacy.includes('telecom')) return 'telecommunications';
  if (legacy.includes('medical') || legacy.includes('healthcare')) return 'medical-equipment';
  if (legacy.includes('building') || legacy.includes('facility')) return 'building-systems';
  if (legacy.includes('field') || legacy.includes('service')) return 'field-service';
  
  // Default fallback
  return 'field-service';
};