export type AuthUser = {
  id: number;
  email: string;
  name: string | null;
};

export type AuthConfig = {
  demo: boolean;
  demoEmail: string | null;
};
