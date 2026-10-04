export const LICENSES = [
  { value: "all_rights_reserved", label: "All Rights Reserved" },
  { value: "public_domain", label: "Public Domain" },
  { value: "cc_by", label: "CC BY 4.0" },
  { value: "cc_by_sa", label: "CC BY-SA 4.0" },
  { value: "cc_by_nc", label: "CC BY-NC 4.0" },
  { value: "cc_by_nd", label: "CC BY-ND 4.0" },
  { value: "cc_by_nc_sa", label: "CC BY-NC-SA 4.0" },
  { value: "cc_by_nc_nd", label: "CC BY-NC-ND 4.0" },
] as const;

export type LicenseValue = (typeof LICENSES)[number]["value"];
