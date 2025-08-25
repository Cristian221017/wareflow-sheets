# 🌐 Setup Completo: 2 Links (Teste + Oficial)

## ✅ **O QUE JÁ FOI IMPLEMENTADO**

### 1. 🎛️ **Sistema de Detecção de Ambiente**
- ✅ **Hook `useEnvironment()`**: Detecta automaticamente se está em teste ou produção
- ✅ **Indicadores visuais**: Banners que mostram quando está em ambiente de teste
- ✅ **Configurações por ambiente**: Funcionalidades diferentes baseadas no ambiente

### 2. 🚨 **Componentes Visuais**
- ✅ **EnvironmentIndicator**: Barra amarela no topo quando em teste
- ✅ **EnvironmentBadge**: Alert destacado mostrando que é ambiente de teste
- ✅ **Integrado nos layouts**: Cliente e Super Admin já mostram os indicadores

---

## 🚀 **PRÓXIMOS PASSOS PARA SETUP COMPLETO**

### **PASSO 1: Configurar Domínios**

#### **1.1 No seu provedor de domínio (ex: GoDaddy, Namecheap)**
```bash
# DNS Records que você precisa criar:

# Para ambiente de TESTE
teste.seudominio.com → A Record → 185.158.133.1

# Para ambiente OFICIAL
seudominio.com → A Record → 185.158.133.1
www.seudominio.com → A Record → 185.158.133.1
```

#### **1.2 No Lovable**
1. Vá para **Project Settings → Domains**
2. Clique **"Connect Domain"**  
3. Adicione `seudominio.com` (produção)
4. Depois adicione `teste.seudominio.com` (teste)
5. Aguarde 24-48h para propagação DNS

### **PASSO 2: Testar o Sistema**

Após DNS propagado:

#### **2.1 Acesso de Teste**
- 🌐 **URL**: `https://teste.seudominio.com`
- 🟡 **Visual**: Barra amarela "AMBIENTE DE TESTE"
- 🔧 **Recursos**: Funcionalidades experimentais habilitadas
- 📊 **Debug**: Informações de debug visíveis

#### **2.2 Acesso Oficial**
- 🌐 **URL**: `https://seudominio.com`  
- ✅ **Visual**: Interface normal, sem banners
- 🔒 **Resources**: Apenas funcionalidades estáveis
- 🚀 **Produção**: Comportamento otimizado

---

## 🎯 **COMO USAR NO DIA A DIA**

### **Para Desenvolvimento e Testes:**
1. **Desenvolva normalmente** no Lovable
2. **Acesse** `teste.seudominio.com` para testar
3. **Valide** com clientes no ambiente de teste
4. **Publique** quando estiver pronto

### **Para Clientes:**
- **Teste**: Envie link `teste.seudominio.com` para validação
- **Oficial**: Clients usam `seudominio.com` normalmente

### **Vantagens:**
- ✅ **Mesmo código**: Zero duplicação 
- ✅ **Dados compartilhados**: Continuidade total
- ✅ **Controle visual**: Clear diferenciação 
- ✅ **Feature flags**: Controle granular de funcionalidades

---

## 🛠️ **FUNCIONALIDADES POR AMBIENTE**

### **🧪 Ambiente de TESTE (`teste.seudominio.com`)**
```typescript
- showDebugInfo: true          // Mostra informações técnicas
- enableBetaFeatures: true     // Recursos experimentais
- allowTestData: true          // Permite dados de teste  
- showAdvancedOptions: true    // Opções avançadas visíveis
- showEnvironmentBadge: true   // Banner de teste visível
```

### **🚀 Ambiente OFICIAL (`seudominio.com`)**
```typescript
- showDebugInfo: false         // Interface limpa
- enableBetaFeatures: false    // Apenas recursos estáveis
- allowTestData: false         // Dados reais apenas
- showAdvancedOptions: false   // Interface simplificada
- showEnvironmentBadge: false  // Sem banners
```

---

## 🔧 **EXEMPLO: ADICIONANDO NOVA FUNCIONALIDADE**

### **1. Desenvolver com Feature Flag**
```typescript
const NovaFuncionalidade = () => {
  const { isTest } = useEnvironment();
  const { isEnabled } = useFeatureFlags();
  
  // Só mostra em teste OU se feature flag ativada
  if (!isTest && !isEnabled('nova_funcionalidade')) {
    return null;
  }
  
  return <div>Nova Funcionalidade Experimental</div>;
};
```

### **2. Workflow de Deploy**
1. **Desenvolver** nova funcionalidade
2. **Testar** em `teste.seudominio.com`
3. **Validar** com clientes no ambiente teste  
4. **Ativar feature flag** quando aprovado
5. **Clientes veem** em `seudominio.com`

---

## 📞 **TROUBLESHOOTING**

### **DNS não está funcionando?**
- Use [DNSChecker.org](https://dnschecker.org) para verificar
- Aguarde até 48h para propagação completa
- Verifique se não há registros conflitantes

### **Ambiente não está sendo detectado?**
- Verifique se URL contém "teste", "staging" ou "dev"
- Limpe cache do navegador
- Teste em aba anônima

### **SSL não está funcionando?**
- Lovable provisiona SSL automaticamente
- Aguarde algumas horas após configurar domínio
- Verifique se todos A records estão corretos

---

## 🎉 **RESULTADO FINAL**

Você terá:

🔗 **2 Links funcionais:**
- `https://teste.seudominio.com` - Para testes e validação
- `https://seudominio.com` - Para uso oficial dos clientes

🎛️ **Controle total:**
- Mesmo sistema, comportamentos diferentes
- Deploy seguro com validações
- Feature flags para controle granular

🛡️ **Segurança garantida:**
- Dados compartilhados mas protegidos
- Sistema de backup e validação  
- Rollback fácil se necessário

**Pronto para começar a configuração dos domínios?**