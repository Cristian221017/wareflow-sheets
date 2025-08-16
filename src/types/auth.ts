export type UserType = 'transportadora' | 'cliente';

export interface User {
  id: string;
  name: string;
  email: string;
  type: UserType;
  cnpj?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}