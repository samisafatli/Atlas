// Each profile owns a separate SQLite database, so data never mixes. The id
// names the database file and must not change; the name is only displayed.
export const profiles = [
  // The owner's database keeps DATABASE_URL; his confirmed arrangements
  // (mother, salaries) live in personal-rules and apply only here.
  { id: "sami", name: "Sami", personalRules: true },
  { id: "paula", name: "Paula", personalRules: false },
] as const;

export type Profile = (typeof profiles)[number];
export type ProfileId = Profile["id"];

export const DEFAULT_PROFILE_ID: ProfileId = "sami";
export const PROFILE_COOKIE = "atlas-profile";

export function findProfile(id: string | undefined): Profile {
  return (
    profiles.find((profile) => profile.id === id) ??
    profiles.find((profile) => profile.id === DEFAULT_PROFILE_ID)!
  );
}
