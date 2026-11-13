export type MadeTogetherMaker = {
  key: string;
  name: string;
  slug: string | null;
  href: string | null;
  logoUrl: string | null;
  craftContribution: string | null;
  averageRating: number | null;
  reviewsCount: number;
  starSeller: boolean;
};

export type MadeTogetherPresentation = {
  makers: MadeTogetherMaker[];
  /** Average of maker shop ratings when available. */
  aggregateRating: number | null;
  /** Stars shown in the compact buy box (makers, else product reviews). */
  compactRating: number | null;
};
