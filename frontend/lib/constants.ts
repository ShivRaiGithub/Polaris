// Test data constants for development

export const TEST_IDENTITY_DATA = {
  name: "RAJESH KUMAR",
  dob: {
    year: 1995,
    month: 3,
    day: 15,
  },
  gender: 1, // 1 = Male, 2 = Female, 0 = Other
  docType: 3, // 1=Passport, 2=PAN, 3=Driver's License, 4=Aadhaar, 5=Other
  docId: "ABCDE1234F",
  secretSalt: "98765432109876543210", // 20 digit random number - CHANGED for 2nd doc
  currentYear: 2026,
  currentMonth: 2,
  currentDay: 1,
  minAge: 21,
  genderFilter: 0, // 0 = no filter, 1 = male only, 2 = female only
};

export const DOCUMENT_TYPES = {
  1: "Passport",
  2: "PAN Card",
  3: "Driver's License",
  4: "Aadhaar Card",
  5: "Other ID",
} as const;

export const GENDER_OPTIONS = {
  0: "Other",
  1: "Male",
  2: "Female",
} as const;

// Server API endpoint
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const API_ENDPOINTS = {
  REGISTER: `${API_BASE_URL}/api/register`,
  USER: `${API_BASE_URL}/api/user`,
  TRANSACTION: `${API_BASE_URL}/api/transaction`,
  GENERATE_PROOF: `${API_BASE_URL}/api/generate-proof`,
  HEALTH: `${API_BASE_URL}/api/health`,
} as const;
