// Test data constants for development

export const DOCUMENT_TYPES = {
  1: "Aadhaar Card",
  2: "PAN Card",
  3: "Driver's License",
  4: "Passport",
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
