export type WorkspaceViewMode = "artistic" | "classic";

export type TreeBundle = {
  tree: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    moderationMode: "OPEN" | "REVIEW_STRUCTURE";
    status: "ACTIVE" | "ARCHIVED";
    archivedAt: string | null;
    lastActivityAt: string;
  };
  access: {
    role: "OWNER" | "CONTRIBUTOR" | "VIEWER" | "PERSONAL" | null;
    isArchived: boolean;
    claimedPersonId: string | null;
    editorIdentity: {
      id: string;
      displayName: string | null;
      accentColor: string | null;
      claimedPersonId: string | null;
    } | null;
  };
  links?: {
    owner: string;
    contributor: string;
    viewer: string | null;
  };
  people: Array<{
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string | null;
    maidenName: string | null;
    displayName: string | null;
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
    generation: number | null;
    branchKey: string | null;
    layoutX: number | null;
    layoutY: number | null;
    isPrivate: boolean;
    deletedAt: string | null;
    claimedBy: {
      id: string;
      displayName: string | null;
    } | null;
    media: Array<{
      id: string;
      type: string;
      url: string;
      caption: string | null;
      fileName: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
    }>;
  }>;
  relationships: Array<{
    id: string;
    fromPersonId: string;
    toPersonId: string;
    type: string;
    status: string;
    note: string | null;
    deletedAt: string | null;
    proposedByEditorId: string | null;
  }>;
  history: Array<{
    id: string;
    entityType: string;
    entityId: string;
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
    createdAt: string;
  }>;
};
