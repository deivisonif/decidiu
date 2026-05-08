# Sistema de Planejamento Reprodutivo - Alagoas

Sistema web para digitalizar e organizar o fluxo de atendimento, capacitação e registro de distribuição de insumos do Programa Estadual de Planejamento Reprodutivo.

## Tecnologias

- **Backend**: Python Flask + SQLite
- **Frontend**: React + TypeScript + Tailwind CSS

## Estrutura do Projeto

```
/backend          - API Flask
  app.py         - Aplicação principal
  requirements.txt
  database.db    - SQLite (gerado automaticamente)

/src             - Frontend React
  /components    - Componentes reutilizáveis
  /pages         - Páginas da aplicação
```

## Como Executar

### Backend (Flask)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

pip install -r requirements.txt
python app.py
```

O backend rodará em `http://localhost:5000`

### Frontend (React)

```bash
npm install
npm run dev
```

O frontend rodará em `http://localhost:5173`

## Módulos

### Ambulatorial
- Cadastro de Pacientes
- Dados Ginecológicos/Obstétricos
- Registro de Consultas e Retornos
- Lista de Pacientes

### Capacitação
- Agendamento de Municípios
- Cadastro de Enfermeiras Instrutoras
- Cadastro de Enfermeiras Alunas
- Cadastro de Pacientes de Capacitação
- Registro de Atendimentos
- Gestão de Fichas de Atendimento (PDF)

### Distribuição de Insumos
- Cadastro de Solicitações (DIU/Implanon)
- Lista de Espera (Autorização/Negação)
- Distribuição por Município
- Relatórios Detalhados com Filtros
- Exportação de Relatórios (PDF/Excel)

## Banco de Dados

O sistema utiliza SQLite através do backend Python Flask. O banco de dados é criado automaticamente na primeira execução e inclui:

- 102 municípios de Alagoas pré-carregados
- Tabelas para pacientes (ambulatorial e capacitação)
- Tabelas para enfermeiras e instrutoras
- Tabelas para consultas e atendimentos
- Tabelas para solicitações e distribuição de insumos

## API Endpoints

Todos os endpoints estão disponíveis em `http://localhost:5000/api/`:

- `/pacientes` - Gestão de pacientes ambulatoriais
- `/capacitacao/*` - Módulo de capacitação
- `/ambulatorial/*` - Módulo ambulatorial
- `/distribuicao/*` - Módulo de distribuição de insumos
