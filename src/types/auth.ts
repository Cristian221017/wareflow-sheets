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
  emailNotificacaoBoleto?: string;
  senha?: string;
  role?: 'super_admin' | 'admin_transportadora' | 'operador' | 'cliente';
  transportadoraId?: string;
  clienteId?: string; // ID do cliente vinculado (quando user é cliente)
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  clientes: User[];
  addCliente: (cliente: Omit<User, 'id' | 'type'>) => Promise<{ id: string }>;
}