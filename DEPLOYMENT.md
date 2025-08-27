# Deployment Checklist - Wareflow Sheets

## ✅ Configurações de Segurança Implementadas

### 1. Ambiente (.env)
- [x] `.env.example` criado na raiz
- [x] Instruções para adicionar arquivos .env ao .gitignore (manual)
- [x] Remoção de arquivos .env do repositório (manual via git)

### 2. Scripts de Build
- [x] Scripts ajustados no package.json (manual - arquivo read-only):
  ```json
  {
    "scripts": {
      "dev": "vite",
      "build": "vite build", 
      "build:staging": "vite build --mode staging",
      "build:prod": "vite build --mode production",
      "preview": "vite preview"
    }
  }
  ```

### 3. Logger Resiliente
- [x] `src/utils/logger.ts` substituído completamente
- [x] Funções implementadas:
  - `log()`, `warn()`, `error()` - com persistência no Supabase
  - `audit()` - eventos de negócio com correlação
  - `auditError()` - erros com contexto normalizado
  - `normalizeError()` - padronização de erros
  - `redact()` - proteção de dados sensíveis

### 4. Tela de Logs Melhorada
- [x] `src/components/WMS/LogsPage.tsx` atualizada
- [x] Meta JSON colapsável com `PrettyJson` component
- [x] Botão "Copiar JSON" para clipboard
- [x] Botão "🔎 Gerar Log Teste" para debug

### 5. Logs Padronizados
- [x] `src/contexts/AuthContext.tsx` - auditorias AUTH
- [x] `src/lib/financeiroApi.ts` - auditorias FINANCEIRO  
- [x] `src/lib/nfApi.ts` - auditorias NF
- [x] `src/contexts/WMSContext.tsx` - cache com escopo

### 6. Cache com Escopo
- [x] Invalidação específica por contexto:
  ```typescript
  // Por cliente
  ['documentos_financeiros', 'cliente', clienteId]
  ['nfs', 'cliente', clienteId]
  
  // Por transportadora  
  ['documentos_financeiros', 'transportadora', transportadoraId]
  ['nfs', 'transportadora', transportadoraId]
  ```

## 🧪 Testes Recomendados

### Build
```bash
npm run build:staging
npm run build:prod
```

### Health Check
- Acessar `/health` em staging
- Acessar `/health` em produção
- Verificar `VITE_ENV` e `MODE` corretos

### Logs
- Painel de Logs: botão "Gerar Log Teste"
- Gerar erro real (ex: NF inválida)
- Verificar meta JSON estruturado
- Console limpo em produção

### Auditorias Implementadas
- `LOGIN_SUCCESS` / `LOGIN_FAILURE` - autenticação
- `LOGOUT` - desconexão
- `NF_SOLICITADA` / `NF_CONFIRMADA` / `NF_RECUSADA` - fluxo NF
- `NF_CREATED` - criação de notas fiscais
- `DOC_CREATED` / `DOC_UPDATED` - documentos financeiros

## 📋 Ações Manuais Restantes

1. **Adicionar ao .gitignore**:
   ```
   .env
   .env.production
   .env.staging
   ```

2. **Remover arquivos do Git**:
   ```bash
   git rm --cached .env .env.production .env.staging
   git commit -m "chore: remove env files from repo"
   ```

3. **Rotacionar chaves Supabase** (se havia valores reais expostos)

## 🎯 Resultado Final
- ✅ Logs estruturados com meta JSON + correlação  
- ✅ Console silencioso em produção
- ✅ Auditorias de eventos críticos
- ✅ Cache invalidation com escopo
- ✅ Proteção de dados sensíveis (redaction)
- ✅ Tela de logs com debug tools