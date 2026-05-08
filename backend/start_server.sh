#!/bin/bash

echo "================================================"
echo "  Iniciando Backend Flask - Sistema DECIDIU"
echo "================================================"
echo ""

# Verifica se Flask está instalado
if ! python3 -c "import flask" 2>/dev/null; then
    echo "⚠️  Flask não encontrado. Instalando dependências..."
    pip3 install --break-system-packages flask flask-cors
    echo "✓ Dependências instaladas"
    echo ""
fi

# Mata processos anteriores
echo "Encerrando processos anteriores..."
pkill -9 -f "python.*app.py" 2>/dev/null
sleep 1

# Inicia o servidor
echo "Iniciando servidor na porta 5000..."
echo ""
python3 app.py

echo ""
echo "================================================"
echo "  Servidor encerrado"
echo "================================================"
