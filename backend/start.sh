#!/bin/bash

echo "=========================================="
echo "Iniciando Backend do Sistema DeciDIU"
echo "=========================================="
echo ""

# Verifica se o Python está instalado
if ! command -v python3 &> /dev/null
then
    echo "❌ Python3 não está instalado!"
    echo "   Instale Python3 antes de continuar."
    exit 1
fi

echo "✓ Python encontrado: $(python3 --version)"
echo ""

# Verifica se as dependências estão instaladas
echo "Verificando dependências..."
if ! python3 -c "import flask" 2>/dev/null; then
    echo "⚠ Flask não está instalado. Instalando dependências..."
    pip install -r requirements.txt
fi

echo "✓ Dependências verificadas"
echo ""

# Inicia o servidor
echo "=========================================="
echo "Servidor iniciando em http://localhost:5000"
echo "=========================================="
echo ""
python3 app.py
