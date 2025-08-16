export type UserType = 'transportadora' | 'cliente';

export interface User {
  id: string;
  name: string;
  email: string;
  type: UserType;
  cnpj?: string;
  emailNotaFiscal?: string;
  emailSolicitacaoLiberacao?: string;
  emailLiberacaoAutorizada?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  clientes: User[];
  addCliente: (cliente: Omit<User, 'id' | 'type'>) => Promise<void>;
}