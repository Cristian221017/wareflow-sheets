-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transportadoras table
CREATE TABLE public.transportadoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  plano TEXT NOT NULL DEFAULT 'basico' CHECK (plano IN ('basico', 'premium', 'enterprise')),
  data_contrato DATE,
  limite_usuarios INTEGER DEFAULT 5,
  limite_clientes INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin_transportadora', 'operador', 'cliente');

-- Create user_transportadoras table (many-to-many relationship)
CREATE TABLE public.user_transportadoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  transportadora_id UUID NOT NULL REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'operador',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, transportadora_id)
);

-- Create clientes table
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportadora_id UUID NOT NULL REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  email_nota_fiscal TEXT,
  email_solicitacao_liberacao TEXT,
  email_liberacao_autorizada TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transportadora_id, cnpj)
);

-- Create notas_fiscais table
CREATE TABLE public.notas_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportadora_id UUID NOT NULL REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero_nf TEXT NOT NULL,
  numero_pedido TEXT NOT NULL,
  ordem_compra TEXT NOT NULL,
  data_recebimento DATE NOT NULL,
  fornecedor TEXT NOT NULL,
  cnpj_fornecedor TEXT NOT NULL,
  produto TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  peso DECIMAL(10,3) NOT NULL CHECK (peso > 0),
  volume DECIMAL(10,3) NOT NULL CHECK (volume > 0),
  localizacao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Armazenada' CHECK (status IN ('Armazenada', 'Ordem Solicitada', 'Solicitação Confirmada')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transportadora_id, numero_nf)
);

-- Create pedidos_liberacao table
CREATE TABLE public.pedidos_liberacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportadora_id UUID NOT NULL REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  numero_pedido TEXT NOT NULL,
  ordem_compra TEXT NOT NULL,
  data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
  produto TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  peso DECIMAL(10,3) NOT NULL CHECK (peso > 0),
  volume DECIMAL(10,3) NOT NULL CHECK (volume > 0),
  prioridade TEXT NOT NULL DEFAULT 'Média' CHECK (prioridade IN ('Alta', 'Média', 'Baixa')),
  responsavel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Em análise' CHECK (status IN ('Em análise', 'Confirmado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pedidos_liberados table
CREATE TABLE public.pedidos_liberados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transportadora_id UUID NOT NULL REFERENCES public.transportadoras(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nota_fiscal_id UUID NOT NULL REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  pedido_liberacao_id UUID NOT NULL REFERENCES public.pedidos_liberacao(id) ON DELETE CASCADE,
  numero_pedido TEXT NOT NULL,
  ordem_compra TEXT NOT NULL,
  data_liberacao DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  peso DECIMAL(10,3) NOT NULL CHECK (peso > 0),
  volume DECIMAL(10,3) NOT NULL CHECK (volume > 0),
  transportadora_responsavel TEXT NOT NULL,
  data_expedicao DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transportadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_transportadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_liberacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_liberados ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_transportadoras ut
    WHERE ut.user_id = _user_id
      AND ut.role = _role
      AND ut.is_active = true
  )
$$;

-- Create function to get user transportadora
CREATE OR REPLACE FUNCTION public.get_user_transportadora(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT ut.transportadora_id
  FROM public.user_transportadoras ut
  WHERE ut.user_id = _user_id
    AND ut.is_active = true
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for transportadoras
CREATE POLICY "Super admins can view all transportadoras" 
ON public.transportadoras 
FOR SELECT 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their transportadora" 
ON public.transportadoras 
FOR SELECT 
USING (id = public.get_user_transportadora(auth.uid()));

CREATE POLICY "Super admins can manage transportadoras" 
ON public.transportadoras 
FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for user_transportadoras
CREATE POLICY "Super admins can manage user transportadoras" 
ON public.user_transportadoras 
FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admin transportadora can manage users in their transportadora" 
ON public.user_transportadoras 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'admin_transportadora') 
  AND transportadora_id = public.get_user_transportadora(auth.uid())
);

CREATE POLICY "Users can view their own transportadora assignments" 
ON public.user_transportadoras 
FOR SELECT 
USING (user_id = auth.uid());

-- RLS Policies for clientes
CREATE POLICY "Users can view clientes from their transportadora" 
ON public.clientes 
FOR SELECT 
USING (transportadora_id = public.get_user_transportadora(auth.uid()));

CREATE POLICY "Admin and operadores can manage clientes from their transportadora" 
ON public.clientes 
FOR ALL 
USING (
  transportadora_id = public.get_user_transportadora(auth.uid())
  AND (public.has_role(auth.uid(), 'admin_transportadora') OR public.has_role(auth.uid(), 'operador'))
);

-- RLS Policies for notas_fiscais
CREATE POLICY "Users can view notas fiscais from their transportadora" 
ON public.notas_fiscais 
FOR SELECT 
USING (transportadora_id = public.get_user_transportadora(auth.uid()));

CREATE POLICY "Admin and operadores can manage notas fiscais from their transportadora" 
ON public.notas_fiscais 
FOR ALL 
USING (
  transportadora_id = public.get_user_transportadora(auth.uid())
  AND (public.has_role(auth.uid(), 'admin_transportadora') OR public.has_role(auth.uid(), 'operador'))
);

-- RLS Policies for pedidos_liberacao
CREATE POLICY "Users can view pedidos liberacao from their transportadora" 
ON public.pedidos_liberacao 
FOR SELECT 
USING (transportadora_id = public.get_user_transportadora(auth.uid()));

CREATE POLICY "Admin and operadores can manage pedidos liberacao from their transportadora" 
ON public.pedidos_liberacao 
FOR ALL 
USING (
  transportadora_id = public.get_user_transportadora(auth.uid())
  AND (public.has_role(auth.uid(), 'admin_transportadora') OR public.has_role(auth.uid(), 'operador'))
);

-- RLS Policies for pedidos_liberados
CREATE POLICY "Users can view pedidos liberados from their transportadora" 
ON public.pedidos_liberados 
FOR SELECT 
USING (transportadora_id = public.get_user_transportadora(auth.uid()));

CREATE POLICY "Admin and operadores can manage pedidos liberados from their transportadora" 
ON public.pedidos_liberados 
FOR ALL 
USING (
  transportadora_id = public.get_user_transportadora(auth.uid())
  AND (public.has_role(auth.uid(), 'admin_transportadora') OR public.has_role(auth.uid(), 'operador'))
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transportadoras_updated_at
  BEFORE UPDATE ON public.transportadoras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_transportadoras_updated_at
  BEFORE UPDATE ON public.user_transportadoras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_liberacao_updated_at
  BEFORE UPDATE ON public.pedidos_liberacao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_liberados_updated_at
  BEFORE UPDATE ON public.pedidos_liberados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();