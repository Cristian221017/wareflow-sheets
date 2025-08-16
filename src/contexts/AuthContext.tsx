import React, { createContext, useContext, useState } from 'react';
import { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: Array<User & { password: string }> = [
  {
    id: '1',
    name: 'Transportadora ABC',
    email: 'transportadora@abc.com',
    password: '123456',
    type: 'transportadora',
    cnpj: '12.345.678/0001-90'
  },
  {
    id: '2',
    name: 'Cliente Premium',
    email: 'cliente@premium.com',
    password: '123456',
    type: 'cliente',
    cnpj: '11.222.333/0001-44'
  },
  {
    id: '3',
    name: 'Cliente Corporativo',
    email: 'cliente@corporativo.com',
    password: '123456',
    type: 'cliente',
    cnpj: '22.333.444/0001-55'
  }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [clientes, setClientes] = useState<User[]>(
    mockUsers.filter(u => u.type === 'cliente').map(({ password, ...user }) => user)
  );

  const login = async (email: string, password: string): Promise<boolean> => {
    const foundUser = mockUsers.find(u => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const addCliente = async (clienteData: Omit<User, 'id' | 'type'>): Promise<void> => {
    const novoCliente: User = {
      ...clienteData,
      id: Date.now().toString(),
      type: 'cliente'
    };
    
    setClientes(prev => [...prev, novoCliente]);
    
    // Simular envio de emails de boas-vindas
    if (clienteData.emailNotaFiscal) {
      console.log(`Email de boas-vindas (NF) enviado para: ${clienteData.emailNotaFiscal}`);
    }
    if (clienteData.emailSolicitacaoLiberacao) {
      console.log(`Email de boas-vindas (Solicitação) enviado para: ${clienteData.emailSolicitacaoLiberacao}`);
    }
    if (clienteData.emailLiberacaoAutorizada) {
      console.log(`Email de boas-vindas (Liberação) enviado para: ${clienteData.emailLiberacaoAutorizada}`);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: !!user,
      clientes,
      addCliente
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}