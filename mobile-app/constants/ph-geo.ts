// NCR-only geography dataset for cascading Region → City → Barangay
// Reference: PH Dataset; trimmed strictly to NCR (Metro Manila)

export type Barangay = string;
export type City = { name: string; barangays: Barangay[] };
export type Region = { name: string; cities: City[] };

export const PH_GEOGRAPHY: { regions: Region[] } = {
  regions: [
    {
      name: 'National Capital Region (NCR)',
      cities: [
        { name: 'Caloocan City', barangays: ['Barangay 73'] },
      ],
    },
  ],
};

export default PH_GEOGRAPHY;


