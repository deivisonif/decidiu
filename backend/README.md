# Backend do Sistema DeciDIU - Módulo de Capacitação

## Tecnologias
- Python 3.x
- Flask (API REST)
- SQLite (Banco de Dados)
- Flask-CORS (Suporte a CORS)

## Como Iniciar o Backend

### Opção 1: Script Automatizado (Recomendado)
```bash
cd backend
./start.sh
```

### Opção 2: Manual
```bash
cd backend
pip install -r requirements.txt
python app.py
```

## Verificar se o Backend está Funcionando

### Teste Manual
Abra seu navegador e acesse:
```
http://localhost:5000/api/health
```

Você deve ver:
```json
{
  "status": "ok",
  "message": "Backend está funcionando"
}
```

### Teste via Script Python
```bash
cd backend
python test_connection.py
```

## Banco de Dados

O banco de dados SQLite será criado automaticamente em:
```
backend/database.db
```

As tabelas são criadas automaticamente na primeira execução.

## Estrutura da API

### Endpoints Principais

#### Saúde do Servidor
- `GET /api/health` - Verifica se o servidor está funcionando

#### Estatísticas
- `GET /api/capacitacao/stats` - Estatísticas do módulo de capacitação

#### Agendamentos
- `GET /api/capacitacao/agendamentos` - Lista todos os agendamentos
- `POST /api/capacitacao/agendamentos` - Cria novo agendamento

#### Enfermeiras Instrutoras
- `GET /api/capacitacao/enfermeiras-instrutoras` - Lista instrutoras
- `POST /api/capacitacao/enfermeiras-instrutoras` - Cadastra nova instrutora

#### Enfermeiras Alunas
- `GET /api/capacitacao/enfermeiras-alunas` - Lista alunas
- `POST /api/capacitacao/enfermeiras-alunas` - Cadastra nova aluna

#### Pacientes de Capacitação
- `GET /api/capacitacao/pacientes` - Lista todos os pacientes
- `POST /api/capacitacao/pacientes` - Cria novo paciente (rascunho)
- `GET /api/capacitacao/pacientes/:id` - Busca paciente por ID
- `PATCH /api/capacitacao/pacientes/:id` - Atualiza dados do paciente

## Solução de Problemas

### Erro: "Failed to fetch"
1. Verifique se o backend está rodando: `curl http://localhost:5000/api/health`
2. Verifique se a porta 5000 está livre: `lsof -i :5000`
3. Reinicie o backend: `python app.py`

### Erro: "CPF já cadastrado"
O sistema impede duplicação de CPFs. Use um CPF diferente.

### Erro ao salvar paciente
1. Verifique os logs do backend no terminal
2. Verifique o console do navegador (F12)
3. Certifique-se de que os campos obrigatórios estão preenchidos

## Logs e Debug

O backend imprime logs detalhados no terminal, incluindo:
- Requisições recebidas
- Queries SQL executadas
- Erros e exceções

Monitore o terminal onde o backend está rodando para depuração.
