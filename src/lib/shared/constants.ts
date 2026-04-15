export const RELATIONSHIP_OPTIONS = [
  { value: "PARENT", label: "Parent" },
  { value: "CHILD", label: "Child" },
  { value: "SPOUSE", label: "Spouse" },
  { value: "SIBLING", label: "Sibling" },
  { value: "ADOPTED", label: "Adopted" },
  { value: "STEP", label: "Step" },
  { value: "FOSTER", label: "Foster" },
] as const;

export const GENDER_OPTIONS = [
  { value: "UNSPECIFIED", label: "Prefer not to say" },
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "OTHER", label: "Other" },
] as const;

export const LIFE_STATUS_OPTIONS = [
  { value: "UNKNOWN", label: "Unknown" },
  { value: "LIVING", label: "Living" },
  { value: "DECEASED", label: "Deceased" },
] as const;

export const VIEW_MODE_OPTIONS = [
  { value: "artistic", label: "Artistic tree" },
  { value: "classic", label: "Classic diagram" },
] as const;

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  CONTRIBUTOR: "Contributor",
  VIEWER: "Viewer",
  PERSONAL: "Personal editor",
};

export const ARCHIVE_AFTER_MONTHS = 24;
export const DEFAULT_MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
