export type TreeBundle = {
  tree: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    moderationMode: "OPEN" | "REVIEW_STRUCTURE";
    status: "ACTIVE" | "ARCHIVED";
    lastActivityAt: string;
  };
  access: {
    role: "OWNER" | "CONTRIBUTOR" | "VIEWER" | "PERSONAL" | null;
    isArchived: boolean;
    claimedPersonId: string | null;
  };
  myEditor?: {
    displayName: string | null;
    needsNamePrompt: boolean;
  };
  account?: {
    linkedToUser: boolean;
  };
  links?: {
    stable: string;
    edit: string;
    viewer: string | null;
  };
  people: Array<{
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string | null;
    maidenName: string | null;
    nickname: string | null;
    gender: string;
    lifeStatus: string;
    birthDate: string | null;
    deathDate: string | null;
    birthplace: string | null;
    currentCity: string | null;
    bio: string | null;
    occupation: string | null;
    education: string | null;
    hobbies: string | null;
    favoriteQuote: string | null;
    profilePhotoUrl: string | null;
    galleryPhotos: string[];
    lifeEvents: string[];
    notes: string[];
    layoutX: number | null;
    layoutY: number | null;
    isPrivate: boolean;
    claimedBy: {
      id: string;
      displayName: string | null;
    } | null;
    media: Array<{
      id: string;
      type: string;
      url: string;
      caption: string | null;
    }>;
  }>;
  relationships: Array<{
    id: string;
    fromPersonId: string;
    toPersonId: string;
    type: string;
    status: string;
    note: string | null;
    proposedByEditorId: string | null;
  }>;
  history: Array<{
    id: string;
    entityType: string;
    action: string;
    summary: string;
    createdAt: string;
    rolledBackAt: string | null;
    editorIdentity: {
      id: string;
      displayName: string | null;
    } | null;
  }>;
  moderationQueue: Array<{
    id: string;
    fromPersonId: string;
    toPersonId: string;
    type: string;
    note: string | null;
  }>;
};
