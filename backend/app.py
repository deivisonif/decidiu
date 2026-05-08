from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime
import hashlib
from functools import wraps
from zoneinfo import ZoneInfo

_TZ_BRASILIA = ZoneInfo('America/Sao_Paulo')

def agora_brasilia() -> str:
    """Retorna o datetime atual no fuso de Brasília como string ISO 8601."""
    return datetime.now(_TZ_BRASILIA).strftime('%Y-%m-%d %H:%M:%S')

def inserir_log(cursor, usuario_id, acao, descricao, cargo_usuario=None, modulo=None, tabela_afetada=None, registro_id=None):
    """Insere registro de auditoria com horário de Brasília."""
    cursor.execute('''
        INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, agora_brasilia()))

app = Flask(__name__)

# Configuração CORS mais abrangente
CORS(app,
     resources={r"/api/*": {
         "origins": ["http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:5001", "http://127.0.0.1:5001", "http://localhost:5173", "http://127.0.0.1:5173"],
         "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "X-User-Id", "Authorization"],
         "supports_credentials": True,
         "expose_headers": ["Content-Type", "X-User-Id"],
         "max_age": 3600
     }})

# Middleware para garantir Content-Type JSON em todas as respostas de API
@app.after_request
def set_json_content_type(response):
    if request.path.startswith('/api/'):
        if 'Content-Type' not in response.headers:
            response.headers['Content-Type'] = 'application/json'
    return response

# Handler para 404 - SEMPRE retorna JSON
@app.errorhandler(404)
def not_found(error):
    if request.path.startswith('/api/'):
        return jsonify({
            'error': 'Endpoint não encontrado',
            'path': request.path,
            'method': request.method
        }), 404
    return error

# Handler para 500 - SEMPRE retorna JSON
@app.errorhandler(500)
def internal_error(error):
    if request.path.startswith('/api/'):
        return jsonify({
            'error': 'Erro interno do servidor',
            'message': str(error)
        }), 500
    return error

DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_usuario_by_id(usuario_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (usuario_id,))
    usuario = cursor.fetchone()
    conn.close()
    return dict(usuario) if usuario else None

def verificar_permissao_gestao(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Tentar obter usuario_id de várias fontes
        usuario_id = request.headers.get('X-User-Id')

        if not usuario_id:
            usuario_id = request.args.get('usuario_id')

        if not usuario_id:
            try:
                json_data = request.get_json(silent=True) or {}
                usuario_id = json_data.get('usuario_id')
            except Exception:
                usuario_id = None

        if not usuario_id:
            return jsonify({'error': 'Não autenticado'}), 401

        usuario = get_usuario_by_id(usuario_id)

        if not usuario:
            return jsonify({'error': 'Usuário não encontrado'}), 401

        cargo = usuario.get('cargo', '')

        cargos_permitidos = ['Administrador', 'Coordenador', 'Enfermeiro(a) Instrutor(a)']

        if cargo not in cargos_permitidos:
            return jsonify({'error': 'Acesso negado. Você não tem permissão para acessar este módulo.'}), 403

        request.usuario_autenticado = usuario
        return f(*args, **kwargs)

    return decorated_function

def verificar_permissao_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Tentar obter usuario_id de várias fontes
        usuario_id = request.headers.get('X-User-Id')

        if not usuario_id:
            usuario_id = request.args.get('usuario_id')

        if not usuario_id:
            try:
                json_data = request.get_json(silent=True) or {}
                usuario_id = json_data.get('usuario_id')
            except Exception:
                usuario_id = None

        if not usuario_id:
            return jsonify({'error': 'Não autenticado'}), 401

        usuario = get_usuario_by_id(usuario_id)

        if not usuario:
            return jsonify({'error': 'Usuário não encontrado'}), 401

        if usuario.get('cargo') != 'Administrador':
            return jsonify({'error': 'Acesso negado. Apenas administradores podem realizar esta ação.'}), 403

        request.usuario_autenticado = usuario
        return f(*args, **kwargs)

    return decorated_function

def verificar_permissao_admin_ou_coordenador(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Tentar obter usuario_id de várias fontes
        usuario_id = request.headers.get('X-User-Id')

        if not usuario_id:
            usuario_id = request.args.get('usuario_id')

        if not usuario_id:
            try:
                json_data = request.get_json(silent=True) or {}
                usuario_id = json_data.get('usuario_id')
            except Exception:
                usuario_id = None

        if not usuario_id:
            return jsonify({'error': 'Não autenticado'}), 401

        usuario = get_usuario_by_id(usuario_id)

        if not usuario:
            return jsonify({'error': 'Usuário não encontrado'}), 401

        cargo = usuario.get('cargo', '')
        cargos_permitidos = ['Administrador', 'Coordenador']

        if cargo not in cargos_permitidos:
            return jsonify({'error': 'Acesso negado. Apenas administradores e coordenadores podem realizar esta ação.'}), 403

        request.usuario_autenticado = usuario
        return f(*args, **kwargs)

    return decorated_function

def verificar_expiracao_senha(usuario):
    if not usuario.get('password_last_changed_at'):
        return True

    from datetime import datetime, timedelta
    last_changed = datetime.fromisoformat(usuario['password_last_changed_at'].replace('Z', '+00:00'))
    expira_em = last_changed + timedelta(days=90)
    agora = datetime.now()

    return agora >= expira_em

def gerar_senha_provisoria():
    import random
    import string
    caracteres = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(random.choice(caracteres) for _ in range(12))

def validar_senha_provisoria(usuario, senha):
    if not usuario.get('temporary_password_hash'):
        return False

    if usuario.get('temporary_password_used') == 1:
        return False

    if usuario.get('temporary_password_expires_at'):
        from datetime import datetime
        expira_em = datetime.fromisoformat(usuario['temporary_password_expires_at'].replace('Z', '+00:00'))
        if datetime.now() >= expira_em:
            return False

    senha_hash = hashlib.sha256(senha.encode()).hexdigest()
    return senha_hash == usuario['temporary_password_hash']

def success_response(data=None, message=None, status_code=200):
    response = {'ok': True}
    if data is not None:
        response['data'] = data
    if message:
        response['message'] = message
    return jsonify(response), status_code

def error_response(message, status_code=400, details=None):
    response = {
        'ok': False,
        'error': message
    }
    if details:
        response['details'] = details
    return jsonify(response), status_code

def get_cargo_hierarquia():
    return {
        'Administrador': 1,
        'Coordenador': 2,
        'Enfermeiro(a) Instrutor(a)': 3,
        'Médico(a) / Enfermeiro(a) Ambulatorial': 4,
        'Enfermeiro(a) Aluno(a)': 5,
        'Responsável por Insumos': 6,
        'Visitante': 7,
        'Recepcionista': 8
    }

def pode_gerenciar_usuario(usuario_autenticado_cargo, usuario_alvo_cargo):
    # Administrador pode gerenciar qualquer usuário
    if usuario_autenticado_cargo == 'Administrador':
        return True

    hierarquia = get_cargo_hierarquia()
    nivel_autenticado = hierarquia.get(usuario_autenticado_cargo, 999)
    nivel_alvo = hierarquia.get(usuario_alvo_cargo, 999)

    # Só pode gerenciar usuários de nível inferior
    return nivel_autenticado < nivel_alvo

def encode_base64_safe(data):
    try:
        import base64
        if isinstance(data, str):
            return data
        if data is None:
            return None
        return base64.b64encode(data).decode('utf-8')
    except Exception as e:
        print(f"Erro ao codificar base64: {e}")
        return None

def decode_base64_safe(data):
    try:
        import base64
        if data is None:
            return None
        if isinstance(data, bytes):
            return data
        return base64.b64decode(data)
    except Exception as e:
        print(f"Erro ao decodificar base64: {e}")
        return None

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pacientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_completo TEXT,
            cartao_sus TEXT,
            cpf TEXT,
            data_nascimento TEXT,
            estado_civil TEXT,
            municipio TEXT,
            raca_cor TEXT,
            celular TEXT,
            escolaridade TEXT,
            possui_comorbidade TEXT,
            qual_comorbidade TEXT,
            renda_mensal REAL,
            componentes_familia INTEGER,
            renec_cartao_cria TEXT,
            cep TEXT,
            municipio_endereco TEXT,
            bairro TEXT,
            logradouro TEXT,
            numero TEXT,
            complemento TEXT,
            menor_idade TEXT,
            parentesco TEXT,
            cpf_responsavel TEXT,
            nome_mae TEXT,
            status TEXT DEFAULT 'rascunho',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS dados_ginecologicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER UNIQUE,
            paridade INTEGER,
            uso_contraceptivo TEXT,
            qual_metodo_contraceptivo TEXT,
            citologia TEXT,
            usb TEXT,
            beta_hcg TEXT,
            metodo_escolhido TEXT,
            elegivel_metodo TEXT,
            elegivel_metodo_escolha TEXT,
            data_consulta TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consultas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER,
            data_consulta TEXT NOT NULL,
            houve_insercao TEXT,
            houve_intercorrencia TEXT,
            qual_intercorrencia TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agendamentos_municipios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            municipio TEXT NOT NULL,
            data_agendamento TEXT NOT NULL,
            plano_governanca INTEGER DEFAULT 0,
            status TEXT DEFAULT 'agendado',
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notificacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL,
            titulo TEXT NOT NULL,
            mensagem TEXT NOT NULL,
            agendamento_id INTEGER,
            dias_restantes INTEGER,
            lida INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (agendamento_id) REFERENCES agendamentos_municipios(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS enfermeiras_instrutoras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            telefone TEXT,
            email TEXT,
            especialidade TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS enfermeiras_alunas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            coren TEXT,
            telefone TEXT,
            email TEXT,
            municipio TEXT,
            enfermeira_instrutora_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (enfermeira_instrutora_id) REFERENCES enfermeiras_instrutoras(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pacientes_capacitacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_completo TEXT,
            cartao_sus TEXT,
            cpf TEXT,
            data_nascimento TEXT,
            estado_civil TEXT,
            municipio TEXT,
            raca_cor TEXT,
            celular TEXT,
            escolaridade TEXT,
            possui_comorbidade TEXT,
            qual_comorbidade TEXT,
            renda_mensal REAL,
            componentes_familia INTEGER,
            renec_cartao_cria TEXT,
            cep TEXT,
            municipio_endereco TEXT,
            bairro TEXT,
            logradouro TEXT,
            numero TEXT,
            complemento TEXT,
            menor_idade TEXT DEFAULT 'Não',
            parentesco TEXT,
            cpf_responsavel TEXT,
            nome_mae TEXT,
            status TEXT DEFAULT 'rascunho',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS dados_ginecologicos_capacitacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER UNIQUE,
            paridade INTEGER,
            uso_contraceptivo TEXT,
            qual_metodo_contraceptivo TEXT,
            citologia TEXT,
            usb TEXT,
            beta_hcg TEXT,
            metodo_escolhido TEXT,
            elegivel_metodo TEXT,
            elegivel_metodo_escolha TEXT,
            data_consulta TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paciente_id) REFERENCES pacientes_capacitacao(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consultas_capacitacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER,
            data_consulta TEXT NOT NULL,
            houve_insercao TEXT,
            houve_intercorrencia TEXT,
            qual_intercorrencia TEXT,
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paciente_id) REFERENCES pacientes_capacitacao(id)
        )
    ''')

    try:
        cursor.execute("SELECT observacoes FROM consultas_capacitacao LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE consultas_capacitacao ADD COLUMN observacoes TEXT")
        print("Coluna 'observacoes' adicionada à tabela consultas_capacitacao")

    # Adicionar coluna quantidade_componentes_familia se não existir
    try:
        cursor.execute("SELECT quantidade_componentes_familia FROM pacientes_capacitacao LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE pacientes_capacitacao ADD COLUMN quantidade_componentes_familia TEXT")
        print("Coluna 'quantidade_componentes_familia' adicionada à tabela pacientes_capacitacao")

    # Adicionar coluna coren na tabela enfermeiras_instrutoras se não existir
    try:
        cursor.execute("SELECT coren FROM enfermeiras_instrutoras LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_instrutoras ADD COLUMN coren TEXT")
        print("Coluna 'coren' adicionada à tabela enfermeiras_instrutoras")

    # Adicionar coluna coren na tabela enfermeiras_alunas se não existir
    try:
        cursor.execute("SELECT coren FROM enfermeiras_alunas LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_alunas ADD COLUMN coren TEXT")
        print("Coluna 'coren' adicionada à tabela enfermeiras_alunas")

    try:
        cursor.execute("SELECT certificado_filename FROM enfermeiras_alunas LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_alunas ADD COLUMN certificado_filename TEXT")
        print("Coluna 'certificado_filename' adicionada à tabela enfermeiras_alunas")

    try:
        cursor.execute("SELECT certificado_content FROM enfermeiras_alunas LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_alunas ADD COLUMN certificado_content BLOB")
        print("Coluna 'certificado_content' adicionada à tabela enfermeiras_alunas")

    # Adicionar coluna qual_comorbidade_especifique na tabela pacientes_capacitacao se não existir
    try:
        cursor.execute("SELECT qual_comorbidade_especifique FROM pacientes_capacitacao LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE pacientes_capacitacao ADD COLUMN qual_comorbidade_especifique TEXT")
        print("Coluna 'qual_comorbidade_especifique' adicionada à tabela pacientes_capacitacao")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS insercoes_diu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER,
            enfermeira_instrutora_id INTEGER,
            enfermeira_aluna_id INTEGER,
            data_insercao TEXT NOT NULL,
            tipo_diu TEXT,
            metodo_contraceptivo TEXT,
            metodo_contraceptivo_outro TEXT,
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paciente_id) REFERENCES pacientes_capacitacao(id),
            FOREIGN KEY (enfermeira_instrutora_id) REFERENCES enfermeiras_instrutoras(id),
            FOREIGN KEY (enfermeira_aluna_id) REFERENCES enfermeiras_alunas(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS pacientes_ambulatorial (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_completo TEXT NOT NULL,
            cpf TEXT,
            cartao_sus TEXT,
            data_nascimento TEXT,
            estado_civil TEXT,
            celular TEXT,
            municipio_nascimento TEXT,
            municipio TEXT,
            bairro TEXT,
            endereco TEXT,
            cep TEXT,
            logradouro TEXT,
            numero TEXT,
            complemento TEXT,
            escolaridade TEXT,
            etnia TEXT,
            possui_comorbidade TEXT,
            qual_comorbidade TEXT,
            qual_comorbidade_especifique TEXT,
            renda_mensal TEXT,
            quantos_componentes_familia TEXT,
            recebe_cartao_cria TEXT,
            tipo_familia TEXT,
            tipo_familia_outro TEXT,
            menor_idade TEXT,
            parentesco TEXT,
            cpf_responsavel TEXT,
            nome_completo_responsavel TEXT,
            data_nascimento_responsavel TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    try:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN municipio_nascimento TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN etnia TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN qual_comorbidade TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN qual_comorbidade_especifique TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN recebe_cartao_cria TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN tipo_familia TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN tipo_familia_outro TEXT")
    except sqlite3.OperationalError:
        pass

    cursor.execute(
        "UPDATE pacientes_ambulatorial SET tipo_familia = 'Família Quilombola' WHERE tipo_familia = 'Família Quilombla'"
    )

    try:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN data_nascimento_responsavel TEXT")
    except sqlite3.OperationalError:
        pass

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS dados_ginecologicos_obstetricos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL,
            paridade TEXT,
            usa_metodo_contraceptivo TEXT,
            qual_metodo_contraceptivo TEXT,
            metodo_contraceptivo_outro TEXT,
            gravidez TEXT,
            usa TEXT,
            bare_iug TEXT,
            metodo_escolhido TEXT,
            metodo_escolhido_outro TEXT,
            elegivel_metodo_escolhido TEXT,
            elegivel_outro_metodo TEXT,
            data_consulta TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paciente_id) REFERENCES pacientes_ambulatorial(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consultas_ambulatorial (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paciente_id INTEGER NOT NULL,
            data_consulta TEXT NOT NULL,
            houve_insercao TEXT,
            tipo_insercao TEXT,
            tipo_insercao_outro TEXT,
            nova_intercorrencia TEXT,
            qual_intercorrencia TEXT,
            observacoes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (paciente_id) REFERENCES pacientes_ambulatorial(id)
        )
    ''')

    try:
        cursor.execute("SELECT observacoes FROM consultas_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE consultas_ambulatorial ADD COLUMN observacoes TEXT")
        print("Coluna 'observacoes' adicionada à tabela consultas_ambulatorial")

    try:
        cursor.execute("SELECT houve_retirada FROM consultas_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE consultas_ambulatorial ADD COLUMN houve_retirada TEXT")
        print("Coluna 'houve_retirada' adicionada à tabela consultas_ambulatorial")

    try:
        cursor.execute("SELECT metodo_retirado FROM consultas_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE consultas_ambulatorial ADD COLUMN metodo_retirado TEXT")
        print("Coluna 'metodo_retirado' adicionada à tabela consultas_ambulatorial")

    try:
        cursor.execute("SELECT motivo_retirada FROM consultas_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE consultas_ambulatorial ADD COLUMN motivo_retirada TEXT")
        print("Coluna 'motivo_retirada' adicionada à tabela consultas_ambulatorial")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS enfermeiras_instrutoras_ambulatorial (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            tipo_registro TEXT,
            numero_registro TEXT,
            telefone TEXT,
            email TEXT,
            especialidade TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    try:
        cursor.execute("SELECT senha_hash FROM enfermeiras_instrutoras LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_instrutoras ADD COLUMN senha_hash TEXT")
        print("Coluna 'senha_hash' adicionada à tabela enfermeiras_instrutoras")

    try:
        cursor.execute("SELECT unidade_saude FROM enfermeiras_instrutoras LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_instrutoras ADD COLUMN unidade_saude TEXT")
        print("Coluna 'unidade_saude' adicionada à tabela enfermeiras_instrutoras")

    try:
        cursor.execute("SELECT diploma_filename FROM enfermeiras_instrutoras LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_instrutoras ADD COLUMN diploma_filename TEXT")
        print("Coluna 'diploma_filename' adicionada à tabela enfermeiras_instrutoras")

    try:
        cursor.execute("SELECT diploma_content FROM enfermeiras_instrutoras LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_instrutoras ADD COLUMN diploma_content BLOB")
        print("Coluna 'diploma_content' adicionada à tabela enfermeiras_instrutoras")

    try:
        cursor.execute("SELECT unidade_saude FROM enfermeiras_instrutoras_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_instrutoras_ambulatorial ADD COLUMN unidade_saude TEXT")
        print("Coluna 'unidade_saude' adicionada à tabela enfermeiras_instrutoras_ambulatorial")

    try:
        cursor.execute("SELECT diploma_filename FROM enfermeiras_instrutoras_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_instrutoras_ambulatorial ADD COLUMN diploma_filename TEXT")
        print("Coluna 'diploma_filename' adicionada à tabela enfermeiras_instrutoras_ambulatorial")

    try:
        cursor.execute("SELECT diploma_content FROM enfermeiras_instrutoras_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_instrutoras_ambulatorial ADD COLUMN diploma_content BLOB")
        print("Coluna 'diploma_content' adicionada à tabela enfermeiras_instrutoras_ambulatorial")

    try:
        cursor.execute("SELECT senha_hash FROM enfermeiras_instrutoras_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE enfermeiras_instrutoras_ambulatorial ADD COLUMN senha_hash TEXT")
        print("Coluna 'senha_hash' adicionada à tabela enfermeiras_instrutoras_ambulatorial")

    # Adicionar campos de endereço para enfermeiras_instrutoras (Capacitação)
    for coluna in ['cep', 'logradouro', 'municipio', 'bairro', 'numero', 'complemento']:
        try:
            cursor.execute(f"SELECT {coluna} FROM enfermeiras_instrutoras LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute(f"ALTER TABLE enfermeiras_instrutoras ADD COLUMN {coluna} TEXT")
            print(f"Coluna '{coluna}' adicionada à tabela enfermeiras_instrutoras")

    # Adicionar campos de endereço para enfermeiras_instrutoras_ambulatorial
    for coluna in ['cep', 'logradouro', 'municipio', 'bairro', 'numero', 'complemento']:
        try:
            cursor.execute(f"SELECT {coluna} FROM enfermeiras_instrutoras_ambulatorial LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute(f"ALTER TABLE enfermeiras_instrutoras_ambulatorial ADD COLUMN {coluna} TEXT")
            print(f"Coluna '{coluna}' adicionada à tabela enfermeiras_instrutoras_ambulatorial")

    # Adicionar campos de endereço para enfermeiras_alunas
    for coluna in ['cep', 'logradouro', 'bairro', 'numero', 'complemento']:
        try:
            cursor.execute(f"SELECT {coluna} FROM enfermeiras_alunas LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute(f"ALTER TABLE enfermeiras_alunas ADD COLUMN {coluna} TEXT")
            print(f"Coluna '{coluna}' adicionada à tabela enfermeiras_alunas")

    # Adicionar coluna qual_comorbidade na tabela pacientes_ambulatorial se não existir
    try:
        cursor.execute("SELECT qual_comorbidade FROM pacientes_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN qual_comorbidade TEXT")
        print("Coluna 'qual_comorbidade' adicionada à tabela pacientes_ambulatorial")

    # Adicionar coluna qual_comorbidade_especifique na tabela pacientes_ambulatorial se não existir
    try:
        cursor.execute("SELECT qual_comorbidade_especifique FROM pacientes_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN qual_comorbidade_especifique TEXT")
        print("Coluna 'qual_comorbidade_especifique' adicionada à tabela pacientes_ambulatorial")

    # Adicionar coluna recebe_cartao_cria na tabela pacientes_ambulatorial se não existir
    try:
        cursor.execute("SELECT recebe_cartao_cria FROM pacientes_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN recebe_cartao_cria TEXT")
        print("Coluna 'recebe_cartao_cria' adicionada à tabela pacientes_ambulatorial")

    try:
        cursor.execute("SELECT municipio_nascimento FROM pacientes_ambulatorial LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE pacientes_ambulatorial ADD COLUMN municipio_nascimento TEXT")
        print("Coluna 'municipio_nascimento' adicionada à tabela pacientes_ambulatorial")

    # Colunas adicionais em dados_ginecologicos_obstetricos
    try:
        cursor.execute("SELECT enfermeira_responsavel_id FROM dados_ginecologicos_obstetricos LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE dados_ginecologicos_obstetricos ADD COLUMN enfermeira_responsavel_id INTEGER")
        print("Coluna 'enfermeira_responsavel_id' adicionada à tabela dados_ginecologicos_obstetricos")

    try:
        cursor.execute("SELECT realizou_usg FROM dados_ginecologicos_obstetricos LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE dados_ginecologicos_obstetricos ADD COLUMN realizou_usg TEXT")
        print("Coluna 'realizou_usg' adicionada à tabela dados_ginecologicos_obstetricos")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fichas_atendimento_pdf (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enfermeira_aluna_id INTEGER NOT NULL,
            nome_arquivo TEXT NOT NULL,
            pdf_content BLOB NOT NULL,
            nome_paciente TEXT,
            cpf_paciente TEXT,
            data_nascimento_paciente TEXT,
            municipio_paciente TEXT,
            data_anexacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (enfermeira_aluna_id) REFERENCES enfermeiras_alunas(id)
        )
    ''')

    try:
        cursor.execute("SELECT metodo_inserido FROM fichas_atendimento_pdf LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE fichas_atendimento_pdf ADD COLUMN metodo_inserido TEXT")
        print("Coluna 'metodo_inserido' adicionada à tabela fichas_atendimento_pdf")

    try:
        cursor.execute("SELECT enfermeira_aluna_id FROM dados_ginecologicos_capacitacao LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE dados_ginecologicos_capacitacao ADD COLUMN enfermeira_aluna_id INTEGER")
        print("Coluna 'enfermeira_aluna_id' adicionada à tabela dados_ginecologicos_capacitacao")

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS municipios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            estado TEXT NOT NULL,
            codigo_ibge TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS solicitacoes_insumos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            municipio_id INTEGER NOT NULL,
            tipo_insumo TEXT NOT NULL,
            quantidade_solicitada INTEGER NOT NULL,
            quantidade_autorizada INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Aguardando confirmação',
            data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            nome_solicitante TEXT,
            observacao TEXT,
            motivo_negacao TEXT,
            data_resposta TIMESTAMP,
            respondido_por TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (municipio_id) REFERENCES municipios(id)
        )
    ''')

    try:
        cursor.execute("SELECT nome_paciente FROM fichas_atendimento_pdf LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE fichas_atendimento_pdf ADD COLUMN nome_paciente TEXT")
        print("Coluna 'nome_paciente' adicionada à tabela fichas_atendimento_pdf")

    try:
        cursor.execute("SELECT cpf_paciente FROM fichas_atendimento_pdf LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE fichas_atendimento_pdf ADD COLUMN cpf_paciente TEXT")
        print("Coluna 'cpf_paciente' adicionada à tabela fichas_atendimento_pdf")

    try:
        cursor.execute("SELECT data_nascimento_paciente FROM fichas_atendimento_pdf LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE fichas_atendimento_pdf ADD COLUMN data_nascimento_paciente TEXT")
        print("Coluna 'data_nascimento_paciente' adicionada à tabela fichas_atendimento_pdf")

    try:
        cursor.execute("SELECT municipio_paciente FROM fichas_atendimento_pdf LIMIT 1")
    except sqlite3.OperationalError:
        cursor.execute("ALTER TABLE fichas_atendimento_pdf ADD COLUMN municipio_paciente TEXT")
        print("Coluna 'municipio_paciente' adicionada à tabela fichas_atendimento_pdf")

    cursor.execute("SELECT COUNT(*) as count FROM municipios WHERE estado = 'AL'")
    municipios_count = cursor.fetchone()['count']

    if municipios_count == 0:
        print("Carregando municípios de Alagoas...")
        municipios_alagoas = [
            ('Água Branca', '2700102', 'AL'), ('Anadia', '2700201', 'AL'), ('Arapiraca', '2700300', 'AL'),
            ('Atalaia', '2700409', 'AL'), ('Barra de Santo Antônio', '2700508', 'AL'), ('Barra de São Miguel', '2700607', 'AL'),
            ('Batalha', '2700706', 'AL'), ('Belém', '2700805', 'AL'), ('Belo Monte', '2700904', 'AL'),
            ('Boca da Mata', '2701001', 'AL'), ('Branquinha', '2701100', 'AL'), ('Cacimbinhas', '2701209', 'AL'),
            ('Cajueiro', '2701308', 'AL'), ('Campestre', '2701357', 'AL'), ('Campo Alegre', '2701407', 'AL'),
            ('Campo Grande', '2701506', 'AL'), ('Canapi', '2701605', 'AL'), ('Capela', '2701704', 'AL'),
            ('Carneiros', '2701803', 'AL'), ('Chã Preta', '2701902', 'AL'), ('Coité do Nóia', '2702009', 'AL'),
            ('Colônia Leopoldina', '2702108', 'AL'), ('Coqueiro Seco', '2702207', 'AL'), ('Coruripe', '2702306', 'AL'),
            ('Craíbas', '2702355', 'AL'), ('Delmiro Gouveia', '2702405', 'AL'), ('Dois Riachos', '2702504', 'AL'),
            ('Estrela de Alagoas', '2702553', 'AL'), ('Feira Grande', '2702603', 'AL'), ('Feliz Deserto', '2702702', 'AL'),
            ('Flexeiras', '2702801', 'AL'), ('Girau do Ponciano', '2702900', 'AL'), ('Ibateguara', '2703007', 'AL'),
            ('Igaci', '2703106', 'AL'), ('Igreja Nova', '2703205', 'AL'), ('Inhapi', '2703304', 'AL'),
            ('Jacaré dos Homens', '2703403', 'AL'), ('Jacuípe', '2703502', 'AL'), ('Japaratinga', '2703601', 'AL'),
            ('Jaramataia', '2703700', 'AL'), ('Jequiá da Praia', '2703759', 'AL'), ('Joaquim Gomes', '2703809', 'AL'),
            ('Jundiá', '2703908', 'AL'), ('Junqueiro', '2704005', 'AL'), ('Lagoa da Canoa', '2704104', 'AL'),
            ('Limoeiro de Anadia', '2704203', 'AL'), ('Maceió', '2704302', 'AL'), ('Major Isidoro', '2704401', 'AL'),
            ('Mar Vermelho', '2704906', 'AL'), ('Maragogi', '2704500', 'AL'), ('Maravilha', '2704609', 'AL'),
            ('Marechal Deodoro', '2704708', 'AL'), ('Maribondo', '2704807', 'AL'), ('Mata Grande', '2705002', 'AL'),
            ('Matriz de Camaragibe', '2705101', 'AL'), ('Messias', '2705200', 'AL'), ('Minador do Negrão', '2705309', 'AL'),
            ('Monteirópolis', '2705408', 'AL'), ('Murici', '2705507', 'AL'), ('Novo Lino', '2705606', 'AL'),
            ('Olho d\'Água das Flores', '2705705', 'AL'), ('Olho d\'Água do Casado', '2705804', 'AL'), ('Olho d\'Água Grande', '2705903', 'AL'),
            ('Olivença', '2706000', 'AL'), ('Ouro Branco', '2706109', 'AL'), ('Palestina', '2706208', 'AL'),
            ('Palmeira dos Índios', '2706307', 'AL'), ('Pão de Açúcar', '2706406', 'AL'), ('Pariconha', '2706422', 'AL'),
            ('Paripueira', '2706448', 'AL'), ('Passo de Camaragibe', '2706505', 'AL'), ('Paulo Jacinto', '2706604', 'AL'),
            ('Penedo', '2706703', 'AL'), ('Piaçabuçu', '2706802', 'AL'), ('Pilar', '2706901', 'AL'),
            ('Pindoba', '2707008', 'AL'), ('Piranhas', '2707107', 'AL'), ('Poço das Trincheiras', '2707206', 'AL'),
            ('Porto Calvo', '2707305', 'AL'), ('Porto de Pedras', '2707404', 'AL'), ('Porto Real do Colégio', '2707503', 'AL'),
            ('Quebrangulo', '2707602', 'AL'), ('Rio Largo', '2707701', 'AL'), ('Roteiro', '2707800', 'AL'),
            ('Santa Luzia do Norte', '2707909', 'AL'), ('Santana do Ipanema', '2708006', 'AL'), ('Santana do Mundaú', '2708105', 'AL'),
            ('São Brás', '2708204', 'AL'), ('São José da Laje', '2708303', 'AL'), ('São José da Tapera', '2708402', 'AL'),
            ('São Luís do Quitunde', '2708501', 'AL'), ('São Miguel dos Campos', '2708600', 'AL'), ('São Miguel dos Milagres', '2708709', 'AL'),
            ('São Sebastião', '2708808', 'AL'), ('Satuba', '2708907', 'AL'), ('Senador Rui Palmeira', '2708956', 'AL'),
            ('Tanque d\'Arca', '2709004', 'AL'), ('Taquarana', '2709103', 'AL'), ('Teotônio Vilela', '2709152', 'AL'),
            ('Traipu', '2709202', 'AL'), ('União dos Palmares', '2709301', 'AL'), ('Viçosa', '2709400', 'AL')
        ]
        cursor.executemany('INSERT INTO municipios (nome, codigo_ibge, estado) VALUES (?, ?, ?)', municipios_alagoas)
        print(f"{len(municipios_alagoas)} municípios de Alagoas inseridos com sucesso")

    # Tabela de usuários do sistema
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_completo TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            telefone TEXT,
            profissao TEXT,
            vinculo_empregaticio TEXT,
            cep TEXT,
            municipio TEXT,
            logradouro TEXT,
            bairro TEXT,
            numero TEXT,
            complemento TEXT,
            cargo TEXT NOT NULL CHECK (cargo IN (
                'Administrador',
                'Coordenador',
                'Enfermeiro(a) Instrutor(a)',
                'Enfermeiro(a) Aluno(a)',
                'Médico(a) / Enfermeiro(a) Ambulatorial',
                'Responsável por Insumos',
                'Visitante',
                'Recepcionista'
            )),
            status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
            primeiro_acesso INTEGER DEFAULT 1,
            criado_por INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (criado_por) REFERENCES usuarios(id)
        )
    ''')

    # Adicionar campos de controle de senha se não existirem
    campos_senha = [
        ('data_nascimento', 'TEXT'),
        ('password_last_changed_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
        ('password_expires_at', 'TIMESTAMP'),
        ('must_change_password', 'INTEGER DEFAULT 1'),
        ('temporary_password_hash', 'TEXT'),
        ('temporary_password_expires_at', 'TIMESTAMP'),
        ('temporary_password_used', 'INTEGER DEFAULT 0')
    ]

    for campo, tipo in campos_senha:
        try:
            cursor.execute(f'ALTER TABLE usuarios ADD COLUMN {campo} {tipo}')
        except sqlite3.OperationalError:
            pass

    # Migração: renomear cargo 'Secretário(a)' para 'Recepcionista' nos dados existentes
    # e garantir que o CHECK constraint aceite 'Recepcionista'
    try:
        cursor.execute("INSERT OR IGNORE INTO usuarios (nome_completo, email, senha_hash, cpf, cargo) VALUES ('__test_recepcionista__', '__test_r@test.com__', 'x', '__001__', 'Recepcionista')")
        cursor.execute("DELETE FROM usuarios WHERE email = '__test_r@test.com__'")
    except sqlite3.IntegrityError:
        # Constraint antiga ainda em vigor — recriar a tabela com o novo constraint
        cursor.execute("ALTER TABLE usuarios RENAME TO usuarios_old")
        cursor.execute('''
            CREATE TABLE usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome_completo TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                senha_hash TEXT NOT NULL,
                cpf TEXT UNIQUE NOT NULL,
                telefone TEXT,
                profissao TEXT,
                vinculo_empregaticio TEXT,
                cep TEXT,
                municipio TEXT,
                logradouro TEXT,
                bairro TEXT,
                numero TEXT,
                complemento TEXT,
                cargo TEXT NOT NULL CHECK (cargo IN (
                    'Administrador',
                    'Coordenador',
                    'Enfermeiro(a) Instrutor(a)',
                    'Enfermeiro(a) Aluno(a)',
                    'Médico(a) / Enfermeiro(a) Ambulatorial',
                    'Responsável por Insumos',
                    'Visitante',
                    'Recepcionista'
                )),
                status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'bloqueado')),
                primeiro_acesso INTEGER DEFAULT 1,
                criado_por INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_nascimento TEXT,
                password_last_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                password_expires_at TIMESTAMP,
                must_change_password INTEGER DEFAULT 1,
                temporary_password_hash TEXT,
                temporary_password_expires_at TIMESTAMP,
                temporary_password_used INTEGER DEFAULT 0,
                FOREIGN KEY (criado_por) REFERENCES usuarios(id)
            )
        ''')
        cursor.execute("UPDATE usuarios_old SET cargo = 'Recepcionista' WHERE cargo = 'Secretário(a)'")
        cursor.execute("INSERT INTO usuarios SELECT * FROM usuarios_old")
        cursor.execute("DROP TABLE usuarios_old")
        print("Tabela usuarios recriada com suporte ao cargo 'Recepcionista'")

    # Migração de dados: corrigir registros 'Secretário(a)' -> 'Recepcionista' se constraint já permite
    try:
        cursor.execute("UPDATE usuarios SET cargo = 'Recepcionista' WHERE cargo = 'Secretário(a)'")
    except Exception:
        pass

    # Tabela de logs de auditoria
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS logs_auditoria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER,
            cargo_usuario TEXT,
            acao TEXT NOT NULL,
            modulo TEXT,
            tabela_afetada TEXT,
            registro_id TEXT,
            dados_anteriores TEXT,
            dados_novos TEXT,
            ip_address TEXT,
            descricao TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
    ''')

    # Migrar colunas novas se ainda não existirem (banco existente)
    cursor.execute("PRAGMA table_info(logs_auditoria)")
    colunas_audit = [col[1] for col in cursor.fetchall()]
    if 'modulo' not in colunas_audit:
        cursor.execute("ALTER TABLE logs_auditoria ADD COLUMN modulo TEXT")
    if 'cargo_usuario' not in colunas_audit:
        cursor.execute("ALTER TABLE logs_auditoria ADD COLUMN cargo_usuario TEXT")

    # Verificar e adicionar colunas necessárias na tabela usuarios antes de criar índices
    cursor.execute("PRAGMA table_info(usuarios)")
    colunas_existentes = [coluna[1] for coluna in cursor.fetchall()]

    if 'email' not in colunas_existentes:
        print("Adicionando coluna 'email' à tabela usuarios...")
        cursor.execute("ALTER TABLE usuarios ADD COLUMN email TEXT")
        conn.commit()
        print("Coluna 'email' adicionada com sucesso")

    if 'cpf' not in colunas_existentes:
        print("Adicionando coluna 'cpf' à tabela usuarios...")
        cursor.execute("ALTER TABLE usuarios ADD COLUMN cpf TEXT")
        conn.commit()
        print("Coluna 'cpf' adicionada com sucesso")

    if 'cargo' not in colunas_existentes:
        print("Adicionando coluna 'cargo' à tabela usuarios...")
        cursor.execute("ALTER TABLE usuarios ADD COLUMN cargo TEXT")
        conn.commit()
        print("Coluna 'cargo' adicionada com sucesso")

    if 'nome_completo' not in colunas_existentes:
        print("Adicionando coluna 'nome_completo' à tabela usuarios...")
        cursor.execute("ALTER TABLE usuarios ADD COLUMN nome_completo TEXT")
        conn.commit()
        print("Coluna 'nome_completo' adicionada com sucesso")

    if 'telefone' not in colunas_existentes:
        print("Adicionando coluna 'telefone' à tabela usuarios...")
        cursor.execute("ALTER TABLE usuarios ADD COLUMN telefone TEXT")
        conn.commit()
        print("Coluna 'telefone' adicionada com sucesso")

    if 'status' not in colunas_existentes:
        print("Adicionando coluna 'status' à tabela usuarios...")
        cursor.execute("ALTER TABLE usuarios ADD COLUMN status TEXT DEFAULT 'ativo'")
        conn.commit()
        print("Coluna 'status' adicionada com sucesso")

    if 'primeiro_acesso' not in colunas_existentes:
        print("Adicionando coluna 'primeiro_acesso' à tabela usuarios...")
        cursor.execute("ALTER TABLE usuarios ADD COLUMN primeiro_acesso INTEGER DEFAULT 1")
        conn.commit()
        print("Coluna 'primeiro_acesso' adicionada com sucesso")

    if 'criado_por' not in colunas_existentes:
        print("Adicionando coluna 'criado_por' à tabela usuarios...")
        cursor.execute("ALTER TABLE usuarios ADD COLUMN criado_por INTEGER")
        conn.commit()
        print("Coluna 'criado_por' adicionada com sucesso")

    if 'updated_at' not in colunas_existentes:
        print("Adicionando coluna 'updated_at' à tabela usuarios...")
        cursor.execute("ALTER TABLE usuarios ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
        conn.commit()
        print("Coluna 'updated_at' adicionada com sucesso")

    # Criar índices para melhor performance (após garantir que as colunas existem)
    try:
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)')
    except sqlite3.OperationalError as e:
        print(f"Aviso ao criar índice idx_usuarios_email: {e}")

    try:
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usuarios_cpf ON usuarios(cpf)')
    except sqlite3.OperationalError as e:
        print(f"Aviso ao criar índice idx_usuarios_cpf: {e}")

    try:
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usuarios_cargo ON usuarios(cargo)')
    except sqlite3.OperationalError as e:
        print(f"Aviso ao criar índice idx_usuarios_cargo: {e}")

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_usuario_id ON logs_auditoria(usuario_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs_auditoria(created_at)')

    # Criar índices únicos de CPF para tabelas de pacientes (evitar duplicatas)
    try:
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_ambulatorial_cpf ON pacientes_ambulatorial(cpf) WHERE cpf IS NOT NULL AND cpf != ""')
    except sqlite3.OperationalError as e:
        print(f"Aviso ao criar índice único de CPF em pacientes_ambulatorial: {e}")

    try:
        cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_capacitacao_cpf ON pacientes_capacitacao(cpf) WHERE cpf IS NOT NULL AND cpf != ""')
    except sqlite3.OperationalError as e:
        print(f"Aviso ao criar índice único de CPF em pacientes_capacitacao: {e}")

    # Criar usuário administrador padrão se não existir
    cursor.execute("SELECT COUNT(*) as count FROM usuarios WHERE cpf = '12345678909'")
    if cursor.fetchone()['count'] == 0:
        # CPF: 123.456.789-09 | Senha: Admin@123
        senha_hash = hashlib.sha256('Admin@123'.encode()).hexdigest()
        cursor.execute('''
            INSERT INTO usuarios (nome_completo, email, senha_hash, cpf, telefone, cargo, status, primeiro_acesso)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', ('Administrador do Sistema', 'admin@decidiu.com', senha_hash, '12345678909', '(82) 99999-9999', 'Administrador', 'ativo', 1))
        print("Usuário administrador padrão criado com sucesso - CPF: 123.456.789-09")

    conn.commit()
    conn.close()

@app.route("/")
def home():
    return jsonify({
        "status": "API do Decidiu funcionando",
        "api_base": "/api"
    })

@app.route('/api/pacientes', methods=['GET', 'POST'])
def pacientes():
    if request.method == 'GET':
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM pacientes ORDER BY created_at DESC')
        rows = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    elif request.method == 'POST':
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('INSERT INTO pacientes (status) VALUES (?)', ('rascunho',))
        paciente_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({'id': paciente_id, 'status': 'rascunho'}), 201

@app.route('/api/pacientes/buscar', methods=['GET'])
def buscar_paciente():
    cpf = request.args.get('cpf')
    sus = request.args.get('sus')

    conn = get_db()
    cursor = conn.cursor()

    if cpf:
        cursor.execute('SELECT * FROM pacientes WHERE cpf = ?', (cpf,))
    elif sus:
        cursor.execute('SELECT * FROM pacientes WHERE cartao_sus = ?', (sus,))
    else:
        conn.close()
        return jsonify({'error': 'CPF ou Cartão SUS é obrigatório'}), 400

    row = cursor.fetchone()
    conn.close()

    if row:
        return jsonify(dict(row))
    return jsonify({'error': 'Paciente não encontrado'}), 404

@app.route('/api/pacientes/<int:id>', methods=['GET', 'PATCH'])
def paciente_detail(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM pacientes WHERE id = ?', (id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return jsonify(dict(row))
        return jsonify({'error': 'Paciente não encontrado'}), 404

    elif request.method == 'PATCH':
        data = request.json
        fields = []
        values = []

        for key, value in data.items():
            if key != 'id':
                fields.append(f"{key} = ?")
                values.append(value)

        values.append(datetime.now().isoformat())
        fields.append("updated_at = ?")
        values.append(id)

        query = f"UPDATE pacientes SET {', '.join(fields)} WHERE id = ?"
        cursor.execute(query, values)
        conn.commit()
        conn.close()

        return jsonify({'message': 'Paciente atualizado com sucesso'})

@app.route('/api/pacientes/<int:id>/identificacao', methods=['POST'])
def salvar_identificacao(id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        UPDATE pacientes SET
            nome_completo = ?, cartao_sus = ?, cpf = ?, data_nascimento = ?,
            estado_civil = ?, municipio = ?, raca_cor = ?, celular = ?,
            escolaridade = ?, possui_comorbidade = ?, qual_comorbidade = ?,
            renda_mensal = ?, componentes_familia = ?, renec_cartao_cria = ?,
            cep = ?, municipio_endereco = ?, bairro = ?, logradouro = ?,
            numero = ?, complemento = ?, menor_idade = ?, parentesco = ?,
            cpf_responsavel = ?, nome_mae = ?, status = ?, updated_at = ?
        WHERE id = ?
    ''', (
        data.get('nome_completo'), data.get('cartao_sus'), data.get('cpf'),
        data.get('data_nascimento'), data.get('estado_civil'), data.get('municipio'),
        data.get('raca_cor'), data.get('celular'), data.get('escolaridade'),
        data.get('possui_comorbidade'), data.get('qual_comorbidade'),
        data.get('renda_mensal'), data.get('componentes_familia'),
        data.get('renec_cartao_cria'), data.get('cep'), data.get('municipio_endereco'),
        data.get('bairro'), data.get('logradouro'), data.get('numero'),
        data.get('complemento'), data.get('menor_idade'), data.get('parentesco'),
        data.get('cpf_responsavel'), data.get('nome_mae'), 'em_andamento',
        datetime.now().isoformat(), id
    ))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Dados salvos com sucesso'})

@app.route('/api/pacientes/<int:id>/dados-ginecologicos', methods=['GET', 'POST'])
def dados_ginecologicos(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM dados_ginecologicos WHERE paciente_id = ?', (id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return jsonify(dict(row))
        return jsonify({})

    elif request.method == 'POST':
        data = request.json

        cursor.execute('SELECT id FROM dados_ginecologicos WHERE paciente_id = ?', (id,))
        exists = cursor.fetchone()

        if exists:
            cursor.execute('''
                UPDATE dados_ginecologicos SET
                    paridade = ?, uso_contraceptivo = ?, qual_metodo_contraceptivo = ?,
                    citologia = ?, usb = ?, beta_hcg = ?, metodo_escolhido = ?,
                    elegivel_metodo = ?, elegivel_metodo_escolha = ?, data_consulta = ?
                WHERE paciente_id = ?
            ''', (
                data.get('paridade'), data.get('uso_contraceptivo'),
                data.get('qual_metodo_contraceptivo'), data.get('citologia'),
                data.get('usb'), data.get('beta_hcg'), data.get('metodo_escolhido'),
                data.get('elegivel_metodo'), data.get('elegivel_metodo_escolha'),
                data.get('data_consulta'), id
            ))
        else:
            cursor.execute('''
                INSERT INTO dados_ginecologicos (
                    paciente_id, paridade, uso_contraceptivo, qual_metodo_contraceptivo,
                    citologia, usb, beta_hcg, metodo_escolhido, elegivel_metodo,
                    elegivel_metodo_escolha, data_consulta
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                id, data.get('paridade'), data.get('uso_contraceptivo'),
                data.get('qual_metodo_contraceptivo'), data.get('citologia'),
                data.get('usb'), data.get('beta_hcg'), data.get('metodo_escolhido'),
                data.get('elegivel_metodo'), data.get('elegivel_metodo_escolha'),
                data.get('data_consulta')
            ))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Dados ginecológicos salvos com sucesso'})

@app.route('/api/pacientes/<int:id>/consultas', methods=['GET', 'POST'])
def consultas_paciente(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM consultas WHERE paciente_id = ? ORDER BY data_consulta DESC', (id,))
        rows = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    elif request.method == 'POST':
        data = request.json
        consultas = data.get('consultas', [])

        for consulta in consultas:
            cursor.execute('''
                INSERT INTO consultas (
                    paciente_id, data_consulta, houve_insercao,
                    houve_intercorrencia, qual_intercorrencia
                ) VALUES (?, ?, ?, ?, ?)
            ''', (
                id, consulta.get('data_consulta'), consulta.get('houve_insercao'),
                consulta.get('houve_intercorrencia'), consulta.get('qual_intercorrencia')
            ))

        conn.commit()
        conn.close()
        return jsonify({'message': 'Consultas registradas com sucesso'})

@app.route('/api/pacientes/<int:id>/finalizar', methods=['PATCH'])
def finalizar_paciente(id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        UPDATE pacientes SET status = ?, updated_at = ?
        WHERE id = ?
    ''', ('finalizado', datetime.now().isoformat(), id))

    conn.commit()
    conn.close()
    return jsonify({'message': 'Paciente finalizado com sucesso'})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Backend está funcionando'}), 200

@app.route('/api/capacitacao/dashboard', methods=['GET'])
def capacitacao_dashboard():
    conn = get_db()
    cursor = conn.cursor()

    # Total de instrutoras - busca EXCLUSIVAMENTE da tabela de capacitação
    cursor.execute("SELECT COUNT(*) as count FROM enfermeiras_instrutoras")
    total_instrutoras = cursor.fetchone()['count']

    # Total de alunas - busca EXCLUSIVAMENTE da tabela de capacitação
    cursor.execute("SELECT COUNT(*) as count FROM enfermeiras_alunas")
    total_alunas = cursor.fetchone()['count']

    # Total de DIUs inseridos APENAS do módulo Capacitação
    # Conta fichas com enfermeira_aluna_id (específico de capacitação)
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM fichas_atendimento_pdf
        WHERE metodo_inserido = 'DIU'
        AND enfermeira_aluna_id IS NOT NULL
    """)
    dius_fichas = cursor.fetchone()['count']

    # Conta inserções vinculadas a alunas ou instrutoras de capacitação
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM insercoes_diu
        WHERE (metodo_contraceptivo = 'DIU' OR tipo_diu != '')
        AND (enfermeira_aluna_id IS NOT NULL OR enfermeira_instrutora_id IS NOT NULL)
    """)
    dius_insercoes = cursor.fetchone()['count']

    # Conta atendimentos registrados com método escolhido = DIU
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM dados_ginecologicos_capacitacao
        WHERE metodo_escolhido = 'DIU'
        AND enfermeira_aluna_id IS NOT NULL
    """)
    dius_atendimentos = cursor.fetchone()['count']

    total_dius = dius_fichas + dius_insercoes + dius_atendimentos

    # Total de Implanons inseridos APENAS do módulo Capacitação
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM fichas_atendimento_pdf
        WHERE metodo_inserido = 'Implanon'
        AND enfermeira_aluna_id IS NOT NULL
    """)
    implanons_fichas = cursor.fetchone()['count']

    cursor.execute("""
        SELECT COUNT(*) as count
        FROM insercoes_diu
        WHERE metodo_contraceptivo = 'Implanon'
        AND (enfermeira_aluna_id IS NOT NULL OR enfermeira_instrutora_id IS NOT NULL)
    """)
    implanons_insercoes = cursor.fetchone()['count']

    # Conta atendimentos registrados com método escolhido = Implanon
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM dados_ginecologicos_capacitacao
        WHERE metodo_escolhido = 'Implanon'
        AND enfermeira_aluna_id IS NOT NULL
    """)
    implanons_atendimentos = cursor.fetchone()['count']

    total_implanons = implanons_fichas + implanons_insercoes + implanons_atendimentos

    # Total de pacientes com inserção APENAS do módulo Capacitação
    # Conta apenas fichas vinculadas a enfermeiras alunas
    cursor.execute("""
        SELECT COUNT(DISTINCT cpf_paciente) as count
        FROM fichas_atendimento_pdf
        WHERE cpf_paciente IS NOT NULL
        AND cpf_paciente != ''
        AND enfermeira_aluna_id IS NOT NULL
    """)
    pacientes_fichas = cursor.fetchone()['count']

    # Conta apenas inserções vinculadas a capacitação
    cursor.execute("""
        SELECT COUNT(DISTINCT paciente_id) as count
        FROM insercoes_diu
        WHERE paciente_id IS NOT NULL
        AND (enfermeira_aluna_id IS NOT NULL OR enfermeira_instrutora_id IS NOT NULL)
    """)
    pacientes_insercoes = cursor.fetchone()['count']

    # Conta pacientes que tiveram atendimentos registrados com método escolhido
    cursor.execute("""
        SELECT COUNT(DISTINCT paciente_id) as count
        FROM dados_ginecologicos_capacitacao
        WHERE metodo_escolhido IN ('DIU', 'Implanon')
        AND enfermeira_aluna_id IS NOT NULL
    """)
    pacientes_atendimentos = cursor.fetchone()['count']

    total_pacientes = pacientes_fichas + pacientes_insercoes + pacientes_atendimentos

    # Total de agendamentos
    cursor.execute('SELECT COUNT(*) as count FROM agendamentos_municipios')
    total_agendamentos = cursor.fetchone()['count']

    # Dados por município: consolida fichas_atendimento_pdf + dados_ginecologicos_capacitacao + insercoes_diu
    cursor.execute('''
        SELECT
            ea.municipio,
            COUNT(DISTINCT CASE
                WHEN (
                    COALESCE(fichas.ficha_count, 0) +
                    COALESCE(atend.atend_count, 0) +
                    COALESCE(ins.insercao_count, 0)
                ) >= 10 THEN ea.id
            END) as profissionais_capacitados,
            SUM(
                COALESCE(fichas.ficha_count, 0) +
                COALESCE(atend.atend_count, 0) +
                COALESCE(ins.insercao_count, 0)
            ) as total_insercoes
        FROM enfermeiras_alunas ea
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as ficha_count
            FROM fichas_atendimento_pdf
            WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) fichas ON ea.id = fichas.enfermeira_aluna_id
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as atend_count
            FROM dados_ginecologicos_capacitacao
            WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) atend ON ea.id = atend.enfermeira_aluna_id
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as insercao_count
            FROM insercoes_diu
            WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) ins ON ea.id = ins.enfermeira_aluna_id
        WHERE ea.municipio IS NOT NULL AND ea.municipio != ''
        GROUP BY ea.municipio
        HAVING total_insercoes > 0
    ''')

    municipios = []
    for row in cursor.fetchall():
        municipio_nome = row['municipio']

        # Contar DIUs para este município
        cursor.execute('''
            SELECT COUNT(*) as count
            FROM fichas_atendimento_pdf fap
            JOIN enfermeiras_alunas ea ON fap.enfermeira_aluna_id = ea.id
            WHERE ea.municipio = ? AND fap.metodo_inserido = 'DIU'
        ''', (municipio_nome,))
        dius_fichas = cursor.fetchone()['count']

        cursor.execute('''
            SELECT COUNT(*) as count
            FROM insercoes_diu id
            JOIN enfermeiras_alunas ea ON id.enfermeira_aluna_id = ea.id
            WHERE ea.municipio = ? AND (id.metodo_contraceptivo = 'DIU' OR id.tipo_diu != '')
        ''', (municipio_nome,))
        dius_insercoes = cursor.fetchone()['count']

        cursor.execute('''
            SELECT COUNT(*) as count
            FROM dados_ginecologicos_capacitacao dgc
            JOIN enfermeiras_alunas ea ON dgc.enfermeira_aluna_id = ea.id
            WHERE ea.municipio = ? AND dgc.metodo_escolhido = 'DIU'
        ''', (municipio_nome,))
        dius_atendimentos = cursor.fetchone()['count']

        total_dius_municipio = dius_fichas + dius_insercoes + dius_atendimentos

        # Contar Implanons para este município
        cursor.execute('''
            SELECT COUNT(*) as count
            FROM fichas_atendimento_pdf fap
            JOIN enfermeiras_alunas ea ON fap.enfermeira_aluna_id = ea.id
            WHERE ea.municipio = ? AND fap.metodo_inserido = 'Implanon'
        ''', (municipio_nome,))
        implanons_fichas = cursor.fetchone()['count']

        cursor.execute('''
            SELECT COUNT(*) as count
            FROM insercoes_diu id
            JOIN enfermeiras_alunas ea ON id.enfermeira_aluna_id = ea.id
            WHERE ea.municipio = ? AND id.metodo_contraceptivo = 'Implanon'
        ''', (municipio_nome,))
        implanons_insercoes = cursor.fetchone()['count']

        cursor.execute('''
            SELECT COUNT(*) as count
            FROM dados_ginecologicos_capacitacao dgc
            JOIN enfermeiras_alunas ea ON dgc.enfermeira_aluna_id = ea.id
            WHERE ea.municipio = ? AND dgc.metodo_escolhido = 'Implanon'
        ''', (municipio_nome,))
        implanons_atendimentos = cursor.fetchone()['count']

        total_implanons_municipio = implanons_fichas + implanons_insercoes + implanons_atendimentos

        municipios.append({
            'nome': row['municipio'],
            'profissionais_capacitados': row['profissionais_capacitados'],
            'insercoes': row['total_insercoes'],
            'diu_inseridos': total_dius_municipio,
            'implanon_inseridos': total_implanons_municipio
        })

    conn.close()

    return jsonify({
        'instrutores': total_instrutoras,
        'alunos': total_alunas,
        'diu_inseridos': total_dius,
        'implanon_inseridos': total_implanons,
        'pacientes_com_insercao': total_pacientes,
        'agendamentos': total_agendamentos,
        'municipios': municipios
    })

@app.route('/api/capacitacao/mapa/dados', methods=['GET'])
def mapa_capacitacao_dados():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT
            ea.municipio,
            COUNT(DISTINCT CASE
                WHEN (
                    COALESCE(fichas.ficha_count, 0) +
                    COALESCE(atend.atend_count, 0) +
                    COALESCE(ins.insercao_count, 0)
                ) >= 10 THEN ea.id
            END) as profissionais_capacitados,
            SUM(
                COALESCE(fichas.ficha_count, 0) +
                COALESCE(atend.atend_count, 0) +
                COALESCE(ins.insercao_count, 0)
            ) as insercoes_realizadas
        FROM enfermeiras_alunas ea
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as ficha_count
            FROM fichas_atendimento_pdf WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) fichas ON ea.id = fichas.enfermeira_aluna_id
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as atend_count
            FROM dados_ginecologicos_capacitacao WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) atend ON ea.id = atend.enfermeira_aluna_id
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as insercao_count
            FROM insercoes_diu WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) ins ON ea.id = ins.enfermeira_aluna_id
        WHERE ea.municipio IS NOT NULL AND ea.municipio != ''
        GROUP BY ea.municipio
        HAVING insercoes_realizadas > 0
    ''')

    dados_municipios = {}
    for row in cursor.fetchall():
        municipio_nome = row['municipio'].lower().replace(' ', '-')
        # Remove acentos para normalizar
        municipio_nome = municipio_nome.replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
        municipio_nome = municipio_nome.replace('â', 'a').replace('ê', 'e').replace('ô', 'o')
        municipio_nome = municipio_nome.replace('ã', 'a').replace('õ', 'o')
        municipio_nome = municipio_nome.replace('ç', 'c')

        dados_municipios[municipio_nome] = {
            'nome': row['municipio'],
            'profissionais_capacitados': row['profissionais_capacitados'],
            'insercoes_realizadas': row['insercoes_realizadas']
        }

    conn.close()
    return jsonify(dados_municipios)

@app.route('/api/capacitacao/mapa-municipios', methods=['GET'])
def mapa_municipios():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT
            ea.municipio,
            COUNT(DISTINCT CASE
                WHEN (
                    COALESCE(fichas.ficha_count, 0) +
                    COALESCE(atend.atend_count, 0) +
                    COALESCE(ins.insercao_count, 0)
                ) >= 10 THEN ea.id
            END) as profissionais_capacitados,
            SUM(
                COALESCE(fichas.ficha_count, 0) +
                COALESCE(atend.atend_count, 0) +
                COALESCE(ins.insercao_count, 0)
            ) as insercoes_realizadas
        FROM enfermeiras_alunas ea
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as ficha_count
            FROM fichas_atendimento_pdf WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) fichas ON ea.id = fichas.enfermeira_aluna_id
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as atend_count
            FROM dados_ginecologicos_capacitacao WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) atend ON ea.id = atend.enfermeira_aluna_id
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as insercao_count
            FROM insercoes_diu WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) ins ON ea.id = ins.enfermeira_aluna_id
        WHERE ea.municipio IS NOT NULL AND ea.municipio != ''
        GROUP BY ea.municipio
        HAVING insercoes_realizadas > 0
    ''')

    municipios = []
    for row in cursor.fetchall():
        municipios.append({
            'municipio': row['municipio'],
            'capacitados': row['profissionais_capacitados'],
            'insercoes': row['insercoes_realizadas']
        })

    conn.close()
    return jsonify(municipios)

@app.route('/api/capacitacao/stats/municipio/<municipio>', methods=['GET'])
def capacitacao_stats_municipio(municipio):
    conn = get_db()
    cursor = conn.cursor()

    # Normalizar nome do município (capitalizar corretamente)
    municipio_normalizado = municipio.replace('-', ' ').title()

    # Total de agendamentos para o município
    cursor.execute('SELECT COUNT(*) as count FROM agendamentos_municipios WHERE municipio = ?', (municipio_normalizado,))
    agendamentos = cursor.fetchone()['count']

    # Total de enfermeiras alunas do município - busca EXCLUSIVAMENTE da tabela de capacitação
    cursor.execute("SELECT COUNT(*) as count FROM enfermeiras_alunas WHERE municipio = ?", (municipio_normalizado,))
    alunas = cursor.fetchone()['count']

    # Total de profissionais capacitados (alunas que completaram 10 fichas)
    cursor.execute('''
        SELECT COUNT(DISTINCT ea.id) as count
        FROM enfermeiras_alunas ea
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as ficha_count
            FROM fichas_atendimento_pdf
            GROUP BY enfermeira_aluna_id
        ) fichas ON ea.id = fichas.enfermeira_aluna_id
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as atend_count
            FROM dados_ginecologicos_capacitacao
            WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) atend ON ea.id = atend.enfermeira_aluna_id
        LEFT JOIN (
            SELECT enfermeira_aluna_id, COUNT(*) as insercao_count
            FROM insercoes_diu
            WHERE enfermeira_aluna_id IS NOT NULL
            GROUP BY enfermeira_aluna_id
        ) ins ON ea.id = ins.enfermeira_aluna_id
        WHERE ea.municipio = ?
        AND (
            COALESCE(fichas.ficha_count, 0) +
            COALESCE(atend.atend_count, 0) +
            COALESCE(ins.insercao_count, 0)
        ) >= 10
    ''', (municipio_normalizado,))
    result = cursor.fetchone()
    profissionais_capacitados = result['count'] if result else 0

    # Total de inserções DIU do município (fichas + insercoes_diu + atendimentos)
    cursor.execute('''
        SELECT COUNT(*) as count
        FROM fichas_atendimento_pdf fap
        JOIN enfermeiras_alunas ea ON fap.enfermeira_aluna_id = ea.id
        WHERE ea.municipio = ? AND fap.metodo_inserido = 'DIU'
    ''', (municipio_normalizado,))
    dius_fichas = cursor.fetchone()['count']

    cursor.execute('''
        SELECT COUNT(*) as count
        FROM insercoes_diu id
        JOIN enfermeiras_alunas ea ON id.enfermeira_aluna_id = ea.id
        WHERE ea.municipio = ? AND (id.metodo_contraceptivo = 'DIU' OR id.tipo_diu != '')
    ''', (municipio_normalizado,))
    dius_insercoes = cursor.fetchone()['count']

    cursor.execute('''
        SELECT COUNT(*) as count
        FROM dados_ginecologicos_capacitacao dgc
        JOIN enfermeiras_alunas ea ON dgc.enfermeira_aluna_id = ea.id
        WHERE ea.municipio = ? AND dgc.metodo_escolhido = 'DIU'
    ''', (municipio_normalizado,))
    dius_atendimentos = cursor.fetchone()['count']

    dius = dius_fichas + dius_insercoes + dius_atendimentos

    # Total de inserções Implanon do município (fichas + insercoes_diu + atendimentos)
    cursor.execute('''
        SELECT COUNT(*) as count
        FROM fichas_atendimento_pdf fap
        JOIN enfermeiras_alunas ea ON fap.enfermeira_aluna_id = ea.id
        WHERE ea.municipio = ? AND fap.metodo_inserido = 'Implanon'
    ''', (municipio_normalizado,))
    implanons_fichas = cursor.fetchone()['count']

    cursor.execute('''
        SELECT COUNT(*) as count
        FROM insercoes_diu id
        JOIN enfermeiras_alunas ea ON id.enfermeira_aluna_id = ea.id
        WHERE ea.municipio = ? AND id.metodo_contraceptivo = 'Implanon'
    ''', (municipio_normalizado,))
    implanons_insercoes = cursor.fetchone()['count']

    cursor.execute('''
        SELECT COUNT(*) as count
        FROM dados_ginecologicos_capacitacao dgc
        JOIN enfermeiras_alunas ea ON dgc.enfermeira_aluna_id = ea.id
        WHERE ea.municipio = ? AND dgc.metodo_escolhido = 'Implanon'
    ''', (municipio_normalizado,))
    implanons_atendimentos = cursor.fetchone()['count']

    implanons = implanons_fichas + implanons_insercoes + implanons_atendimentos

    # Total de pacientes com inserção do município (fichas + insercoes_diu + atendimentos)
    cursor.execute('''
        SELECT COUNT(DISTINCT fap.cpf_paciente) as count
        FROM fichas_atendimento_pdf fap
        JOIN enfermeiras_alunas ea ON fap.enfermeira_aluna_id = ea.id
        WHERE ea.municipio = ? AND fap.cpf_paciente IS NOT NULL AND fap.cpf_paciente != ''
    ''', (municipio_normalizado,))
    pacientes_fichas = cursor.fetchone()['count']

    cursor.execute('''
        SELECT COUNT(DISTINCT id.paciente_id) as count
        FROM insercoes_diu id
        JOIN enfermeiras_alunas ea ON id.enfermeira_aluna_id = ea.id
        WHERE ea.municipio = ? AND id.paciente_id IS NOT NULL
    ''', (municipio_normalizado,))
    pacientes_insercoes = cursor.fetchone()['count']

    cursor.execute('''
        SELECT COUNT(DISTINCT dgc.paciente_id) as count
        FROM dados_ginecologicos_capacitacao dgc
        JOIN enfermeiras_alunas ea ON dgc.enfermeira_aluna_id = ea.id
        WHERE ea.municipio = ? AND dgc.metodo_escolhido IN ('DIU', 'Implanon')
    ''', (municipio_normalizado,))
    pacientes_atendimentos = cursor.fetchone()['count']

    pacientes_com_insercao = pacientes_fichas + pacientes_insercoes + pacientes_atendimentos

    conn.close()

    return jsonify({
        'totalAgendamentos': agendamentos,
        'totalAlunas': alunas,
        'totalProfissionaisCapacitados': profissionais_capacitados,
        'totalDius': dius,
        'totalImplanons': implanons,
        'totalPacientesComInsercao': pacientes_com_insercao
    })

@app.route('/api/capacitacao/stats', methods=['GET'])
def capacitacao_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) as count FROM agendamentos_municipios')
    agendamentos = cursor.fetchone()['count']

    cursor.execute('SELECT COUNT(*) as count FROM enfermeiras_instrutoras')
    instrutoras = cursor.fetchone()['count']

    cursor.execute('SELECT COUNT(*) as count FROM enfermeiras_alunas')
    alunas = cursor.fetchone()['count']

    # Total de DIUs inseridos APENAS do módulo Capacitação
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM insercoes_diu
        WHERE (metodo_contraceptivo = 'DIU' OR tipo_diu != '')
        AND (enfermeira_aluna_id IS NOT NULL OR enfermeira_instrutora_id IS NOT NULL)
    """)
    dius_insercoes = cursor.fetchone()['count']

    # Total de Implanons inseridos APENAS do módulo Capacitação
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM insercoes_diu
        WHERE metodo_contraceptivo = 'Implanon'
        AND (enfermeira_aluna_id IS NOT NULL OR enfermeira_instrutora_id IS NOT NULL)
    """)
    implanons_insercoes = cursor.fetchone()['count']

    # Fichas apenas com enfermeira_aluna_id (específico de capacitação)
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM fichas_atendimento_pdf
        WHERE metodo_inserido = 'DIU'
        AND enfermeira_aluna_id IS NOT NULL
    """)
    dius_fichas = cursor.fetchone()['count']

    cursor.execute("""
        SELECT COUNT(*) as count
        FROM fichas_atendimento_pdf
        WHERE metodo_inserido = 'Implanon'
        AND enfermeira_aluna_id IS NOT NULL
    """)
    implanons_fichas = cursor.fetchone()['count']

    # Pacientes com inserção APENAS do módulo Capacitação
    # Conta pacientes de consultas_capacitacao + fichas + insercoes_diu vinculadas a capacitação
    cursor.execute("SELECT COUNT(DISTINCT paciente_id) as count FROM consultas_capacitacao WHERE houve_insercao = 'Sim'")
    pacientes_consultas = cursor.fetchone()['count']

    cursor.execute("""
        SELECT COUNT(DISTINCT cpf_paciente) as count
        FROM fichas_atendimento_pdf
        WHERE cpf_paciente IS NOT NULL AND cpf_paciente != ''
        AND enfermeira_aluna_id IS NOT NULL
    """)
    pacientes_fichas = cursor.fetchone()['count']

    cursor.execute("""
        SELECT COUNT(DISTINCT paciente_id) as count
        FROM insercoes_diu
        WHERE paciente_id IS NOT NULL
        AND (enfermeira_aluna_id IS NOT NULL OR enfermeira_instrutora_id IS NOT NULL)
    """)
    pacientes_insercoes = cursor.fetchone()['count']

    total_pacientes = pacientes_consultas + pacientes_fichas + pacientes_insercoes

    conn.close()

    return jsonify({
        'totalAgendamentos': agendamentos,
        'totalInstrutoras': instrutoras,
        'totalAlunas': alunas,
        'totalDius': dius_insercoes + dius_fichas,
        'totalImplanons': implanons_insercoes + implanons_fichas,
        'totalPacientesComInsercao': total_pacientes
    })

@app.route('/api/capacitacao/agendamentos', methods=['GET', 'POST'])
def agendamentos():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM agendamentos_municipios ORDER BY data_agendamento DESC')
        rows = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    elif request.method == 'POST':
        data = request.json
        cursor.execute('''
            INSERT INTO agendamentos_municipios (
                municipio, data_agendamento, plano_governanca, status, observacoes
            ) VALUES (?, ?, ?, ?, ?)
        ''', (
            data.get('municipio'),
            data.get('data_agendamento'),
            1 if data.get('plano_governanca') else 0,
            data.get('status', 'agendado'),
            data.get('observacoes', '')
        ))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Agendamento criado com sucesso'}), 201

@app.route('/api/capacitacao/agendamentos/<int:agendamento_id>', methods=['GET', 'PUT', 'DELETE'])
def agendamento_detail(agendamento_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM agendamentos_municipios WHERE id = ?', (agendamento_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return jsonify(dict(row))
        return jsonify({'error': 'Agendamento não encontrado'}), 404

    elif request.method == 'PUT':
        data = request.json
        cursor.execute('''
            UPDATE agendamentos_municipios
            SET municipio = ?, data_agendamento = ?, plano_governanca = ?, status = ?, observacoes = ?
            WHERE id = ?
        ''', (
            data.get('municipio'),
            data.get('data_agendamento'),
            1 if data.get('plano_governanca') else 0,
            data.get('status'),
            data.get('observacoes', ''),
            agendamento_id
        ))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Agendamento atualizado com sucesso'})

    elif request.method == 'DELETE':
        cursor.execute('SELECT status FROM agendamentos_municipios WHERE id = ?', (agendamento_id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({'error': 'Agendamento não encontrado'}), 404

        if row['status'] == 'realizado':
            conn.close()
            return jsonify({'error': 'Agendamentos realizados não podem ser excluídos'}), 403

        cursor.execute('DELETE FROM agendamentos_municipios WHERE id = ?', (agendamento_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Agendamento excluído com sucesso'})

@app.route('/api/capacitacao/notificacoes', methods=['GET'])
def get_notificacoes():
    conn = get_db()
    cursor = conn.cursor()

    from datetime import datetime, timedelta

    hoje = datetime.now().date()

    # Limiares progressivos: notificação gerada quando dias_restantes cai dentro da janela de cada limiar.
    # A deduplicação usa o campo "marco" (14, 7, 2 ou 1) para garantir que cada aviso seja gerado
    # apenas uma vez por agendamento, mesmo que o sistema não seja consultado exatamente no dia certo.
    MARCOS = [
        (14, 'Agendamento em 14 dias',  'info14'),
        (7,  'Agendamento em 7 dias',   'info'),
        (2,  'Agendamento em 2 dias',   'warning'),
        (1,  'Agendamento amanhã',      'urgent'),
    ]

    cursor.execute('''
        SELECT id, municipio, data_agendamento, status
        FROM agendamentos_municipios
        WHERE status IN ('agendado', 'confirmado')
    ''')
    agendamentos = cursor.fetchall()

    for agendamento in agendamentos:
        agendamento_id = agendamento['id']
        municipio = agendamento['municipio']
        data_agendamento_str = agendamento['data_agendamento']

        try:
            data_agendamento = datetime.strptime(data_agendamento_str, '%Y-%m-%d').date()
        except Exception:
            continue

        dias_restantes = (data_agendamento - hoje).days

        # Só gera notificações para agendamentos futuros (>= 0 significa hoje ou amanhã)
        if dias_restantes < 0:
            continue

        for limiar, titulo, tipo in MARCOS:
            # A janela deste marco começa quando dias_restantes <= limiar
            # e termina quando o próximo marco menor ainda não foi alcançado.
            # Isso garante que a notificação será criada mesmo que o sistema
            # não seja consultado exatamente no dia do limiar.
            if dias_restantes <= limiar:
                cursor.execute('''
                    SELECT id FROM notificacoes
                    WHERE agendamento_id = ? AND tipo = ?
                ''', (agendamento_id, tipo))

                if not cursor.fetchone():
                    mensagem = f'O agendamento em {municipio} está marcado para {data_agendamento.strftime("%d/%m/%Y")} — faltam {dias_restantes} dia{"s" if dias_restantes != 1 else ""}.'

                    cursor.execute('''
                        INSERT INTO notificacoes
                        (tipo, titulo, mensagem, agendamento_id, dias_restantes, lida)
                        VALUES (?, ?, ?, ?, ?, 0)
                    ''', (tipo, titulo, mensagem, agendamento_id, dias_restantes))

    conn.commit()

    # Retorna notificações de agendamentos ainda não realizados/passados,
    # incluindo as já lidas para histórico, mas filtrando agendamentos passados.
    cursor.execute('''
        SELECT n.*, a.municipio, a.data_agendamento
        FROM notificacoes n
        LEFT JOIN agendamentos_municipios a ON n.agendamento_id = a.id
        WHERE a.data_agendamento IS NULL
           OR a.data_agendamento >= date('now')
           OR n.lida = 0
        ORDER BY
            CASE WHEN n.lida = 0 THEN 0 ELSE 1 END,
            n.created_at DESC
    ''')
    notificacoes = cursor.fetchall()

    conn.close()

    result = []
    for notif in notificacoes:
        result.append({
            'id': notif['id'],
            'tipo': notif['tipo'],
            'titulo': notif['titulo'],
            'mensagem': notif['mensagem'],
            'agendamento_id': notif['agendamento_id'],
            'dias_restantes': notif['dias_restantes'],
            'lida': notif['lida'] == 1,
            'created_at': notif['created_at'],
            'municipio': notif['municipio'],
            'data_agendamento': notif['data_agendamento']
        })

    return jsonify(result)

@app.route('/api/capacitacao/notificacoes/nao-lidas/count', methods=['GET'])
def get_notificacoes_count():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) as count FROM notificacoes WHERE lida = 0')
    result = cursor.fetchone()
    conn.close()

    return jsonify({'count': result['count']})

@app.route('/api/capacitacao/notificacoes/<int:notificacao_id>/marcar-lida', methods=['PATCH'])
def marcar_notificacao_lida(notificacao_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('UPDATE notificacoes SET lida = 1 WHERE id = ?', (notificacao_id,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Notificação marcada como lida'})

@app.route('/api/capacitacao/notificacoes/marcar-todas-lidas', methods=['PATCH'])
def marcar_todas_lidas():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('UPDATE notificacoes SET lida = 1')
    conn.commit()
    conn.close()

    return jsonify({'message': 'Todas as notificações foram marcadas como lidas'})

@app.route('/api/capacitacao/enfermeiras-instrutoras/validar', methods=['POST'])
def validar_instrutora_capacitacao():
    conn = get_db()
    cursor = conn.cursor()
    data = request.json

    cpf = data.get('cpf')
    email = data.get('email')
    coren = data.get('coren')
    instrutora_id = data.get('id')

    errors = []

    if cpf:
        query = 'SELECT id FROM enfermeiras_instrutoras WHERE cpf = ?'
        params = [cpf]
        if instrutora_id:
            query += ' AND id != ?'
            params.append(instrutora_id)
        cursor.execute(query, params)
        if cursor.fetchone():
            errors.append('CPF já cadastrado em Capacitação')

        cursor.execute('SELECT id FROM enfermeiras_instrutoras_ambulatorial WHERE cpf = ?', (cpf,))
        if cursor.fetchone():
            errors.append('CPF já cadastrado em Ambulatorial')

    if email:
        query = 'SELECT id FROM enfermeiras_instrutoras WHERE email = ?'
        params = [email]
        if instrutora_id:
            query += ' AND id != ?'
            params.append(instrutora_id)
        cursor.execute(query, params)
        if cursor.fetchone():
            errors.append('E-mail já cadastrado em Capacitação')

        cursor.execute('SELECT id FROM enfermeiras_instrutoras_ambulatorial WHERE email = ?', (email,))
        if cursor.fetchone():
            errors.append('E-mail já cadastrado em Ambulatorial')

    if coren:
        query = 'SELECT id FROM enfermeiras_instrutoras WHERE coren = ?'
        params = [coren]
        if instrutora_id:
            query += ' AND id != ?'
            params.append(instrutora_id)
        cursor.execute(query, params)
        if cursor.fetchone():
            errors.append('COREN já cadastrado em Capacitação')

        cursor.execute('SELECT id FROM enfermeiras_instrutoras_ambulatorial WHERE numero_registro = ?', (coren,))
        if cursor.fetchone():
            errors.append('COREN já cadastrado em Ambulatorial')

    conn.close()

    if errors:
        return jsonify({'valid': False, 'errors': errors}), 400
    return jsonify({'valid': True}), 200

@app.route('/api/capacitacao/enfermeiras-instrutoras', methods=['GET', 'POST'])
def enfermeiras_instrutoras():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM enfermeiras_instrutoras ORDER BY nome')
        rows = cursor.fetchall()
        instrutoras = []

        for row in rows:
            instrutora = dict(row)

            if 'diploma_content' in instrutora:
                instrutora['tem_diploma'] = instrutora['diploma_content'] is not None
                del instrutora['diploma_content']

            if 'senha_hash' in instrutora:
                del instrutora['senha_hash']

            cursor.execute('SELECT COUNT(*) as count FROM insercoes_diu WHERE enfermeira_instrutora_id = ?', (instrutora['id'],))
            count_row = cursor.fetchone()
            instrutora['total_dius'] = count_row['count'] if count_row else 0
            instrutoras.append(instrutora)

        conn.close()
        return jsonify(instrutoras)

    elif request.method == 'POST':
        data = request.json
        try:
            import base64

            senha = data.get('senha', '')
            senha_hash = hashlib.sha256(senha.encode()).hexdigest() if senha else None

            diploma_content = None
            diploma_filename = None
            if data.get('diploma_content'):
                diploma_content = decode_base64_safe(data.get('diploma_content'))
                diploma_filename = data.get('diploma_filename', 'diploma.pdf')

            cursor.execute('''
                INSERT INTO enfermeiras_instrutoras (
                    nome, cpf, coren, telefone, email, especialidade, unidade_saude,
                    cep, logradouro, municipio, bairro, numero, complemento,
                    senha_hash, diploma_filename, diploma_content
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('nome'),
                data.get('cpf'),
                data.get('coren', ''),
                data.get('telefone', ''),
                data.get('email', ''),
                data.get('especialidade', ''),
                data.get('unidade_saude', ''),
                data.get('cep', ''),
                data.get('logradouro', ''),
                data.get('municipio', ''),
                data.get('bairro', ''),
                data.get('numero', ''),
                data.get('complemento', ''),
                senha_hash,
                diploma_filename,
                diploma_content
            ))
            instrutora_id = cursor.lastrowid

            conn.commit()
            conn.close()
            return jsonify({'message': 'Instrutora cadastrada com sucesso'}), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'CPF já cadastrado'}), 400

@app.route('/api/capacitacao/enfermeiras-instrutoras/<int:id>/diploma', methods=['GET'])
def download_diploma_instrutora(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT diploma_filename, diploma_content FROM enfermeiras_instrutoras WHERE id = ?', (id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row['diploma_content']:
        return jsonify({'error': 'Diploma não encontrado'}), 404

    from flask import send_file
    import io

    return send_file(
        io.BytesIO(row['diploma_content']),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=row['diploma_filename'] or 'diploma.pdf'
    )

@app.route('/api/capacitacao/enfermeiras-alunas', methods=['GET', 'POST'])
def enfermeiras_alunas():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT
                ea.*,
                ei.nome as instrutora_nome
            FROM enfermeiras_alunas ea
            LEFT JOIN enfermeiras_instrutoras ei ON ea.enfermeira_instrutora_id = ei.id
            ORDER BY ea.nome
        ''')
        rows = cursor.fetchall()
        alunas = []

        for row in rows:
            aluna = dict(row)

            if 'certificado_content' in aluna:
                aluna['tem_certificado'] = aluna['certificado_content'] is not None
                del aluna['certificado_content']

            cursor.execute('SELECT COUNT(*) as count FROM fichas_atendimento_pdf WHERE enfermeira_aluna_id = ?', (aluna['id'],))
            count_row = cursor.fetchone()
            total_fichas = count_row['count'] if count_row else 0
            aluna['total_fichas'] = total_fichas
            aluna['progresso'] = min(int((total_fichas / 10) * 100), 100)
            aluna['status'] = 'Concluído' if total_fichas >= 10 else 'Incompleto'
            alunas.append(aluna)

        conn.close()
        return jsonify(alunas)

    elif request.method == 'POST':
        data = request.json
        try:
            import base64

            certificado_content = None
            certificado_filename = None
            if data.get('certificado_content'):
                certificado_content = decode_base64_safe(data.get('certificado_content'))
                certificado_filename = data.get('certificado_filename', 'certificado.pdf')

            cursor.execute('''
                INSERT INTO enfermeiras_alunas (
                    nome, cpf, coren, telefone, email, municipio,
                    cep, logradouro, bairro, numero, complemento,
                    enfermeira_instrutora_id, certificado_filename, certificado_content
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('nome'),
                data.get('cpf'),
                data.get('coren', ''),
                data.get('telefone', ''),
                data.get('email', ''),
                data.get('municipio', ''),
                data.get('cep', ''),
                data.get('logradouro', ''),
                data.get('bairro', ''),
                data.get('numero', ''),
                data.get('complemento', ''),
                data.get('enfermeira_instrutora_id') or None,
                certificado_filename,
                certificado_content
            ))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Aluno(a) cadastrado(a) com sucesso'}), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'CPF já cadastrado'}), 400

@app.route('/api/capacitacao/enfermeiras-alunas/<int:id>/certificado', methods=['GET'])
def download_certificado_aluna(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT certificado_filename, certificado_content FROM enfermeiras_alunas WHERE id = ?', (id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row['certificado_content']:
        return jsonify({'error': 'Certificado não encontrado'}), 404

    from flask import send_file
    import io

    return send_file(
        io.BytesIO(row['certificado_content']),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=row['certificado_filename'] or 'certificado.pdf'
    )

@app.route('/api/capacitacao/pacientes', methods=['GET', 'POST'])
def pacientes_capacitacao():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM pacientes_capacitacao ORDER BY created_at DESC')
        rows = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    elif request.method == 'POST':
        cursor.execute('INSERT INTO pacientes_capacitacao (status) VALUES (?)', ('rascunho',))
        paciente_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({'id': paciente_id, 'status': 'rascunho'}), 201

@app.route('/api/capacitacao/pacientes/<int:id>', methods=['GET', 'PATCH'])
def paciente_capacitacao_detail(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM pacientes_capacitacao WHERE id = ?', (id,))
        paciente = cursor.fetchone()

        if not paciente:
            conn.close()
            return jsonify({'error': 'Paciente não encontrado'}), 404

        cursor.execute('''
            SELECT
                dgc.*,
                ea.nome as enfermeira_aluna_nome
            FROM dados_ginecologicos_capacitacao dgc
            LEFT JOIN enfermeiras_alunas ea ON dgc.enfermeira_aluna_id = ea.id
            WHERE dgc.paciente_id = ?
        ''', (id,))
        dados_gine = cursor.fetchone()

        cursor.execute('SELECT * FROM consultas_capacitacao WHERE paciente_id = ? ORDER BY data_consulta DESC', (id,))
        consultas = cursor.fetchall()

        cursor.execute('''
            SELECT
                id.*,
                ei.nome as instrutora_nome,
                ea.nome as aluna_nome
            FROM insercoes_diu id
            LEFT JOIN enfermeiras_instrutoras ei ON id.enfermeira_instrutora_id = ei.id
            LEFT JOIN enfermeiras_alunas ea ON id.enfermeira_aluna_id = ea.id
            WHERE id.paciente_id = ?
            ORDER BY id.data_insercao DESC
        ''', (id,))
        insercoes = cursor.fetchall()

        conn.close()

        result = dict(paciente)
        result['dados_ginecologicos'] = dict(dados_gine) if dados_gine else None
        result['consultas'] = [dict(c) for c in consultas]
        result['insercoes'] = [dict(i) for i in insercoes]

        return jsonify(result)

    elif request.method == 'PATCH':
        try:
            data = request.json
            print(f"Recebendo PATCH para paciente ID: {id}")
            print(f"Dados recebidos: {data}")

            # Verificar duplicidade de CPF antes de atualizar
            cpf_patch = (data.get('cpf') or '').replace('.', '').replace('-', '').strip()
            if cpf_patch:
                cursor.execute(
                    'SELECT id FROM pacientes_capacitacao WHERE REPLACE(REPLACE(cpf, ".", ""), "-", "") = ? AND id != ?',
                    (cpf_patch, id)
                )
                if cursor.fetchone():
                    conn.close()
                    return jsonify({'error': 'Já existe uma paciente cadastrada com este CPF.'}), 409

            valid_columns = [
                'nome_completo', 'cartao_sus', 'cpf', 'data_nascimento', 'estado_civil',
                'municipio', 'raca_cor', 'celular', 'escolaridade', 'possui_comorbidade',
                'qual_comorbidade', 'qual_comorbidade_especifique', 'renda_mensal', 'componentes_familia', 'quantidade_componentes_familia',
                'renec_cartao_cria', 'cep', 'municipio_endereco', 'bairro', 'logradouro', 'numero',
                'complemento', 'menor_idade', 'parentesco', 'cpf_responsavel', 'nome_mae', 'status'
            ]

            fields = []
            values = []

            for key, value in data.items():
                if key in valid_columns:
                    if value == '' or value is None:
                        fields.append(f"{key} = ?")
                        values.append(None)
                    elif key in ['renda_mensal', 'componentes_familia']:
                        try:
                            if value:
                                cleaned_value = str(value).replace('R$', '').replace('.', '').replace(',', '.').strip()
                                fields.append(f"{key} = ?")
                                values.append(float(cleaned_value) if key == 'renda_mensal' else int(cleaned_value))
                            else:
                                fields.append(f"{key} = ?")
                                values.append(None)
                        except (ValueError, AttributeError) as e:
                            print(f"Erro ao converter valor de {key}: {e}")
                            fields.append(f"{key} = ?")
                            values.append(None)
                    else:
                        fields.append(f"{key} = ?")
                        values.append(value)
                else:
                    print(f"Campo ignorado (não existe na tabela): {key}")

            if fields:
                values.append(datetime.now().isoformat())
                fields.append("updated_at = ?")
                values.append(id)

                query = f"UPDATE pacientes_capacitacao SET {', '.join(fields)} WHERE id = ?"
                print(f"Query SQL: {query}")
                print(f"Valores: {values}")
                cursor.execute(query, values)

                usuario_req = request.headers.get('X-User-Id')
                if usuario_req:
                    try:
                        cursor.execute('SELECT cargo FROM usuarios WHERE id = ?', (int(usuario_req),))
                        u = cursor.fetchone()
                        nome_pac = data.get('nome_completo', f'ID {id}')
                        acao_pac = 'cadastro_paciente' if data.get('status') == 'finalizado' else 'edicao_paciente'
                        cursor.execute('''
                            INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (int(usuario_req), u['cargo'] if u else None, acao_pac, 'Capacitação',
                              'pacientes_capacitacao', str(id),
                              f"Paciente {nome_pac} - dados atualizados", agora_brasilia()))
                    except Exception:
                        pass

                conn.commit()
                print("Paciente atualizado com sucesso")

            conn.close()
            return jsonify({'message': 'Paciente atualizado com sucesso'})
        except Exception as e:
            print(f"Erro ao atualizar paciente: {str(e)}")
            conn.close()
            return jsonify({'error': str(e)}), 500

@app.route('/api/capacitacao/pacientes/<int:id>/dados-ginecologicos', methods=['GET', 'POST'])
def dados_ginecologicos_capacitacao(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM dados_ginecologicos_capacitacao WHERE paciente_id = ?', (id,))
        dados = cursor.fetchone()
        conn.close()

        if dados:
            return jsonify(dict(dados))
        return jsonify(None)

    elif request.method == 'POST':
        data = request.json

        cursor.execute('SELECT id FROM dados_ginecologicos_capacitacao WHERE paciente_id = ?', (id,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute('''
                UPDATE dados_ginecologicos_capacitacao
                SET paridade = ?, uso_contraceptivo = ?, qual_metodo_contraceptivo = ?,
                    citologia = ?, usb = ?, beta_hcg = ?, metodo_escolhido = ?,
                    elegivel_metodo = ?, elegivel_metodo_escolha = ?, data_consulta = ?,
                    enfermeira_aluna_id = ?
                WHERE paciente_id = ?
            ''', (
                data.get('paridade'),
                data.get('uso_contraceptivo'),
                data.get('qual_metodo_contraceptivo'),
                data.get('citologia'),
                data.get('usb'),
                data.get('beta_hcg'),
                data.get('metodo_escolhido'),
                data.get('elegivel_metodo'),
                data.get('elegivel_metodo_escolha'),
                data.get('data_consulta'),
                data.get('enfermeira_aluna_id'),
                id
            ))
        else:
            cursor.execute('''
                INSERT INTO dados_ginecologicos_capacitacao
                (paciente_id, paridade, uso_contraceptivo, qual_metodo_contraceptivo,
                 citologia, usb, beta_hcg, metodo_escolhido, elegivel_metodo,
                 elegivel_metodo_escolha, data_consulta, enfermeira_aluna_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                id,
                data.get('paridade'),
                data.get('uso_contraceptivo'),
                data.get('qual_metodo_contraceptivo'),
                data.get('citologia'),
                data.get('usb'),
                data.get('beta_hcg'),
                data.get('metodo_escolhido'),
                data.get('elegivel_metodo'),
                data.get('elegivel_metodo_escolha'),
                data.get('data_consulta'),
                data.get('enfermeira_aluna_id')
            ))

        usuario_req = request.headers.get('X-User-Id')
        if usuario_req:
            try:
                cursor.execute('SELECT cargo FROM usuarios WHERE id = ?', (int(usuario_req),))
                u = cursor.fetchone()
                cursor.execute('''
                    INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (int(usuario_req), u['cargo'] if u else None, 'registro_dados_clinicos', 'Capacitação',
                      'dados_ginecologicos_capacitacao', str(id),
                      f"Dados ginecológicos/clínicos registrados para paciente ID {id}", agora_brasilia()))
            except Exception:
                pass
        conn.commit()
        conn.close()
        return jsonify({'message': 'Dados ginecológicos salvos com sucesso'}), 201

@app.route('/api/ambulatorial/pacientes/validar-cpf', methods=['GET'])
def validar_cpf_paciente_ambulatorial():
    cpf = (request.args.get('cpf') or '').replace('.', '').replace('-', '').strip()
    exclude_id = request.args.get('excludeId', None)

    if not cpf:
        return jsonify({'valid': False, 'message': 'CPF não fornecido'}), 400

    conn = get_db()
    cursor = conn.cursor()

    if exclude_id:
        cursor.execute(
            'SELECT id FROM pacientes_ambulatorial WHERE REPLACE(REPLACE(cpf, ".", ""), "-", "") = ? AND id != ?',
            (cpf, exclude_id)
        )
    else:
        cursor.execute(
            'SELECT id FROM pacientes_ambulatorial WHERE REPLACE(REPLACE(cpf, ".", ""), "-", "") = ?',
            (cpf,)
        )

    existing = cursor.fetchone()
    conn.close()

    if existing:
        return jsonify({'valid': False, 'message': 'CPF já cadastrado'}), 400

    return jsonify({'valid': True})

@app.route('/api/ambulatorial/pacientes', methods=['GET', 'POST'])
def pacientes_ambulatorial():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM pacientes_ambulatorial ORDER BY created_at DESC')
        rows = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    elif request.method == 'POST':
        data = request.json
        cpf = (data.get('cpf') or '').replace('.', '').replace('-', '').strip()
        if cpf:
            cursor.execute('SELECT id FROM pacientes_ambulatorial WHERE REPLACE(REPLACE(cpf, ".", ""), "-", "") = ?', (cpf,))
            if cursor.fetchone():
                conn.close()
                return jsonify({'error': 'Já existe uma paciente cadastrada com este CPF.'}), 409
        try:
            cursor.execute('''
                INSERT INTO pacientes_ambulatorial (
                    nome_completo, cpf, cartao_sus, data_nascimento, estado_civil,
                    celular, municipio_nascimento, municipio, bairro, endereco, cep, logradouro, numero,
                    complemento, escolaridade, etnia, possui_comorbidade, qual_comorbidade,
                    qual_comorbidade_especifique, renda_mensal,
                    quantos_componentes_familia, recebe_cartao_cria, tipo_familia, tipo_familia_outro,
                    menor_idade, parentesco, cpf_responsavel, nome_completo_responsavel,
                    data_nascimento_responsavel
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data.get('nome_completo'),
                data.get('cpf', ''),
                data.get('cartao_sus', ''),
                data.get('data_nascimento', ''),
                data.get('estado_civil', ''),
                data.get('celular', ''),
                data.get('municipio_nascimento', ''),
                data.get('municipio', ''),
                data.get('bairro', ''),
                data.get('endereco', ''),
                data.get('cep', ''),
                data.get('logradouro', ''),
                data.get('numero', ''),
                data.get('complemento', ''),
                data.get('escolaridade', ''),
                data.get('etnia', ''),
                data.get('possui_comorbidade', ''),
                data.get('qual_comorbidade', ''),
                data.get('qual_comorbidade_especifique', ''),
                data.get('renda_mensal', ''),
                data.get('quantos_componentes_familia', ''),
                data.get('recebe_cartao_cria', ''),
                data.get('tipo_familia', ''),
                data.get('tipo_familia_outro', ''),
                data.get('menor_idade', ''),
                data.get('parentesco', ''),
                data.get('cpf_responsavel', ''),
                data.get('nome_completo_responsavel', ''),
                data.get('data_nascimento_responsavel', '')
            ))
            paciente_id = cursor.lastrowid
            usuario_req = request.headers.get('X-User-Id')
            if usuario_req:
                try:
                    cursor.execute('SELECT cargo FROM usuarios WHERE id = ?', (int(usuario_req),))
                    u = cursor.fetchone()
                    cursor.execute('''
                        INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (int(usuario_req), u['cargo'] if u else None, 'cadastro_paciente', 'Ambulatorial',
                          'pacientes_ambulatorial', str(paciente_id),
                          f"Cadastro de paciente: {data.get('nome_completo', 'N/A')}", agora_brasilia()))
                except Exception:
                    pass
            conn.commit()
            conn.close()
            return jsonify({'message': 'Paciente cadastrado com sucesso', 'paciente_id': paciente_id}), 201
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'Já existe uma paciente cadastrada com este CPF.'}), 409
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 400

@app.route('/api/ambulatorial/pacientes/<int:paciente_id>', methods=['GET', 'PUT'])
def paciente_ambulatorial_detail(paciente_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM pacientes_ambulatorial WHERE id = ?', (paciente_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return jsonify(dict(row))
        return jsonify({'error': 'Paciente não encontrado'}), 404

    elif request.method == 'PUT':
        data = request.json
        cpf_put = (data.get('cpf') or '').replace('.', '').replace('-', '').strip()
        if cpf_put:
            cursor.execute(
                'SELECT id FROM pacientes_ambulatorial WHERE REPLACE(REPLACE(cpf, ".", ""), "-", "") = ? AND id != ?',
                (cpf_put, paciente_id)
            )
            if cursor.fetchone():
                conn.close()
                return jsonify({'error': 'Já existe uma paciente cadastrada com este CPF.'}), 409
        try:
            cursor.execute('''
                UPDATE pacientes_ambulatorial SET
                    nome_completo = ?, cpf = ?, cartao_sus = ?, data_nascimento = ?,
                    estado_civil = ?, celular = ?, municipio_nascimento = ?, municipio = ?, bairro = ?,
                    endereco = ?, cep = ?, logradouro = ?, numero = ?, complemento = ?,
                    escolaridade = ?, etnia = ?, possui_comorbidade = ?, qual_comorbidade = ?,
                    qual_comorbidade_especifique = ?, renda_mensal = ?,
                    quantos_componentes_familia = ?, recebe_cartao_cria = ?, tipo_familia = ?,
                    tipo_familia_outro = ?, menor_idade = ?, parentesco = ?,
                    cpf_responsavel = ?, nome_completo_responsavel = ?, data_nascimento_responsavel = ?
                WHERE id = ?
            ''', (
                data.get('nome_completo'),
                data.get('cpf', ''),
                data.get('cartao_sus', ''),
                data.get('data_nascimento', ''),
                data.get('estado_civil', ''),
                data.get('celular', ''),
                data.get('municipio_nascimento', ''),
                data.get('municipio', ''),
                data.get('bairro', ''),
                data.get('endereco', ''),
                data.get('cep', ''),
                data.get('logradouro', ''),
                data.get('numero', ''),
                data.get('complemento', ''),
                data.get('escolaridade', ''),
                data.get('etnia', ''),
                data.get('possui_comorbidade', ''),
                data.get('qual_comorbidade', ''),
                data.get('qual_comorbidade_especifique', ''),
                data.get('renda_mensal', ''),
                data.get('quantos_componentes_familia', ''),
                data.get('recebe_cartao_cria', ''),
                data.get('tipo_familia', ''),
                data.get('tipo_familia_outro', ''),
                data.get('menor_idade', ''),
                data.get('parentesco', ''),
                data.get('cpf_responsavel', ''),
                data.get('nome_completo_responsavel', ''),
                data.get('data_nascimento_responsavel', ''),
                paciente_id
            ))
            usuario_req = request.headers.get('X-User-Id')
            if usuario_req:
                try:
                    cursor.execute('SELECT cargo FROM usuarios WHERE id = ?', (int(usuario_req),))
                    u = cursor.fetchone()
                    cursor.execute('''
                        INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (int(usuario_req), u['cargo'] if u else None, 'edicao_paciente', 'Ambulatorial',
                          'pacientes_ambulatorial', str(paciente_id),
                          f"Edição de paciente: {data.get('nome_completo', 'N/A')}", agora_brasilia()))
                except Exception:
                    pass
            conn.commit()
            conn.close()
            return jsonify({'message': 'Paciente atualizado com sucesso'}), 200
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 400

@app.route('/api/ambulatorial/dados-ginecologicos', methods=['POST'])
def criar_dados_ginecologicos():
    conn = get_db()
    cursor = conn.cursor()
    data = request.json

    try:
        cursor.execute('''
            INSERT INTO dados_ginecologicos_obstetricos (
                paciente_id, paridade, usa_metodo_contraceptivo, qual_metodo_contraceptivo,
                metodo_contraceptivo_outro, gravidez, usa, bare_iug, metodo_escolhido,
                metodo_escolhido_outro, elegivel_metodo_escolhido,
                elegivel_outro_metodo, data_consulta, enfermeira_responsavel_id, realizou_usg
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data.get('paciente_id'),
            data.get('paridade', ''),
            data.get('usa_metodo_contraceptivo', ''),
            data.get('qual_metodo_contraceptivo', ''),
            data.get('metodo_contraceptivo_outro', ''),
            data.get('gravidez', ''),
            data.get('usa', ''),
            data.get('bare_iug', ''),
            data.get('metodo_escolhido', ''),
            data.get('metodo_escolhido_outro', ''),
            data.get('elegivel_metodo_escolhido', ''),
            data.get('elegivel_outro_metodo', ''),
            data.get('data_consulta', ''),
            data.get('enfermeira_responsavel_id'),
            data.get('realizou_usg', '')
        ))
        dados_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({'message': 'Dados ginecológicos salvos com sucesso', 'dados_id': dados_id}), 201
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 400

@app.route('/api/ambulatorial/dados-ginecologicos/<int:paciente_id>', methods=['GET', 'PUT'])
def dados_ginecologicos_by_paciente(paciente_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM dados_ginecologicos_obstetricos WHERE paciente_id = ?', (paciente_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return jsonify(dict(row))
        return jsonify({}), 200

    elif request.method == 'PUT':
        data = request.json
        try:
            cursor.execute('''
                UPDATE dados_ginecologicos_obstetricos SET
                    paridade = ?, usa_metodo_contraceptivo = ?, qual_metodo_contraceptivo = ?,
                    metodo_contraceptivo_outro = ?, gravidez = ?, usa = ?, bare_iug = ?,
                    metodo_escolhido = ?, metodo_escolhido_outro = ?,
                    elegivel_metodo_escolhido = ?, elegivel_outro_metodo = ?, data_consulta = ?,
                    enfermeira_responsavel_id = ?, realizou_usg = ?
                WHERE paciente_id = ?
            ''', (
                data.get('paridade', ''),
                data.get('usa_metodo_contraceptivo', ''),
                data.get('qual_metodo_contraceptivo', ''),
                data.get('metodo_contraceptivo_outro', ''),
                data.get('gravidez', ''),
                data.get('usa', ''),
                data.get('bare_iug', ''),
                data.get('metodo_escolhido', ''),
                data.get('metodo_escolhido_outro', ''),
                data.get('elegivel_metodo_escolhido', ''),
                data.get('elegivel_outro_metodo', ''),
                data.get('data_consulta', ''),
                data.get('enfermeira_responsavel_id'),
                data.get('realizou_usg', ''),
                paciente_id
            ))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Dados ginecológicos atualizados com sucesso'}), 200
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 400

@app.route('/api/ambulatorial/consultas/<int:paciente_id>', methods=['GET', 'POST'])
def consultas_ambulatorial(paciente_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM consultas_ambulatorial WHERE paciente_id = ? ORDER BY data_consulta DESC', (paciente_id,))
        rows = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    elif request.method == 'POST':
        data = request.json
        try:
            cursor.execute('''
                INSERT INTO consultas_ambulatorial (
                    paciente_id, data_consulta, houve_insercao, tipo_insercao,
                    tipo_insercao_outro, nova_intercorrencia, qual_intercorrencia, observacoes,
                    houve_retirada, metodo_retirado, motivo_retirada
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                paciente_id,
                data.get('data_consulta'),
                data.get('houve_insercao', ''),
                data.get('tipo_insercao', ''),
                data.get('tipo_insercao_outro', ''),
                data.get('nova_intercorrencia', ''),
                data.get('qual_intercorrencia', ''),
                data.get('observacoes', ''),
                data.get('houve_retirada', ''),
                data.get('metodo_retirado', ''),
                data.get('motivo_retirada', '')
            ))
            consulta_id = cursor.lastrowid
            usuario_req = request.headers.get('X-User-Id')
            if usuario_req:
                try:
                    cursor.execute('SELECT cargo FROM usuarios WHERE id = ?', (int(usuario_req),))
                    u = cursor.fetchone()
                    houve_insercao = data.get('houve_insercao', '')
                    tipo_insercao = data.get('tipo_insercao', '')
                    descricao_log = f"Consulta registrada para paciente ID {paciente_id}"
                    if houve_insercao == 'Sim' and tipo_insercao:
                        descricao_log += f" - Inserção de {tipo_insercao}"
                    cursor.execute('''
                        INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (int(usuario_req), u['cargo'] if u else None, 'registro_consulta', 'Ambulatorial',
                          'consultas_ambulatorial', str(consulta_id), descricao_log, agora_brasilia()))
                except Exception:
                    pass
            conn.commit()
            conn.close()
            return jsonify({'message': 'Consulta registrada com sucesso', 'consulta_id': consulta_id}), 201
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 400

@app.route('/api/ambulatorial/stats', methods=['GET'])
def ambulatorial_stats():
    conn = get_db()
    cursor = conn.cursor()

    year = request.args.get('year', None)

    try:
        if year and year != 'Todos':
            cursor.execute('SELECT COUNT(*) as total FROM pacientes_ambulatorial WHERE strftime("%Y", created_at) = ?', (year,))
            total_pacientes = cursor.fetchone()['total']

            cursor.execute('''
                SELECT COUNT(*) as total
                FROM consultas_ambulatorial c
                JOIN pacientes_ambulatorial p ON c.paciente_id = p.id
                WHERE strftime("%Y", c.data_consulta) = ?
            ''', (year,))
            total_consultas = cursor.fetchone()['total']

            cursor.execute('''
                SELECT COUNT(*) as total
                FROM consultas_ambulatorial c
                JOIN pacientes_ambulatorial p ON c.paciente_id = p.id
                WHERE strftime("%Y", c.data_consulta) = ? AND c.houve_insercao = 'Sim' AND c.tipo_insercao = 'DIU'
            ''', (year,))
            total_dius = cursor.fetchone()['total']

            cursor.execute('''
                SELECT COUNT(*) as total
                FROM consultas_ambulatorial c
                JOIN pacientes_ambulatorial p ON c.paciente_id = p.id
                WHERE strftime("%Y", c.data_consulta) = ? AND c.houve_insercao = 'Sim' AND c.tipo_insercao = 'Implanon'
            ''', (year,))
            total_implanons = cursor.fetchone()['total']

            cursor.execute('''
                SELECT COUNT(*) as total
                FROM consultas_ambulatorial c
                JOIN pacientes_ambulatorial p ON c.paciente_id = p.id
                WHERE strftime("%Y", c.data_consulta) = ? AND c.houve_insercao = 'Sim'
            ''', (year,))
            total_insercoes = cursor.fetchone()['total']

            cursor.execute('''
                SELECT COUNT(*) as total
                FROM consultas_ambulatorial c
                JOIN pacientes_ambulatorial p ON c.paciente_id = p.id
                WHERE strftime("%Y", c.data_consulta) = ? AND c.nova_intercorrencia = 'Sim'
            ''', (year,))
            total_intercorrencias = cursor.fetchone()['total']

            cursor.execute('''
                SELECT COUNT(*) as total
                FROM dados_ginecologicos_obstetricos d
                JOIN pacientes_ambulatorial p ON d.paciente_id = p.id
                WHERE strftime("%Y", d.created_at) = ? AND d.realizou_usg = 'Sim'
            ''', (year,))
            total_usgs = cursor.fetchone()['total']

            cursor.execute('''
                SELECT AVG(
                    CAST((julianday('now') - julianday(data_nascimento)) / 365.25 AS INTEGER)
                ) as media_idade
                FROM pacientes_ambulatorial
                WHERE strftime("%Y", created_at) = ?
                  AND data_nascimento IS NOT NULL
                  AND data_nascimento != ''
                  AND data_nascimento != 'None'
            ''', (year,))
        else:
            cursor.execute('SELECT COUNT(*) as total FROM pacientes_ambulatorial')
            total_pacientes = cursor.fetchone()['total']

            cursor.execute('SELECT COUNT(*) as total FROM consultas_ambulatorial')
            total_consultas = cursor.fetchone()['total']

            cursor.execute("SELECT COUNT(*) as total FROM consultas_ambulatorial WHERE houve_insercao = 'Sim' AND tipo_insercao = 'DIU'")
            total_dius = cursor.fetchone()['total']

            cursor.execute("SELECT COUNT(*) as total FROM consultas_ambulatorial WHERE houve_insercao = 'Sim' AND tipo_insercao = 'Implanon'")
            total_implanons = cursor.fetchone()['total']

            cursor.execute("SELECT COUNT(*) as total FROM consultas_ambulatorial WHERE houve_insercao = 'Sim'")
            total_insercoes = cursor.fetchone()['total']

            cursor.execute("SELECT COUNT(*) as total FROM consultas_ambulatorial WHERE nova_intercorrencia = 'Sim'")
            total_intercorrencias = cursor.fetchone()['total']

            cursor.execute("SELECT COUNT(*) as total FROM dados_ginecologicos_obstetricos WHERE realizou_usg = 'Sim'")
            total_usgs = cursor.fetchone()['total']

            cursor.execute('''
                SELECT AVG(
                    CAST((julianday('now') - julianday(data_nascimento)) / 365.25 AS INTEGER)
                ) as media_idade
                FROM pacientes_ambulatorial
                WHERE data_nascimento IS NOT NULL
                  AND data_nascimento != ''
                  AND data_nascimento != 'None'
            ''')

        media_idade_result = cursor.fetchone()
        media_idade = int(media_idade_result['media_idade']) if media_idade_result['media_idade'] else 0

        cursor.execute('''
            SELECT
                SUM(CASE WHEN possui_comorbidade = 'Sim' THEN 1 ELSE 0 END) as com_comorbidade,
                COUNT(*) as total
            FROM pacientes_ambulatorial
        ''')
        comorbidade_data = cursor.fetchone()
        percentual_comorbidade = 0
        if comorbidade_data and comorbidade_data['total'] and comorbidade_data['total'] > 0:
            com_comorbidade = comorbidade_data['com_comorbidade'] or 0
            percentual_comorbidade = int((com_comorbidade / comorbidade_data['total']) * 100)

        conn.close()

        return jsonify({
            'totalPacientes': total_pacientes,
            'totalConsultas': total_consultas,
            'totalDius': total_dius,
            'totalImplanons': total_implanons,
            'totalInsercoes': total_insercoes,
            'totalIntercorrencias': total_intercorrencias,
            'totalUsgs': total_usgs,
            'mediaIdade': media_idade,
            'percentualComorbidade': percentual_comorbidade
        })
    except Exception as e:
        conn.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/ambulatorial/enfermeiras-instrutoras/validar', methods=['POST'])
def validar_instrutora_ambulatorial():
    conn = get_db()
    cursor = conn.cursor()
    data = request.json

    cpf = data.get('cpf')
    email = data.get('email')
    numero_registro = data.get('numero_registro')
    instrutora_id = data.get('id')

    errors = []

    if cpf:
        cpf_limpo = cpf.replace('.', '').replace('-', '')
        query = 'SELECT id FROM enfermeiras_instrutoras_ambulatorial WHERE cpf = ?'
        params = [cpf_limpo]
        if instrutora_id:
            query += ' AND id != ?'
            params.append(instrutora_id)
        cursor.execute(query, params)
        if cursor.fetchone():
            errors.append('CPF já cadastrado em Ambulatorial')

        cursor.execute('SELECT id FROM enfermeiras_instrutoras WHERE cpf = ?', (cpf_limpo,))
        if cursor.fetchone():
            errors.append('CPF já cadastrado em Capacitação')

        cursor.execute('SELECT id FROM usuarios WHERE cpf = ?', (cpf_limpo,))
        if cursor.fetchone():
            errors.append('CPF já cadastrado no sistema')

    if email:
        query = 'SELECT id FROM enfermeiras_instrutoras_ambulatorial WHERE email = ?'
        params = [email]
        if instrutora_id:
            query += ' AND id != ?'
            params.append(instrutora_id)
        cursor.execute(query, params)
        if cursor.fetchone():
            errors.append('E-mail já cadastrado em Ambulatorial')

        cursor.execute('SELECT id FROM enfermeiras_instrutoras WHERE email = ?', (email,))
        if cursor.fetchone():
            errors.append('E-mail já cadastrado em Capacitação')

        cursor.execute('SELECT id FROM usuarios WHERE email = ?', (email.lower(),))
        if cursor.fetchone():
            errors.append('E-mail já cadastrado no sistema')

    if numero_registro:
        query = 'SELECT id FROM enfermeiras_instrutoras_ambulatorial WHERE numero_registro = ?'
        params = [numero_registro]
        if instrutora_id:
            query += ' AND id != ?'
            params.append(instrutora_id)
        cursor.execute(query, params)
        if cursor.fetchone():
            errors.append('Número de registro já cadastrado em Ambulatorial')

        cursor.execute('SELECT id FROM enfermeiras_instrutoras WHERE coren = ?', (numero_registro,))
        if cursor.fetchone():
            errors.append('Número de registro já cadastrado em Capacitação')

    conn.close()

    if errors:
        return jsonify({'valid': False, 'errors': errors}), 400
    return jsonify({'valid': True}), 200

@app.route('/api/ambulatorial/enfermeiras-instrutoras', methods=['GET', 'POST'])
def enfermeiras_instrutoras_ambulatorial():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM enfermeiras_instrutoras_ambulatorial ORDER BY nome')
        rows = cursor.fetchall()
        instrutoras = []

        for row in rows:
            instrutora = dict(row)

            if 'diploma_content' in instrutora:
                instrutora['tem_diploma'] = instrutora['diploma_content'] is not None
                del instrutora['diploma_content']

            if 'senha_hash' in instrutora:
                del instrutora['senha_hash']

            instrutoras.append(instrutora)

        conn.close()
        return jsonify(instrutoras)

    elif request.method == 'POST':
        data = request.json
        try:
            import base64

            senha = data.get('senha', '')
            senha_hash = hashlib.sha256(senha.encode()).hexdigest() if senha else None

            cpf_limpo = data.get('cpf', '').replace('.', '').replace('-', '')
            email = data.get('email', '')
            nome = data.get('nome', '')

            diploma_content = None
            diploma_filename = None
            if data.get('diploma_content'):
                diploma_content = decode_base64_safe(data.get('diploma_content'))
                diploma_filename = data.get('diploma_filename', 'diploma.pdf')

            # Inserir na tabela auxiliar ambulatorial (dados específicos do módulo)
            cursor.execute('''
                INSERT INTO enfermeiras_instrutoras_ambulatorial (
                    nome, cpf, tipo_registro, numero_registro, telefone, email, especialidade,
                    unidade_saude, cep, logradouro, municipio, bairro, numero, complemento,
                    senha_hash, diploma_filename, diploma_content
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                nome,
                cpf_limpo,
                data.get('tipo_registro', ''),
                data.get('numero_registro', ''),
                data.get('telefone', ''),
                email,
                data.get('especialidade', ''),
                data.get('unidade_saude', ''),
                data.get('cep', ''),
                data.get('logradouro', ''),
                data.get('municipio', ''),
                data.get('bairro', ''),
                data.get('numero', ''),
                data.get('complemento', ''),
                senha_hash,
                diploma_filename,
                diploma_content
            ))

            # Inserir também na tabela usuarios para habilitar login e listagem em Gestão
            cursor.execute('''
                INSERT OR IGNORE INTO usuarios (
                    nome_completo, email, senha_hash, cpf, telefone,
                    profissao, vinculo_empregaticio,
                    cep, municipio, logradouro, bairro, numero, complemento,
                    cargo, status, primeiro_acesso, must_change_password
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                nome,
                email.lower() if email else email,
                senha_hash,
                cpf_limpo,
                data.get('telefone', ''),
                data.get('especialidade', ''),
                data.get('unidade_saude', ''),
                data.get('cep', ''),
                data.get('municipio', ''),
                data.get('logradouro', ''),
                data.get('bairro', ''),
                data.get('numero', ''),
                data.get('complemento', ''),
                'Médico(a) / Enfermeiro(a) Ambulatorial',
                'ativo',
                1,
                1
            ))

            conn.commit()
            conn.close()
            return jsonify({'message': 'Profissional cadastrado com sucesso'}), 201
        except sqlite3.IntegrityError as e:
            conn.close()
            msg = str(e)
            if 'email' in msg.lower():
                return jsonify({'error': 'E-mail já cadastrado'}), 400
            return jsonify({'error': 'CPF já cadastrado'}), 400

@app.route('/api/ambulatorial/enfermeiras-instrutoras/<int:id>/diploma', methods=['GET'])
def download_diploma_instrutora_ambulatorial(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT diploma_filename, diploma_content FROM enfermeiras_instrutoras_ambulatorial WHERE id = ?', (id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row['diploma_content']:
        return jsonify({'error': 'Diploma não encontrado'}), 404

    from flask import send_file
    import io

    return send_file(
        io.BytesIO(row['diploma_content']),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=row['diploma_filename'] or 'diploma.pdf'
    )

@app.route('/api/ambulatorial/enfermeiras-instrutoras/<int:id>', methods=['GET', 'PATCH'])
def enfermeira_instrutora_ambulatorial_detail(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM enfermeiras_instrutoras_ambulatorial WHERE id = ?', (id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({'error': 'Profissional não encontrado'}), 404

        instrutora = dict(row)
        if instrutora.get('diploma_content'):
            instrutora['diploma_content'] = encode_base64_safe(instrutora['diploma_content'])
        return jsonify(instrutora)

    elif request.method == 'PATCH':
        data = request.json
        try:
            import base64

            senha = data.get('senha', '')
            diploma_content = data.get('diploma_content')

            if senha:
                senha_hash = hashlib.sha256(senha.encode()).hexdigest()

                if diploma_content:
                    diploma_content_bytes = decode_base64_safe(diploma_content)
                    diploma_filename = data.get('diploma_filename', 'diploma.pdf')

                    cursor.execute('''
                        UPDATE enfermeiras_instrutoras_ambulatorial
                        SET nome = ?, cpf = ?, tipo_registro = ?, numero_registro = ?,
                            telefone = ?, email = ?, especialidade = ?, unidade_saude = ?,
                            senha_hash = ?, diploma_filename = ?, diploma_content = ?
                        WHERE id = ?
                    ''', (
                        data.get('nome'),
                        data.get('cpf'),
                        data.get('tipo_registro', ''),
                        data.get('numero_registro', ''),
                        data.get('telefone', ''),
                        data.get('email', ''),
                        data.get('especialidade', ''),
                        data.get('unidade_saude', ''),
                        senha_hash,
                        diploma_filename,
                        diploma_content_bytes,
                        id
                    ))
                else:
                    cursor.execute('''
                        UPDATE enfermeiras_instrutoras_ambulatorial
                        SET nome = ?, cpf = ?, tipo_registro = ?, numero_registro = ?,
                            telefone = ?, email = ?, especialidade = ?, unidade_saude = ?, senha_hash = ?
                        WHERE id = ?
                    ''', (
                        data.get('nome'),
                        data.get('cpf'),
                        data.get('tipo_registro', ''),
                        data.get('numero_registro', ''),
                        data.get('telefone', ''),
                        data.get('email', ''),
                        data.get('especialidade', ''),
                        data.get('unidade_saude', ''),
                        senha_hash,
                        id
                    ))
            else:
                if diploma_content:
                    diploma_content_bytes = decode_base64_safe(diploma_content)
                    diploma_filename = data.get('diploma_filename', 'diploma.pdf')

                    cursor.execute('''
                        UPDATE enfermeiras_instrutoras_ambulatorial
                        SET nome = ?, cpf = ?, tipo_registro = ?, numero_registro = ?,
                            telefone = ?, email = ?, especialidade = ?, unidade_saude = ?,
                            diploma_filename = ?, diploma_content = ?
                        WHERE id = ?
                    ''', (
                        data.get('nome'),
                        data.get('cpf'),
                        data.get('tipo_registro', ''),
                        data.get('numero_registro', ''),
                        data.get('telefone', ''),
                        data.get('email', ''),
                        data.get('especialidade', ''),
                        data.get('unidade_saude', ''),
                        diploma_filename,
                        diploma_content_bytes,
                        id
                    ))
                else:
                    cursor.execute('''
                        UPDATE enfermeiras_instrutoras_ambulatorial
                        SET nome = ?, cpf = ?, tipo_registro = ?, numero_registro = ?,
                            telefone = ?, email = ?, especialidade = ?, unidade_saude = ?
                        WHERE id = ?
                    ''', (
                        data.get('nome'),
                        data.get('cpf'),
                        data.get('tipo_registro', ''),
                        data.get('numero_registro', ''),
                        data.get('telefone', ''),
                        data.get('email', ''),
                        data.get('especialidade', ''),
                        data.get('unidade_saude', ''),
                        id
                    ))

            conn.commit()
            conn.close()
            return jsonify({'message': 'Profissional atualizado com sucesso'}), 200
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'CPF já cadastrado para outro profissional'}), 400
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 500

@app.route('/api/ambulatorial/enfermeiras-instrutoras/buscar', methods=['GET'])
def buscar_enfermeiras_ambulatoriais():
    conn = get_db()
    cursor = conn.cursor()

    termo = request.args.get('termo', '').strip()

    if not termo:
        cursor.execute('''
            SELECT id, nome, cpf, numero_registro, especialidade
            FROM enfermeiras_instrutoras_ambulatorial
            ORDER BY nome
            LIMIT 50
        ''')
    else:
        cursor.execute('''
            SELECT id, nome, cpf, numero_registro, especialidade
            FROM enfermeiras_instrutoras_ambulatorial
            WHERE nome LIKE ? OR cpf LIKE ?
            ORDER BY nome
            LIMIT 50
        ''', (f'%{termo}%', f'%{termo}%'))

    enfermeiras = []
    for row in cursor.fetchall():
        enfermeiras.append({
            'id': row['id'],
            'nome': row['nome'],
            'cpf': row['cpf'],
            'numero_registro': row['numero_registro'],
            'especialidade': row['especialidade']
        })

    conn.close()
    return jsonify(enfermeiras)

@app.route('/api/ambulatorial/pacientes/filtrados', methods=['GET'])
def pacientes_ambulatorial_filtrados():
    conn = get_db()
    cursor = conn.cursor()

    filtro = request.args.get('filtro', 'todos')

    if filtro == 'com_diu':
        cursor.execute('''
            SELECT DISTINCT p.*
            FROM pacientes_ambulatorial p
            INNER JOIN consultas_ambulatorial c ON p.id = c.paciente_id
            WHERE c.houve_insercao = 'Sim' AND c.tipo_insercao = 'DIU'
            ORDER BY p.created_at DESC
        ''')
    elif filtro == 'com_implanon':
        cursor.execute('''
            SELECT DISTINCT p.*
            FROM pacientes_ambulatorial p
            INNER JOIN consultas_ambulatorial c ON p.id = c.paciente_id
            WHERE c.houve_insercao = 'Sim' AND c.tipo_insercao = 'Implanon'
            ORDER BY p.created_at DESC
        ''')
    elif filtro == 'sem_insercao':
        cursor.execute('''
            SELECT p.*
            FROM pacientes_ambulatorial p
            WHERE p.id NOT IN (
                SELECT DISTINCT paciente_id
                FROM consultas_ambulatorial
                WHERE houve_insercao = 'Sim'
            )
            ORDER BY p.created_at DESC
        ''')
    else:
        cursor.execute('SELECT * FROM pacientes_ambulatorial ORDER BY created_at DESC')

    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/capacitacao/enfermeiras-instrutoras/<int:id>', methods=['GET', 'PATCH'])
def enfermeira_instrutora_capacitacao_detail(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM enfermeiras_instrutoras WHERE id = ?', (id,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({'error': 'Instrutora não encontrada'}), 404

        instrutora = dict(row)
        if instrutora.get('diploma_content'):
            instrutora['diploma_content'] = encode_base64_safe(instrutora['diploma_content'])
        return jsonify(instrutora)

    elif request.method == 'PATCH':
        data = request.json
        try:
            import base64

            senha = data.get('senha', '')
            diploma_content = data.get('diploma_content')

            if senha:
                senha_hash = hashlib.sha256(senha.encode()).hexdigest()

                if diploma_content:
                    diploma_content_bytes = decode_base64_safe(diploma_content)
                    diploma_filename = data.get('diploma_filename', 'diploma.pdf')

                    cursor.execute('''
                        UPDATE enfermeiras_instrutoras
                        SET nome = ?, cpf = ?, coren = ?, telefone = ?, email = ?, especialidade = ?,
                            unidade_saude = ?, senha_hash = ?, diploma_filename = ?, diploma_content = ?
                        WHERE id = ?
                    ''', (
                        data.get('nome'),
                        data.get('cpf'),
                        data.get('coren', ''),
                        data.get('telefone', ''),
                        data.get('email', ''),
                        data.get('especialidade', ''),
                        data.get('unidade_saude', ''),
                        senha_hash,
                        diploma_filename,
                        diploma_content_bytes,
                        id
                    ))
                else:
                    cursor.execute('''
                        UPDATE enfermeiras_instrutoras
                        SET nome = ?, cpf = ?, coren = ?, telefone = ?, email = ?, especialidade = ?,
                            unidade_saude = ?, senha_hash = ?
                        WHERE id = ?
                    ''', (
                        data.get('nome'),
                        data.get('cpf'),
                        data.get('coren', ''),
                        data.get('telefone', ''),
                        data.get('email', ''),
                        data.get('especialidade', ''),
                        data.get('unidade_saude', ''),
                        senha_hash,
                        id
                    ))
            else:
                if diploma_content:
                    diploma_content_bytes = decode_base64_safe(diploma_content)
                    diploma_filename = data.get('diploma_filename', 'diploma.pdf')

                    cursor.execute('''
                        UPDATE enfermeiras_instrutoras
                        SET nome = ?, cpf = ?, coren = ?, telefone = ?, email = ?, especialidade = ?,
                            unidade_saude = ?, diploma_filename = ?, diploma_content = ?
                        WHERE id = ?
                    ''', (
                        data.get('nome'),
                        data.get('cpf'),
                        data.get('coren', ''),
                        data.get('telefone', ''),
                        data.get('email', ''),
                        data.get('especialidade', ''),
                        data.get('unidade_saude', ''),
                        diploma_filename,
                        diploma_content_bytes,
                        id
                    ))
                else:
                    cursor.execute('''
                        UPDATE enfermeiras_instrutoras
                        SET nome = ?, cpf = ?, coren = ?, telefone = ?, email = ?, especialidade = ?, unidade_saude = ?
                        WHERE id = ?
                    ''', (
                        data.get('nome'),
                        data.get('cpf'),
                        data.get('coren', ''),
                        data.get('telefone', ''),
                        data.get('email', ''),
                        data.get('especialidade', ''),
                        data.get('unidade_saude', ''),
                        id
                    ))

            conn.commit()
            conn.close()
            return jsonify({'message': 'Instrutora atualizada com sucesso'}), 200
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'CPF já cadastrado para outra instrutora'}), 400
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 500

@app.route('/api/capacitacao/enfermeiras-alunas/<int:id>', methods=['GET', 'PATCH'])
def enfermeira_aluna_detail(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT
                ea.*,
                ei.nome as instrutora_nome
            FROM enfermeiras_alunas ea
            LEFT JOIN enfermeiras_instrutoras ei ON ea.enfermeira_instrutora_id = ei.id
            WHERE ea.id = ?
        ''', (id,))
        row = cursor.fetchone()

        if not row:
            conn.close()
            return jsonify({'error': 'Aluna não encontrada'}), 404

        aluna = dict(row)

        cursor.execute('SELECT COUNT(*) as count FROM fichas_atendimento_pdf WHERE enfermeira_aluna_id = ?', (id,))
        count_row = cursor.fetchone()
        total_fichas = count_row['count'] if count_row else 0
        aluna['total_fichas'] = total_fichas
        aluna['progresso'] = min(int((total_fichas / 10) * 100), 100)
        aluna['status'] = 'Concluído' if total_fichas >= 10 else 'Incompleto'

        if aluna.get('certificado_content'):
            import base64
            aluna['certificado_content'] = base64.b64encode(aluna['certificado_content']).decode('utf-8')

        conn.close()
        return jsonify(aluna)

    elif request.method == 'PATCH':
        data = request.json
        try:
            import base64

            certificado_content = data.get('certificado_content')

            if certificado_content:
                certificado_content_bytes = decode_base64_safe(certificado_content)
                certificado_filename = data.get('certificado_filename', 'certificado.pdf')

                cursor.execute('''
                    UPDATE enfermeiras_alunas
                    SET nome = ?, cpf = ?, coren = ?, telefone = ?, email = ?, municipio = ?,
                        enfermeira_instrutora_id = ?, certificado_filename = ?, certificado_content = ?
                    WHERE id = ?
                ''', (
                    data.get('nome'),
                    data.get('cpf'),
                    data.get('coren', ''),
                    data.get('telefone', ''),
                    data.get('email', ''),
                    data.get('municipio', ''),
                    data.get('enfermeira_instrutora_id') or None,
                    certificado_filename,
                    certificado_content_bytes,
                    id
                ))
            else:
                cursor.execute('''
                    UPDATE enfermeiras_alunas
                    SET nome = ?, cpf = ?, coren = ?, telefone = ?, email = ?, municipio = ?, enfermeira_instrutora_id = ?
                    WHERE id = ?
                ''', (
                    data.get('nome'),
                    data.get('cpf'),
                    data.get('coren', ''),
                    data.get('telefone', ''),
                    data.get('email', ''),
                    data.get('municipio', ''),
                    data.get('enfermeira_instrutora_id') or None,
                    id
                ))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Aluno(a) atualizado(a) com sucesso'}), 200
        except sqlite3.IntegrityError:
            conn.close()
            return jsonify({'error': 'CPF já cadastrado para outro(a) aluno(a)'}), 400
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 500

@app.route('/api/capacitacao/enfermeiras-alunas/<int:aluna_id>/fichas', methods=['GET', 'POST'])
def fichas_atendimento(aluna_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT id, enfermeira_aluna_id, nome_arquivo, nome_paciente, cpf_paciente,
                   data_nascimento_paciente, municipio_paciente, metodo_inserido, data_anexacao
            FROM fichas_atendimento_pdf
            WHERE enfermeira_aluna_id = ?
            ORDER BY data_anexacao DESC
        ''', (aluna_id,))
        rows = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    elif request.method == 'POST':
        import base64
        data = request.json
        try:
            if not data.get('nome_paciente') or not data.get('cpf_paciente') or not data.get('data_nascimento_paciente') or not data.get('municipio_paciente') or not data.get('metodo_inserido'):
                return jsonify({'error': 'Todos os dados do paciente são obrigatórios'}), 400

            pdf_content_base64 = data.get('pdf_content')
            pdf_content = decode_base64_safe(pdf_content_base64)

            cursor.execute('''
                INSERT INTO fichas_atendimento_pdf
                (enfermeira_aluna_id, nome_arquivo, pdf_content, nome_paciente, cpf_paciente,
                 data_nascimento_paciente, municipio_paciente, metodo_inserido)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                aluna_id,
                data.get('nome_arquivo'),
                pdf_content,
                data.get('nome_paciente'),
                data.get('cpf_paciente'),
                data.get('data_nascimento_paciente'),
                data.get('municipio_paciente'),
                data.get('metodo_inserido')
            ))

            ficha_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return jsonify({'message': 'Ficha anexada com sucesso', 'ficha_id': ficha_id}), 201
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 400

@app.route('/api/capacitacao/enfermeiras-alunas/<int:aluna_id>/fichas/<int:ficha_id>', methods=['GET', 'DELETE'])
def ficha_atendimento_detail(aluna_id, ficha_id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        import base64
        cursor.execute('''
            SELECT *
            FROM fichas_atendimento_pdf
            WHERE id = ? AND enfermeira_aluna_id = ?
        ''', (ficha_id, aluna_id))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return jsonify({'error': 'Ficha não encontrada'}), 404

        ficha = dict(row)
        ficha['pdf_content'] = base64.b64encode(ficha['pdf_content']).decode('utf-8')
        return jsonify(ficha)

    elif request.method == 'DELETE':
        try:
            cursor.execute('''
                DELETE FROM fichas_atendimento_pdf
                WHERE id = ? AND enfermeira_aluna_id = ?
            ''', (ficha_id, aluna_id))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Ficha removida com sucesso'}), 200
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 400

@app.route('/api/municipios', methods=['GET'])
def get_municipios_geral():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM municipios WHERE estado = ? ORDER BY nome', ('AL',))
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/distribuicao/municipios', methods=['GET'])
def get_municipios():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM municipios WHERE estado = ? ORDER BY nome', ('AL',))
    rows = cursor.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/distribuicao/solicitacoes', methods=['GET', 'POST'])
def solicitacoes_insumos():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        data_inicio = request.args.get('dataInicio')
        data_fim = request.args.get('dataFim')
        municipio_id = request.args.get('municipio')
        tipo_insumo = request.args.get('tipoInsumo')
        status = request.args.get('status')

        query = '''
            SELECT s.*, m.nome as municipio_nome
            FROM solicitacoes_insumos s
            JOIN municipios m ON s.municipio_id = m.id
            WHERE 1=1
        '''
        params = []

        if data_inicio:
            query += ' AND DATE(s.data_solicitacao) >= DATE(?)'
            params.append(data_inicio)

        if data_fim:
            query += ' AND DATE(s.data_solicitacao) <= DATE(?)'
            params.append(data_fim)

        if municipio_id:
            query += ' AND s.municipio_id = ?'
            params.append(municipio_id)

        if tipo_insumo:
            query += ' AND s.tipo_insumo = ?'
            params.append(tipo_insumo)

        if status:
            query += ' AND s.status = ?'
            params.append(status)

        query += ' ORDER BY s.data_solicitacao DESC'

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    elif request.method == 'POST':
        data = request.json
        try:
            cursor.execute('''
                INSERT INTO solicitacoes_insumos (
                    municipio_id, tipo_insumo, quantidade_solicitada, nome_solicitante, observacao
                ) VALUES (?, ?, ?, ?, ?)
            ''', (
                data.get('municipio_id'),
                data.get('tipo_insumo'),
                data.get('quantidade_solicitada'),
                data.get('nome_solicitante', ''),
                data.get('observacao', '')
            ))
            solicitacao_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return jsonify({'message': 'Solicitação criada com sucesso', 'id': solicitacao_id}), 201
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 400

@app.route('/api/distribuicao/solicitacoes/<int:id>', methods=['GET', 'PATCH'])
def solicitacao_detail(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT s.*, m.nome as municipio_nome
            FROM solicitacoes_insumos s
            JOIN municipios m ON s.municipio_id = m.id
            WHERE s.id = ?
        ''', (id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return jsonify(dict(row))
        return jsonify({'error': 'Solicitação não encontrada'}), 404

    elif request.method == 'PATCH':
        data = request.json
        try:
            cursor.execute('''
                UPDATE solicitacoes_insumos
                SET status = ?, quantidade_autorizada = ?, motivo_negacao = ?, data_resposta = ?, respondido_por = ?
                WHERE id = ?
            ''', (
                data.get('status'),
                data.get('quantidade_autorizada', 0),
                data.get('motivo_negacao', ''),
                datetime.now().isoformat(),
                data.get('respondido_por', ''),
                id
            ))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Solicitação atualizada com sucesso'}), 200
        except Exception as e:
            conn.close()
            return jsonify({'error': str(e)}), 400

@app.route('/api/distribuicao/stats', methods=['GET'])
def distribuicao_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) as count FROM solicitacoes_insumos')
    total_solicitacoes = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM solicitacoes_insumos WHERE status = 'Autorizado'")
    total_autorizadas = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM solicitacoes_insumos WHERE status = 'Não autorizado'")
    total_negadas = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM solicitacoes_insumos WHERE status = 'Aguardando confirmação'")
    total_aguardando = cursor.fetchone()['count']

    cursor.execute("SELECT SUM(quantidade_solicitada) as total FROM solicitacoes_insumos WHERE tipo_insumo = 'DIU'")
    total_dius_solicitados = cursor.fetchone()['total'] or 0

    cursor.execute("SELECT SUM(quantidade_autorizada) as total FROM solicitacoes_insumos WHERE tipo_insumo = 'DIU' AND status = 'Autorizado'")
    total_dius_autorizados = cursor.fetchone()['total'] or 0

    cursor.execute("SELECT SUM(quantidade_solicitada) as total FROM solicitacoes_insumos WHERE tipo_insumo = 'Implanon'")
    total_implanons_solicitados = cursor.fetchone()['total'] or 0

    cursor.execute("SELECT SUM(quantidade_autorizada) as total FROM solicitacoes_insumos WHERE tipo_insumo = 'Implanon' AND status = 'Autorizado'")
    total_implanons_autorizados = cursor.fetchone()['total'] or 0

    conn.close()

    return jsonify({
        'totalSolicitacoes': total_solicitacoes,
        'totalAutorizadas': total_autorizadas,
        'totalNegadas': total_negadas,
        'totalAguardando': total_aguardando,
        'totalDiusSolicitados': total_dius_solicitados,
        'totalDiusAutorizados': total_dius_autorizados,
        'totalImplanonsSolicitados': total_implanons_solicitados,
        'totalImplanonsAutorizados': total_implanons_autorizados
    })

# Endpoints de Responsáveis

@app.route('/api/distribuicao/responsaveis', methods=['GET', 'POST'])
def responsaveis():
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        try:
            cursor.execute('''
                SELECT id, nome, cpf, cargo, telefone, email, municipio, status
                FROM responsaveis_municipios
                ORDER BY nome
            ''')
            responsaveis = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return jsonify(responsaveis)
        except Exception as e:
            conn.close()
            return jsonify({'error': f'Erro ao buscar responsáveis: {str(e)}'}), 500

    elif request.method == 'POST':
        data = request.json
        try:
            cursor.execute('''
                INSERT INTO responsaveis_municipios
                (nome, cpf, cargo, telefone, email, municipio, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['nome'],
                data['cpf'],
                data.get('cargo', ''),
                data.get('telefone', ''),
                data.get('email', ''),
                data['municipio'],
                'ativo',
                datetime.now().isoformat()
            ))
            conn.commit()
            responsavel_id = cursor.lastrowid
            conn.close()
            return jsonify({
                'id': responsavel_id,
                'message': 'Responsável cadastrado com sucesso'
            }), 201
        except Exception as e:
            conn.close()
            return jsonify({'error': f'Erro ao cadastrar responsável: {str(e)}'}), 400

@app.route('/api/distribuicao/responsaveis/<int:id>', methods=['GET', 'PATCH'])
def responsavel(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM responsaveis_municipios WHERE id = ?', (id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            return jsonify(dict(row))
        return jsonify({'error': 'Responsável não encontrado'}), 404

    elif request.method == 'PATCH':
        data = request.json
        try:
            cursor.execute('''
                UPDATE responsaveis_municipios
                SET nome = ?, cpf = ?, cargo = ?, telefone = ?, email = ?, municipio = ?, status = ?
                WHERE id = ?
            ''', (
                data.get('nome'),
                data.get('cpf'),
                data.get('cargo', ''),
                data.get('telefone', ''),
                data.get('email', ''),
                data.get('municipio'),
                data.get('status', 'ativo'),
                id
            ))
            conn.commit()
            conn.close()
            return jsonify({'message': 'Responsável atualizado com sucesso'}), 200
        except Exception as e:
            conn.close()
            return jsonify({'error': f'Erro ao atualizar responsável: {str(e)}'}), 400

@app.route('/api/distribuicao/responsaveis/validar-cpf', methods=['GET'])
def validar_cpf_responsavel():
    cpf = request.args.get('cpf', '')
    exclude_id = request.args.get('excludeId', None)

    if not cpf:
        return jsonify({'valid': False, 'message': 'CPF não fornecido'}), 400

    conn = get_db()
    cursor = conn.cursor()

    if exclude_id:
        cursor.execute('SELECT id FROM responsaveis_municipios WHERE cpf = ? AND id != ?', (cpf, exclude_id))
    else:
        cursor.execute('SELECT id FROM responsaveis_municipios WHERE cpf = ?', (cpf,))

    existing = cursor.fetchone()
    conn.close()

    if existing:
        return jsonify({'valid': False, 'message': 'CPF já cadastrado'}), 400

    return jsonify({'valid': True})

# Endpoints de Autenticação e Gestão de Usuários

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    cpf = data.get('cpf', '').replace('.', '').replace('-', '')
    senha = data.get('senha', '')

    if not cpf or not senha:
        return jsonify({'error': 'CPF e senha são obrigatórios'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM usuarios WHERE cpf = ? AND status = ?', (cpf, 'ativo'))
    usuario = cursor.fetchone()

    if not usuario:
        conn.close()
        return jsonify({'error': 'Credenciais inválidas'}), 401

    usuario_dict = dict(usuario)
    senha_hash = hashlib.sha256(senha.encode()).hexdigest()
    senha_valida = False
    usando_provisoria = False

    if usuario_dict['senha_hash'] == senha_hash:
        senha_valida = True
    elif validar_senha_provisoria(usuario_dict, senha):
        senha_valida = True
        usando_provisoria = True

        cursor.execute('''
            UPDATE usuarios SET temporary_password_used = 1 WHERE id = ?
        ''', (usuario_dict['id'],))
        conn.commit()

    if not senha_valida:
        conn.close()
        return jsonify({'error': 'Credenciais inválidas'}), 401

    cursor.execute('''
        INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, descricao, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (usuario_dict['id'], usuario_dict.get('cargo'), 'login', 'Sistema', f"Login realizado por {usuario_dict['nome_completo']}", agora_brasilia()))
    conn.commit()

    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (usuario_dict['id'],))
    usuario_atualizado = dict(cursor.fetchone())
    conn.close()

    senha_expirada = verificar_expiracao_senha(usuario_atualizado)
    must_change = usuario_atualizado.get('must_change_password', 0) == 1 or usando_provisoria or senha_expirada

    usuario_atualizado['must_change_password'] = 1 if must_change else 0
    usuario_atualizado['password_expired'] = senha_expirada
    usuario_atualizado['using_temporary'] = usando_provisoria

    return jsonify(usuario_atualizado)

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    data = request.json
    usuario_id = data.get('usuario_id')

    if usuario_id:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO logs_auditoria (usuario_id, acao, modulo, descricao, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (usuario_id, 'logout', 'Sistema', 'Logout realizado', agora_brasilia()))
        conn.commit()
        conn.close()

    return jsonify({'message': 'Logout realizado com sucesso'})

@app.route('/api/auth/recuperar-senha', methods=['POST'])
def recuperar_senha():
    data = request.json
    cpf = data.get('cpf', '').replace('.', '').replace('-', '')
    data_nascimento = data.get('data_nascimento', '')

    if not cpf or not data_nascimento:
        return jsonify({'error': 'CPF e data de nascimento são obrigatórios'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT * FROM usuarios
        WHERE cpf = ? AND data_nascimento = ? AND status = ?
    ''', (cpf, data_nascimento, 'ativo'))

    usuario = cursor.fetchone()

    if not usuario:
        conn.close()
        return jsonify({'error': 'Dados inválidos. Verifique CPF e data de nascimento.'}), 404

    from datetime import datetime, timedelta
    senha_provisoria = gerar_senha_provisoria()
    senha_provisoria_hash = hashlib.sha256(senha_provisoria.encode()).hexdigest()
    expira_em = datetime.now() + timedelta(hours=24)

    cursor.execute('''
        UPDATE usuarios
        SET temporary_password_hash = ?,
            temporary_password_expires_at = ?,
            temporary_password_used = 0,
            must_change_password = 1
        WHERE id = ?
    ''', (senha_provisoria_hash, expira_em.isoformat(), usuario['id']))

    cursor.execute('''
        INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, descricao, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (usuario['id'], usuario['cargo'], 'recuperacao_senha', 'Sistema', f"Senha provisória gerada para {usuario['nome_completo']}", agora_brasilia()))

    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Senha provisória gerada com sucesso',
        'senha_provisoria': senha_provisoria,
        'validade_horas': 24,
        'expira_em': expira_em.strftime('%d/%m/%Y às %H:%M')
    })

@app.route('/api/auth/alterar-senha', methods=['POST', 'OPTIONS'])
def alterar_senha():
    if request.method == 'OPTIONS':
        return '', 204

    print('[BACKEND] Recebendo requisição para alterar senha...')
    print(f'[BACKEND] Headers: {dict(request.headers)}')
    print(f'[BACKEND] Origin: {request.headers.get("Origin")}')

    data = request.json
    print(f'[BACKEND] Dados recebidos: usuario_id={data.get("usuario_id")}, tem_senha_atual={bool(data.get("senha_atual"))}, tem_nova_senha={bool(data.get("nova_senha"))}')

    usuario_id = data.get('usuario_id')
    senha_atual = data.get('senha_atual', '')
    nova_senha = data.get('nova_senha', '')

    if not usuario_id or not nova_senha:
        print('[BACKEND] Erro: Dados incompletos')
        return jsonify({'error': 'Dados incompletos'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (usuario_id,))
    usuario = cursor.fetchone()

    if not usuario:
        print(f'[BACKEND] Erro: Usuário não encontrado (ID: {usuario_id})')
        conn.close()
        return jsonify({'error': 'Usuário não encontrado'}), 404

    usuario_dict = dict(usuario)
    print(f'[BACKEND] Usuário encontrado: {usuario_dict["nome_completo"]}')

    if senha_atual:
        print('[BACKEND] Validando senha atual...')
        senha_atual_hash = hashlib.sha256(senha_atual.encode()).hexdigest()
        if usuario_dict['senha_hash'] != senha_atual_hash and not validar_senha_provisoria(usuario_dict, senha_atual):
            print('[BACKEND] Erro: Senha atual incorreta')
            conn.close()
            return jsonify({'error': 'Senha atual incorreta'}), 401
        print('[BACKEND] Senha atual validada com sucesso')

    from datetime import datetime, timedelta
    nova_senha_hash = hashlib.sha256(nova_senha.encode()).hexdigest()
    agora = datetime.now()
    expira_em = agora + timedelta(days=90)

    print('[BACKEND] Atualizando senha no banco de dados...')
    cursor.execute('''
        UPDATE usuarios
        SET senha_hash = ?,
            password_expires_at = ?,
            must_change_password = 0,
            primeiro_acesso = 0,
            temporary_password_hash = NULL,
            temporary_password_expires_at = NULL,
            temporary_password_used = 0
        WHERE id = ?
    ''', (nova_senha_hash, expira_em.isoformat(), usuario_id))

    cursor.execute('''
        INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, descricao, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (usuario_id, usuario_dict.get('cargo'), 'alteracao_senha', 'Sistema', f"Senha alterada por {usuario_dict['nome_completo']}", agora_brasilia()))

    conn.commit()
    print('[BACKEND] Senha atualizada e commit realizado')

    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (usuario_id,))
    usuario_atualizado = dict(cursor.fetchone())
    conn.close()

    print('[BACKEND] Sucesso: Senha alterada com sucesso!')
    return jsonify({
        'message': 'Senha alterada com sucesso',
        'usuario': usuario_atualizado
    })

@app.route('/api/auth/redefinir-senha/<int:usuario_id>', methods=['POST'])
@verificar_permissao_admin
def redefinir_senha_admin(usuario_id):
    data = request.json
    nova_senha = data.get('nova_senha')

    if not nova_senha:
        return jsonify({'error': 'Nova senha é obrigatória'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (usuario_id,))
    usuario = cursor.fetchone()

    if not usuario:
        conn.close()
        return jsonify({'error': 'Usuário não encontrado'}), 404

    # Administrador pode redefinir senha de qualquer usuário (já verificado pelo decorator)
    # Não há restrição adicional de hierarquia aqui pois apenas Administradores podem acessar este endpoint

    from datetime import datetime, timedelta
    nova_senha_hash = hashlib.sha256(nova_senha.encode()).hexdigest()
    agora = datetime.now()
    expira_em = agora + timedelta(days=90)

    cursor.execute('''
        UPDATE usuarios
        SET senha_hash = ?,
            password_last_changed_at = ?,
            password_expires_at = ?,
            must_change_password = 1,
            temporary_password_hash = NULL,
            temporary_password_expires_at = NULL,
            temporary_password_used = 0
        WHERE id = ?
    ''', (nova_senha_hash, agora.isoformat(), expira_em.isoformat(), usuario_id))

    admin = request.usuario_autenticado
    cursor.execute('''
        INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (admin['id'], admin.get('cargo'), 'redefinicao_senha_admin', 'Gestão', 'usuarios', str(usuario_id),
          f"Admin {admin['nome_completo']} redefiniu senha de {usuario['nome_completo']}", agora_brasilia()))

    conn.commit()
    conn.close()

    return jsonify({'message': 'Senha redefinida com sucesso. O usuário deverá alterá-la no próximo login.'})

@app.route('/api/usuarios', methods=['GET', 'POST'])
def usuarios():
    if request.method == 'GET':
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM usuarios ORDER BY created_at DESC')
        rows = cursor.fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    elif request.method == 'POST':
        data = request.json

        # Validações
        if not data.get('nome_completo') or not data.get('email') or not data.get('cpf') or not data.get('senha_hash') or not data.get('cargo'):
            return jsonify({'error': 'Campos obrigatórios faltando'}), 400

        conn = get_db()
        cursor = conn.cursor()

        # Verificar se email já existe
        cursor.execute('SELECT id FROM usuarios WHERE email = ?', (data['email'].lower(),))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'Email já cadastrado'}), 400

        # Verificar se CPF já existe
        cpf_limpo = ''.join(filter(str.isdigit, data['cpf']))
        cursor.execute('SELECT id FROM usuarios WHERE cpf = ?', (cpf_limpo,))
        if cursor.fetchone():
            conn.close()
            return jsonify({'error': 'CPF já cadastrado'}), 400

        # Hash da senha
        senha_hash = hashlib.sha256(data['senha_hash'].encode()).hexdigest()

        try:
            cursor.execute('''
                INSERT INTO usuarios (
                    nome_completo, email, senha_hash, cpf, telefone,
                    profissao, vinculo_empregaticio, cep, municipio, logradouro,
                    bairro, numero, complemento, cargo, status, primeiro_acesso, criado_por
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['nome_completo'],
                data['email'].lower(),
                senha_hash,
                data['cpf'],
                data.get('telefone'),
                data.get('profissao'),
                data.get('vinculo_empregaticio'),
                data.get('cep'),
                data.get('municipio'),
                data.get('logradouro'),
                data.get('bairro'),
                data.get('numero'),
                data.get('complemento'),
                data['cargo'],
                'ativo',
                1,
                data.get('criado_por')
            ))

            usuario_id = cursor.lastrowid

            # Sincronização com tabelas específicas de Capacitação
            if data['cargo'] == 'Enfermeiro(a) Aluno(a)':
                # Criar registro na tabela enfermeiras_alunas
                cursor.execute('''
                    INSERT INTO enfermeiras_alunas (
                        nome, cpf, telefone, email, municipio,
                        cep, logradouro, bairro, numero, complemento
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    data['nome_completo'],
                    data['cpf'],
                    data.get('telefone'),
                    data['email'].lower(),
                    data.get('municipio'),
                    data.get('cep'),
                    data.get('logradouro'),
                    data.get('bairro'),
                    data.get('numero'),
                    data.get('complemento')
                ))

            elif data['cargo'] == 'Enfermeiro(a) Instrutor(a)':
                # Criar registro na tabela enfermeiras_instrutoras
                cursor.execute('''
                    INSERT INTO enfermeiras_instrutoras (
                        nome, cpf, telefone, email, municipio,
                        cep, logradouro, bairro, numero, complemento,
                        senha_hash
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    data['nome_completo'],
                    data['cpf'],
                    data.get('telefone'),
                    data['email'].lower(),
                    data.get('municipio'),
                    data.get('cep'),
                    data.get('logradouro'),
                    data.get('bairro'),
                    data.get('numero'),
                    data.get('complemento'),
                    senha_hash
                ))

            # Registrar log de criação
            if data.get('criado_por'):
                criador = request.usuario_autenticado if hasattr(request, 'usuario_autenticado') and request.usuario_autenticado else None
                cursor.execute('''
                    INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    data['criado_por'],
                    criador.get('cargo') if criador else None,
                    'criacao_usuario',
                    'Gestão',
                    'usuarios',
                    str(usuario_id),
                    f"Criação do usuário {data['nome_completo']} com cargo {data['cargo']}",
                    agora_brasilia()
                ))

            conn.commit()

            # Buscar o usuário criado
            cursor.execute('SELECT * FROM usuarios WHERE id = ?', (usuario_id,))
            novo_usuario = cursor.fetchone()
            conn.close()

            return jsonify(dict(novo_usuario)), 201

        except sqlite3.IntegrityError as e:
            conn.rollback()
            conn.close()
            print(f'Erro de integridade ao cadastrar usuário: {str(e)}')
            return jsonify({'error': 'Erro ao cadastrar usuário. Verifique se os dados não estão duplicados.'}), 400
        except Exception as e:
            conn.rollback()
            conn.close()
            print(f'Erro inesperado ao cadastrar usuário: {str(e)}')
            return jsonify({'error': f'Erro ao cadastrar usuário: {str(e)}'}), 500

@app.route('/api/usuarios/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def usuario_especifico(id):
    conn = get_db()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
        usuario = cursor.fetchone()
        conn.close()

        if not usuario:
            return jsonify({'error': 'Usuário não encontrado'}), 404

        return jsonify(dict(usuario))

    elif request.method == 'PUT':
        data = request.json

        cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
        usuario_anterior = cursor.fetchone()

        if not usuario_anterior:
            conn.close()
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Atualizar senha se fornecida
        if data.get('senha_hash'):
            senha_hash = hashlib.sha256(data['senha_hash'].encode()).hexdigest()
            cursor.execute('''
                UPDATE usuarios
                SET senha_hash = ?, primeiro_acesso = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (senha_hash, id))

            # Registrar log de alteração de senha
            if data.get('usuario_id'):
                executor = request.usuario_autenticado if hasattr(request, 'usuario_autenticado') and request.usuario_autenticado else None
                cursor.execute('''
                    INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    data['usuario_id'],
                    executor.get('cargo') if executor else None,
                    'alteracao_senha',
                    'Gestão',
                    'usuarios',
                    str(id),
                    f"Senha alterada para {usuario_anterior['nome_completo']}",
                    agora_brasilia()
                ))

        # Atualizar outros campos se fornecidos
        if data.get('cargo') and data['cargo'] != usuario_anterior['cargo']:
            cursor.execute('''
                UPDATE usuarios
                SET cargo = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data['cargo'], id))

            # Registrar log de alteração de hierarquia
            if data.get('usuario_id'):
                executor = request.usuario_autenticado if hasattr(request, 'usuario_autenticado') and request.usuario_autenticado else None
                cursor.execute('''
                    INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    data['usuario_id'],
                    executor.get('cargo') if executor else None,
                    'alteracao_hierarquia',
                    'Gestão',
                    'usuarios',
                    str(id),
                    f"Hierarquia alterada de {usuario_anterior['cargo']} para {data['cargo']}",
                    agora_brasilia()
                ))

        if 'status' in data:
            cursor.execute('''
                UPDATE usuarios
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (data['status'], id))

        conn.commit()

        cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
        usuario_atualizado = cursor.fetchone()
        conn.close()

        return jsonify(dict(usuario_atualizado))

    elif request.method == 'DELETE':
        cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
        usuario = cursor.fetchone()

        if not usuario:
            conn.close()
            return jsonify({'error': 'Usuário não encontrado'}), 404

        # Registrar log de exclusão
        data = request.json
        if data and data.get('usuario_id'):
            executor = request.usuario_autenticado if hasattr(request, 'usuario_autenticado') and request.usuario_autenticado else None
            cursor.execute('''
                INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['usuario_id'],
                executor.get('cargo') if executor else None,
                'exclusao_usuario',
                'Gestão',
                'usuarios',
                str(id),
                f"Exclusão do usuário {usuario['nome_completo']} ({usuario['email']})",
                agora_brasilia()
            ))

        cursor.execute('DELETE FROM usuarios WHERE id = ?', (id,))
        conn.commit()
        conn.close()

        return jsonify({'message': 'Usuário excluído com sucesso'})

@app.route('/api/logs-auditoria', methods=['GET', 'POST'])
@verificar_permissao_admin_ou_coordenador
def logs_auditoria():
    if request.method == 'GET':
        conn = get_db()
        cursor = conn.cursor()

        usuario_filtro = request.args.get('usuario', '').strip()
        acao_filtro = request.args.get('acao', '').strip()
        modulo_filtro = request.args.get('modulo', '').strip()
        data_inicio = request.args.get('data_inicio', '').strip()
        data_fim = request.args.get('data_fim', '').strip()
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        offset = (page - 1) * per_page

        conditions = []
        params = []

        if usuario_filtro:
            conditions.append('(u.nome_completo LIKE ? OR u.email LIKE ?)')
            params.extend([f'%{usuario_filtro}%', f'%{usuario_filtro}%'])
        if acao_filtro:
            conditions.append('l.acao = ?')
            params.append(acao_filtro)
        if modulo_filtro:
            conditions.append('l.modulo = ?')
            params.append(modulo_filtro)
        if data_inicio:
            conditions.append("DATE(l.created_at) >= DATE(?)")
            params.append(data_inicio)
        if data_fim:
            conditions.append("DATE(l.created_at) <= DATE(?)")
            params.append(data_fim)

        where_clause = ('WHERE ' + ' AND '.join(conditions)) if conditions else ''

        cursor.execute(f'''
            SELECT COUNT(*) as total
            FROM logs_auditoria l
            LEFT JOIN usuarios u ON l.usuario_id = u.id
            {where_clause}
        ''', params)
        total = cursor.fetchone()['total']

        cursor.execute(f'''
            SELECT l.*, u.nome_completo as usuario_nome, u.cargo as usuario_cargo_atual
            FROM logs_auditoria l
            LEFT JOIN usuarios u ON l.usuario_id = u.id
            {where_clause}
            ORDER BY l.created_at DESC
            LIMIT ? OFFSET ?
        ''', params + [per_page, offset])

        rows = cursor.fetchall()
        conn.close()
        return jsonify({'logs': [dict(row) for row in rows], 'total': total, 'page': page, 'per_page': per_page})

    elif request.method == 'POST':
        # Endpoint para o frontend registrar eventos de exportação/impressão
        data = request.json
        if not data or not data.get('acao') or not data.get('descricao'):
            return jsonify({'error': 'acao e descricao são obrigatórios'}), 400

        usuario = request.usuario_autenticado
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            usuario['id'],
            usuario.get('cargo'),
            data['acao'],
            data.get('modulo'),
            data.get('tabela_afetada'),
            data.get('registro_id'),
            data['descricao'],
            agora_brasilia()
        ))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Log registrado com sucesso'}), 201

@app.route('/api/profissionais', methods=['GET'])
@verificar_permissao_gestao
def listar_profissionais():
    conn = get_db()
    cursor = conn.cursor()

    # Parâmetros de busca e paginação
    busca = request.args.get('busca', '')
    categoria = request.args.get('categoria', 'Todos')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    offset = (page - 1) * per_page

    usuario = request.usuario_autenticado
    cargo = usuario.get('cargo', '')

    # Enfermeiros Instrutores só podem visualizar Enfermeiros Alunos
    if cargo == 'Enfermeiro(a) Instrutor(a)':
        categoria = 'Enfermeiro(a) Aluno(a)'

    # Query base
    query_conditions = ['(nome_completo LIKE ? OR cpf LIKE ? OR cargo LIKE ?)']
    params = [f'%{busca}%', f'%{busca}%', f'%{busca}%']

    # Adicionar filtro por categoria se não for "Todos"
    if categoria != 'Todos':
        query_conditions.append('cargo = ?')
        params.append(categoria)

    query_base = f'''
        FROM usuarios
        WHERE {' AND '.join(query_conditions)}
    '''

    # Contar total de registros
    cursor.execute(f'SELECT COUNT(*) as total {query_base}', params)
    total = cursor.fetchone()['total']

    # Buscar registros paginados
    cursor.execute(f'''
        SELECT id, nome_completo, cpf, cargo, status, profissao, telefone,
               email, municipio, created_at
        {query_base}
        ORDER BY nome_completo ASC
        LIMIT ? OFFSET ?
    ''', params + [per_page, offset])

    profissionais = [dict(row) for row in cursor.fetchall()]

    # Buscar todas as categorias existentes
    cursor.execute('SELECT DISTINCT cargo FROM usuarios ORDER BY cargo')
    todas_categorias = [row['cargo'] for row in cursor.fetchall()]

    # Filtrar categorias baseado no cargo do usuário
    if cargo == 'Enfermeiro(a) Instrutor(a)':
        categorias = ['Enfermeiro(a) Aluno(a)']
    else:
        categorias = todas_categorias

    conn.close()

    return jsonify({
        'profissionais': profissionais,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page,
        'categorias': categorias,
        'cargo_usuario': cargo
    })

@app.route('/api/profissionais/<int:id>', methods=['GET'])
@verificar_permissao_gestao
def obter_profissional(id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
    profissional = cursor.fetchone()
    conn.close()

    if not profissional:
        return jsonify({'error': 'Profissional não encontrado'}), 404

    return jsonify(dict(profissional))

@app.route('/api/profissionais/<int:id>/status', methods=['PUT'])
@verificar_permissao_admin_ou_coordenador
def atualizar_status_profissional(id):
    conn = get_db()
    cursor = conn.cursor()
    data = request.json

    novo_status = data.get('status')
    if novo_status not in ['ativo', 'inativo', 'bloqueado']:
        conn.close()
        return jsonify({'error': 'Status inválido'}), 400

    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
    usuario = cursor.fetchone()

    if not usuario:
        conn.close()
        return jsonify({'error': 'Profissional não encontrado'}), 404

    # Verificar hierarquia: apenas Administrador pode alterar status de qualquer usuário
    # Coordenador só pode alterar status de usuários de nível inferior
    usuario_autenticado = request.usuario_autenticado
    if not pode_gerenciar_usuario(usuario_autenticado.get('cargo'), usuario['cargo']):
        conn.close()
        return jsonify({'error': 'Você não tem permissão para alterar o status deste usuário.'}), 403

    cursor.execute('''
        UPDATE usuarios
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (novo_status, id))

    # Registrar log
    if data.get('usuario_id'):
        executor = request.usuario_autenticado if hasattr(request, 'usuario_autenticado') and request.usuario_autenticado else None
        cursor.execute('''
            INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['usuario_id'],
            executor.get('cargo') if executor else None,
            'alteracao_status',
            'Gestão',
            'usuarios',
            str(id),
            f"Status alterado de {usuario['status']} para {novo_status} para {usuario['nome_completo']}",
            agora_brasilia()
        ))

    conn.commit()

    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
    usuario_atualizado = cursor.fetchone()
    conn.close()

    return jsonify(dict(usuario_atualizado))

@app.route('/api/profissionais/<int:id>', methods=['PUT'])
@verificar_permissao_gestao
def editar_profissional(id):
    conn = get_db()
    cursor = conn.cursor()
    data = request.json

    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
    usuario = cursor.fetchone()

    if not usuario:
        conn.close()
        return jsonify({'error': 'Profissional não encontrado'}), 404

    # Verificar hierarquia
    usuario_autenticado = request.usuario_autenticado
    if not pode_gerenciar_usuario(usuario_autenticado.get('cargo'), usuario['cargo']):
        conn.close()
        return jsonify({'error': 'Você não tem permissão para editar este usuário.'}), 403

    # Campos que podem ser atualizados
    campos_atualizacao = []
    valores = []

    campos_permitidos = ['nome_completo', 'cpf', 'email', 'telefone', 'profissao', 'municipio', 'cep', 'logradouro', 'numero', 'complemento', 'bairro']

    for campo in campos_permitidos:
        if campo in data:
            campos_atualizacao.append(f'{campo} = ?')
            valores.append(data[campo])

    # Apenas Administrador pode alterar o cargo
    if 'cargo' in data:
        usuario_autenticado = request.usuario_autenticado
        if usuario_autenticado.get('cargo') == 'Administrador':
            campos_atualizacao.append('cargo = ?')
            valores.append(data['cargo'])

    if not campos_atualizacao:
        conn.close()
        return jsonify({'error': 'Nenhum campo para atualizar'}), 400

    campos_atualizacao.append('updated_at = CURRENT_TIMESTAMP')
    valores.append(id)

    query = f"UPDATE usuarios SET {', '.join(campos_atualizacao)} WHERE id = ?"
    cursor.execute(query, valores)

    # Registrar log
    executor = request.usuario_autenticado if hasattr(request, 'usuario_autenticado') and request.usuario_autenticado else None
    cursor.execute('''
        INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        executor['id'] if executor else (data.get('usuario_id')),
        executor.get('cargo') if executor else None,
        'edicao_profissional',
        'Gestão',
        'usuarios',
        str(id),
        f"Edição do profissional {usuario['nome_completo']}",
        agora_brasilia()
    ))

    conn.commit()

    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
    usuario_atualizado = cursor.fetchone()
    conn.close()

    return jsonify(dict(usuario_atualizado))

@app.route('/api/profissionais/<int:id>', methods=['DELETE'])
@verificar_permissao_gestao
def excluir_profissional(id):
    conn = get_db()
    cursor = conn.cursor()
    data = request.json

    cursor.execute('SELECT * FROM usuarios WHERE id = ?', (id,))
    usuario = cursor.fetchone()

    if not usuario:
        conn.close()
        return jsonify({'error': 'Profissional não encontrado'}), 404

    # Verificar hierarquia
    usuario_autenticado = request.usuario_autenticado
    if not pode_gerenciar_usuario(usuario_autenticado.get('cargo'), usuario['cargo']):
        conn.close()
        return jsonify({'error': 'Você não tem permissão para excluir este usuário.'}), 403

    # Registrar log antes de excluir
    executor = request.usuario_autenticado if hasattr(request, 'usuario_autenticado') and request.usuario_autenticado else None
    cursor.execute('''
        INSERT INTO logs_auditoria (usuario_id, cargo_usuario, acao, modulo, tabela_afetada, registro_id, descricao, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        executor['id'] if executor else (data.get('usuario_id') if data else None),
        executor.get('cargo') if executor else None,
        'exclusao_profissional',
        'Gestão',
        'usuarios',
        str(id),
        f"Profissional {usuario['nome_completo']} (CPF: {usuario['cpf']}) foi excluído",
        agora_brasilia()
    ))

    # Excluir o profissional
    cursor.execute('DELETE FROM usuarios WHERE id = ?', (id,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Profissional excluído com sucesso'})

@app.route('/api/dashboard/gestao', methods=['GET'])
def dashboard_gestao():
    conn = get_db()
    cursor = conn.cursor()

    # Total de profissionais cadastrados
    cursor.execute("SELECT COUNT(*) as total FROM usuarios WHERE status = 'ativo'")
    total_profissionais = cursor.fetchone()['total']

    # Total de profissionais por especialização (profissão)
    cursor.execute("""
        SELECT profissao, COUNT(*) as total
        FROM usuarios
        WHERE status = 'ativo' AND profissao IS NOT NULL AND profissao != ''
        GROUP BY profissao
    """)
    profissionais_por_especializacao = {row['profissao']: row['total'] for row in cursor.fetchall()}

    # Total de enfermeiros (somando todos os cargos de enfermeiro)
    cursor.execute("""
        SELECT COUNT(*) as total
        FROM usuarios
        WHERE status = 'ativo'
        AND (profissao LIKE '%Enfermeiro%' OR profissao LIKE '%Enfermeira%')
    """)
    total_enfermeiros = cursor.fetchone()['total']

    # Total de médicos
    cursor.execute("""
        SELECT COUNT(*) as total
        FROM usuarios
        WHERE status = 'ativo'
        AND (profissao LIKE '%Médico%' OR profissao LIKE '%Médica%')
    """)
    total_medicos = cursor.fetchone()['total']

    # Total de profissionais por módulo (baseado no cargo)
    cursor.execute("""
        SELECT
            CASE
                WHEN cargo = 'Enfermeiro(a) Instrutor(a)' THEN 'Capacitação - Instrutores'
                WHEN cargo = 'Enfermeiro(a) Aluno(a)' THEN 'Capacitação - Alunos'
                WHEN cargo = 'Médico(a) / Enfermeiro(a) Ambulatorial' THEN 'Ambulatorial'
                WHEN cargo = 'Responsável por Insumos' THEN 'Distribuição/Insumos'
                ELSE 'Gestão'
            END as modulo,
            COUNT(*) as total
        FROM usuarios
        WHERE status = 'ativo'
        GROUP BY modulo
    """)
    profissionais_por_modulo = {row['modulo']: row['total'] for row in cursor.fetchall()}

    # Total de pacientes ambulatoriais
    cursor.execute("SELECT COUNT(*) as total FROM pacientes")
    total_pacientes_ambulatorial = cursor.fetchone()['total']

    # Total de pacientes de capacitação
    cursor.execute("SELECT COUNT(*) as total FROM pacientes_capacitacao")
    total_pacientes_capacitacao = cursor.fetchone()['total']

    # Total geral de pacientes
    total_pacientes = total_pacientes_ambulatorial + total_pacientes_capacitacao

    # Agendamentos pendentes
    cursor.execute("""
        SELECT COUNT(*) as total
        FROM agendamentos_municipios
        WHERE status = 'agendado'
    """)
    agendamentos_pendentes = cursor.fetchone()['total']

    conn.close()

    return jsonify({
        'total_profissionais': total_profissionais,
        'total_enfermeiros': total_enfermeiros,
        'total_medicos': total_medicos,
        'profissionais_por_especializacao': profissionais_por_especializacao,
        'profissionais_por_modulo': profissionais_por_modulo,
        'total_pacientes': total_pacientes,
        'total_pacientes_ambulatorial': total_pacientes_ambulatorial,
        'total_pacientes_capacitacao': total_pacientes_capacitacao,
        'agendamentos_pendentes': agendamentos_pendentes
    })

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000, host='0.0.0.0')
