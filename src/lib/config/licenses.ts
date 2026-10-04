export const LICENSES = [
  { value: "all_rights_reserved", label: "All Rights Reserved" },
  { value: "public_domain", label: "Public Domain (CC0 / Public Domain Mark)" },
  { value: "cc_by", label: "Creative Commons Attribution (CC BY 4.0)" },
  { value: "cc_by_sa", label: "Creative Commons Attribution-ShareAlike (CC BY-SA 4.0)" },
  { value: "cc_by_nc", label: "Creative Commons Attribution-NonCommercial (CC BY-NC 4.0)" },
  { value: "cc_by_nd", label: "Creative Commons Attribution-NoDerivatives (CC BY-ND 4.0)" },
  { value: "cc_by_nc_sa", label: "Creative Commons Attribution-NonCommercial-ShareAlike (CC BY-NC-SA 4.0)" },
  { value: "cc_by_nc_nd", label: "Creative Commons Attribution-NonCommercial-NoDerivatives (CC BY-NC-ND 4.0)" },
] as const;

export type LicenseValue = (typeof LICENSES)[number]["value"];
