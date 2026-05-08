export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validatePassword = (password: string, cpf?: string): PasswordValidationResult => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('A senha deve ter no mínimo 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('A senha deve conter pelo menos 1 letra maiúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('A senha deve conter pelo menos 1 letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('A senha deve conter pelo menos 1 número');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('A senha deve conter pelo menos 1 caractere especial');
  }

  if (cpf) {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (password === cpfLimpo) {
      errors.push('A senha não pode ser igual ao CPF');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validarSenhaForte = (password: string): number => {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

  return strength;
};

export const getPasswordStrength = (password: string): number => {
  if (!password) return 0;

  let strength = 0;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  ];

  strength = checks.filter(Boolean).length;

  return (strength / checks.length) * 100;
};

export const getPasswordStrengthColor = (strength: number): string => {
  if (strength <= 1) return 'bg-red-500';
  if (strength === 2) return 'bg-orange-500';
  if (strength === 3) return 'bg-yellow-500';
  if (strength === 4) return 'bg-blue-500';
  return 'bg-green-500';
};

export const getPasswordStrengthText = (strength: number): string => {
  if (strength <= 1) return 'Muito fraca';
  if (strength === 2) return 'Fraca';
  if (strength === 3) return 'Média';
  if (strength === 4) return 'Forte';
  return 'Muito forte';
};

export interface ValidacaoSenha {
  valida: boolean;
  tamanho: boolean;
  maiuscula: boolean;
  minuscula: boolean;
  numero: boolean;
  especial: boolean;
}

export const validarSenha = (password: string): ValidacaoSenha => {
  return {
    tamanho: password.length >= 8,
    maiuscula: /[A-Z]/.test(password),
    minuscula: /[a-z]/.test(password),
    numero: /[0-9]/.test(password),
    especial: /[@$!%*?&]/.test(password),
    valida: password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[@$!%*?&]/.test(password)
  };
};

export const obterMensagemErro = (validacao: ValidacaoSenha): string => {
  const erros: string[] = [];

  if (!validacao.tamanho) erros.push('Mínimo de 8 caracteres');
  if (!validacao.maiuscula) erros.push('Letra maiúscula');
  if (!validacao.minuscula) erros.push('Letra minúscula');
  if (!validacao.numero) erros.push('Número');
  if (!validacao.especial) erros.push('Caractere especial (@$!%*?&)');

  return erros.join(', ');
};

export const PasswordStrengthIndicator = ({ password, cpf }: { password: string; cpf: string }) => {
  if (!password) return null;

  const validation = validatePassword(password, cpf);

  return (
    <div className="mt-2">
      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm font-medium text-red-800 mb-2">Requisitos da senha:</p>
          <ul className="text-xs text-red-700 space-y-1">
            {validation.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
      {validation.isValid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm font-medium text-green-800">Senha forte</p>
        </div>
      )}
    </div>
  );
};
