# NexoDesk

Interface web de uma central de atendimento para abertura, organização e acompanhamento de chamados internos. O NexoDesk reúne solicitantes, equipe de atendimento e administradores em um único fluxo, com controle de acesso por perfil e acompanhamento de prazos de SLA.

![Tela do NexoDesk](src/assets/hero.png)

## Aplicação online

Acesse a versão publicada do NexoDesk:

**[Abrir o NexoDesk](https://nexodeskfront.onrender.com/login)**

## Funcionalidades

- Autenticação e persistência da sessão do usuário;
- Troca obrigatória de senha temporária no primeiro acesso;
- Solicitação de cadastro com aprovação administrativa;
- Painel com resumo e chamados recentes;
- Abertura de chamados por categoria, com prioridade e anexo;
- Consulta, pesquisa e filtros dos próprios chamados;
- Histórico de interações e detalhes de cada solicitação;
- Notificações de atualizações nos chamados, com sincronização automática;
- Fila de atendimento para a equipe de suporte;
- Acompanhamento visual dos prazos de SLA;
- Gestão de usuários, perfis e status de acesso;
- Cadastro de departamentos, setores e categorias de chamados.

## Acesso para demonstração

Use as credenciais abaixo para conhecer e testar as funcionalidades do sistema:

| Campo | Credencial |
| --- | --- |
| E-mail | `teste@teste.com` |
| Senha | `@Password123` |
| Perfil | Administrador |

> Esta é uma conta de demonstração com perfil de administrador. Visitantes podem explorar todas as áreas e operar o fluxo de chamados. Alterações em usuários, senhas, departamentos, setores e categorias ficam bloqueadas para preservar os dados compartilhados do ambiente.

## Perfis de acesso

| Perfil | Permissões principais |
| --- | --- |
| Padrão | Abrir, consultar e acompanhar os próprios chamados e notificações. |
| Equipe de atendimento | Recursos do perfil padrão e acesso à fila de atendimento. |
| Administrador | Acesso completo, incluindo gestão de usuários e configurações. |

## Tecnologias

- React 19
- TypeScript
- Vite
- React Router
- Lucide React
- Oxlint

## Pré-requisitos

Antes de começar, tenha instalado:

- Node.js compatível com o Vite 8;
- npm;
- A API do NexoDesk em execução.

## Como executar

1. Clone este repositório e acesse a pasta do projeto.

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Crie o arquivo de variáveis de ambiente a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

   No Windows PowerShell, use:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Confira o endereço da API no arquivo `.env`:

   ```env
   VITE_API_URL=http://localhost:5199
   ```

5. Inicie o ambiente de desenvolvimento:

   ```bash
   npm run dev
   ```

6. Abra no navegador o endereço informado pelo Vite, normalmente `http://localhost:5173`.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor local com atualização automática. |
| `npm run build` | Valida o TypeScript e gera a versão de produção. |
| `npm run lint` | Analisa o código em busca de problemas. |
| `npm run preview` | Executa localmente a versão de produção gerada. |

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `VITE_API_URL` | URL base da API do NexoDesk, sem `/api` no final. | `http://localhost:5199` |

Se a variável não for definida, a aplicação usa `http://localhost:5000` como endereço padrão.

## Estrutura do projeto

```text
public/                 Arquivos públicos e ícones
src/
├── assets/             Imagens da interface
├── auth/               Contexto de autenticação e sessão
├── pages/              Telas e fluxos da aplicação
├── services/           Cliente de comunicação com a API
├── App.tsx             Rotas e proteção por perfil
├── App.css             Estilos dos componentes e páginas
├── index.css           Estilos globais
└── main.tsx            Inicialização da aplicação
```

## Integração com a API

As requisições são enviadas para o endereço configurado em `VITE_API_URL`. As rotas protegidas utilizam um token Bearer retornado no login e armazenam a sessão no navegador.

Para que todos os recursos funcionem, a API deve permitir requisições originadas pelo endereço do frontend e disponibilizar os endpoints de autenticação, chamados, notificações, usuários, departamentos, setores e categorias.

## Hospedagem e infraestrutura

O projeto foi publicado utilizando serviços separados para cada parte da aplicação:

| Componente | Hospedagem |
| --- | --- |
| Frontend | Render |
| API | Render |
| Banco de dados PostgreSQL | Neon |

O frontend consome a API hospedada no Render, que centraliza as regras de negócio e se comunica com o banco de dados PostgreSQL hospedado no Neon. As configurações sensíveis e os endereços dos serviços são definidos por variáveis de ambiente nas plataformas de hospedagem.

## Gerando uma versão de produção

Execute:

```bash
npm run build
```

Os arquivos otimizados serão criados na pasta `dist/`. Para validá-los localmente:

```bash
npm run preview
```

